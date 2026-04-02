import { useMemo, useState } from "react";
import { Target, ChevronRight, Edit2, Check, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useGoals } from "@/hooks/useGoals";
import { useAvancos } from "@/hooks/useAvancos";
import { useSheetsData } from "@/contexts/SheetsDataContext";
import { useVendasCharts } from "@/hooks/useVendasCharts";
import { format, startOfMonth, endOfMonth, differenceInBusinessDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const fmtBRL = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};

const fmtBRLFull = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function getProgressColor(pct: number, expectedPct: number): string {
  const ratio = expectedPct > 0 ? pct / expectedPct : 1;
  if (pct >= 100) return "hsl(142, 71%, 45%)"; // green
  if (ratio >= 0.9) return "hsl(var(--primary))"; // on track: blue
  if (ratio >= 0.7) return "hsl(38, 92%, 50%)";  // slightly behind: amber
  return "hsl(0, 84%, 60%)"; // significantly behind: red
}

function PaceIcon({ pct, expectedPct }: { pct: number; expectedPct: number }) {
  if (expectedPct === 0) return null;
  const ratio = pct / expectedPct;
  if (ratio >= 0.95) return <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(142, 71%, 45%)" }} />;
  if (ratio >= 0.75) return <Minus className="w-3.5 h-3.5" style={{ color: "hsl(38, 92%, 50%)" }} />;
  return <TrendingDown className="w-3.5 h-3.5" style={{ color: "hsl(0, 84%, 60%)" }} />;
}

interface ProgressBarProps {
  pct: number;
  expectedPct: number;
  color: string;
}

