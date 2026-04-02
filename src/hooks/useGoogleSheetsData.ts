import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LeadRow, MetaAdveronixRow, LeadsGhlRow, GhlLeadsTabRow,
} from "@/config/sheets";
import { parseDate } from "@/config/sheets";

export interface SheetsData {
  leads: LeadRow[];
  metaAdveronix: MetaAdveronixRow[];
  leadsGhl: LeadsGhlRow[];
  ghlLeadsTab: GhlLeadsTabRow[];
  lastUpdated: Date | null;
  isLoading: boolean;
}

// ── Mappers: Supabase snake_case → frontend camelCase interfaces ────────────

function mapLead(r: Record<string, unknown>): LeadRow {
  return {
    origem: (r.origem as string) ?? "",
    instagram: (r.instagram as string) ?? "",
    email: (r.email as string) ?? "",
    nome: (r.nome as string) ?? "",
    telefone: (r.telefone as string) ?? "",
    faturamento: (r.faturamento as string) ?? "",
    profissao: (r.profissao as string) ?? "",
    mql: (r.mql as string) ?? "",
    socio: (r.socio as string) ?? "",
    leadScoring: (r.lead_scoring as string) ?? "",
    dataCadastro: parseDate(r.data_cadastro as string),
    dataContato: parseDate(r.data_contato as string),
    dataAgendamento: parseDate(r.data_agendamento as string),
    dataCall: parseDate(r.data_call as string),
    horaCall: (r.hora_call as string) ?? "",
    sdr: (r.sdr as string) ?? "",
    statusCall: (r.status_call as string) ?? "",
    statusVenda: (r.status_venda as string) ?? "",
    motivoNoshow: (r.motivo_noshow as string) ?? "",
    cashCollected: Number(r.cash_collected) || 0,
    valorTotal: Number(r.valor_total) || 0,
    closer: (r.closer as string) ?? "",
    produtoVendido: (r.produto_vendido as string) ?? "",
    valorOportunidade: Number(r.valor_oportunidade) || 0,
    dataConclusao: parseDate(r.data_conclusao as string),
    razaoPerda: (r.razao_perda as string) ?? "",
    linkReuniao: (r.link_reuniao as string) ?? "",
    observacoes: (r.observacoes as string) ?? "",
    data2Call: parseDate(r.data_2call as string),
    hora2Call: (r.hora_2call as string) ?? "",
    statusCall2: (r.status_call_2 as string) ?? "",
    statusVenda2: (r.status_venda_2 as string) ?? "",
    motivoNoshow2: (r.motivo_noshow_2 as string) ?? "",
    cashCollected2: Number(r.cash_collected_2) || 0,
    valorTotal2: Number(r.valor_total_2) || 0,
    adNameEmail: (r.ad_name_email as string) ?? "",
    adNameTelefone: (r.ad_name_telefone as string) ?? "",
  };
}

function mapMeta(r: Record<string, unknown>): MetaAdveronixRow {
  return {
    day: parseDate(r.day as string),
    campaignName: (r.campaign_name as string) ?? "",
    campaignId: (r.campaign_id as string) ?? "",
    adSetName: (r.ad_set_name as string) ?? "",
    adName: (r.ad_name as string) ?? "",
    adId: (r.ad_id as string) ?? "",
    amountSpent: Number(r.amount_spent) || 0,
    impressions: Number(r.impressions) || 0,
    threeSecViews: Number(r.three_sec_views) || 0,
    videoWatches75: Number(r.video_watches_75) || 0,
    linkClicks: Number(r.link_clicks) || 0,
    landingPageViews: Number(r.landing_page_views) || 0,
  };
}

