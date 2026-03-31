import { useMemo } from "react";
import { LeadRow } from "@/config/sheets";
import {
  isCallRealizadaStatus,
  isVendaStatus,
  classifyFunnel,
  FUNNEL_CONFIG,
  type Funnel,
} from "@/lib/classifyFunnel";
import {
  format, subMonths, startOfMonth, endOfMonth, isWithinInterval,
  startOfDay, endOfDay, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, endOfWeek,
  differenceInDays, differenceInCalendarMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface AreaDataPoint { label: string; vendas: number; faturamento: number; coletado: number }
interface WeekDataPoint { semana: string; agendadas: number; realizadas: number }
interface PieDataPoint { name: string; value: number }
interface CloserData { name: string; vendas: number; meta: number; calls: number; cashCollected: number; conversao: number }

export type AreaGranularity = "daily" | "weekly" | "monthly";
export type ProductFilter = "all" | "MFA" | "PAA" | "outros";

export interface ConvHourPoint { hora: string; conversao: number; calls: number; vendas: number }
export interface NoShowHourPoint { hora: string; taxaNoshow: number; agendados: number; noshows: number }
export interface PublicoDataPoint { label: string; vendas: number; calls: number; conversao: number }
export interface FunnelBreakdownPoint { funnel: Funnel; label: string; color: string; vendas: number; faturamento: number; cashCollected: number; conversao: number; calls: number; agendamentos: number; comparecimento: number; ticketMedio: number }

export interface VendasCharts {
  areaData: AreaDataPoint[];
  areaGranularity: AreaGranularity;
  areaTitle: string;
  weeklyCallsData: WeekDataPoint[];
  pieData: PieDataPoint[];
  closers: CloserData[];
  convByHour: ConvHourPoint[];
  noShowByHour: NoShowHourPoint[];
  funnelBreakdown: FunnelBreakdownPoint[];
  profissaoBreakdown: PublicoDataPoint[];
  faturamentoBreakdown: PublicoDataPoint[];
  totalVendas: number;
  totalReceita: number;
  totalFaturamento: number;
  ticketMedio: number;
  taxaConversao: number;
  totalCalls: number;
  callsRealizadas: number;
  agendamentos: number;
  totalSinais: number;
  receitaSinais: number;
}

const CLOSER_META = 35;

/** Checks if a lead has any venda (1st or 2nd call) using centralized logic */
function isVenda(l: LeadRow): boolean {
  return isVendaStatus(l.statusVenda) || isVendaStatus(l.statusVenda2);
}

function isCallRealizada(l: LeadRow): boolean {
  return isCallRealizadaStatus(l.statusCall) || isCallRealizadaStatus(l.statusCall2);
}

function isNoShow(l: LeadRow): boolean {
  const re = /no\s*show|noshow|não\s*compareceu|nao\s*compareceu/i;
  return re.test(l.statusCall) || re.test(l.motivoNoshow) || re.test(l.statusCall2) || re.test(l.motivoNoshow2);
}

function matchesProductFilter(l: LeadRow, filter: ProductFilter): boolean {
  if (filter === "all") return true;
  const p = (l.produtoVendido || "").trim();
  if (filter === "MFA") return /MFA/i.test(p);
  if (filter === "PAA") return /PAA/i.test(p);
  return p !== "" && !/MFA|PAA/i.test(p);
}

function classifyCrm(l: LeadRow): Funnel {
  return classifyFunnel({ adName: l.adNameEmail || l.adNameTelefone || "", origem: l.origem });
}

function refDate(l: LeadRow): Date | null {
  return l.dataCall || l.dataConclusao || l.dataAgendamento;
}

/** Check if 2nd call date falls within range */
function is2ndCallInRange(l: LeadRow, range?: { from: Date; to: Date }): boolean {
  if (!range) return true;
  if (!l.data2Call) return false;
  return isWithinInterval(l.data2Call, { start: startOfDay(range.from), end: endOfDay(range.to) });
}

/** Cash collected — only includes 2nd call if its date is in range */
function cashCollectedFiltered(l: LeadRow, range?: { from: Date; to: Date }): number {
  let total = l.cashCollected || 0;
  if (is2ndCallInRange(l, range)) total += l.cashCollected2 || 0;
  return total;
}

/** Count vendas for a lead considering date filtering on 2nd call */
function countVendas(l: LeadRow, range?: { from: Date; to: Date }): number {
  let count = 0;
  if (isVendaStatus(l.statusVenda)) count++;
  if (isVendaStatus(l.statusVenda2) && is2ndCallInRange(l, range)) count++;
  return count;
}

/** Count calls realizadas considering date filtering on 2nd call */
function countCallsRealizadas(l: LeadRow, range?: { from: Date; to: Date }): number {
  let count = 0;
  if (isCallRealizadaStatus(l.statusCall)) count++;
  if (isCallRealizadaStatus(l.statusCall2) && is2ndCallInRange(l, range)) count++;
  return count;
}

/** Faturamento (valorTotal) — includes both calls, 2nd only if in range */
function faturamentoFiltered(l: LeadRow, range?: { from: Date; to: Date }): number {
  let total = 0;
  if (isVendaStatus(l.statusVenda)) total += l.valorTotal || 0;
  if (isVendaStatus(l.statusVenda2) && is2ndCallInRange(l, range)) total += l.valorTotal2 || 0;
  return total;
}

function pickGranularity(from: Date, to: Date): AreaGranularity {
  const days = differenceInDays(to, from);
  const months = differenceInCalendarMonths(to, from);
  if (days <= 14) return "daily";
  if (months <= 1) return "weekly";
  return "monthly";
}

function buildAreaData(leads: LeadRow[], range: { from: Date; to: Date }, granularity: AreaGranularity): AreaDataPoint[] {
  const { from, to } = range;

  const aggregate = (subset: LeadRow[], subRange?: { from: Date; to: Date }) => {
    const vendasList = subset.filter((l) => { const d = refDate(l); return d && isVenda(l); });
    return {
      vendas: vendasList.reduce((s, l) => s + countVendas(l, subRange), 0),
      faturamento: vendasList.reduce((s, l) => s + faturamentoFiltered(l, subRange), 0),
      coletado: vendasList.reduce((s, l) => s + cashCollectedFiltered(l, subRange), 0),
    };
  };

  if (granularity === "daily") {
    return eachDayOfInterval({ start: from, end: to }).map((day) => {
      const interval = { start: startOfDay(day), end: endOfDay(day) };
      const dayLeads = leads.filter((l) => { const d = refDate(l); return d && isWithinInterval(d, interval); });
      const agg = aggregate(dayLeads);
      return { label: format(day, "dd/MM", { locale: ptBR }), ...agg };
    });
  }

  if (granularity === "weekly") {
    return eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 }).map((weekStart, i) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const clampedStart = weekStart < from ? from : weekStart;
      const clampedEnd = weekEnd > to ? to : weekEnd;
      const interval = { start: startOfDay(clampedStart), end: endOfDay(clampedEnd) };
      const weekLeads = leads.filter((l) => { const d = refDate(l); return d && isWithinInterval(d, interval); });
      const agg = aggregate(weekLeads);
      return { label: `S${i + 1} (${format(clampedStart, "dd/MM")})`, ...agg };
    });
  }

  // monthly
  return eachMonthOfInterval({ start: from, end: to }).map((m) => {
    const interval = { start: startOfMonth(m), end: endOfMonth(m) };
    const monthLeads = leads.filter((l) => { const d = refDate(l); return d && isWithinInterval(d, interval); });
    const agg = aggregate(monthLeads);
    const label = format(m, "MMM/yy", { locale: ptBR });
    return { label: label.charAt(0).toUpperCase() + label.slice(1), ...agg };
  });
}

