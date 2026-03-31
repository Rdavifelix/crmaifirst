import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '../KpiCard';
import {
  useMonthlyStats,
  useSellerRanking,
  useRevenueByMonth,
  useLeadsBySource,
  useLossReasons,
  useDashboardStats,
} from '@/hooks/useDashboard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Target, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const FMT = new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', notation: 'compact', maximumFractionDigits: 1 });
const fmt = (v: number) => FMT.format(v);

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

export function VendasTab() {
  const { data: monthly } = useMonthlyStats();
  const { data: stats } = useDashboardStats();
  const { data: sellers } = useSellerRanking();
  const { data: revenueByMonth } = useRevenueByMonth(6);
  const { data: leadsBySource } = useLeadsBySource();
  const { data: lossReasons } = useLossReasons();

  const topRevenue = revenueByMonth?.reduce((max, m) => Math.max(max, m.revenue), 0) || 1;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          featured
          title="Receita do Mês"
          value={fmt(monthly?.revenueThisMonth || 0)}
          change={monthly?.revenueChange}
          icon={<TrendingUp className="h-4 w-4" />}
          subtitle="Vendas fechadas este mês"
        />
        <KpiCard
          title="Vendas Fechadas"
          value={monthly?.dealsThisMonth || 0}
          change={monthly?.dealsChange}
          icon={<ShoppingBag className="h-4 w-4" />}
          subtitle="Negócios ganhos este mês"
        />
        <KpiCard
          title="Ticket Médio"
          value={fmt(stats?.avgDealValue || 0)}
          icon={<DollarSign className="h-4 w-4" />}
          subtitle="Por venda fechada"
        />
        <KpiCard
          title="Taxa de Conversão"
          value={`${stats?.conversionRate || 0}%`}
          icon={<Target className="h-4 w-4" />}
          subtitle="Leads → Fechado"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => fmt(v)} width={80} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt(v), 'Receita']} />
                <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance por Canal</CardTitle>
            <CardDescription>Leads e conversões por origem</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leadsBySource?.slice(0, 7)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="source" className="text-xs" width={90} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Bar dataKey="count" name="Total" fill="hsl(var(--primary))" radius={4} />
                <Bar dataKey="won" name="Fechados" fill="hsl(var(--status-won))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Seller ranking + Loss reasons */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-4 w-4 text-amber-500" />
              Ranking de Vendedores
            </CardTitle>
            <CardDescription>Por receita total fechada</CardDescription>
          </CardHeader>
          <CardContent>
            {!sellers?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma venda fechada ainda
              </p>
            ) : (
              <div className="space-y-3">
                {sellers.slice(0, 8).map((seller, idx) => {
                  const pct = topRevenue > 0 ? (seller.revenue / (sellers[0]?.revenue || 1)) * 100 : 0;
                  return (
                    <div key={seller.id} className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-5 shrink-0 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{seller.name}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <Badge variant="secondary" className="text-xs">{seller.deals} vendas</Badge>
                            <span className="text-sm font-bold">{fmt(seller.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Motivos de Perda</CardTitle>
            <CardDescription>Por que leads não fecham</CardDescription>
          </CardHeader>
          <CardContent>
            {!lossReasons?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma perda registrada
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={lossReasons} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="reason" className="text-xs" width={130} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="Leads" fill="hsl(var(--status-lost))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
