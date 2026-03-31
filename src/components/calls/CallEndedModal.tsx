import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, Loader2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useCallContext } from '@/contexts/CallContext';
import { useAnalyzeSalesCall } from '@/hooks/useAnalyzeSalesCall';
import { SalesAnalysisResult } from './SalesAnalysisResult';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};


export function CallEndedModal() {
  const { callEndedResult, showCallEndedModal, setShowCallEndedModal } = useCallContext();
  const { analysis, isAnalyzing, analyze } = useAnalyzeSalesCall();
  const [showTranscription, setShowTranscription] = useState(false);

  // Auto-analyze when modal opens with transcriptions
  useEffect(() => {
    if (showCallEndedModal && callEndedResult?.transcriptions?.length) {
      analyze(
        callEndedResult.transcriptions,
        callEndedResult.callId,
        callEndedResult.leadId,
      );
    }
  }, [showCallEndedModal, callEndedResult]);

  if (!showCallEndedModal || !callEndedResult) return null;

  const handleClose = () => setShowCallEndedModal(false);
  const hasTranscriptions = callEndedResult.transcriptions.length > 0;

  return (
    <Dialog open={showCallEndedModal} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Chamada encerrada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Call info */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">
                {callEndedResult.peerName || callEndedResult.peerPhone}
              </p>
              {callEndedResult.peerName && (
                <p className="text-sm text-muted-foreground">{callEndedResult.peerPhone}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {callEndedResult.direction === 'OUTGOING' ? 'Chamada realizada' : 'Chamada recebida'}
              </p>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatDuration(callEndedResult.duration)}</span>
            </div>
          </div>

          {/* AI Analysis */}
          {isAnalyzing && (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Analisando chamada com IA...</span>
            </div>
          )}

          {analysis && <SalesAnalysisResult analysis={analysis} leadId={callEndedResult.leadId} />}

          {/* Coach Performance Summary */}
          {callEndedResult.coachSessionId && (
            <CoachSummary sessionId={callEndedResult.coachSessionId} />
          )}

          {!hasTranscriptions && !isAnalyzing && !analysis && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sem transcrição disponível para análise.
            </p>
          )}

          {/* Transcription */}
          {hasTranscriptions && (
            <div>
              <button
                onClick={() => setShowTranscription(!showTranscription)}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
              >
                {showTranscription ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Transcrição ({callEndedResult.transcriptions.length} segmentos)
              </button>
              {showTranscription && (
                <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-lg bg-muted/30 text-sm mt-2">
                  {callEndedResult.transcriptions.map((t) => (
                    <div key={t.id} className={t.speakerType === 'local' ? 'text-primary' : 'text-foreground'}>
                      <span className="font-medium">{t.speaker}:</span> {t.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button onClick={handleClose} className="w-full">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function CoachSummary({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('coach_sessions').select('*').eq('id', sessionId).single();
      if (data) setSession(data);
    };
    fetch();
  }, [sessionId]);

  if (!session) return null;

  const checklist = (session.checklist_state as boolean[][] | null) || [];
  const totalItems = checklist.flat().length;
  const completedItems = checklist.flat().filter(Boolean).length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="p-3 rounded-lg border bg-primary/5 space-y-2">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Desempenho no Playbook</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-primary">{completionRate}%</p>
          <p className="text-[10px] text-muted-foreground">Conclusão</p>
        </div>
        <div>
          <p className="text-lg font-bold">{session.phases_completed || 0}</p>
          <p className="text-[10px] text-muted-foreground">Fases completas</p>
        </div>
        <div>
          <p className="text-lg font-bold text-destructive">{session.alerts_triggered || 0}</p>
          <p className="text-[10px] text-muted-foreground">Alertas</p>
        </div>
      </div>
    </div>
  );
}
