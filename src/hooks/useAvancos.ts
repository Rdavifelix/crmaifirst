import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Etapa {
  key: string;
  label: string;
  icon: string;
  done: boolean;
}

export interface Avanco {
  id: string;
  lead_nome: string;
  lead_empresa: string;
  lead_telefone: string;
  lead_email: string;
  closer_name: string;
  sdr_name: string;
  lead_scoring: number;
  valor: number;
  data_limite: string | null;
  funil: string;
  etapas: Etapa[];
  status: string;
  created_at: string;
  updated_at: string;
}

export function useAvancos() {
  const [avancos, setAvancos] = useState<Avanco[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAvancos = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("avancos")
      .select("*")
      .eq("status", "ativo")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAvancos(
        data.map((d: Record<string, unknown>) => ({
          ...d,
          etapas: (d.etapas as Etapa[]) || [],
        })) as Avanco[]
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAvancos(); }, [fetchAvancos]);

  const createAvanco = useCallback(async (avanco: Partial<Avanco>) => {
    const { error } = await supabase.from("avancos").insert(avanco as any);
    if (!error) await fetchAvancos();
    return error;
  }, [fetchAvancos]);

  const updateAvanco = useCallback(async (id: string, updates: Partial<Avanco>) => {
    const { error } = await supabase
      .from("avancos")
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (!error) await fetchAvancos();
    return error;
  }, [fetchAvancos]);

  const deleteAvanco = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("avancos")
      .update({ status: "concluido", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) await fetchAvancos();
    return error;
  }, [fetchAvancos]);

  return { avancos, isLoading, createAvanco, updateAvanco, deleteAvanco, refetch: fetchAvancos };
}
