import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GoalMetric = "leads" | "agendamentos" | "vendas" | "receita";
export type GoalRole = "SDR" | "Closer";

export interface Goal {
  id: string;
  period: string;
  member_name: string | null; // null = meta geral
  role: GoalRole | null;
  metric: GoalMetric;
  target: number;
}

export interface GoalUpsert {
  period: string;
  member_name: string | null;
  role: GoalRole | null;
  metric: GoalMetric;
  target: number;
}

export function useGoals(period: string) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("period", period)
      .order("member_name", { ascending: true });

    if (error) {
      console.error("Error fetching goals:", error);
    } else {
      setGoals((data as Goal[]) ?? []);
    }
    setIsLoading(false);
  }, [period]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const upsert = useCallback(
    async (payload: GoalUpsert) => {
      const { error } = await supabase.from("goals").upsert(
        { ...payload },
        { onConflict: "period,member_name,metric" }
      );
      if (error) {
        toast.error("Erro ao salvar meta");
        console.error(error);
      } else {
        toast.success("Meta salva!");
        fetch();
      }
    },
    [fetch]
  );

  /** Helper: get target for a specific member+metric (or global when member_name=null) */
  const getTarget = useCallback(
    (member_name: string | null, metric: GoalMetric): number => {
      return (
        goals.find(
          (g) => g.member_name === member_name && g.metric === metric
        )?.target ?? 0
      );
    },
    [goals]
  );

  return { goals, isLoading, upsert, getTarget, refetch: fetch };
}
