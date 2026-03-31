import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TranscriptionSegment } from '@/contexts/CallContext';

const SONIOX_WS_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';
const SAMPLE_RATE = 16000;

// Float32 (-1..1) → PCM Int16 (-32768..32767)
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

export function useCallTranscription() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptionsRef = useRef<TranscriptionSegment[]>([]);
  const micRef = useRef<ChannelRefs>({ ws: null, audioContext: null, processor: null, source: null });
  const remoteRef = useRef<ChannelRefs>({ ws: null, audioContext: null, processor: null, source: null });
  const segmentIdRef = useRef(0);
  const apiKeyRef = useRef<string | null>(null);

  const addTranscription = useCallback((segment: TranscriptionSegment) => {
    setTranscriptions(prev => {
      // Remove partials from same speaker, keep finals
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
      // Persistent token buffer across messages (per doc recommendation)
      let tokenBuffer: string[] = [];

      const ws = new WebSocket(SONIOX_WS_URL);
      ws.binaryType = 'arraybuffer';
      refs.current.ws = ws;

      ws.onopen = () => {
        // Send config
        ws.send(JSON.stringify({
          api_key: apiKey,
          model: 'stt-rt-preview',
          language_code: 'pt',
          sample_rate: SAMPLE_RATE,
          audio_format: 'pcm_s16le',
          num_channels: 1,
          include_nonfinal: true,
        }));

        // AudioContext at 16kHz (Soniox requirement per doc)
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

          if (data.error_code) {
            return;
          }

          if (!data.tokens || data.tokens.length === 0) return;

          // Separate final vs non-final tokens (per doc pattern)
          const finalTokens: string[] = [];
          const nonFinalTokens: string[] = [];

          for (const token of data.tokens) {
            if (token.is_final) {
              finalTokens.push(token.text);
            } else {
              nonFinalTokens.push(token.text);
            }
          }

          // Final tokens: accumulate and emit segment
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
              tokenBuffer = []; // Reset buffer after emitting
            }
          }

          // Non-final tokens: show preview
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
        } catch {
          // Ignore non-JSON messages (config confirmation, etc.)
        }
      };

      ws.onerror = () => {
        reject(new Error(`WebSocket error for ${speakerType}`));
      };

      ws.onclose = () => {};
    });
  }, [addTranscription]);

  const startTranscription = useCallback(async (
    micStream: MediaStream,
    remoteStream: MediaStream | null,
    peerName?: string,
  ) => {
    setError(null);
    setTranscriptions([]);
    transcriptionsRef.current = [];
    segmentIdRef.current = 0;

    try {
      // Get Soniox API key
      if (!apiKeyRef.current) {
        const { data, error: fnError } = await supabase.functions.invoke('get-soniox-token');
        if (fnError || !data?.api_key) {
          throw new Error('Não foi possível obter token Soniox');
        }
        apiKeyRef.current = data.api_key;
      }

      const apiKey = apiKeyRef.current;

      // Start mic channel
      await startChannel(micStream, 'Você', 'local', apiKey, micRef);

      // Start remote channel if available
      if (remoteStream) {
        const tracks = remoteStream.getAudioTracks();
        if (tracks.length > 0) {
          await startChannel(remoteStream, peerName || 'Cliente', 'remote', apiKey, remoteRef);
        }
      }

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
    cleanup(remoteRef);
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