function ProgressBar({ pct, expectedPct, color }: ProgressBarProps) {
  const clampedPct = Math.min(pct, 100);
  const clampedExpected = Math.min(expectedPct, 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 rounded-full overflow-visible relative" style={{ background: "hsl(var(--muted))" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${clampedPct}%`, background: color }}
        />
        {/* Expected pace marker */}
        {clampedExpected > 0 && clampedExpected < 100 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full opacity-60"
            style={{ left: `${clampedExpected}%`, background: "hsl(var(--foreground))" }}
          />
        )}
      </div>
      <span className="text-sm font-bold flex-shrink-0 w-12 text-right" style={{ color: "hsl(var(--foreground))" }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

interface InlineEditProps {
  label: string;
  value: number;
  onSave: (val: number) => void;
  format?: "currency" | "number";
}

function InlineEdit({ label, value, onSave, format: fmt = "number" }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  const start = () => {
    setInput(String(value || ""));
    setEditing(true);
  };

  const save = () => {
    const parsed = parseFloat(input.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    onSave(parsed);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  if (!editing) {
    return (
      <button
        onClick={start}
        className="group flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        <Edit2 className="w-3 h-3" />
        <span>{label}: {value > 0 ? (fmt === "currency" ? fmtBRLFull(value) : String(value)) : "definir"}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        className="text-xs h-7 px-2 rounded-md border outline-none w-36"
        style={{
          background: "hsl(var(--background))",
          border: "1px solid hsl(var(--border))",
          color: "hsl(var(--foreground))",
        }}
        placeholder={fmt === "currency" ? "Ex: 100000" : "Ex: 20"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
      />
      <button onClick={save} className="w-6 h-6 rounded flex items-center justify-center hover:opacity-80" style={{ background: "hsl(var(--primary))", color: "white" }}>
        <Check className="w-3 h-3" />
      </button>
      <button onClick={cancel} className="w-6 h-6 rounded flex items-center justify-center hover:opacity-80" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function MetaComercialCard() {
  const navigate = useNavigate();
  const { leads, isLoading: sheetsLoading } = useSheetsData();
  const currentMonthRange = useMemo(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, []);
  const charts = useVendasCharts(leads, currentMonthRange, "all");
  const period = format(new Date(), "yyyy-MM");
  const { goals, isLoading: goalsLoading, upsert } = useGoals(period);
  const { avancos, isLoading: avancosLoading } = useAvancos();

  const today = startOfDay(new Date());
  const monthEnd = endOfMonth(today);
  const dayOfMonth = today.getDate();
  const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  // Expected pace: fraction of month elapsed
  const expectedPct = (dayOfMonth / totalDaysInMonth) * 100;

  const metrics = useMemo(() => {
    const metaReceita = goals.find(g => g.member_name === null && g.metric === "receita")?.target ?? 0;
    const metaVendas = goals.find(g => g.member_name === null && g.metric === "vendas")?.target ?? 0;

    const cashCollected = charts.totalReceita;
    const vendas = charts.totalVendas;

    const pctReceita = metaReceita > 0 ? (cashCollected / metaReceita) * 100 : 0;
    const pctVendas = metaVendas > 0 ? (vendas / metaVendas) * 100 : 0;

    const diasUteis = differenceInBusinessDays(monthEnd, today);
    const porDia = dayOfMonth > 0 ? cashCollected / dayOfMonth : 0;
    const projecao = porDia * totalDaysInMonth;

    const faltam = Math.max(metaReceita - cashCollected, 0);
    const necessarioPorDia = diasUteis > 0 ? faltam / diasUteis : 0;

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
      necessarioPorDia,
    };
  }, [charts, goals, avancos, dayOfMonth, totalDaysInMonth, monthEnd, today]);

  const receitaColor = getProgressColor(metrics.pctReceita, expectedPct);
  const vendasColor = getProgressColor(metrics.pctVendas, expectedPct);

  const handleSaveReceita = (val: number) => {
    upsert({ period, member_name: null, role: null, metric: "receita", target: val });
  };

  const handleSaveVendas = (val: number) => {
    upsert({ period, member_name: null, role: null, metric: "vendas", target: val });
  };

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
          <div className="flex items-baseline justify-between mb-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-display" style={{ color: receitaColor }}>
                {fmtBRLFull(metrics.cashCollected)}
              </span>
              {metrics.metaReceita > 0 && (
                <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  / {fmtBRLFull(metrics.metaReceita)}
                </span>
              )}
            </div>
            <PaceIcon pct={metrics.pctReceita} expectedPct={expectedPct} />
          </div>
          <ProgressBar pct={metrics.pctReceita} expectedPct={expectedPct} color={receitaColor} />
          <div className="mt-1.5">
            <InlineEdit
              label="Meta receita"
              value={metrics.metaReceita}
              onSave={handleSaveReceita}
              format="currency"
            />
          </div>
        </div>

        {/* Vendas / Logos */}
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-display" style={{ color: vendasColor }}>
                {metrics.vendas}
              </span>
              {metrics.metaVendas > 0 && (
                <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                  / {metrics.metaVendas} logos
                </span>
              )}
            </div>
            <PaceIcon pct={metrics.pctVendas} expectedPct={expectedPct} />
          </div>
          <ProgressBar pct={metrics.pctVendas} expectedPct={expectedPct} color={vendasColor} />
          <div className="mt-1.5">
            <InlineEdit
              label="Meta vendas"
              value={metrics.metaVendas}
              onSave={handleSaveVendas}
              format="number"
            />
          </div>
        </div>
      </div>

      {/* Bottom metrics */}
      <div className="grid grid-cols-5 divide-x" style={{ borderTop: "1px solid hsl(var(--border))", borderColor: "hsl(var(--border))" }}>
        {[
          { label: "PROJEÇÃO", value: fmtBRL(metrics.projecao) },
          { label: "/DIA ATUAL", value: fmtBRL(metrics.porDia) },
          { label: "/DIA PRECISA", value: metrics.metaReceita > 0 ? fmtBRL(metrics.necessarioPorDia) : "—" },
          { label: "DIAS ÚTEIS", value: String(metrics.diasUteis) },
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