function mapGhl(r: Record<string, unknown>): LeadsGhlRow {
  return {
    contactId: (r.contact_id as string) ?? "",
    firstName: (r.first_name as string) ?? "",
    lastName: (r.last_name as string) ?? "",
    phone: (r.phone as string) ?? "",
    email: (r.email as string) ?? "",
    businessName: (r.business_name as string) ?? "",
    created: parseDate(r.created as string),
    lastActivity: parseDate(r.last_activity as string),
    tags: (r.tags as string) ?? "",
    utmPlacement: (r.utm_placement as string) ?? "",
    utmTarget: (r.utm_target as string) ?? "",
    utmTerm: (r.utm_term as string) ?? "",
    utmCampaign: (r.utm_campaign as string) ?? "",
    utmMedium: (r.utm_medium as string) ?? "",
    utmContent: (r.utm_content as string) ?? "",
    utmSource: (r.utm_source as string) ?? "",
    faixaFaturamento: (r.faixa_faturamento as string) ?? "",
    areaAtuacao: (r.area_atuacao as string) ?? "",
    faixaFaturamentoMensal: (r.faixa_faturamento_mensal as string) ?? "",
    adName: (r.ad_name as string) ?? "",
  };
}

function mapGhlLead(r: Record<string, unknown>): GhlLeadsTabRow {
  return {
    contactId: (r.contact_id as string) ?? "",
    nome: (r.nome as string) ?? "",
    email: (r.email as string) ?? "",
    telefone: (r.telefone as string) ?? "",
    dataCriacao: parseDate(r.data_criacao as string),
    tags: (r.tags as string) ?? "",
    source: (r.source as string) ?? "",
    faturamento: (r.faturamento as string) ?? "",
    profissao: (r.profissao as string) ?? "",
    campaignFirst: (r.campaign_first as string) ?? "",
    adNameFirst: (r.ad_name_first as string) ?? "",
    utmSource: (r.utm_source as string) ?? "",
    sessionSource: (r.session_source as string) ?? "",
    campaignLatest: (r.campaign_latest as string) ?? "",
    adNameLatest: (r.ad_name_latest as string) ?? "",
    funil: (r.funil as string) ?? "",
    socio: (r.socio as string) ?? "",
    webinarTag: (r.webinar_tag as string) ?? "",
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGoogleSheetsData(): SheetsData {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [metaAdveronix, setMetaAdveronix] = useState<MetaAdveronixRow[]>([]);
  const [leadsGhl, setLeadsGhl] = useState<LeadsGhlRow[]>([]);
  const [ghlLeadsTab, setGhlLeadsTab] = useState<GhlLeadsTabRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Fetch all 4 tables in parallel from Supabase
      const [leadsRes, metaRes, ghlRes, ghlLeadsRes] = await Promise.all([
        supabase.from("sheets_leads").select("*").order("data_cadastro", { ascending: false }),
        supabase.from("sheets_meta_ads").select("*").order("day", { ascending: false }),
        supabase.from("sheets_ghl_base").select("*").order("created", { ascending: false }),
        supabase.from("sheets_ghl_leads").select("*").order("data_criacao", { ascending: false }),
      ]);

      if (leadsRes.error) console.error("sheets_leads error:", leadsRes.error);
      if (metaRes.error) console.error("sheets_meta_ads error:", metaRes.error);
      if (ghlRes.error) console.error("sheets_ghl_base error:", ghlRes.error);
      if (ghlLeadsRes.error) console.error("sheets_ghl_leads error:", ghlLeadsRes.error);

      const newLeads = (leadsRes.data ?? []).map(mapLead);
      const newMeta = (metaRes.data ?? []).map(mapMeta);
      const newGhl = (ghlRes.data ?? []).map(mapGhl);
      const newGhlLeads = (ghlLeadsRes.data ?? []).map(mapGhlLead);

      setLeads(newLeads);
      setMetaAdveronix(newMeta);
      setLeadsGhl(newGhl);
      setGhlLeadsTab(newGhlLeads);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { leads, metaAdveronix, leadsGhl, ghlLeadsTab, lastUpdated, isLoading };
}
