import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, PhoneCall, Target, DollarSign, ShoppingBag, Calendar, Users, Briefcase } from "lucide-react";
import { KpiCard, SectionCard } from "@/components/KpiCard";
import { useSheetsData } from "@/contexts/SheetsDataContext";
import { useVendasCharts, ProductFilter } from "@/hooks/useVendasCharts";
import { useDateRange } from "@/hooks/useDateRange";
import { Skeleton } from "@/components/ui/skeleton";

const fmtBRLShort = (v: number) => {
  if (v >= 1000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};

const PIE_COLORS = [
  "hsl(218,70%,42%)", "hsl(162,55%,38%)", "hsl(36,88%,50%)", "hsl(258,60%,52%)",
];

const PUBLICO_COLORS = [
  "hsl(218,70%,42%)", "hsl(218,65%,50%)", "hsl(218,60%,58%)", "hsl(218,55%,65%)",
  "hsl(218,50%,72%)", "hsl(218,45%,78%)", "hsl(218,40%,83%)", "hsl(218,35%,88%)",
];

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const tt = {
  backgroundColor: "hsl(0,0%,100%)",
  border: "1px solid hsl(216,18%,88%)",
  color: "hsl(218,40%,12%)",
  fontSize: 12,
  borderRadius: 10,
  boxShadow: "0 4px 16px hsl(218,40%,20%,0.10)",
};

const PRODUCT_FILTERS: { key: ProductFilter; label: string }[] = [
  { key: "all", label: "Todos os Produtos" },
  { key: "MFA", label: "MFA" },
  { key: "PAA", label: "PAA" },
  { key: "outros", label: "Outros" },
];

export function VendasTab() {
  const { leads, isLoading } = useSheetsData();
  const { range } = useDateRange();
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const charts = useVendasCharts(leads, range, productFilter);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── KPIs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <KpiCard featured title="Vendas" value={String(charts.totalVendas)} subtitle="No período" icon={ShoppingBag} />
        <KpiCard title="Faturamento Total" value={fmtBRL(charts.totalFaturamento)} subtitle="Valor total contratado" icon={DollarSign} iconColor="hsl(36,88%,50%)" />
        <KpiCard title="Cash Collected" value={fmtBRL(charts.totalReceita)} subtitle="No período" icon={TrendingUp} iconColor="hsl(258,60%,52%)" />
        <KpiCard title="Ticket Médio" value={fmtBRL(charts.ticketMedio)} subtitle="Cash / vendas" icon={DollarSign} iconColor="hsl(162,55%,38%)" />
        <KpiCard title="Conversão" value={`${charts.taxaConversao.toFixed(1)}%`} subtitle="Vendas / Calls realizadas" icon={Target} iconColor="hsl(36,88%,50%)" />
        <KpiCard title="Reuniões Agendadas" value={String(charts.agendamentos)} subtitle="No período" icon={Calendar} iconColor="hsl(162,55%,38%)" />
        <KpiCard title="Calls Realizadas" value={String(charts.callsRealizadas)} subtitle={`${charts.totalCalls} calls total`} icon={PhoneCall} iconColor="hsl(192,78%,38%)" />
      </div>

      {/* ── Funnel Breakdown ──────────────────────────────────── */}
      {charts.funnelBreakdown.length > 0 && (
        <SectionCard title="Vendas por Funil" subtitle="Origem das vendas e faturamento por canal">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                   <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Funil</th>
                   <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Vendas</th>
                   <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Faturamento</th>
                   <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Cash</th>
                   <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Ticket Médio</th>
                   <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Agend.</th>
                   <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Reuniões</th>
                   <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Comparec.</th>
                   <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Conversão</th>
                 </tr>
               </thead>
               <tbody>
                 {charts.funnelBreakdown.map((f) => (
                   <tr key={f.funnel} style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}>
                     <td className="py-2.5 pr-4">
                       <div className="flex items-center gap-2">
                         <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: f.color }} />
                         <span className="font-medium" style={{ color: "hsl(var(--foreground))" }}>{f.label}</span>
                       </div>
                     </td>
                     <td className="text-center py-2.5 px-3 font-bold" style={{ color: "hsl(var(--foreground))" }}>{f.vendas}</td>
                     <td className="text-center py-2.5 px-3 font-semibold" style={{ color: "hsl(36,88%,50%)" }}>{fmtBRL(f.faturamento)}</td>
                     <td className="text-center py-2.5 px-3 font-semibold" style={{ color: "hsl(162,55%,38%)" }}>{fmtBRL(f.cashCollected)}</td>
                     <td className="text-center py-2.5 px-3 font-semibold" style={{ color: "hsl(258,60%,52%)" }}>{fmtBRL(f.ticketMedio)}</td>
                      <td className="text-center py-2.5 px-3" style={{ color: "hsl(var(--muted-foreground))" }}>{f.agendamentos}</td>
                      <td className="text-center py-2.5 px-3 font-semibold" style={{ color: "hsl(var(--foreground))" }}>{f.calls}</td>
                     <td className="text-center py-2.5 px-3 font-semibold" style={{ color: f.comparecimento >= 70 ? "hsl(162,55%,38%)" : f.comparecimento >= 50 ? "hsl(36,88%,50%)" : "hsl(var(--destructive))" }}>{f.comparecimento}%</td>
                     <td className="text-center py-2.5 px-3 font-semibold" style={{ color: f.conversao >= 30 ? "hsl(162,55%,38%)" : f.conversao >= 15 ? "hsl(36,88%,50%)" : "hsl(var(--muted-foreground))" }}>{f.conversao}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Row 2 ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <SectionCard title="Calls Agendadas vs Realizadas" subtitle="Por semana do mês atual" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.weeklyCallsData} barCategoryGap="32%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,18%,91%)" vertical={false} />
              <XAxis dataKey="semana" tick={{ fill: "hsl(218,16%,52%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(218,16%,52%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tt} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "hsl(218,16%,52%)", fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="agendadas" name="Agendadas" fill="hsl(218,50%,74%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizadas" name="Realizadas" fill="hsl(220,55%,20%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title={charts.areaTitle} subtitle={
          charts.areaGranularity === "daily" ? "Flutuação diária"
          : charts.areaGranularity === "weekly" ? "Flutuação semanal"
          : "Flutuação mensal"
        }>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={charts.areaData}>
              <defs>
                <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(218,70%,42%)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="hsl(218,70%,42%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(218,16%,52%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ ...tt, padding: "10px 14px", minWidth: 180 }}>
                      <p className="font-bold text-xs mb-2" style={{ color: "hsl(218,40%,12%)" }}>{label}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-4 text-xs">
                          <span style={{ color: "hsl(218,16%,52%)" }}>Vendas</span>
                          <span className="font-bold" style={{ color: "hsl(218,70%,42%)" }}>{d.vendas}</span>
                        </div>
                        {d.faturamento > 0 && (
                          <div className="flex justify-between gap-4 text-xs">
                            <span style={{ color: "hsl(218,16%,52%)" }}>Faturamento</span>
                            <span className="font-bold" style={{ color: "hsl(36,88%,50%)" }}>{fmtBRL(d.faturamento)}</span>
                          </div>
                        )}
                        {d.coletado > 0 && (
                          <div className="flex justify-between gap-4 text-xs">
                            <span style={{ color: "hsl(218,16%,52%)" }}>Coletado</span>
                            <span className="font-bold" style={{ color: "hsl(162,55%,38%)" }}>{fmtBRL(d.coletado)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="vendas"
                name="Vendas"
                stroke="hsl(218,70%,42%)"
                strokeWidth={2}
                fill="url(#gradVendas)"
                dot={{ r: 3, fill: "hsl(218,70%,42%)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ── Row 3 ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <SectionCard title="Vendas por Produto">
          {charts.pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={charts.pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                    {charts.pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={tt} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
                {charts.pieData.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{p.name}</span>
                    <span className="text-xs font-bold ml-auto" style={{ color: "hsl(var(--foreground))" }}>{p.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
              Dados de produto em breve
            </p>
          )}
        </SectionCard>

        <SectionCard title="Ranking Closers" subtitle={`Meta: ${35} vendas`} className="lg:col-span-2">
          {charts.closers.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 pb-1" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                <div className="col-span-4" />
                <div className="col-span-2 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Calls</span>
                </div>
                <div className="col-span-3 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Cash</span>
                </div>
                <div className="col-span-3 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Conv.</span>
                </div>
              </div>

              {charts.closers.map((c, i) => {
                const pct = Math.min(Math.round((c.vendas / c.meta) * 100), 100);
                const medals = ["🥇", "🥈", "🥉"];
                const barColor = pct >= 100 ? "hsl(162,55%,38%)" : "hsl(218,70%,42%)";
                const convColor = c.conversao >= 30 ? "hsl(162,55%,38%)" : c.conversao >= 15 ? "hsl(36,88%,50%)" : "hsl(var(--muted-foreground))";
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center py-1">
                    <div className="col-span-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm w-4 leading-none">{medals[i] ?? String(i + 1)}</span>
                        <span className="text-xs font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{c.name}</span>
                        <span className="text-xs font-bold ml-auto" style={{ color: barColor }}>{c.vendas}<span className="font-normal text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>/{c.meta}</span></span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-col items-center gap-0.5">
                      <span className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>{c.calls}</span>
                      <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>calls</span>
                    </div>
                    <div className="col-span-3 flex flex-col items-center gap-0.5">
                      <span className="text-sm font-bold" style={{ color: "hsl(162,55%,38%)" }}>{fmtBRLShort(c.cashCollected)}</span>
                      <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>coletado</span>
                    </div>
                    <div className="col-span-3 flex flex-col items-center gap-0.5">
                      <span className="text-sm font-bold" style={{ color: convColor }}>{c.conversao}%</span>
                      <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>conv.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
              Ranking em breve
            </p>
          )}
        </SectionCard>

      </div>

      {/* ── Row 4: Conversão por Horário ────────────────────────── */}
      <SectionCard
        title="Taxa de Conversão por Horário"
        subtitle="% de vendas sobre calls realizadas em cada faixa de hora"
      >
        {charts.convByHour.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.convByHour} barCategoryGap="28%">
              <defs>
                <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(162,55%,38%)" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(162,55%,38%)" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,18%,91%)" vertical={false} />
              <XAxis dataKey="hora" tick={{ fill: "hsl(218,16%,52%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "hsl(218,16%,52%)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} width={38} />
              <Tooltip
                contentStyle={tt}
                formatter={(value: number, _name: string, props) => {
                  const d = props.payload;
                  return [
                    <><span style={{ fontWeight: 700 }}>{value}%</span><span style={{ color: "hsl(218,16%,52%)", marginLeft: 6, fontSize: 11 }}>({d.vendas} vendas / {d.calls} calls)</span></>,
                    "Conversão",
                  ];
                }}
              />
              <Bar dataKey="conversao" name="Conversão (%)" fill="url(#gradConv)" radius={[5, 5, 0, 0]}>
                {charts.convByHour.map((d, i) => {
                  const color = d.conversao >= 40 ? "hsl(162,55%,38%)" : d.conversao >= 20 ? "hsl(36,88%,50%)" : "hsl(218,70%,42%)";
                  return <Cell key={i} fill={color} fillOpacity={0.85} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <PhoneCall className="w-8 h-8 opacity-20" style={{ color: "hsl(var(--muted-foreground))" }} />
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Nenhuma call com horário registrado no período.</p>
          </div>
        )}
      </SectionCard>

      {/* ── Row 5: No-Show por Horário ──────────────────────────── */}
      <SectionCard
        title="Taxa de No-Show por Horário"
        subtitle="% de leads que não compareceram sobre os agendados em cada faixa de hora"
      >
        {charts.noShowByHour.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.noShowByHour} barCategoryGap="28%">
              <defs>
                <linearGradient id="gradNoShow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0,72%,51%)" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(0,72%,51%)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,18%,91%)" vertical={false} />
              <XAxis dataKey="hora" tick={{ fill: "hsl(218,16%,52%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "hsl(218,16%,52%)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} width={38} />
              <Tooltip
                contentStyle={tt}
                formatter={(value: number, _name: string, props) => {
                  const d = props.payload;
                  return [
                    <><span style={{ fontWeight: 700 }}>{value}%</span><span style={{ color: "hsl(218,16%,52%)", marginLeft: 6, fontSize: 11 }}>({d.noshows} no-show / {d.agendados} agendados)</span></>,
                    "No-Show",
                  ];
                }}
              />
              <Bar dataKey="taxaNoshow" name="No-Show (%)" fill="url(#gradNoShow)" radius={[5, 5, 0, 0]}>
                {charts.noShowByHour.map((d, i) => {
                  const color = d.taxaNoshow >= 50 ? "hsl(0,72%,51%)" : d.taxaNoshow >= 25 ? "hsl(36,88%,50%)" : "hsl(218,70%,42%)";
                  return <Cell key={i} fill={color} fillOpacity={0.85} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <PhoneCall className="w-8 h-8 opacity-20" style={{ color: "hsl(var(--muted-foreground))" }} />
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Nenhum dado de no-show com horário registrado no período.</p>
          </div>
        )}
      </SectionCard>

      {/* ── Row 6: Perfil do Público — filtro por produto ───────── */}
      <div>
        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider mr-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Filtrar por produto:
          </span>
          {PRODUCT_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setProductFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
              style={
                productFilter === f.key
                  ? { background: "hsl(218,70%,42%)", color: "hsl(0,0%,100%)", boxShadow: "0 2px 8px hsl(218,70%,42%,0.30)" }
                  : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Profissão */}
          <SectionCard
            title="Vendas por Profissão"
            subtitle="Categorias do público que mais compraram no período"
          >
            {charts.profissaoBreakdown.length > 0 ? (
              <div className="space-y-2.5 mt-1">
                {charts.profissaoBreakdown.map((d, i) => {
                  const maxVendas = charts.profissaoBreakdown[0].vendas;
                  const pct = Math.round((d.vendas / maxVendas) * 100);
                  const convColor = d.conversao >= 30 ? "hsl(162,55%,38%)" : d.conversao >= 15 ? "hsl(36,88%,50%)" : "hsl(var(--muted-foreground))";
                  return (
                    <div key={d.label} className="flex items-center gap-3">
                      <div className="w-4 text-center">
                        <span className="text-[11px] font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate pr-2" style={{ color: "hsl(var(--foreground))" }}>{d.label}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs font-bold" style={{ color: "hsl(218,70%,42%)" }}>{d.vendas} vendas</span>
                            <span className="text-xs font-semibold" style={{ color: convColor }}>{d.conversao}% conv.</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: PUBLICO_COLORS[i % PUBLICO_COLORS.length] }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Briefcase className="w-7 h-7 opacity-20" style={{ color: "hsl(var(--muted-foreground))" }} />
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Sem dados de profissão no período.
                </p>
              </div>
            )}
          </SectionCard>

          {/* Faturamento */}
          <SectionCard
            title="Vendas por Faixa de Faturamento"
            subtitle="Faixa de faturamento do público que mais comprou no período"
          >
            {charts.faturamentoBreakdown.length > 0 ? (
              <div className="space-y-2.5 mt-1">
                {charts.faturamentoBreakdown.map((d, i) => {
                  const maxVendas = charts.faturamentoBreakdown[0].vendas;
                  const pct = Math.round((d.vendas / maxVendas) * 100);
                  const convColor = d.conversao >= 30 ? "hsl(162,55%,38%)" : d.conversao >= 15 ? "hsl(36,88%,50%)" : "hsl(var(--muted-foreground))";
                  return (
                    <div key={d.label} className="flex items-center gap-3">
                      <div className="w-4 text-center">
                        <span className="text-[11px] font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate pr-2" style={{ color: "hsl(var(--foreground))" }}>{d.label}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs font-bold" style={{ color: "hsl(218,70%,42%)" }}>{d.vendas} vendas</span>
                            <span className="text-xs font-semibold" style={{ color: convColor }}>{d.conversao}% conv.</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: PUBLICO_COLORS[i % PUBLICO_COLORS.length] }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Users className="w-7 h-7 opacity-20" style={{ color: "hsl(var(--muted-foreground))" }} />
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Sem dados de faturamento no período.
                </p>
              </div>
            )}
          </SectionCard>

        </div>
      </div>

    </div>
  );
}
