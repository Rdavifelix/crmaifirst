import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMonthlyStats, useSellerRanking } from '@/hooks/useDashboard';
import { Target, TrendingUp, Calendar, Zap, Edit2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const FMT = new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', notation: 'compact', maximumFractionDigits: 1 });
const fmt = (v: number) => FMT.format(v);

const GOAL_KEY = 'crm-meta-mensal';

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

export function MetasTab() {
  const { data: monthly } = useMonthlyStats();
  const { data: sellers } = useSellerRanking();

  const [goal, setGoal] = useState<number>(0);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(GOAL_KEY);
    if (saved) setGoal(parseFloat(saved));
  }, []);

  const saveGoal = () => {
    const val = parseFloat(inputVal.replace(/[^\d.]/g, '')) || 0;
    setGoal(val);
    localStorage.setItem(GOAL_KEY, String(val));
    setEditing(false);
  };

  const startEdit = () => {
    setInputVal(String(goal || ''));
    setEditing(true);
  };

  const revenue = monthly?.revenueThisMonth || 0;
  const pct = goal > 0 ? Math.min((revenue / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - revenue, 0);
  const daysLeft = getBusinessDaysLeft();
  const totalDays = getBusinessDaysInMonth();
  const daysElapsed = totalDays - daysLeft;
  const dailyAvg = daysElapsed > 0 ? revenue / daysElapsed : 0;
  const projection = dailyAvg * totalDays;
  const now = new Date();

  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-primary' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500';

  const totalRevenue = sellers?.reduce((s, v) => s + v.revenue, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Meta do mês */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Meta Comercial — {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
              </CardTitle>
              <CardDescription>Acompanhe o progresso da receita mensal</CardDescription>
            </div>
            {!editing ? (
              <Button variant="ghost" size="sm" onClick={startEdit} className="shrink-0">
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                {goal > 0 ? 'Editar meta' : 'Definir meta'}
              </Button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  className="w-36 h-8 text-sm"
                  placeholder="Ex: 500000"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                  autoFocus
                />
                <Button size="sm" className="h-8" onClick={saveGoal}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold">{fmt(revenue)}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {goal > 0 ? `de ${fmt(goal)} (${pct.toFixed(1)}%)` : 'Meta não definida'}
              </p>
            </div>
            {goal > 0 && remaining > 0 && (
              <p className="text-sm text-muted-foreground">
                Faltam <span className="font-semibold text-foreground">{fmt(remaining)}</span>
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
                <span>{fmt(goal)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Por Dia</p>
                <p className="text-lg font-bold">{fmt(dailyAvg)}</p>
                <p className="text-xs text-muted-foreground">média diária atual</p>
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

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-red-50 dark:bg-red-950 text-red-600">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Faltam</p>
                <p className="text-lg font-bold">{goal > 0 ? fmt(remaining) : '—'}</p>
                <p className="text-xs text-muted-foreground">para atingir a meta</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seller goals */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Vendedor</CardTitle>
          <CardDescription>Receita fechada por membro da equipe (histórico total)</CardDescription>
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
                        <span className="text-xs text-muted-foreground w-10 text-right">{sellerPct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
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
