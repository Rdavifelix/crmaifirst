import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';

interface InterviewAnalysis {
  nota_geral: number;
  comunicacao: number;
  conhecimento_tecnico: number;
  postura_profissional: number;
  adequacao_vaga: number;
  pontos_fortes: string[];
  pontos_fracos: string[];
  recomendacao: string;
  resumo: string;
  perguntas_nao_respondidas?: string[];
}

interface InterviewEndedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: InterviewAnalysis | null;
  candidateName: string;
}

const recColors: Record<string, string> = {
  Contratar: 'bg-green-500/10 text-green-600',
  Considerar: 'bg-yellow-500/10 text-yellow-600',
  'Nao recomendado': 'bg-red-500/10 text-red-600',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function InterviewEndedModal({ open, onOpenChange, analysis, candidateName }: InterviewEndedModalProps) {
  if (!analysis) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Avaliação: {candidateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score + Recommendation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-foreground">
                {analysis.nota_geral.toFixed(1)}
              </div>
              <span className="text-muted-foreground text-sm">/10</span>
            </div>
            <Badge className={recColors[analysis.recomendacao] || ''} variant="outline">
              {analysis.recomendacao}
            </Badge>
          </div>

          {/* Summary */}
          <p className="text-sm text-muted-foreground">{analysis.resumo}</p>

          {/* Score Bars */}
          <div className="space-y-3">
            <ScoreBar label="Comunicação" value={analysis.comunicacao} />
            <ScoreBar label="Conhecimento Técnico" value={analysis.conhecimento_tecnico} />
            <ScoreBar label="Postura Profissional" value={analysis.postura_profissional} />
            <ScoreBar label="Adequação à Vaga" value={analysis.adequacao_vaga} />
          </div>

          {/* Strengths */}
          {analysis.pontos_fortes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1 mb-2">
                <ThumbsUp className="h-4 w-4 text-green-500" /> Pontos Fortes
              </h4>
              <ul className="space-y-1">
                {analysis.pontos_fortes.map((p, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {analysis.pontos_fracos.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1 mb-2">
                <ThumbsDown className="h-4 w-4 text-red-500" /> Pontos Fracos
              </h4>
              <ul className="space-y-1">
                {analysis.pontos_fracos.map((p, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Unanswered questions */}
          {analysis.perguntas_nao_respondidas && analysis.perguntas_nao_respondidas.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" /> Perguntas Não Respondidas
              </h4>
              <ul className="space-y-1">
                {analysis.perguntas_nao_respondidas.map((p, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
