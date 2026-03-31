import { useRef, useEffect } from 'react';
import { TranscriptionSegment } from '@/hooks/useInterviewTranscription';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InterviewTranscriptionPanelProps {
  transcriptions: TranscriptionSegment[];
  isTranscribing: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

export function InterviewTranscriptionPanel({
  transcriptions,
  isTranscribing,
  error,
  onStart,
  onStop,
}: InterviewTranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Transcrição ao Vivo</h3>
        {isTranscribing ? (
          <Button size="sm" variant="destructive" onClick={onStop}>
            <MicOff className="h-4 w-4 mr-1" />
            Parar
          </Button>
        ) : (
          <Button size="sm" onClick={onStart}>
            <Mic className="h-4 w-4 mr-1" />
            Iniciar Transcrição
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {transcriptions.length === 0 && !isTranscribing && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Clique em "Iniciar Transcrição" para começar. Você precisará compartilhar a aba do Google Meet.
          </p>
        )}

        {isTranscribing && transcriptions.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Aguardando áudio...</span>
          </div>
        )}

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
      </ScrollArea>
    </div>
  );
}
