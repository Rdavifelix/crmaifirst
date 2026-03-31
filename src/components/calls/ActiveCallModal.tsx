import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PhoneOff, Mic, MicOff, User, MessageSquareText } from 'lucide-react';
import { useCallContext } from '@/contexts/CallContext';
import { useEffect, useRef } from 'react';
import { SalesCoachOverlay } from './SalesCoachOverlay';

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const statusLabels: Record<string, string> = {
  connecting: 'Conectando...',
  ringing: 'Chamando...',
  connected: 'Em chamada',
};

export function ActiveCallModal() {
  const { activeCall, showActiveCallModal, endCall, toggleMute, callStatus, transcriptions, selectedPlaybook, salesCoach } = useCallContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  if (!showActiveCallModal || !activeCall) return null;

  const finalTranscriptions = transcriptions.filter(t => t.is_final);
  const partialTranscriptions = transcriptions.filter(t => !t.is_final);
  const hasCoach = !!selectedPlaybook;

  return (
    <Dialog open={showActiveCallModal} onOpenChange={() => {}}>
      <DialogContent className={`${hasCoach ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`} onPointerDownOutside={(e) => e.preventDefault()} aria-describedby={undefined}>
        <VisuallyHidden><DialogTitle>Chamada em andamento</DialogTitle></VisuallyHidden>
        
        <div className={`flex ${hasCoach ? 'gap-4' : ''}`}>
          {/* Main call panel */}
          <div className={`flex flex-col items-center gap-4 py-4 ${hasCoach ? 'flex-1 min-w-0' : 'w-full'}`}>
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ${callStatus === 'ringing' ? 'animate-pulse' : ''}`}>
              <User className="h-8 w-8 text-primary" />
            </div>

            {/* Peer info */}
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {activeCall.peerName || activeCall.peerPhone}
              </h3>
              {activeCall.peerName && (
                <p className="text-sm text-muted-foreground">{activeCall.peerPhone}</p>
              )}
            </div>

            {/* Status */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {statusLabels[callStatus] || callStatus}
              </p>
              {callStatus === 'connected' && (
                <p className="text-2xl font-mono font-bold mt-1">
                  {formatDuration(activeCall.duration)}
                </p>
              )}
            </div>

            {/* Transcription Panel */}
            {callStatus === 'connected' && (
              <div className="w-full border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 px-3 py-2 border-b">
                  <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Transcrição em tempo real</span>
                </div>
                <ScrollArea className="h-40 w-full">
                  <div ref={scrollRef} className="p-3 space-y-2 text-sm">
                    {finalTranscriptions.length === 0 && partialTranscriptions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center italic">
                        Aguardando fala...
                      </p>
                    )}
                    {finalTranscriptions.map((t) => (
                      <div key={t.id} className="flex gap-2">
                        <span className={`font-semibold text-xs shrink-0 ${t.speakerType === 'local' ? 'text-primary' : 'text-green-600'}`}>
                          {t.speaker}:
                        </span>
                        <span className="text-foreground">{t.text}</span>
                      </div>
                    ))}
                    {partialTranscriptions.map((t) => (
                      <div key={`partial-${t.id}`} className="flex gap-2 opacity-50">
                        <span className={`font-semibold text-xs shrink-0 ${t.speakerType === 'local' ? 'text-primary' : 'text-green-600'}`}>
                          {t.speaker}:
                        </span>
                        <span className="text-foreground italic">{t.text}...</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={toggleMute}
                disabled={callStatus !== 'connected'}
              >
                {activeCall.isMuted ? (
                  <MicOff className="h-6 w-6 text-destructive" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>

              <Button
                variant="destructive"
                size="icon"
                className="h-16 w-16 rounded-full"
                onClick={endCall}
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
            </div>
          </div>

          {/* Sales Coach Overlay */}
          {hasCoach && callStatus === 'connected' && (
            <div className="w-72 shrink-0">
              <SalesCoachOverlay
                currentPhase={salesCoach.currentPhase}
                currentPhaseIndex={salesCoach.currentPhaseIndex}
                totalPhases={salesCoach.totalPhases}
                phaseChecklist={salesCoach.phaseChecklist}
                alerts={salesCoach.alerts}
                suggestion={salesCoach.suggestion}
                isAnalyzing={salesCoach.isAnalyzing}
                phaseCelebration={salesCoach.phaseCelebration}
                phaseProgress={salesCoach.phaseProgress}
                overallProgress={salesCoach.overallProgress}
                onDismissAlert={salesCoach.dismissAlert}
                onAdvancePhase={salesCoach.manualAdvancePhase}
                onGoBackPhase={salesCoach.manualGoBackPhase}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
