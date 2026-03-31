import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TranscriptionSegment } from '@/contexts/CallContext';
import { toast } from 'sonner';

export interface SalesCallAnalysis {
  diagnostico: string;
  pontos_chave: string[];
  riscos: string[];
  proximo_passo: string;
  sentimento: 'positive' | 'neutral' | 'negative';
  tarefas_sugeridas: Array<{
    titulo: string;
    prioridade: 'high' | 'medium' | 'low';
    descricao: string;
  }>;
  dados_extraidos: {
    empresa?: string | null;
    cargo?: string | null;
    necessidade?: string | null;
    orcamento?: string | null;
    timeline?: string | null;
    decisor?: string | null;
  };
}

export function useAnalyzeSalesCall() {
  const [analysis, setAnalysis] = useState<SalesCallAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (
    transcriptions: TranscriptionSegment[],
    callHistoryId?: string,
    leadId?: string,
    meetingId?: string,
  ) => {
    if (transcriptions.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get lead context if available
      let leadContext = null;
      if (leadId) {
        const { data } = await supabase.from('leads')
          .select('name, phone, email, status, deal_value')
          .eq('id', leadId)
          .single();
        if (data) leadContext = data;
      }

      const { data, error: fnError } = await supabase.functions.invoke('analyze-sales-call', {
        body: { transcriptions, leadContext },
      });

      if (fnError) throw fnError;

      setAnalysis(data);

      // Save to call_history
      if (callHistoryId && data) {
        await supabase.from('call_history').update({
          ai_summary: data.diagnostico,
          ai_sentiment: data.sentimento,
          ai_key_points: data.pontos_chave as unknown as any,
          ai_suggested_tasks: data.tarefas_sugeridas as unknown as any,
          ai_processed_at: new Date().toISOString(),
          metadata: { ai_analysis: data } as unknown as any,
        }).eq('id', callHistoryId);
      }

      // Save to lead_meetings
      if (meetingId && data) {
        await supabase.from('lead_meetings' as any).update({
          ai_summary: data.diagnostico,
          ai_sentiment: data.sentimento,
          ai_key_points: data.pontos_chave,
        }).eq('id', meetingId);
      }

    } catch (err: any) {
      const msg = err?.message || 'Erro ao analisar chamada';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analysis, isAnalyzing, error, analyze };
}
