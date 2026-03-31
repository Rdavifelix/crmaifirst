import { useMemo } from "react";
import type { LeadRow, MetaAdveronixRow, LeadsGhlRow, GhlLeadsTabRow } from "@/config/sheets";
import type { DateRange } from "@/hooks/useDateRange";
import {
  classifyFunnel,
  extractWebinarNumber,
  isCallRealizadaStatus,
  isVendaStatus,
  isMQL,
  FUNNEL_CONFIG,
  type Funnel,
} from "@/lib/classifyFunnel";

// ── Helpers ──────────────────────────────────────────────────────────────────

function safe(n: number, d: number, mult = 1): number {
  return d > 0 ? (n / d) * mult : 0;
}

function inRange(d: Date | null, range: DateRange): boolean {
  if (!d) return false;
  return d >= range.from && d <= range.to;
}

/** Best ad_name from a CRM LeadRow */
function getLeadAdName(l: LeadRow): string {
  return l.adNameEmail || l.adNameTelefone || "";
}

function isCallRealizada(l: LeadRow): boolean {
  return isCallRealizadaStatus(l.statusCall) || isCallRealizadaStatus(l.statusCall2);
}

function isVenda(l: LeadRow): boolean {
  return isVendaStatus(l.statusVenda) || isVendaStatus(l.statusVenda2);
}

function normalizeEmail(v: string): string {
  return v.trim().toLowerCase();
}

function normalizePhone(v: string): string {
  return v.replace(/\D/g, "");
}

function isAplicacaoFunil(funil: string): boolean {
  const normalized = funil
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return normalized.startsWith("aplicacao");
}

// ── Exported types ───────────────────────────────────────────────────────────

export interface OverviewKpis {
  invest: number;
  totalLeads: number;
  cpl: number;
  mqlCount: number;
  cac: number;
  roas: number;
  receita: number;
  vendas: number;
  calls: number;
  agendados: number;
  impressions: number;
  linkClicks: number;
  lpViews: number;
  funnelInvest: { funil: string; value: number; color: string }[];
  funnelLeads: { funil: string; value: number; color: string }[];
  funnelBreakdown: FunnelBreakdownItem[];
}

export interface FunnelBreakdownItem {
  funil: string;
  color: string;
  invest: number;
  leads: number;
  calls: number;
  custoPorReuniao: number;
  vendas: number;
  cac: number;
  cashCollected: number;
  faturamento: number;
  roas: number;
  agendamentos: number;
  taxaAgendamento: number;
  comparecimento: number;
  ticketMedio: number;
}

export interface WebinarData {
  availableWebinars: number[];
  impressions: number;
  threeSecViews: number;
  videoWatches75: number;
  linkClicks: number;
  lpViews: number;
  ghlLeads: number;
  mqlCount: number;
  invest: number;
  ctr: number;
  viewPagePctClicks: number;
  leadsPctViewPage: number;
  mqlPctLeads: number;
  cpm: number;
  cpc: number;
  cpViewPage: number;
  cpl: number;
  cpMql: number;
  faixaDistribution: { faixa: string; count: number; pct: number }[];
  cadastroCount: number;
  aplicacaoCount: number;
  aplicacaoPct: number;
  pipelineAgendados: number;
  pipelineCalls: number;
  pipelineVendas: number;
  pipelineCash: number;
  pipelineShowUp: number;
  pipelineConversao: number;
  pipelineTicket: number;
}

export interface AplicacaoData {
  amountSpent: number;
  impressions: number;
  cpm: number;
  linkClicks: number;
  cpc: number;
  ctr: number;
  lpViews: number;
  newLeads: number;
  lpConversion: number;
  cpl: number;
  demosBooked: number;
  costPerDemo: number;
  leadToBooking: number;
  qualifiedLeads: number;
  costPerQualified: number;
  sales: number;
  contractedRevenue: number;
  ufCash: number;
  cpa: number;
  revRoas: number;
  ufRoas: number;
}

export interface OrganicFunnelData {
  leads: number;
  agendados: number;
  calls: number;
  vendas: number;
  cash: number;
  conversao: number;
  ticket: number;
  showUp: number;
}

export interface MarketingDetailedData {
  overview: OverviewKpis;
  webinar: WebinarData;
  aplicacao: AplicacaoData;
  estudoCaso: OrganicFunnelData;
  instagram: OrganicFunnelData;
  stagesData: { name: string; value: number; color: string }[];
}

