import { useState } from 'react';
import { Lead } from '@/hooks/useLeads';
import { LeadIntelligence } from '@/hooks/useLeadIntelligence';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LEAD_STATUSES, LeadStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  Send, 
  Calendar, 
  Phone, 
  CheckCircle2, 
  Circle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useLeadMessages, useLeadStatusHistory, useLeadPostSaleStages } from '@/hooks/useLeads';

interface AICopilotPanelProps {
  lead: Lead;
  intelligence: LeadIntelligence;
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenDetails: () => void;
}

interface AIAnalysis {
  healthScore?: number;
  engagementLabel?: string;
  nextBestAction?: string;
  predictedOutcomeLabel?: string;
  recommendations?: string[];
  attentionPoints?: string[];
}

// Funnel stages definition
const FUNNEL_STAGES = [
  { key: 'new', label: 'Novo Lead' },
  { key: 'first_contact', label: 'Primeiro Contacto' },
  { key: 'negotiating', label: 'Em Negociação' },
  { key: 'proposal_sent', label: 'Proposta Enviada' },
  { key: 'follow_up', label: 'Follow-up' },
  { key: 'won', label: 'Ganho' },
];

export function AICopilotPanel({ 
  lead, 
  intelligence, 
  isCollapsed,
  onToggle,
  onOpenDetails 
}: AICopilotPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const { data: messages } = useLeadMessages(lead.id);
  const { data: statusHistory } = useLeadStatusHistory(lead.id);
  const { data: postSaleStages } = useLeadPostSaleStages(lead.id);

  const currentStageIndex = FUNNEL_STAGES.findIndex(s => s.key === lead.status);

  const analyzeNow = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-lead', {
        body: {
          lead,
          messages: messages?.slice(-10),
          statusHistory,
          postSaleStages,
        },
      });

      if (error) throw error;
      setAnalysis(data);
      setHasAnalyzed(true);
    } catch {
      // Analysis failed silently
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-l bg-card/50 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={onToggle}
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          {analysis && (
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                analysis.healthScore && analysis.healthScore >= 70 
                  ? "bg-green-500/20 text-green-500"
                  : analysis.healthScore && analysis.healthScore >= 40
                  ? "bg-yellow-500/20 text-yellow-500"
                  : "bg-red-500/20 text-red-500"
              )}
            >
              {analysis.healthScore || '?'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="border-l bg-card/50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Copiloto de IA</h3>
        </div>
        <div className="flex items-center gap-2">
          {!hasAnalyzed && (
            <Button
              size="sm"
              onClick={analyzeNow}
              disabled={isAnalyzing}
              className="gap-1.5"
            >
              {isAnalyzing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Analisar
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Engagement & Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 bg-muted/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Engajamento
              </p>
              <p className="text-lg font-bold">
                {analysis?.engagementLabel || intelligence.temperatureLabel}
              </p>
            </Card>
            <Card className="p-3 bg-muted/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Status
              </p>
              <p className="text-sm font-medium">
                {LEAD_STATUSES[lead.status as LeadStatus]?.label}
              </p>
            </Card>
          </div>

          {/* Funnel Stage */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Circle className="h-3 w-3" />
              Etapa do Funil
            </p>
            <div className="space-y-1">
              {FUNNEL_STAGES.map((stage, index) => {
                const isComplete = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isPending = index > currentStageIndex;

                return (
                  <div
                    key={stage.key}
                    className={cn(
                      "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors",
                      isCurrent && "bg-primary/10 border border-primary/30",
                      isComplete && "opacity-60"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isComplete && "bg-green-500",
                      isCurrent && "bg-primary",
                      isPending && "bg-muted-foreground/30"
                    )} />
                    <span className={cn(
                      "text-sm",
                      isCurrent && "font-medium text-primary"
                    )}>
                      {stage.label}
                    </span>
                    {isCurrent && lead.status === 'negotiating' && (
                      <Badge variant="outline" className="ml-auto text-[10px] text-yellow-500 border-yellow-500/30">
                        <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                        Ativo
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Best Actions */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Zap className="h-3 w-3" />
              Próxima Melhor Ação
            </p>
            <div className="space-y-2">
              {analysis?.nextBestAction ? (
                <Button
                  variant="outline"
                  className="w-full justify-between group hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  onClick={onOpenDetails}
                >
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    <span className="truncate">{analysis.nextBestAction}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-between group hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  >
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span>Enviar Follow-up</span>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-between group hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Agendar Reunião</span>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Attention Points */}
          {analysis?.attentionPoints && analysis.attentionPoints.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Pontos de Atenção
              </p>
              <div className="space-y-2">
                {analysis.attentionPoints.map((point, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-2 text-sm p-2 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health Score */}
          {analysis?.healthScore !== undefined && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Score de Saúde
              </p>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold",
                  analysis.healthScore >= 70 
                    ? "bg-green-500/20 text-green-500"
                    : analysis.healthScore >= 40
                    ? "bg-yellow-500/20 text-yellow-500"
                    : "bg-red-500/20 text-red-500"
                )}>
                  {analysis.healthScore}
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        analysis.healthScore >= 70 
                          ? "bg-green-500"
                          : analysis.healthScore >= 40
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      )}
                      style={{ width: `${analysis.healthScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis.predictedOutcomeLabel || 'Análise completa'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CTA to analyze */}
          {!hasAnalyzed && (
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Insight Pronto</p>
                  <p className="text-xs text-muted-foreground">Clique para analisar o lead</p>
                </div>
              </div>
              <Button
                onClick={analyzeNow}
                disabled={isAnalyzing}
                className="w-full gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Gerar Análise de IA
                  </>
                )}
              </Button>
            </Card>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
