import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
  Legend,
} from "recharts";
import {
  Megaphone, Users, DollarSign, TrendingUp,
  Target, PhoneCall, Eye, MousePointer,
  BarChart2, Star, CheckCircle2, CalendarCheck,
  MessageCircle,
} from "lucide-react";
import { KpiCard, SectionCard } from "@/components/KpiCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/hooks/useDateRange";
import { useSheetsData } from "@/contexts/SheetsDataContext";
import {
  useMarketingDetailed,
  WebinarData,
  AplicacaoData,
  OrganicFunnelData,
  type FunnelBreakdownItem,
} from "@/hooks/useMarketingDetailed";

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (v: number) => v.toLocaleString("pt-BR");

const C = {
  blue: "hsl(218,70%,42%)",
  green: "hsl(162,55%,38%)",
  orange: "hsl(36,88%,50%)",
  red: "hsl(350,70%,52%)",
  purple: "hsl(258,60%,52%)",
  cyan: "hsl(192,78%,38%)",
};

const TT = {
  backgroundColor: "hsl(0,0%,100%)",
  border: "1px solid hsl(216,18%,88%)",
  color: "hsl(218,40%,12%)",
  fontSize: 12,
  borderRadius: 10,
  boxShadow: "0 4px 16px hsl(218,40%,20%,0.10)",
};

type TabKey = "overview" | "webinar" | "aplicacao" | "estudo_caso" | "instagram";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "webinar", label: "Webinar" },
  { key: "aplicacao", label: "Aplicação" },
  { key: "estudo_caso", label: "Estudo de Caso" },
  { key: "instagram", label: "Instagram" },
];

// ── Loading ──────────────────────────────────────────────────────────────────
function MarketingLoading() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ── Metric Row helper ────────────────────────────────────────────────────────
function MetricRow({ label, value, color, isCurrency, isPct }: {
  label: string; value: number; color?: string; isCurrency?: boolean; isPct?: boolean;
}) {
  const display = isCurrency ? fmtBRL(value) : isPct ? `${value}%` : fmtNum(value);
  return (
    <div className="flex items-center justify-between py-2 px-3"
      style={{ borderBottom: "1px solid hsl(var(--border))" }}>
      <span className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: color || "hsl(var(--foreground))" }}>{display}</span>
    </div>
  );
}

// ── FunnelViz ────────────────────────────────────────────────────────────────
interface FunnelStage { name: string; value: number; color: string; }