// ── Pipeline helper — sums both 1st and 2nd call ─────────────────────────────
// 2nd call is only included if its own data2Call falls within the given range.

function pipelineFrom(crm: LeadRow[], range?: DateRange) {
  let agendados = 0, calls = 0, vendas = 0, receita = 0, cash = 0;

  for (const l of crm) {
    // Agendados — only count if dataAgendamento falls within range
    if (l.dataAgendamento !== null && (!range || inRange(l.dataAgendamento, range))) agendados++;

    // 1st call/sale — use fallback reference date to avoid dropping valid rows without dataCall
    const firstActivityDate = l.dataCall || l.dataConclusao || l.dataAgendamento;
    const include1st = !range || inRange(firstActivityDate, range);
    if (include1st) {
      if (isCallRealizadaStatus(l.statusCall)) calls++;
      if (isVendaStatus(l.statusVenda)) {
        vendas++;
        cash += l.cashCollected;
        receita += l.valorTotal;
      }
    }

    // 2nd call — only count if data2Call is within range (or no range filter)
    const include2nd = !range || inRange(l.data2Call, range);
    if (include2nd) {
      if (isCallRealizadaStatus(l.statusCall2)) calls++;
      if (isVendaStatus(l.statusVenda2)) {
        vendas++;
        cash += l.cashCollected2;
        receita += l.valorTotal2;
      }
    }
  }

  return { agendados, calls, vendas, receita, cash };
}

/** Aggregate META metrics from a group */
function metaFrom(meta: MetaAdveronixRow[]) {
  let invest = 0, impressions = 0, clicks = 0, lpViews = 0, threeSecV = 0, v75 = 0;
  for (const r of meta) {
    invest += r.amountSpent;
    impressions += r.impressions;
    clicks += r.linkClicks;
    lpViews += r.landingPageViews;
    threeSecV += r.threeSecViews;
    v75 += r.videoWatches75;
  }
  return { invest, impressions, clicks, lpViews, threeSecV, v75 };
}

// ── Classify helpers for each data source ────────────────────────────────────

function classifyMeta(r: MetaAdveronixRow): Funnel {
  return classifyFunnel({ adName: r.adName, campaignName: r.campaignName });
}

function classifyGhl(r: LeadsGhlRow): Funnel {
  return classifyFunnel({ adName: r.adName, tags: r.tags, utmCampaign: r.utmCampaign });
}

function classifyCrm(l: LeadRow): Funnel {
  return classifyFunnel({ adName: getLeadAdName(l), origem: l.origem });
}

// ── Main hook ────────────────────────────────────────────────────────────────