function buildPublicoBreakdown(
  filtered: LeadRow[],
  vendas: LeadRow[],
  productFilter: ProductFilter,
  keyFn: (l: LeadRow) => string
): PublicoDataPoint[] {
  const productVendas = productFilter === "all" ? vendas : vendas.filter((l) => matchesProductFilter(l, productFilter));
  const map: Record<string, { vendas: number; calls: number }> = {};

  filtered.forEach((l) => {
    const key = keyFn(l) || "Não informado";
    if (!map[key]) map[key] = { vendas: 0, calls: 0 };
    if (isCallRealizada(l)) map[key].calls += 1;
  });

  productVendas.forEach((l) => {
    const key = keyFn(l) || "Não informado";
    if (!map[key]) map[key] = { vendas: 0, calls: 0 };
    map[key].vendas += 1;
  });

  return Object.entries(map)
    .filter(([, d]) => d.vendas > 0)
    .map(([label, d]) => ({
      label,
      vendas: d.vendas,
      calls: d.calls,
      conversao: d.calls > 0 ? Math.round((d.vendas / d.calls) * 100) : 0,
    }))
    .sort((a, b) => b.vendas - a.vendas)
    .slice(0, 8);
}

export function useVendasCharts(
  leads: LeadRow[],
  range?: { from: Date; to: Date },
  productFilter: ProductFilter = "all"
): VendasCharts {
  return useMemo(() => {
    const now = new Date();

    const filtered = range
      ? leads.filter((l) => {
          const d = refDate(l);
          return d && isWithinInterval(d, { start: startOfDay(range.from), end: endOfDay(range.to) });
        })
      : leads;

    // ── KPIs ────────────────────────────────────────────────────────────────
    const vendas = filtered.filter(isVenda);
    const totalVendas = vendas.reduce((s, l) => s + countVendas(l, range), 0);
    const totalSinais = 0;
    const totalReceita = vendas.reduce((s, l) => s + cashCollectedFiltered(l, range), 0);
    const totalFaturamento = vendas.reduce((s, l) => s + faturamentoFiltered(l, range), 0);
    const receitaSinais = 0;
    const ticketMedio = totalVendas > 0 ? totalReceita / totalVendas : 0;
    const callsRealizadas = filtered.reduce((s, l) => s + countCallsRealizadas(l, range), 0);
    const totalCalls = filtered.filter((l) => l.statusCall.trim() !== "" || l.statusCall2.trim() !== "").length;
    const taxaConversao = callsRealizadas > 0 ? (totalVendas / callsRealizadas) * 100 : 0;
    const agendamentos = filtered.filter((l) => {
      if (!l.dataAgendamento) return false;
      if (!range) return true;
      return isWithinInterval(l.dataAgendamento, { start: startOfDay(range.from), end: endOfDay(range.to) });
    }).length;

    // ── Dynamic area chart ──────────────────────────────────────────────────
    let areaData: AreaDataPoint[];
    let areaGranularity: AreaGranularity;
    let areaTitle: string;

    if (range) {
      areaGranularity = pickGranularity(range.from, range.to);
      areaData = buildAreaData(leads, range, areaGranularity);
      areaTitle = areaGranularity === "daily" ? "Vendas por Dia"
        : areaGranularity === "weekly" ? "Vendas por Semana"
        : "Vendas por Mês";
    } else {
      areaGranularity = "monthly";
      areaTitle = "Vendas por Mês";
      areaData = [];
      for (let i = 7; i >= 0; i--) {
        const m = subMonths(now, i);
        const interval = { start: startOfMonth(m), end: endOfMonth(m) };
        const monthLeads = leads.filter((l) => { const d = refDate(l); return d && isWithinInterval(d, interval); });
        const monthVendas = monthLeads.filter(isVenda);
        const label = format(m, "MMM", { locale: ptBR });
        areaData.push({
          label: label.charAt(0).toUpperCase() + label.slice(1),
          vendas: monthVendas.reduce((s, l) => s + countVendas(l), 0),
          faturamento: monthVendas.reduce((s, l) => s + faturamentoFiltered(l), 0),
          coletado: monthVendas.reduce((s, l) => s + cashCollectedFiltered(l), 0),
        });
      }
    }

    // ── Weekly calls data (current month) ──────────────────────────────────
    const monthStart = startOfMonth(now);
    const weeks: WeekDataPoint[] = [];
    for (let w = 0; w < 5; w++) {
      const weekStart = new Date(monthStart);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekStart.getMonth() !== now.getMonth()) break;
      const interval = { start: startOfDay(weekStart), end: endOfDay(weekEnd) };
      const agendadas = leads.filter((l) => l.dataAgendamento && isWithinInterval(l.dataAgendamento, interval)).length;
      const realizadas = leads.filter((l) => { const d = l.dataCall; return d && isCallRealizada(l) && isWithinInterval(d, interval); }).length;
      weeks.push({ semana: `S${w + 1}`, agendadas, realizadas });
    }

    // ── Pie data (vendas reais only) ────────────────────────────────────────
    const prodMap: Record<string, number> = {};
    vendas.forEach((l) => {
      const prod = l.produtoVendido?.trim() || "Outros";
      prodMap[prod] = (prodMap[prod] || 0) + 1;
    });
    const pieData = Object.entries(prodMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);

    // ── Closers ranking (vendas reais only) ────────────────────────────────
    const closerMap: Record<string, { vendas: number; calls: number; cash: number }> = {};
    filtered.forEach((l) => {
      const name = l.closer?.trim();
      if (!name) return;
      if (!closerMap[name]) closerMap[name] = { vendas: 0, calls: 0, cash: 0 };
      if (isCallRealizada(l)) closerMap[name].calls += 1;
    });
    vendas.forEach((l) => {
      const name = l.closer?.trim();
      if (!name) return;
      if (!closerMap[name]) closerMap[name] = { vendas: 0, calls: 0, cash: 0 };
      closerMap[name].vendas += countVendas(l, range);
      closerMap[name].cash += cashCollectedFiltered(l, range);
    });
    const closers = Object.entries(closerMap)
      .map(([name, d]) => ({
        name, vendas: d.vendas, meta: CLOSER_META, calls: d.calls,
        cashCollected: d.cash,
        conversao: d.calls > 0 ? Math.round((d.vendas / d.calls) * 100) : 0,
      }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 5);

    // ── Conversion rate by hour ────────────────────────────────────────────
    const hourBuckets: Record<number, { calls: number; vendas: number }> = {};
    for (let h = 7; h <= 22; h++) hourBuckets[h] = { calls: 0, vendas: 0 };

    const parseHour = (hora: string): number | null => {
      if (!hora?.trim()) return null;
      const m = hora.trim().match(/^(\d{1,2})[:h]/);
      if (!m) return null;
      const h = parseInt(m[1], 10);
      return h >= 0 && h <= 23 ? h : null;
    };

    filtered.forEach((l) => {
      if (isCallRealizada(l)) {
        const h = parseHour(l.horaCall);
        if (h !== null && hourBuckets[h]) {
          hourBuckets[h].calls += 1;
          if (isVenda(l)) hourBuckets[h].vendas += 1;
        }
      }
      const re2 = /call\s*realizada/i;
      if (re2.test(l.statusCall2) && l.hora2Call?.trim()) {
        const h = parseHour(l.hora2Call);
        if (h !== null && hourBuckets[h]) {
          hourBuckets[h].calls += 1;
          if (/^venda$/i.test(l.statusVenda2?.trim())) hourBuckets[h].vendas += 1;
        }
      }
    });

    const convByHour = Object.entries(hourBuckets)
      .map(([h, d]) => ({
        hora: `${h}h`,
        conversao: d.calls > 0 ? Math.round((d.vendas / d.calls) * 100) : 0,
        calls: d.calls,
        vendas: d.vendas,
      }))
      .filter((d) => d.calls > 0);

    // ── No-show rate by hour ───────────────────────────────────────────────
    const noBuckets: Record<number, { agendados: number; noshows: number }> = {};
    for (let h = 7; h <= 22; h++) noBuckets[h] = { agendados: 0, noshows: 0 };

    filtered.forEach((l) => {
      if (l.statusCall.trim()) {
        const h = parseHour(l.horaCall);
        if (h !== null && noBuckets[h]) {
          noBuckets[h].agendados += 1;
          if (/no\s*show|noshow|não\s*compareceu|nao\s*compareceu/i.test(l.statusCall) || l.motivoNoshow.trim()) {
            noBuckets[h].noshows += 1;
          }
        }
      }
      if (l.statusCall2.trim()) {
        const h = parseHour(l.hora2Call);
        if (h !== null && noBuckets[h]) {
          noBuckets[h].agendados += 1;
          if (/no\s*show|noshow|não\s*compareceu|nao\s*compareceu/i.test(l.statusCall2) || l.motivoNoshow2.trim()) {
            noBuckets[h].noshows += 1;
          }
        }
      }
    });

    const noShowByHour = Object.entries(noBuckets)
      .map(([h, d]) => ({
        hora: `${h}h`,
        taxaNoshow: d.agendados > 0 ? Math.round((d.noshows / d.agendados) * 100) : 0,
        agendados: d.agendados,
        noshows: d.noshows,
      }))
      .filter((d) => d.agendados > 0);

    // ── Público: Profissão & Faturamento breakdowns ────────────────────────
    const profissaoBreakdown = buildPublicoBreakdown(
      filtered, vendas, productFilter, (l) => l.profissao?.trim() || ""
    );
    const faturamentoBreakdown = buildPublicoBreakdown(
      filtered, vendas, productFilter, (l) => l.faturamento?.trim() || ""
    );

    // ── Funnel breakdown ──────────────────────────────────────────────────
    const funnelMap: Record<Funnel, { vendas: number; faturamento: number; cash: number; calls: number; agendamentos: number }> = {
      webinar: { vendas: 0, faturamento: 0, cash: 0, calls: 0, agendamentos: 0 },
      aplicacao: { vendas: 0, faturamento: 0, cash: 0, calls: 0, agendamentos: 0 },
      estudo_caso: { vendas: 0, faturamento: 0, cash: 0, calls: 0, agendamentos: 0 },
      instagram: { vendas: 0, faturamento: 0, cash: 0, calls: 0, agendamentos: 0 },
      outros: { vendas: 0, faturamento: 0, cash: 0, calls: 0, agendamentos: 0 },
    };
    filtered.forEach((l) => {
      const f = classifyCrm(l);
      if (isCallRealizada(l)) funnelMap[f].calls += countCallsRealizadas(l, range);
      if (l.dataAgendamento) {
        funnelMap[f].agendamentos += 1;
        if (l.data2Call && is2ndCallInRange(l, range)) funnelMap[f].agendamentos += 1;
      }
    });
    vendas.forEach((l) => {
      const f = classifyCrm(l);
      funnelMap[f].vendas += countVendas(l, range);
      funnelMap[f].faturamento += faturamentoFiltered(l, range);
      funnelMap[f].cash += cashCollectedFiltered(l, range);
    });
    const funnelBreakdown: FunnelBreakdownPoint[] = (Object.keys(funnelMap) as Funnel[])
      .map((funnel) => {
        const d = funnelMap[funnel];
        const cfg = FUNNEL_CONFIG[funnel];
        const comparecimento = d.agendamentos > 0 ? Math.round((d.calls / d.agendamentos) * 100) : 0;
        const ticketMedio = d.vendas > 0 ? d.cash / d.vendas : 0;
        return {
          funnel, label: cfg.label, color: cfg.color,
          vendas: d.vendas, faturamento: d.faturamento, cashCollected: d.cash, calls: d.calls,
          conversao: d.calls > 0 ? Math.round((d.vendas / d.calls) * 100) : 0,
          agendamentos: d.agendamentos,
          comparecimento,
          ticketMedio,
        };
      })
      .filter((d) => d.vendas > 0 || d.calls > 0 || d.agendamentos > 0)
      .sort((a, b) => b.vendas - a.vendas);

    return {
      areaData, areaGranularity, areaTitle,
      weeklyCallsData: weeks, pieData, closers,
      totalVendas, totalReceita, totalFaturamento, ticketMedio,
      taxaConversao, totalCalls, callsRealizadas, agendamentos,
      totalSinais, receitaSinais,
      convByHour, noShowByHour,
      funnelBreakdown, profissaoBreakdown, faturamentoBreakdown,
    };
  }, [leads, range, productFilter]);
}
