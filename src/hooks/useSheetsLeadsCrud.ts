import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SheetsLead {
  id: string;
  origem: string;
  instagram: string;
  email: string;
  nome: string;
  telefone: string;
  faturamento: string;
  profissao: string;
  mql: string;
  socio: string;
  lead_scoring: string;
  data_cadastro: string | null;
  data_contato: string | null;
  data_agendamento: string | null;
  data_call: string | null;
  hora_call: string;
  sdr: string;
  status_call: string;
  status_venda: string;
  motivo_noshow: string;
  cash_collected: number;
  valor_total: number;
  closer: string;
  produto_vendido: string;
  valor_oportunidade: number;
  data_conclusao: string | null;
  razao_perda: string;
  link_reuniao: string;
  observacoes: string;
  data_2call: string | null;
  hora_2call: string;
  status_call_2: string;
  status_venda_2: string;
  motivo_noshow_2: string;
  cash_collected_2: number;
  valor_total_2: number;
  ad_name_email: string;
  ad_name_telefone: string;
  row_hash: string;
  imported_at: string;
  updated_at: string;
}

export type SheetsLeadInsert = Omit<SheetsLead, "id" | "row_hash" | "imported_at" | "updated_at">;

const QUERY_KEY = ["sheets_leads"];

export function useSheetsLeads() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sheets_leads")
        .select("*")
        .order("data_cadastro", { ascending: false });
      if (error) throw error;
      return data as SheetsLead[];
    },
  });
}

export function useCreateSheetsLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Partial<SheetsLeadInsert>) => {
      // Compute row_hash client-side
      const hashInput = `${lead.email ?? ""}|${lead.telefone ?? ""}|${lead.data_cadastro ?? ""}|${lead.closer ?? ""}|${lead.data_call ?? ""}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
      const row_hash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const { data, error } = await supabase
        .from("sheets_leads")
        .insert({ ...lead, row_hash })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Lead criado com sucesso!");
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => {
      toast.error("Erro ao criar lead");
      console.error(err);
    },
  });
}

export function useUpdateSheetsLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SheetsLead> & { id: string }) => {
      // Recompute row_hash if key fields changed
      if (updates.email !== undefined || updates.telefone !== undefined || updates.data_cadastro !== undefined || updates.closer !== undefined || updates.data_call !== undefined) {
        // Need current values for fields not in updates
        const { data: current } = await supabase.from("sheets_leads").select("email,telefone,data_cadastro,closer,data_call").eq("id", id).single();
        const merged = { ...current, ...updates };
        const hashInput = `${merged.email ?? ""}|${merged.telefone ?? ""}|${merged.data_cadastro ?? ""}|${merged.closer ?? ""}|${merged.data_call ?? ""}`;
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
        updates.row_hash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }

      const { data, error } = await supabase
        .from("sheets_leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Lead atualizado!");
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar lead");
      console.error(err);
    },
  });
}

export function useDeleteSheetsLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sheets_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead excluído!");
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => {
      toast.error("Erro ao excluir lead");
      console.error(err);
    },
  });
}