export function useMarketingDetailed(
  leads: LeadRow[],
  metaAdveronix: MetaAdveronixRow[],
  leadsGhl: LeadsGhlRow[],
  ghlLeadsTab: GhlLeadsTabRow[],
  range: DateRange,
  selectedWebinar: number | null,
): MarketingDetailedData {
  return useMemo(() => {
    // ================================================================
    // STEP 1 — Filter by date range
    // ================================================================

    const metaPeriod = metaAdveronix.filter((m) => inRange(m.day, range));
    const ghlPeriod = leadsGhl.filter((g) => inRange(g.created, range));

    // CRM: activity scope for performance metrics (any valid activity date in range)
    const isActivityInRange = (l: LeadRow) =>
      inRange(l.dataAgendamento, range) ||
      inRange(l.dataCall, range) ||
      inRange(l.dataConclusao, range) ||
      inRange(l.data2Call, range);
    const crmPeriod = leads.filter(isActivityInRange);

    // Volume leads — includes leads registered in period OR leads without dataCadastro
    // that have any activity in the period (many rows have empty registration dates)
    const crmByRegistration = leads.filter((l) =>
      inRange(l.dataCadastro, range) ||
      (!l.dataCadastro && isActivityInRange(l))
    );

    // GHL LEADS tab filtered by period — used for Aplicação (MR) lead count
    const ghlTabPeriod = ghlLeadsTab.filter((r) => inRange(r.dataCriacao, range));
    const ghlTabMR = ghlTabPeriod.filter((r) => isAplicacaoFunil(r.funil));
    const ghlTabMRCount = ghlTabMR.length;

    // ================================================================
    // STEP 2 — Partition every dataset by funnel
    // ================================================================

    const allFunnels: Funnel[] = ["webinar", "aplicacao", "estudo_caso", "instagram", "outros"];

    const metaByFunnel: Record<Funnel, MetaAdveronixRow[]> = {
      webinar: [], aplicacao: [], estudo_caso: [], instagram: [], outros: [],
    };
    for (const r of metaPeriod) metaByFunnel[classifyMeta(r)].push(r);

    const ghlByFunnel: Record<Funnel, LeadsGhlRow[]> = {
      webinar: [], aplicacao: [], estudo_caso: [], instagram: [], outros: [],
    };
    for (const r of ghlPeriod) ghlByFunnel[classifyGhl(r)].push(r);

    const crmByFunnel: Record<Funnel, LeadRow[]> = {
      webinar: [], aplicacao: [], estudo_caso: [], instagram: [], outros: [],
    };
    for (const r of crmPeriod) crmByFunnel[classifyCrm(r)].push(r);

    // CRM leads by registration date — used as denominator for taxa de agendamento
    const crmRegByFunnel: Record<Funnel, LeadRow[]> = {
      webinar: [], aplicacao: [], estudo_caso: [], instagram: [], outros: [],
    };
    for (const r of crmByRegistration) crmRegByFunnel[classifyCrm(r)].push(r);

    // ================================================================
    // STEP 3 — Per-funnel aggregates for Overview charts
    // ================================================================

    const funnelAggregates = allFunnels.map((funnel) => {
      const cfg = FUNNEL_CONFIG[funnel];
      const m = metaFrom(metaByFunnel[funnel]);
      const pipe = pipelineFrom(crmByFunnel[funnel], range);
      const ghlLeadsCount = ghlByFunnel[funnel].length;
      // For Aplicação (MR), use GHL LEADS tab "Funil" column as authoritative source
      const crmRegLeadsCount = crmRegByFunnel[funnel].length;
      const leadsCount = funnel === "aplicacao"
        ? (ghlTabMRCount || crmRegLeadsCount)
        : (ghlLeadsCount || crmRegLeadsCount);
      return {
        funnel,
        label: cfg.label,
        color: cfg.color,
        invest: m.invest,
        leads: leadsCount,
        ...pipe,
      };
    });

    // ================================================================
    // STEP 4 — OVERVIEW
    // ================================================================

    const totalMeta = metaFrom(metaPeriod);
    const totalPipe = pipelineFrom(crmPeriod, range);
    const totalLeads = crmByRegistration.length;
    const mqlGlobal = ghlPeriod.filter((r) =>
      isMQL(r.faixaFaturamento) || isMQL(r.faixaFaturamentoMensal),
    ).length;

    const overview: OverviewKpis = {
      invest: +totalMeta.invest.toFixed(2),
      totalLeads,
      cpl: +safe(totalMeta.invest, totalLeads).toFixed(2),
      mqlCount: mqlGlobal,
      calls: totalPipe.calls,
      agendados: totalPipe.agendados,
      vendas: totalPipe.vendas,
      receita: +totalPipe.cash.toFixed(2),
      cac: +safe(totalMeta.invest, totalPipe.vendas).toFixed(2),
      roas: +safe(totalPipe.cash, totalMeta.invest).toFixed(2),
      impressions: totalMeta.impressions,
      linkClicks: totalMeta.clicks,
      lpViews: totalMeta.lpViews,
      funnelInvest: funnelAggregates
        .filter((f) => f.invest > 0)
        .map((f) => ({ funil: f.label, value: +f.invest.toFixed(2), color: f.color }))
        .sort((a, b) => b.value - a.value),
      funnelLeads: funnelAggregates
        .filter((f) => f.leads > 0)
        .map((f) => ({ funil: f.label, value: f.leads, color: f.color }))
        .sort((a, b) => b.value - a.value),
      funnelBreakdown: funnelAggregates
        .filter((f) =>
          f.invest > 0 ||
          f.leads > 0 ||
          f.vendas > 0 ||
          f.calls > 0 ||
          f.agendados > 0
        )
        .map((f) => ({
          funil: f.label,
          color: f.color,
          invest: +f.invest.toFixed(2),
          leads: f.leads,
          calls: f.calls,
          custoPorReuniao: +safe(f.invest, f.calls).toFixed(2),
          vendas: f.vendas,
          cac: +safe(f.invest, f.vendas).toFixed(2),
          cashCollected: +f.cash.toFixed(2),
          faturamento: +f.receita.toFixed(2),
          roas: +safe(f.cash, f.invest).toFixed(2),
          agendamentos: f.agendados,
          taxaAgendamento: +safe(f.agendados, f.leads, 100).toFixed(1),
          comparecimento: +safe(f.calls, f.agendados, 100).toFixed(1),
          ticketMedio: +safe(f.cash, f.vendas).toFixed(2),
        }))
        .sort((a, b) => b.invest - a.invest),
    };

    // ================================================================
    // STEP 5 — Stages funnel
    // ================================================================

    const stagesData = [
      { name: "Impressões", value: totalMeta.impressions, color: "hsl(218,70%,50%)" },
      { name: "Cliques", value: totalMeta.clicks, color: "hsl(218,60%,54%)" },
      { name: "LP Views", value: totalMeta.lpViews, color: "hsl(258,60%,52%)" },
      { name: "Leads", value: totalLeads, color: "hsl(218,70%,42%)" },
      { name: "MQL (20k+)", value: mqlGlobal, color: "hsl(192,78%,38%)" },
      { name: "Agendamentos", value: totalPipe.agendados, color: "hsl(162,55%,38%)" },
      { name: "Calls Realizadas", value: totalPipe.calls, color: "hsl(36,88%,50%)" },
      { name: "Vendas", value: totalPipe.vendas, color: "hsl(350,70%,52%)" },
    ];

    // ================================================================
    // STEP 6 — WEBINAR (with optional selectedWebinar filter)
    // ================================================================

    const wGhl = selectedWebinar === null
      ? ghlByFunnel.webinar
      : ghlByFunnel.webinar.filter((r) => {
          const n = extractWebinarNumber(r.adName, r.tags, r.utmCampaign);
          return n === selectedWebinar;
        });

    const wCrm = selectedWebinar === null
      ? crmByFunnel.webinar
      : crmByFunnel.webinar.filter((r) => {
          const n = extractWebinarNumber(getLeadAdName(r), r.origem);
          return n === selectedWebinar;
        });

    const wMeta = selectedWebinar === null
      ? metaByFunnel.webinar
      : metaByFunnel.webinar.filter((r) => {
          const n = extractWebinarNumber(r.adName, r.campaignName);
          return n === selectedWebinar;
        });

    const wm = metaFrom(wMeta);
    const wp = pipelineFrom(wCrm, range);
    const wMqlCount = wGhl.filter((r) =>
      isMQL(r.faixaFaturamento) || isMQL(r.faixaFaturamentoMensal),
    ).length;

    // Available webinar numbers
    const webinarNums = [...new Set(
      ghlByFunnel.webinar
        .map((r) => extractWebinarNumber(r.adName, r.tags, r.utmCampaign))
        .filter((n): n is number => n !== null),
    )].sort((a, b) => b - a);

    // Also check META campaigns for webinar numbers
    for (const r of metaByFunnel.webinar) {
      const n = extractWebinarNumber(r.adName, r.campaignName);
      if (n !== null && !webinarNums.includes(n)) webinarNums.push(n);
    }
    webinarNums.sort((a, b) => b - a);

    // Faixa distribution
    const faixaMap = new Map<string, number>();
    for (const r of wGhl) {
      const faixa = (r.faixaFaturamento || r.faixaFaturamentoMensal || "").trim();
      if (faixa) faixaMap.set(faixa, (faixaMap.get(faixa) ?? 0) + 1);
    }
    const faixaTotal = [...faixaMap.values()].reduce((s, v) => s + v, 0) || 1;
    const faixaDistribution = [...faixaMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([faixa, count]) => ({
        faixa,
        count,
        pct: +((count / faixaTotal) * 100).toFixed(1),
      }));

    // Cadastro vs Aplicação — from GHL LEADS tab (has "Funil" column)
    // ghlTabPeriod already defined above
    const ghlTabWebinar = selectedWebinar === null
      ? ghlTabPeriod
      : ghlTabPeriod.filter((r) => {
          const wt = r.webinarTag.toLowerCase();
          const match = wt.match(/wb?\s*(\d{1,2})/i);
          return match ? parseInt(match[1], 10) === selectedWebinar : false;
        });
    const wAplicacaoCount = ghlTabWebinar.filter((r) => isAplicacaoFunil(r.funil)).length;
    const wCadastroCount = ghlTabWebinar.length - wAplicacaoCount;
    const totalSplitGhl = ghlTabWebinar.length;

    const webinar: WebinarData = {
      availableWebinars: webinarNums,
      invest: wm.invest,
      impressions: wm.impressions,
      threeSecViews: wm.threeSecV,
      videoWatches75: wm.v75,
      linkClicks: wm.clicks,
      lpViews: wm.lpViews,
      ghlLeads: wGhl.length,
      mqlCount: wMqlCount,
      ctr: +safe(wm.clicks, wm.impressions, 100).toFixed(2),
      viewPagePctClicks: +safe(wm.lpViews, wm.clicks, 100).toFixed(1),
      leadsPctViewPage: +safe(wGhl.length, wm.lpViews, 100).toFixed(1),
      mqlPctLeads: +safe(wMqlCount, wGhl.length, 100).toFixed(1),
      cpm: +safe(wm.invest, wm.impressions, 1000).toFixed(2),
      cpc: +safe(wm.invest, wm.clicks).toFixed(2),
      cpViewPage: +safe(wm.invest, wm.lpViews).toFixed(2),
      cpl: +safe(wm.invest, wGhl.length).toFixed(2),
      cpMql: +safe(wm.invest, wMqlCount).toFixed(2),
      faixaDistribution,
      cadastroCount: wCadastroCount,
      aplicacaoCount: wAplicacaoCount,
      aplicacaoPct: +safe(wAplicacaoCount, totalSplitGhl, 100).toFixed(1),
      pipelineAgendados: wp.agendados,
      pipelineCalls: wp.calls,
      pipelineVendas: wp.vendas,
      pipelineCash: wp.cash,
      pipelineShowUp: +safe(wp.calls, wp.agendados, 100).toFixed(1),
      pipelineConversao: +safe(wp.vendas, wp.calls, 100).toFixed(1),
      pipelineTicket: wp.vendas > 0 ? +safe(wp.receita, wp.vendas).toFixed(2) : 0,
    };

    // ================================================================
    // STEP 7 — APLICAÇÃO (MR)
    // ================================================================

    const mrM = metaFrom(metaByFunnel.aplicacao);
    const mrGhl = ghlByFunnel.aplicacao;
    const mrPipe = pipelineFrom(crmByFunnel.aplicacao, range);
    const mrLeads = ghlTabMRCount || crmRegByFunnel.aplicacao.length || mrGhl.length;

    const aplicacao: AplicacaoData = {
      amountSpent: mrM.invest,
      impressions: mrM.impressions,
      cpm: +safe(mrM.invest, mrM.impressions, 1000).toFixed(2),
      linkClicks: mrM.clicks,
      cpc: +safe(mrM.invest, mrM.clicks).toFixed(2),
      ctr: +safe(mrM.clicks, mrM.impressions, 100).toFixed(2),
      lpViews: mrM.lpViews,
      newLeads: mrLeads,
      lpConversion: +safe(mrLeads, mrM.lpViews, 100).toFixed(1),
      cpl: +safe(mrM.invest, mrLeads).toFixed(2),
      demosBooked: mrPipe.agendados,
      costPerDemo: +safe(mrM.invest, mrPipe.agendados).toFixed(2),
      leadToBooking: +safe(mrPipe.agendados, mrLeads, 100).toFixed(1),
      qualifiedLeads: mrPipe.calls,
      costPerQualified: +safe(mrM.invest, mrPipe.calls).toFixed(2),
      sales: mrPipe.vendas,
      contractedRevenue: mrPipe.receita,
      ufCash: mrPipe.cash,
      cpa: +safe(mrM.invest, mrPipe.vendas).toFixed(2),
      revRoas: +safe(mrPipe.receita, mrM.invest).toFixed(2),
      ufRoas: +safe(mrPipe.cash, mrM.invest).toFixed(2),
    };

    // ================================================================
    // STEP 8 — Organic funnels (Estudo de Caso / Instagram)
    // ================================================================

    function buildOrganic(funnel: Funnel): OrganicFunnelData {
      const pipe = pipelineFrom(crmByFunnel[funnel], range);
      return {
        leads: crmByFunnel[funnel].length,
        agendados: pipe.agendados,
        calls: pipe.calls,
        vendas: pipe.vendas,
        cash: pipe.cash,
        showUp: +safe(pipe.calls, pipe.agendados, 100).toFixed(1),
        conversao: +safe(pipe.vendas, pipe.calls, 100).toFixed(1),
        ticket: pipe.vendas > 0 ? +safe(pipe.receita, pipe.vendas).toFixed(2) : 0,
      };
    }

    return {
      overview,
      stagesData,
      webinar,
      aplicacao,
      estudoCaso: buildOrganic("estudo_caso"),
      instagram: buildOrganic("instagram"),
    };
  }, [leads, metaAdveronix, leadsGhl, ghlLeadsTab, range, selectedWebinar]);
}
