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
      // Cannot use onConflict with NULL member_name (unique index uses COALESCE).
      // So we do a manual select → update/insert.
      let query = supabase
        .from("goals")
        .select("id")
        .eq("period", payload.period)
        .eq("metric", payload.metric);

      if (payload.member_name === null) {
        query = query.is("member_name", null);
      } else {
        query = query.eq("member_name", payload.member_name);
      }

      const { data: existing } = await query.maybeSingle();

      let error;
      if (existing) {
        ({ error } = await supabase
          .from("goals")
          .update({ target: payload.target, role: payload.role })
          .eq("id", existing.id));
      } else {
        ({ error } = await supabase.from("goals").insert(payload));
      }

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

  const deleteGoal = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) {
        toast.error("Erro ao excluir meta");
        console.error(error);
      } else {
        toast.success("Meta excluída!");
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

  return { goals, isLoading, upsert, deleteGoal, getTarget, refetch: fetch };
}

export function useGoalsMultiPeriod(periods: string[]) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (periods.length === 0) {
      setGoals([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .in("period", periods)
      .order("period", { ascending: true })
      .order("member_name", { ascending: true });

    if (error) {
      console.error("Error fetching goals:", error);
    } else {
      setGoals((data as Goal[]) ?? []);
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(periods)]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { goals, isLoading, refetch: fetch };
}
