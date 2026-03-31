import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Loader2, Video, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useMeetingTranscription } from '@/hooks/useMeetingTranscription';
import { useAnalyzeSalesCall } from '@/hooks/useAnalyzeSalesCall';
import { SalesAnalysisResult } from '@/components/calls/SalesAnalysisResult';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PreCapturedStreams {
  mic: MediaStream;
  display: MediaStream | null;
}

interface MeetingTranscriptionModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string | null;
  preCapturedStreams?: PreCapturedStreams | null;
}

export function MeetingTranscriptionModal({
  open,
  onClose,
  leadId,
  leadName,
  preCapturedStreams,
}: MeetingTranscriptionModalProps) {
  const {
    transcriptions,
    isTranscribing,
    error,
    startTranscription,
    stopTranscription,
    getFinalTranscriptions,
    getDurationSeconds,
  } = useMeetingTranscription();

  const { analysis, isAnalyzing, analyze } = useAnalyzeSalesCall();

  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showTranscription, setShowTranscription] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartedRef = useRef(false);

  // Auto-start when pre-captured streams are provided
  useEffect(() => {
    if (open && preCapturedStreams && !isTranscribing && !autoStartedRef.current && !hasEnded) {
      autoStartedRef.current = true;
      handleStart();
    }
    if (!open) {
      autoStartedRef.current = false;
    }
  }, [open, preCapturedStreams]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  // Duration timer
  useEffect(() => {
    if (isTranscribing) {
      timerRef.current = setInterval(() => {
        setDuration(getDurationSeconds());
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTranscribing, getDurationSeconds]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStart = async () => {
    setIsCreating(true);
    try {
      let micStream: MediaStream;
      let displayStream: MediaStream | null = null;

      if (preCapturedStreams) {
        micStream = preCapturedStreams.mic;
        displayStream = preCapturedStreams.display;
      } else {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } catch {
  
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      const { data: meeting, error: insertError } = await supabase
        .from('lead_meetings' as any)
        .insert({
          lead_id: leadId,
          profile_id: profile.id,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const id = (meeting as any).id;
      setMeetingId(id);
      await startTranscription(id, leadName || undefined, micStream, displayStream);
    } catch (err: any) {
      toast.error('Erro ao iniciar reunião: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStop = async () => {
    stopTranscription();
    setIsSaving(true);
    setHasEnded(true);

    try {
      const finals = getFinalTranscriptions();
      const durationSecs = getDurationSeconds();

      if (meetingId) {
        await supabase
          .from('lead_meetings' as any)
          .update({
            status: 'ended',
            transcriptions: finals,
            duration_seconds: durationSecs,
            ended_at: new Date().toISOString(),
          })
          .eq('id', meetingId);
      }

      toast.success('Reunião guardada!');

      // Auto-analyze with IA
      if (finals.length > 0) {
        analyze(finals as any, undefined, leadId, meetingId || undefined);
      }
    } catch {
      toast.error('Erro ao guardar reunião');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isTranscribing) {
      handleStop();
      return;
    }
    setMeetingId(null);
    setDuration(0);
    setHasEnded(false);
    onClose();
  };

  const finalTranscriptions = transcriptions.filter(t => t.is_final);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl h-[85vh] flex flex-col p-0" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-6 pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {hasEnded ? 'Reunião encerrada' : 'Reunião'} · {leadName || 'Lead'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasEnded ? `Duração: ${formatDuration(duration)}` : 'Transcrição em tempo real via Google Meet'}
                </p>
              </div>
            </div>
            {isTranscribing && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="animate-pulse gap-1">
                  <span className="h-2 w-2 rounded-full bg-white" />
                  GRAVANDO
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(duration)}
                </Badge>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
          {/* Before start */}
          {!isTranscribing && !hasEnded && transcriptions.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Mic className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Iniciar Transcrição</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Clique no botão abaixo para capturar o áudio do microfone e da aba do Google Meet.
                </p>
              </div>
            </div>
          )}

          {/* Waiting for audio */}
          {isTranscribing && transcriptions.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Aguardando áudio...</span>
            </div>
          )}

          {error && (
            <div className="p-3 mb-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Live transcription during call */}
          {isTranscribing && transcriptions.length > 0 && (
            <div className="space-y-2">
              {transcriptions.map((t) => (
                <div
                  key={`${t.id}-${t.is_final}`}
                  className={`text-sm ${t.is_final ? '' : 'opacity-50 italic'}`}
                >
                  <span className={`font-semibold ${t.speakerType === 'local' ? 'text-primary' : 'text-blue-500'}`}>
                    {t.speaker}:
                  </span>{' '}
                  <span className="text-foreground">{t.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Post-meeting: AI Analysis */}
          {hasEnded && (
            <div className="space-y-4">
              {/* AI Analysis */}
              {isAnalyzing && (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Analisando reunião com IA...</span>
                </div>
              )}

              {analysis && <SalesAnalysisResult analysis={analysis} leadId={leadId} />}

              {!isAnalyzing && !analysis && finalTranscriptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem transcrição disponível para análise.
                </p>
              )}

              {/* Expandable transcription */}
              {finalTranscriptions.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowTranscription(!showTranscription)}
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
                  >
                    {showTranscription ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Transcrição ({finalTranscriptions.length} segmentos)
                  </button>
                  {showTranscription && (
                    <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-lg bg-muted/30 text-sm mt-2">
                      {finalTranscriptions.map((t) => (
                        <div key={t.id} className={t.speakerType === 'local' ? 'text-primary' : 'text-foreground'}>
                          <span className="font-medium">{t.speaker}:</span> {t.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="px-6 py-4 border-t flex items-center gap-2 flex-shrink-0">
          {!isTranscribing && !hasEnded && transcriptions.length === 0 ? (
            <Button
              onClick={handleStart}
              disabled={isCreating}
              className="w-full gap-2"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              Iniciar Transcrição
            </Button>
          ) : isTranscribing ? (
            <Button
              onClick={handleStop}
              variant="destructive"
              className="w-full gap-2"
              disabled={isSaving}
            >
              <MicOff className="h-4 w-4" />
              Parar e Guardar
            </Button>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
