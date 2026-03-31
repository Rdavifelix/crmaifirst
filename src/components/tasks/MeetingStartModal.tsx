import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, ExternalLink, AlertTriangle, Mic, Loader2 } from 'lucide-react';
import { LeadTask } from '@/hooks/useLeadTasks';
import { toast } from 'sonner';

interface CapturedStreams {
  mic: MediaStream;
  display: MediaStream | null;
}

interface MeetingStartModalProps {
  open: boolean;
  onClose: () => void;
  task: LeadTask | null;
  leadName: string | null;
  onStartTranscription: (streams: CapturedStreams) => void;
}

export function MeetingStartModal({ open, onClose, task, leadName, onStartTranscription }: MeetingStartModalProps) {
  const [meetOpened, setMeetOpened] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleOpenMeet = () => {
    if (task?.meet_link) {
      window.open(task.meet_link, '_blank');
      setMeetOpened(true);
    }
  };

  const handleSkipMeet = () => {
    setMeetOpened(true);
  };

  const handleStartTranscription = async () => {
    setIsCapturing(true);
    try {
      // Capture streams IMMEDIATELY from user gesture
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });

      let display: MediaStream | null = null;
      try {
        display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } catch {
        toast.warning('Captura de aba cancelada. Apenas o microfone será transcrito.');
      }

      // Pass captured streams and close this modal
      onStartTranscription({ mic, display });
    } catch (err: any) {
      toast.error('Erro ao capturar áudio: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClose = () => {
    setMeetOpened(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Iniciar Reunião - {leadName || 'Lead'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Step 1 - Open Google Meet */}
          <div className={`space-y-3 p-4 rounded-xl border-2 transition-all ${!meetOpened ? 'border-primary bg-primary/5' : 'border-border opacity-60'}`}>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Abra o Google Meet</h4>
                <p className="text-xs text-muted-foreground">
                  Primeiro, vamos abrir a reunião em uma nova aba
                </p>
              </div>
            </div>

            {task?.meet_link && (
              <Button
                onClick={handleOpenMeet}
                className="w-full gap-2"
                variant={meetOpened ? 'outline' : 'default'}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir Google Meet
              </Button>
            )}

            {!meetOpened && (
              <button
                onClick={handleSkipMeet}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Já abri o Meet, pular
              </button>
            )}
          </div>

          {/* Step 2 - Start Transcription */}
          <div className={`space-y-3 p-4 rounded-xl border-2 transition-all ${meetOpened ? 'border-primary bg-primary/5' : 'border-border opacity-40'}`}>
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${meetOpened ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Inicie a Transcrição</h4>
                <p className="text-xs text-muted-foreground">
                  Clique abaixo e <strong>compartilhe a aba do Meet</strong>
                </p>
              </div>
            </div>

            {meetOpened && (
              <>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="text-xs">
                    Marque "Compartilhar áudio" ao selecionar a aba!
                  </span>
                </div>

                <Button
                  onClick={handleStartTranscription}
                  className="w-full gap-2"
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  Iniciar Transcrição
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
