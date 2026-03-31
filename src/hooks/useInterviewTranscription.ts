import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SONIOX_WS_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';
const SAMPLE_RATE = 16000;

export interface TranscriptionSegment {
  id: number;
  text: string;
  speaker: string;
  speakerType: 'local' | 'remote';
  confidence: number;
  timestamp: number;
  is_final: boolean;
}

const float32ToInt16 = (audioData: Float32Array): ArrayBuffer => {
  const pcmData = new Int16Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    const s = Math.max(-1, Math.min(1, audioData[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcmData.buffer;
};

interface ChannelRefs {
  ws: WebSocket | null;
  audioContext: AudioContext | null;
  processor: ScriptProcessorNode | null;
  source: MediaStreamAudioSourceNode | null;
}

export function useInterviewTranscription() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptionsRef = useRef<TranscriptionSegment[]>([]);
  const micRef = useRef<ChannelRefs>({ ws: null, audioContext: null, processor: null, source: null });
  const displayRef = useRef<ChannelRefs>({ ws: null, audioContext: null, processor: null, source: null });
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const segmentIdRef = useRef(0);
  const apiKeyRef = useRef<string | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  const addTranscription = useCallback((segment: TranscriptionSegment) => {
    setTranscriptions(prev => {
      const withoutPartials = prev.filter(
        t => t.is_final || t.speaker !== segment.speaker
      );
      const updated = [...withoutPartials, segment];
      transcriptionsRef.current = updated;
      return updated;
    });
  }, []);

  const startChannel = useCallback((
    stream: MediaStream,
    speakerLabel: string,
    speakerType: 'local' | 'remote',
    apiKey: string,
    refs: React.MutableRefObject<ChannelRefs>,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      let tokenBuffer: string[] = [];
      const ws = new WebSocket(SONIOX_WS_URL);
      ws.binaryType = 'arraybuffer';
      refs.current.ws = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          api_key: apiKey,
          model: 'stt-rt-preview',
          language_code: 'pt',
          sample_rate: SAMPLE_RATE,
          audio_format: 'pcm_s16le',
          num_channels: 1,
          include_nonfinal: true,
        }));

        const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        refs.current.audioContext = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        refs.current.source = source;
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        refs.current.processor = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(float32ToInt16(e.inputBuffer.getChannelData(0)));
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error_code) return;
          if (!data.tokens || data.tokens.length === 0) return;

          const finalTokens: string[] = [];
          const nonFinalTokens: string[] = [];
          for (const token of data.tokens) {
            if (token.is_final) finalTokens.push(token.text);
            else nonFinalTokens.push(token.text);
          }

          if (finalTokens.length > 0) {
            tokenBuffer.push(...finalTokens);
            const finalText = tokenBuffer.join('').trim();
            if (finalText.length > 0) {
              addTranscription({
                id: segmentIdRef.current++,
                text: finalText,
                speaker: speakerLabel,
                speakerType,
                confidence: data.tokens[0]?.confidence || 0.9,
                timestamp: Date.now(),
                is_final: true,
              });
              tokenBuffer = [];
            }
          }

          if (nonFinalTokens.length > 0) {
            const previewText = [...tokenBuffer, ...nonFinalTokens].join('').trim();
            if (previewText.length > 0) {
              addTranscription({
                id: segmentIdRef.current++,
                text: previewText,
                speaker: speakerLabel,
                speakerType,
                confidence: 0.5,
                timestamp: Date.now(),
                is_final: false,
              });
            }
          }
        } catch { /* ignore */ }
      };

      ws.onerror = () => reject(new Error(`WebSocket error for ${speakerType}`));
      ws.onclose = () => {};
    });
  }, [addTranscription]);

  const startTranscription = useCallback(async (
    sessionId: string,
    candidateName?: string,
  ) => {
    setError(null);
    setTranscriptions([]);
    transcriptionsRef.current = [];
    segmentIdRef.current = 0;

    try {
      // Get Soniox API key
      if (!apiKeyRef.current) {
        const { data, error: fnError } = await supabase.functions.invoke('get-soniox-token');
        if (fnError || !data?.api_key) throw new Error('Não foi possível obter token Soniox');
        apiKeyRef.current = data.api_key;
      }
      const apiKey = apiKeyRef.current;

      // Capture mic
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      await startChannel(micStream, 'Entrevistador', 'local', apiKey, micRef);

      // Capture display audio (Meet tab)
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        displayStreamRef.current = displayStream;

        const audioTracks = displayStream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioOnlyStream = new MediaStream(audioTracks);
          await startChannel(audioOnlyStream, candidateName || 'Candidato', 'remote', apiKey, displayRef);
        }

        // Stop video track (we only need audio)
        displayStream.getVideoTracks().forEach(t => t.stop());
      } catch {
        // Could not capture display audio
      }

      // Auto-save every 10s
      autoSaveRef.current = setInterval(async () => {
        const finals = transcriptionsRef.current.filter(t => t.is_final);
        if (finals.length > 0) {
          await supabase
            .from('interview_sessions' as any)
            .update({ transcriptions: finals })
            .eq('id', sessionId);
        }
      }, 10000);

      setIsTranscribing(true);
    } catch (err: any) {
      setError(err.message);
      stopTranscription();
    }
  }, [startChannel]);

  const stopTranscription = useCallback(() => {
    const cleanup = (refs: React.MutableRefObject<ChannelRefs>) => {
      refs.current.ws?.close();
      refs.current.processor?.disconnect();
      refs.current.source?.disconnect();
      refs.current.audioContext?.close().catch(() => {});
      refs.current = { ws: null, audioContext: null, processor: null, source: null };
    };

    cleanup(micRef);
    cleanup(displayRef);

    micStreamRef.current?.getTracks().forEach(t => t.stop());
    displayStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    displayStreamRef.current = null;

    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }

    setIsTranscribing(false);
  }, []);

  const getFinalTranscriptions = useCallback(() => {
    return transcriptionsRef.current.filter(t => t.is_final);
  }, []);

  return {
    transcriptions,
    isTranscribing,
    error,
    startTranscription,
    stopTranscription,
    getFinalTranscriptions,
  };
}
