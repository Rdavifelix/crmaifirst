import { useMemo } from "react";
import { Target, ChevronRight } from "lucide-react";
import { useGoals } from "@/hooks/useGoals";
import { useAvancos } from "@/hooks/useAvancos";
import { useSheetsData } from "@/contexts/SheetsDataContext";
import { useVendasCharts } from "@/hooks/useVendasCharts";
import { useDateRange } from "@/hooks/useDateRange";
import { format, endOfMonth, differenceInBusinessDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const fmtBRL = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};

const fmtBRLFull = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ProgressBar({ pct }: { pct: number }) {
  const clampedPct = Math.min(pct, 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${clampedPct}%`,
            background: "hsl(var(--primary))",
          }}
        />
      </div>
      <span className="text-sm font-bold flex-shrink-0" style={{ color: "hsl(var(--foreground))" }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export function MetaComercialCard() {
  const navigate = useNavigate();
  const { leads, isLoading: sheetsLoading } = useSheetsData();
  const { range } = useDateRange();
  const charts = useVendasCharts(leads, range, "all");
  const period = format(new Date(), "yyyy-MM");
  const { goals, isLoading: goalsLoading } = useGoals(period);
  const { avancos, isLoading: avancosLoading } = useAvancos();

  const metrics = useMemo(() => {
    const metaReceita = goals.find(g => g.member_name === null && g.metric === "receita")?.target ?? 0;
    const metaVendas = goals.find(g => g.member_name === null && g.metric === "vendas")?.target ?? 0;

    const cashCollected = charts.totalReceita;
    const vendas = charts.totalVendas;

    const pctReceita = metaReceita > 0 ? (cashCollected / metaReceita) * 100 : 0;
    const pctVendas = metaVendas > 0 ? (vendas / metaVendas) * 100 : 0;

    const today = startOfDay(new Date());
    const monthEnd = endOfMonth(today);
    const diasUteis = differenceInBusinessDays(monthEnd, today);
    const dayOfMonth = new Date().getDate();

    const faltam = Math.max(metaReceita - cashCollected, 0);
    const porDia = dayOfMonth > 0 ? cashCollected / dayOfMonth : 0;
    const projecao = porDia * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

    const naMesa = avancos.reduce((s, a) => s + (a.valor || 0), 0);

    return {
      cashCollected,
      metaReceita,
      pctReceita,
      vendas,
      metaVendas,
      pctVendas,
      projecao,
      porDia,
      faltam,
      diasUteis,
      naMesa,
    };
  }, [charts, goals, avancos]);

  const isLoading = sheetsLoading || goalsLoading || avancosLoading;

  if (isLoading) {
    return (
      <div className="rounded-2xl p-6 animate-pulse" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <div className="h-6 w-40 rounded-lg mb-6" style={{ background: "hsl(var(--muted))" }} />
        <div className="h-4 w-60 rounded mb-3" style={{ background: "hsl(var(--muted))" }} />
        <div className="h-3 w-full rounded-full mb-6" style={{ background: "hsl(var(--muted))" }} />
        <div className="h-4 w-40 rounded mb-3" style={{ background: "hsl(var(--muted))" }} />
        <div className="h-3 w-full rounded-full" style={{ background: "hsl(var(--muted))" }} />
      </div>
    );
  }

  const periodLabel = format(new Date(), "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.12)" }}>
            <Target className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h2 className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>Meta Comercial</h2>
        </div>
        <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: "hsl(var(--muted-foreground))", background: "hsl(var(--muted) / 0.5)" }}>
          {periodLabel}
        </span>
      </div>

      <div className="px-6 pb-3 space-y-5">
        {/* Cash Collected */}
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black font-display" style={{ color: "hsl(var(--primary))" }}>
              {fmtBRLFull(metrics.cashCollected)}
            </span>
            {metrics.metaReceita > 0 && (
              <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                / {fmtBRLFull(metrics.metaReceita)}
              </span>
            )}
          </div>
          <ProgressBar pct={metrics.pctReceita} />
        </div>

        {/* Vendas / Logos */}
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black font-display" style={{ color: "hsl(var(--primary))" }}>
              {metrics.vendas}
            </span>
            {metrics.metaVendas > 0 && (
              <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                / {metrics.metaVendas} logos
              </span>
            )}
          </div>
          <ProgressBar pct={metrics.pctVendas} />
        </div>
      </div>

      {/* Bottom metrics */}
      <div className="grid grid-cols-5 divide-x" style={{ borderTop: "1px solid hsl(var(--border))", borderColor: "hsl(var(--border))" }}>
        {[
          { label: "PROJEÇÃO", value: fmtBRL(metrics.projecao) },
          { label: "/DIA", value: fmtBRL(metrics.porDia) },
          { label: "FALTAM", value: fmtBRL(metrics.faltam) },
          { label: "DIAS", value: String(metrics.diasUteis) },
        ].map((m) => (
          <div key={m.label} className="py-3.5 text-center">
            <p className="text-sm font-black" style={{ color: "hsl(var(--foreground))" }}>{m.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{m.label}</p>
          </div>
        ))}
        <div
          className="py-3.5 text-center cursor-pointer transition-colors hover:opacity-80"
          style={{ background: "hsl(var(--primary) / 0.08)" }}
          onClick={() => navigate("/na-mesa")}
        >
          <p className="text-sm font-black flex items-center justify-center gap-1" style={{ color: "hsl(var(--primary))" }}>
            {fmtBRL(metrics.naMesa)} <ChevronRight className="w-3.5 h-3.5" />
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "hsl(var(--primary))" }}>NA MESA</p>
        </div>
      </div>
    </div>
  );
}
