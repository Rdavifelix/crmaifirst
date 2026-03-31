import { CheckCircle2, Circle, AlertTriangle, Lightbulb, ChevronRight, ChevronLeft, Sparkles, Loader2, ShieldAlert } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CoachAlert, CoachSuggestion } from '@/hooks/useSalesCoach';
import { PlaybookPhase } from '@/hooks/usePlaybooks';
import { motion, AnimatePresence } from 'framer-motion';

interface SalesCoachOverlayProps {
  currentPhase: PlaybookPhase | null;
  currentPhaseIndex: number;
  totalPhases: number;
  phaseChecklist: boolean[];
  alerts: CoachAlert[];
  suggestion: CoachSuggestion | null;
  isAnalyzing: boolean;
  phaseCelebration: boolean;
  phaseProgress: number;
  overallProgress: number;
  onDismissAlert: (id: string) => void;
  onAdvancePhase: () => void;
  onGoBackPhase: () => void;
}

export function SalesCoachOverlay({
  currentPhase,
  currentPhaseIndex,
  totalPhases,
  phaseChecklist,
  alerts,
  suggestion,
  isAnalyzing,
  phaseCelebration,
  phaseProgress,
  overallProgress,
  onDismissAlert,
  onAdvancePhase,
  onGoBackPhase,
}: SalesCoachOverlayProps) {
  if (!currentPhase) return null;

  const allDone = currentPhaseIndex >= totalPhases;

  return (
    <div className="w-full border rounded-lg bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Sales Coach</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onGoBackPhase} disabled={currentPhaseIndex <= 0}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs font-medium text-muted-foreground">
            {allDone ? 'Completo!' : `${currentPhaseIndex + 1}/${totalPhases}`}
          </span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onAdvancePhase} disabled={currentPhaseIndex >= totalPhases - 1}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Phase celebration */}
      <AnimatePresence>
        {phaseCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-3 py-2 bg-primary/20 text-center"
          >
            <span className="text-xs font-bold text-primary">🎉 Fase concluída! Avançando...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!allDone && (
        <ScrollArea className="max-h-52">
          <div className="p-3 space-y-3">
            {/* Phase name + progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{currentPhase.name}</span>
                <span className="text-[10px] text-muted-foreground">{phaseProgress}%</span>
              </div>
              <Progress value={phaseProgress} className="h-1.5" />
            </div>

            {/* Checklist */}
            <div className="space-y-1">
              {currentPhase.checklist.map((item, idx) => {
                const done = phaseChecklist[idx];
                const isNext = !done && phaseChecklist.slice(0, idx).every(Boolean);
                return (
                  <motion.div
                    key={idx}
                    layout
                    className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                      done
                        ? 'bg-primary/10 text-primary'
                        : isNext
                        ? 'bg-accent/10 font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {done ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      </motion.div>
                    ) : (
                      <Circle className={`h-3.5 w-3.5 shrink-0 ${isNext ? 'text-primary/50' : 'text-muted-foreground/40'}`} />
                    )}
                    <span className={done ? 'line-through opacity-70' : ''}>{item.label}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Alerts — critical in RED, warning in amber */}
            <AnimatePresence>
              {alerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => onDismissAlert(alert.id)}
                    className={`flex items-start gap-2 p-2 rounded-md cursor-pointer ${
                      isCritical
                        ? 'bg-destructive/20 border-2 border-destructive animate-pulse shadow-lg shadow-destructive/20'
                        : 'bg-destructive/10 border border-destructive/30 animate-pulse'
                    }`}
                  >
                    {isCritical ? (
                      <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <span className={`text-xs font-medium leading-tight ${
                      isCritical ? 'text-destructive font-bold' : 'text-destructive'
                    }`}>{alert.message}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* AI Suggestion */}
            {suggestion && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-xs text-muted-foreground leading-tight">{suggestion.text}</span>
              </div>
            )}

            {/* Analyzing indicator */}
            {isAnalyzing && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analisando...</span>
              </div>
            )}

            {/* Tips */}
            {currentPhase.tips && !suggestion && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                <Lightbulb className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-[10px] text-muted-foreground italic leading-tight">{currentPhase.tips}</span>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Overall progress footer */}
      <div className="px-3 py-1.5 border-t bg-muted/20">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Progresso geral</span>
          <span className="font-medium">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-1 mt-0.5" />
      </div>
    </div>
  );
}
