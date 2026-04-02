import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSellerRanking } from '@/hooks/useDashboard';
import { useGoals } from '@/hooks/useGoals';
import { useSheetsData } from '@/contexts/SheetsDataContext';
import { useVendasCharts } from '@/hooks/useVendasCharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Target, TrendingUp, Calendar, Zap, Edit2, Check, X, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const FMT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
const fmt = (v: number) => FMT.format(v);
const fmtFull = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function getBusinessDaysLeft(): number {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  let days = 0;
  const cur = new Date(today);
  cur.setDate(cur.getDate() + 1);
  while (cur <= endOfMonth) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function getBusinessDaysInMonth(): number {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  let days = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getBarColor(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 75) return 'bg-primary';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

interface GoalCardProps {
  title: string;
  description: string;
  current: number;
  goal: number;
  onSave: (val: number) => void;
  formatType: 'currency' | 'number';
  unit?: string;
  icon: React.ReactNode;
}

function GoalCard({ title, description, current, goal, onSave, formatType, unit, icon }: GoalCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const barColor = getBarColor(pct);
  const remaining = Math.max(goal - current, 0);

  const startEdit = () => {
    setInputVal(String(goal || ''));
    setEditing(true);
  };

  const saveGoal = () => {
    const val = parseFloat(inputVal.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    onSave(val);
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const displayCurrent = formatType === 'currency' ? fmtFull(current) : `${current}${unit ? ` ${unit}` : ''}`;
  const displayGoal = formatType === 'currency' ? fmtFull(goal) : `${goal}${unit ? ` ${unit}` : ''}`;
  const displayRemaining = formatType === 'currency' ? fmt(remaining) : `${remaining}${unit ? ` ${unit}` : ''}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-primary/10 text-primary">{icon}</div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={startEdit} className="shrink-0">
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              {goal > 0 ? 'Editar' : 'Definir meta'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <Input
                className="w-36 h-8 text-sm"
                placeholder={formatType === 'currency' ? 'Ex: 500000' : 'Ex: 20'}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') cancelEdit(); }}
                autoFocus
              />
              <Button size="sm" className="h-8 px-2" onClick={saveGoal}><Check className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold">{displayCurrent}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {goal > 0 ? `de ${displayGoal} (${pct.toFixed(1)}%)` : 'Meta não definida'}
            </p>
          </div>
          {goal > 0 && remaining > 0 && (
            <p className="text-sm text-muted-foreground">
              Faltam <span className="font-semibold text-foreground">{displayRemaining}</span>
            </p>
          )}
          {goal > 0 && remaining === 0 && (
            <p className="text-sm font-semibold text-emerald-600">Meta atingida! 🎉</p>
          )}
        </div>

        {goal > 0 && (
          <div className="space-y-1">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>{displayGoal}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MetasTab() {
  const { data: sellers } = useSellerRanking();
  const { leads } = useSheetsData();
  const currentMonthRange = useMemo(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, []);
  const charts = useVendasCharts(leads, currentMonthRange, 'all');
  const period = format(new Date(), 'yyyy-MM');
  const { goals, upsert } = useGoals(period);

  const metaReceita = goals.find(g => g.member_name === null && g.metric === 'receita')?.target ?? 0;
  const metaVendas = goals.find(g => g.member_name === null && g.metric === 'vendas')?.target ?? 0;

  const revenue = charts.totalReceita;
  const vendas = charts.totalVendas;

  const daysLeft = getBusinessDaysLeft();
  const totalDays = getBusinessDaysInMonth();
  const daysElapsed = totalDays - daysLeft;
  const dailyAvg = daysElapsed > 0 ? revenue / daysElapsed : 0;
  const projection = dailyAvg * totalDays;
  const remaining = Math.max(metaReceita - revenue, 0);
  const necessarioPorDia = daysLeft > 0 && remaining > 0 ? remaining / daysLeft : 0;

  const now = new Date();
  const totalRevenue = sellers?.reduce((s, v) => s + v.revenue, 0) || 0;

  const handleSaveReceita = (val: number) => {
    upsert({ period, member_name: null, role: null, metric: 'receita', target: val });
  };

  const handleSaveVendas = (val: number) => {
    upsert({ period, member_name: null, role: null, metric: 'vendas', target: val });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Metas — {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</h2>
          <p className="text-sm text-muted-foreground">Acompanhe e ajuste as metas mensais da equipe</p>
        </div>
      </div>

      {/* Meta Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GoalCard
          title="Meta de Receita"
          description="Cash collected no mês"
          current={revenue}
          goal={metaReceita}
          onSave={handleSaveReceita}
          formatType="currency"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <GoalCard
          title="Meta de Vendas"
          description="Contratos fechados (logos)"
          current={vendas}
          goal={metaVendas}
          onSave={handleSaveVendas}
          formatType="number"
          unit="vendas"
          icon={<ShoppingCart className="h-5 w-5" />}
        />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950 text-blue-600">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Projeção</p>
                <p className="text-lg font-bold">{fmt(projection)}</p>
                <p className="text-xs text-muted-foreground">estimativa para o mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-amber-50 dark:bg-amber-950 text-amber-600">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Por Dia (atual)</p>
                <p className="text-lg font-bold">{fmt(dailyAvg)}</p>
                <p className="text-xs text-muted-foreground">média diária atual</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className={cn("rounded-lg p-2", necessarioPorDia > dailyAvg ? "bg-red-50 dark:bg-red-950 text-red-600" : "bg-emerald-50 dark:bg-emerald-950 text-emerald-600")}>
                <Target className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Precisa/Dia</p>
                <p className="text-lg font-bold">{metaReceita > 0 ? fmt(necessarioPorDia) : '—'}</p>
                <p className="text-xs text-muted-foreground">para bater a meta</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-purple-50 dark:bg-purple-950 text-purple-600">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Dias Úteis</p>
                <p className="text-lg font-bold">{daysLeft}</p>
                <p className="text-xs text-muted-foreground">restantes no mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seller performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Vendedor</CardTitle>
          <CardDescription>Receita fechada por membro da equipe neste período</CardDescription>
        </CardHeader>
        <CardContent>
          {!sellers?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma venda fechada ainda. Atribua leads a vendedores para visualizar o ranking.
            </p>
          ) : (
            <div className="space-y-4">
              {sellers.map((seller, idx) => {
                const sellerPct = totalRevenue > 0 ? (seller.revenue / totalRevenue) * 100 : 0;
                const metaSellerReceita = goals.find(g => g.member_name === seller.name && g.metric === 'receita')?.target ?? 0;
                const sellerGoalPct = metaSellerReceita > 0 ? Math.min((seller.revenue / metaSellerReceita) * 100, 100) : 0;

                return (
                  <div key={seller.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs font-bold w-5',
                          idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-muted-foreground'
                        )}>
                          #{idx + 1}
                        </span>
                        <span className="text-sm font-medium">{seller.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{seller.deals} vendas</span>
                        <span className="font-semibold">{fmt(seller.revenue)}</span>
                        {metaSellerReceita > 0 && (
                          <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", sellerGoalPct >= 100 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                            {sellerGoalPct.toFixed(0)}% meta
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground w-10 text-right">{sellerPct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", getBarColor(sellerGoalPct > 0 ? sellerGoalPct : sellerPct))}
                        style={{ width: `${sellerPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