function FunnelViz({ stages }: { stages: FunnelStage[] }) {
  const W = 600;
  const STAGE_H = 56;
  const GAP = 32;
  const ROWS = stages.length;
  const H = ROWS * STAGE_H + (ROWS - 1) * GAP + 8;
  const TOP_W = W * 0.96;
  const BOT_W = W * 0.18;
  const safeTotal = stages[0]?.value || 1;
  const widthFor = (v: number) => BOT_W + ((v / safeTotal) * (TOP_W - BOT_W));

  return (
    <div className="w-full overflow-x-auto py-2">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: 700, margin: "0 auto" }}>
        <defs>
          {stages.map((s, i) => (
            <linearGradient key={i} id={`mfg${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={s.color} stopOpacity="1" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.78" />
            </linearGradient>
          ))}
        </defs>
        {stages.map((stage, i) => {
          const next = stages[i + 1];
          const y = i * (STAGE_H + GAP);
          const topW = widthFor(stage.value);
          const botW = next ? widthFor(next.value) : widthFor(stage.value) * 0.88;
          const topLeft = (W - topW) / 2;
          const topRight = topLeft + topW;
          const botLeft = (W - botW) / 2;
          const botRight = botLeft + botW;
          const trapPath = `M ${topLeft},${y} L ${topRight},${y} L ${botRight},${y + STAGE_H} L ${botLeft},${y + STAGE_H} Z`;
          const midX = W / 2;
          const labelY = y + STAGE_H / 2;
          const convRate = next ? +((next.value / (stage.value || 1)) * 100).toFixed(1) : null;
          const convColor = convRate === null ? "#888" : convRate >= 60 ? C.green : convRate >= 30 ? C.orange : C.red;

          return (
            <g key={stage.name}>
              <path d={trapPath} fill={`url(#mfg${i})`} />
              <text x={midX} y={labelY - 6} textAnchor="middle" fontSize="10" fontWeight="600" fill="white" opacity="0.85" letterSpacing="1">
                {stage.name.toUpperCase()}
              </text>
              <text x={midX} y={labelY + 14} textAnchor="middle" fontSize="20" fontWeight="900" fill="white">
                {stage.value.toLocaleString("pt-BR")}
              </text>
              {convRate !== null && (
                <g>
                  <line x1={midX} y1={y + STAGE_H + 2} x2={midX} y2={y + STAGE_H + GAP - 6}
                    stroke={convColor} strokeWidth="1.5" strokeOpacity="0.45" strokeDasharray="4 3" />
                  <rect x={midX - 50} y={y + STAGE_H + 6} width={100} height={18} rx="9"
                    fill={convColor} opacity="0.13" stroke={convColor} strokeOpacity="0.4" strokeWidth="1" />
                  <text x={midX} y={y + STAGE_H + 19} textAnchor="middle" fontSize="11" fontWeight="800" fill={convColor}>
                    {convRate}%
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Funnel Breakdown Table ───────────────────────────────────────────────────
function FunnelBreakdownTable({ data }: { data: FunnelBreakdownItem[] }) {
  if (!data.length) return null;

  const cols: { key: keyof FunnelBreakdownItem | "funil"; label: string; fmt: (v: number) => string }[] = [
    { key: "invest", label: "Investimento", fmt: fmtBRL },
    { key: "leads", label: "Leads", fmt: fmtNum },
    { key: "calls", label: "Reuniões", fmt: fmtNum },
    { key: "custoPorReuniao", label: "C.P Reunião", fmt: fmtBRL },
    { key: "vendas", label: "Vendas", fmt: fmtNum },
    { key: "cac", label: "CAC", fmt: fmtBRL },
    { key: "cashCollected", label: "Cash Collected", fmt: fmtBRL },
    { key: "faturamento", label: "Faturamento", fmt: fmtBRL },
    { key: "roas", label: "ROAS", fmt: (v) => `${v.toFixed(1)}x` },
    { key: "agendamentos", label: "Agend.", fmt: fmtNum },
    { key: "taxaAgendamento", label: "Tx Agend.", fmt: (v) => `${v}%` },
    { key: "comparecimento", label: "Comparec.", fmt: (v) => `${v}%` },
    { key: "ticketMedio", label: "Ticket Médio", fmt: fmtBRL },
  ];

  // Totals row
  const totals = {
    invest: data.reduce((s, r) => s + r.invest, 0),
    leads: data.reduce((s, r) => s + r.leads, 0),
    calls: data.reduce((s, r) => s + r.calls, 0),
    vendas: data.reduce((s, r) => s + r.vendas, 0),
    cashCollected: data.reduce((s, r) => s + r.cashCollected, 0),
    faturamento: data.reduce((s, r) => s + r.faturamento, 0),
    agendamentos: data.reduce((s, r) => s + r.agendamentos, 0),
  };
  const totalCpReuniao = totals.calls > 0 ? totals.invest / totals.calls : 0;
  const totalCac = totals.vendas > 0 ? totals.invest / totals.vendas : 0;
  const totalRoas = totals.invest > 0 ? totals.cashCollected / totals.invest : 0;
  const totalComparecimento = totals.agendamentos > 0 ? (totals.calls / totals.agendamentos) * 100 : 0;
  const totalTicketMedio = totals.vendas > 0 ? totals.cashCollected / totals.vendas : 0;

    const totalTaxaAgend = totals.leads > 0 ? (totals.agendamentos / totals.leads) * 100 : 0;
  // We need totalLeads for taxa agendamento — sum from the breakdown rows isn't available,
  const totalsRow: Record<string, string> = {
    invest: fmtBRL(totals.invest),
    leads: fmtNum(totals.leads),
    calls: fmtNum(totals.calls),
    custoPorReuniao: fmtBRL(totalCpReuniao),
    vendas: fmtNum(totals.vendas),
    cac: fmtBRL(totalCac),
    cashCollected: fmtBRL(totals.cashCollected),
    faturamento: fmtBRL(totals.faturamento),
    roas: `${totalRoas.toFixed(1)}x`,
    agendamentos: fmtNum(totals.agendamentos),
    taxaAgendamento: `${totalTaxaAgend.toFixed(1)}%`,
    comparecimento: `${totalComparecimento.toFixed(1)}%`,
    ticketMedio: fmtBRL(totalTicketMedio),
  };

  return (
    <SectionCard title="Resultados por Funil" subtitle="Métricas consolidadas por canal de aquisição">
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr style={{ borderBottom: "2px solid hsl(var(--border))" }}>
              <th className="text-left py-2.5 pr-3 font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Funil</th>
              {cols.map((c) => (
                <th key={c.key} className="text-right py-2.5 px-2 font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.funil} className="group" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.color }} />
                    <span className="font-semibold whitespace-nowrap" style={{ color: "hsl(var(--foreground))" }}>{row.funil}</span>
                  </div>
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="text-right py-2.5 px-2 font-medium tabular-nums" style={{ color: "hsl(var(--foreground))" }}>
                    {c.fmt(row[c.key] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid hsl(var(--border))" }}>
              <td className="py-2.5 pr-3 font-bold" style={{ color: "hsl(var(--foreground))" }}>Total</td>
              {cols.map((c) => (
                <td key={c.key} className="text-right py-2.5 px-2 font-bold tabular-nums" style={{ color: "hsl(var(--foreground))" }}>
                  {totalsRow[c.key]}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  );
}

// ── Overview View ────────────────────────────────────────────────────────────
function OverviewView({ data, stagesData }: { data: ReturnType<typeof useMarketingDetailed>["overview"]; stagesData: FunnelStage[] }) {
  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard featured title="Investimento Total" value={fmtBRL(data.invest)} subtitle="Período selecionado" icon={Megaphone} />
        <KpiCard title="Total Leads" value={fmtNum(data.totalLeads)} subtitle="GHL no período" icon={Users} iconColor={C.blue} />
        <KpiCard title="CPL Geral" value={fmtBRL(data.cpl)} icon={DollarSign} iconColor={C.orange} />
        <KpiCard title="MQL (20k+)" value={fmtNum(data.mqlCount)} subtitle={`${data.totalLeads > 0 ? ((data.mqlCount / data.totalLeads) * 100).toFixed(1) : 0}% dos leads`} icon={Target} iconColor={C.green} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard title="C.P Reunião" value={data.calls > 0 ? fmtBRL(data.invest / data.calls) : "–"} subtitle={`${data.calls} calls realizadas`} icon={PhoneCall} iconColor={C.red} />
        <KpiCard title="CAC" value={fmtBRL(data.cac)} subtitle={`${data.vendas} vendas`} icon={TrendingUp} iconColor={C.purple} />
        <KpiCard title="ROAS" value={`${data.roas.toFixed(1)}x`} subtitle={`Cash: ${fmtBRL(data.receita)}`} icon={Star} iconColor={C.cyan} />
      </div>

      {/* Resultados por Funil */}
      <FunnelBreakdownTable data={data.funnelBreakdown} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.funnelInvest.length > 0 && (
          <SectionCard title="Investimento por Funil" subtitle="Distribuição do gasto">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.funnelInvest} dataKey="value" nameKey="funil" cx="50%" cy="50%"
                  outerRadius={90} innerRadius={50} paddingAngle={2} label={({ funil, percent }) => `${funil} ${(percent * 100).toFixed(0)}%`}>
                  {data.funnelInvest.map((f, i) => (
                    <Cell key={i} fill={f.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v: number) => fmtBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {data.funnelLeads.length > 0 && (
          <SectionCard title="Leads por Funil" subtitle="GHL + LEADS combinados">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.funnelLeads} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,18%,91%)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "hsl(218,16%,52%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="funil" width={120} tick={{ fill: "hsl(218,16%,52%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]}>
                  {data.funnelLeads.map((f, i) => (
                    <Cell key={i} fill={f.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}
      </div>

      {/* Full Marketing Funnel */}
      <SectionCard title="Funil de Marketing Completo" subtitle="Impressões → Vendas">
        <FunnelViz stages={stagesData} />
      </SectionCard>
    </div>
  );
}

// ── Webinar View ─────────────────────────────────────────────────────────────
function WebinarView({ data, selectedWebinar, setSelectedWebinar }: {
  data: WebinarData;
  selectedWebinar: number | null;
  setSelectedWebinar: (v: number | null) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Webinar selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          Webinário:
        </span>
        <button
          onClick={() => setSelectedWebinar(null)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: selectedWebinar === null ? C.blue : "hsl(var(--muted))",
            color: selectedWebinar === null ? "white" : "hsl(var(--foreground))",
          }}
        >
          Todos
        </button>
        {data.availableWebinars.map((n) => (
          <button
            key={n}
            onClick={() => setSelectedWebinar(n)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: selectedWebinar === n ? C.blue : "hsl(var(--muted))",
              color: selectedWebinar === n ? "white" : "hsl(var(--foreground))",
            }}
          >
            W{n}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* % Métricas de Tráfego */}
        <SectionCard title="% Métricas de Tráfego" subtitle="Taxas de conversão do funil">
          <div className="space-y-0">
            <MetricRow label="CTR (Cliques / Impressões)" value={data.ctr} isPct color={C.blue} />
            <MetricRow label="% View Page / Cliques" value={data.viewPagePctClicks} isPct color={C.purple} />
            <MetricRow label="% Leads / View Page" value={data.leadsPctViewPage} isPct color={C.green} />
            <MetricRow label="% MQL / Leads" value={data.mqlPctLeads} isPct color={C.orange} />
          </div>
        </SectionCard>

        {/* # Quantidades */}
        <SectionCard title="# Métricas (Quantidades)" subtitle="Volumes absolutos">
          <div className="space-y-0">
            <MetricRow label="Impressões" value={data.impressions} />
            <MetricRow label="Views 3s" value={data.threeSecViews} />
            <MetricRow label="Views 75%" value={data.videoWatches75} />
            <MetricRow label="Cliques no link" value={data.linkClicks} />
            <MetricRow label="View Page (LP)" value={data.lpViews} />
            <MetricRow label="Leads (GHL)" value={data.ghlLeads} color={C.blue} />
            <MetricRow label="MQL (20k+)" value={data.mqlCount} color={C.green} />
          </div>
        </SectionCard>

        {/* $ Custos */}
        <SectionCard title="$ Métricas (Custos)" subtitle="Custo por etapa">
          <div className="space-y-0">
            <MetricRow label="Investimento" value={data.invest} isCurrency />
            <MetricRow label="CPM" value={data.cpm} isCurrency />
            <MetricRow label="CPC" value={data.cpc} isCurrency />
            <MetricRow label="C.P View Page" value={data.cpViewPage} isCurrency />
            <MetricRow label="CPL" value={data.cpl} isCurrency color={C.orange} />
            <MetricRow label="C.P MQL" value={data.cpMql} isCurrency color={C.red} />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Faixa de Faturamento */}
        <SectionCard title="Pesquisa — Faixas de Faturamento" subtitle="Distribuição de leads por faixa (GHL)">
          <div className="space-y-2">
            {data.faixaDistribution.map((f) => {
              const max = data.faixaDistribution[0]?.count || 1;
              const pct = (f.count / max) * 100;
              const isMql = f.faixa.includes("20.000") || f.faixa.includes("50.000") || f.faixa.includes("100.000");
              return (
                <div key={f.faixa} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate" style={{ color: "hsl(var(--foreground))", maxWidth: "70%" }}>{f.faixa}</span>
                    <span className="font-bold flex-shrink-0" style={{ color: isMql ? C.green : "hsl(var(--muted-foreground))" }}>
                      {f.count} ({f.pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: isMql ? C.green : C.blue }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Cadastro vs Aplicação */}
        <div className="space-y-5">
          <SectionCard title="Cadastro vs Aplicação" subtitle="Split dos leads de webinar">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4 text-center" style={{ background: `${C.blue}10`, border: `1.5px solid ${C.blue}30` }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Cadastro</p>
                <p className="text-3xl font-black" style={{ color: C.blue }}>{data.cadastroCount}</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: `${C.green}10`, border: `1.5px solid ${C.green}30` }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Aplicação</p>
                <p className="text-3xl font-black" style={{ color: C.green }}>{data.aplicacaoCount}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: C.green }}>{data.aplicacaoPct}% do total</p>
              </div>
            </div>
          </SectionCard>

          {/* Pipeline */}
          <SectionCard title="Pipeline do Webinar" subtitle="Da aba LEADS">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Agendamentos", value: data.pipelineAgendados, color: C.orange },
                { label: "Calls Realizadas", value: data.pipelineCalls, color: C.green },
                { label: "Vendas", value: data.pipelineVendas, color: C.purple },
                { label: "Cash Collected", value: fmtBRL(data.pipelineCash), color: C.blue },
                { label: "Show-up %", value: `${data.pipelineShowUp}%`, color: data.pipelineShowUp >= 70 ? C.green : data.pipelineShowUp >= 50 ? C.orange : C.red },
                { label: "Conversão %", value: `${data.pipelineConversao}%`, color: data.pipelineConversao >= 20 ? C.green : data.pipelineConversao >= 10 ? C.orange : C.red },
                { label: "Ticket Médio", value: data.pipelineTicket > 0 ? fmtBRL(data.pipelineTicket) : "–", color: "hsl(var(--foreground))" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg px-3 py-2.5" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                  <p className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
                  <p className="text-lg font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ── Aplicação (MR) View ──────────────────────────────────────────────────────
function AplicacaoView({ data }: { data: AplicacaoData }) {
  const rows: { label: string; value: number; isCurrency?: boolean; isPct?: boolean; color?: string; section?: string }[] = [
    { section: "Tráfego", label: "Amount Spent", value: data.amountSpent, isCurrency: true },
    { label: "Impressions", value: data.impressions },
    { label: "CPM", value: data.cpm, isCurrency: true },
    { label: "Link Clicks", value: data.linkClicks },
    { label: "CPC (Link)", value: data.cpc, isCurrency: true },
    { label: "CTR (Link)", value: data.ctr, isPct: true },
    { label: "Landing Page Views", value: data.lpViews },
    { section: "Conversão", label: "New Leads", value: data.newLeads, color: C.blue },
    { label: "LP Conversion", value: data.lpConversion, isPct: true, color: C.green },
    { label: "CPL", value: data.cpl, isCurrency: true, color: C.orange },
    { label: "Demos Booked", value: data.demosBooked, color: C.purple },
    { label: "Cost Per Demo", value: data.costPerDemo, isCurrency: true },
    { label: "Lead to Booking %", value: data.leadToBooking, isPct: true },
    { label: "Qualified Leads (Calls)", value: data.qualifiedLeads, color: C.green },
    { label: "Cost Per Qualified", value: data.costPerQualified, isCurrency: true },
    { section: "Receita", label: "Sales", value: data.sales, color: C.green },
    { label: "Contracted Revenue", value: data.contractedRevenue, isCurrency: true },
    { label: "UF Cash", value: data.ufCash, isCurrency: true, color: C.blue },
    { label: "CPA", value: data.cpa, isCurrency: true, color: C.red },
    { label: "Rev ROAS", value: data.revRoas },
    { label: "UF ROAS", value: data.ufRoas, color: C.green },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <SectionCard title="Aplicação (MR) — Métricas Completas" subtitle="Filtro: campanhas [MR] / Origem MR">
        <div className="space-y-0">
          {rows.map((r, i) => (
            <div key={i}>
              {r.section && (
                <div className="px-3 py-2 mt-2 first:mt-0"
                  style={{ background: "hsl(var(--muted) / 0.5)", borderBottom: "1px solid hsl(var(--border))" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.blue }}>{r.section}</p>
                </div>
              )}
              <MetricRow label={r.label} value={r.value} isCurrency={r.isCurrency} isPct={r.isPct} color={r.color} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Organic Funnel View (Estudo de Caso / Instagram) ─────────────────────────
function OrganicView({ data, title, subtitle }: { data: OrganicFunnelData; title: string; subtitle: string }) {
  const metrics = [
    { label: "Leads", value: data.leads, color: C.blue },
    { label: "Agendamentos", value: data.agendados, color: C.orange },
    { label: "Calls Realizadas", value: data.calls, color: C.green },
    { label: "Vendas", value: data.vendas, color: C.purple },
  ];
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <SectionCard title={title} subtitle={subtitle}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl p-4 text-center"
              style={{ background: `${m.color}08`, border: `1.5px solid ${m.color}25` }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>{m.label}</p>
              <p className="text-3xl font-black" style={{ color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-0">
          <MetricRow label="Cash Collected" value={data.cash} isCurrency color={C.blue} />
          <MetricRow label="Show-up %" value={data.showUp} isPct color={data.showUp >= 70 ? C.green : data.showUp >= 50 ? C.orange : C.red} />
          <MetricRow label="Conversão %" value={data.conversao} isPct color={data.conversao >= 20 ? C.green : data.conversao >= 10 ? C.orange : C.red} />
          <MetricRow label="Ticket Médio" value={data.ticket} isCurrency />
        </div>
      </SectionCard>
      {data.leads === 0 && (
        <p className="text-center text-sm py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
          Sem dados no período selecionado para este funil.
        </p>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function MarketingTab() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedWebinar, setSelectedWebinar] = useState<number | null>(null);
  const { range } = useDateRange();
  const { leads, metaAdveronix, leadsGhl, ghlLeadsTab, isLoading } = useSheetsData();
  const data = useMarketingDetailed(leads, metaAdveronix, leadsGhl, ghlLeadsTab, range, selectedWebinar);



  if (isLoading) return <MarketingLoading />;

  return (
    <div className="space-y-5">
      {/* Tab navigation */}
      <div className="flex items-center gap-1 rounded-xl p-1"
        style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: activeTab === tab.key ? "hsl(var(--card))" : "transparent",
              color: activeTab === tab.key ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: activeTab === tab.key ? "0 1px 4px hsl(0,0%,0%,0.08)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && <OverviewView data={data.overview} stagesData={data.stagesData} />}
      {activeTab === "webinar" && (
        <WebinarView data={data.webinar} selectedWebinar={selectedWebinar} setSelectedWebinar={setSelectedWebinar} />
      )}
      {activeTab === "aplicacao" && <AplicacaoView data={data.aplicacao} />}
      {activeTab === "estudo_caso" && (
        <OrganicView data={data.estudoCaso} title="Estudo de Caso" subtitle="Orgânico — sem dados META" />
      )}
      {activeTab === "instagram" && (
        <OrganicView data={data.instagram} title="Instagram DM" subtitle="Orgânico — sem dados META" />
      )}
    </div>
  );
}
