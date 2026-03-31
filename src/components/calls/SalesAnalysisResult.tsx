import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, TrendingUp, AlertTriangle, Plus, Loader2, Check } from 'lucide-react';
import { SalesCallAnalysis } from '@/hooks/useAnalyzeSalesCall';
import { useCreateLeadTask } from '@/hooks/useLeadTasks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const sentimentConfig = {
  positive: { label: 'Positivo', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  neutral: { label: 'Neutro', color: 'bg-muted text-muted-foreground', icon: TrendingUp },
  negative: { label: 'Negativo', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

interface SalesAnalysisResultProps {
  analysis: SalesCallAnalysis;
  leadId?: string;
}

export function SalesAnalysisResult({ analysis, leadId }: SalesAnalysisResultProps) {
  const sentiment = sentimentConfig[analysis.sentimento] || sentimentConfig.neutral;
  const SentimentIcon = sentiment.icon;

  return (
    <div className="space-y-4">
      {/* Sentiment + Diagnostico */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={sentiment.color}>
            <SentimentIcon className="h-3 w-3 mr-1" />
            {sentiment.label}
          </Badge>
        </div>
        <p className="text-sm">{analysis.diagnostico}</p>
      </div>

      {/* Key points */}
      {analysis.pontos_chave.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-1">Pontos-chave</h4>
          <ul className="text-sm space-y-1">
            {analysis.pontos_chave.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {analysis.riscos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-1 text-destructive">Riscos</h4>
          <ul className="text-sm space-y-1">
            {analysis.riscos.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next step */}
      {analysis.proximo_passo && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <h4 className="text-sm font-medium mb-1">Próximo passo</h4>
          <p className="text-sm">{analysis.proximo_passo}</p>
        </div>
      )}

      {/* Suggested tasks */}
      {analysis.tarefas_sugeridas.length > 0 && (
        <SuggestedTasksList tasks={analysis.tarefas_sugeridas} leadId={leadId} />
      )}

      {/* Extracted data */}
      {analysis.dados_extraidos && Object.values(analysis.dados_extraidos).some(v => v) && (
        <div>
          <h4 className="text-sm font-medium mb-1">Dados extraídos</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {analysis.dados_extraidos.empresa && (
              <div><span className="text-muted-foreground">Empresa:</span> {analysis.dados_extraidos.empresa}</div>
            )}
            {analysis.dados_extraidos.cargo && (
              <div><span className="text-muted-foreground">Cargo:</span> {analysis.dados_extraidos.cargo}</div>
            )}
            {analysis.dados_extraidos.orcamento && (
              <div><span className="text-muted-foreground">Orçamento:</span> {analysis.dados_extraidos.orcamento}</div>
            )}
            {analysis.dados_extraidos.timeline && (
              <div><span className="text-muted-foreground">Timeline:</span> {analysis.dados_extraidos.timeline}</div>
            )}
            {analysis.dados_extraidos.decisor && (
              <div><span className="text-muted-foreground">Decisor:</span> {analysis.dados_extraidos.decisor}</div>
            )}
            {analysis.dados_extraidos.necessidade && (
              <div className="col-span-2"><span className="text-muted-foreground">Necessidade:</span> {analysis.dados_extraidos.necessidade}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for creating suggested tasks
function SuggestedTasksList({ tasks, leadId }: { 
  tasks: SalesCallAnalysis['tarefas_sugeridas']; 
  leadId?: string;
}) {
  const createTask = useCreateLeadTask();
  const [createdIndexes, setCreatedIndexes] = useState<Set<number>>(new Set());
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const handleCreateTask = async (task: SalesCallAnalysis['tarefas_sugeridas'][0], index: number) => {
    if (!leadId) {
      toast.error('Lead não identificado');
      return;
    }

    setLoadingIndex(index);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      await createTask.mutateAsync({
        lead_id: leadId,
        profile_id: profile.id,
        type: 'task',
        title: task.titulo,
        description: task.descricao || undefined,
        priority: task.prioridade,
      });

      setCreatedIndexes(prev => new Set(prev).add(index));
      toast.success('Tarefa criada!');
    } catch (err: any) {
      toast.error('Erro ao criar tarefa: ' + err.message);
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Tarefas sugeridas</h4>
      <div className="space-y-2">
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
            <Badge variant={t.prioridade === 'high' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
              {t.prioridade === 'high' ? 'Alta' : t.prioridade === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
            <span className="flex-1">{t.titulo}</span>
            {leadId && (
              createdIndexes.has(i) ? (
                <Check className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0"
                  disabled={loadingIndex === i}
                  onClick={() => handleCreateTask(t, i)}
                >
                  {loadingIndex === i ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </Button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
