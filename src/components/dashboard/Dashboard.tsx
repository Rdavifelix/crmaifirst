import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlobalDateRangePicker } from '@/components/GlobalDateRangePicker';
import { DateRangeProvider } from '@/hooks/useDateRange';
import { VendasTab } from './tabs/VendasTab';
import { MarketingTab } from './tabs/MarketingTab';
import { MetasTab } from './tabs/MetasTab';
import { MetaComercialCard } from './MetaComercialCard';
import { SheetsDataProvider, useSheetsData } from '@/contexts/SheetsDataContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw } from 'lucide-react';

// KPIs gerais (Visão Geral) mantidos com Supabase
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/dashboard/KpiCard';
import {
  useDashboardStats,
  useLeadsByStatus,
  useLeadsBySource,
  useLeadsByDay,
  useLossReasons,
  useMonthlyStats,
} from '@/hooks/useDashboard';
import { LEAD_STATUSES, LeadStatus } from '@/lib/constants';
import { Users, TrendingUp, Clock, Target } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

function VisaoGeralTab() {
  const { data: stats } = useDashboardStats();
  const { data: leadsByStatus } = useLeadsByStatus();
  const { data: leadsBySource } = useLeadsBySource();
  const { data: leadsByDay } = useLeadsByDay(30);
  const { data: lossReasons } = useLossReasons();
  const { data: monthly } = useMonthlyStats();
  const FMT = new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', notation: 'compact', maximumFractionDigits: 1 });
  const fmt = (v: number) => FMT.format(v);

  const statusColors = Object.entries(LEAD_STATUSES).reduce((acc, [key, value]) => {
    acc[key] = `hsl(var(--${value.color}))`;
    return acc;
  }, {} as Record<string, string>);

  const pieData = leadsByStatus?.map((item) => ({
    name: LEAD_STATUSES[item.status as LeadStatus]?.label || item.status,
    value: item.count,
    color: statusColors[item.status] || '#888',
  })) || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard featured title="Receita Total" value={fmt(stats?.totalRevenue || 0)}
          subtitle="Soma de todas as vendas" icon={<TrendingUp className="h-4 w-4" />} change={monthly?.revenueChange} />
        <KpiCard title="Total de Leads" value={stats?.totalLeads || 0}
          subtitle={`+${stats?.leadsThisMonth || 0} nos últimos 30 dias`} icon={<Users className="h-4 w-4" />} change={monthly?.leadsChange} />
        <KpiCard title="Taxa de Conversão" value={`${stats?.conversionRate || 0}%`}
          subtitle="Leads → Fechado" icon={<Target className="h-4 w-4" />} />
        <KpiCard title="Tempo no Funil" value={`${stats?.avgTimeInFunnel || 0} dias`}
          subtitle="Média até fechar" icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Leads por Dia</CardTitle><CardDescription>Últimos 30 dias</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={leadsByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={(v) => v.split('-').slice(1).join('/')} className="text-xs" interval={6} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="count" name="Leads" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" />
                <Area type="monotone" dataKey="won" name="Fechados" stroke="hsl(var(--status-won))" fill="hsl(var(--status-won) / 0.15)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Distribuição do Funil</CardTitle><CardDescription>Leads por etapa</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Performance por Origem</CardTitle><CardDescription>Canais que trazem mais resultados</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leadsBySource?.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="source" className="text-xs" width={100} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Total" fill="hsl(var(--primary))" radius={4} />
                <Bar dataKey="won" name="Fechados" fill="hsl(var(--status-won))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Motivos de Perda</CardTitle><CardDescription>Por que leads não fecham</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={lossReasons} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="reason" className="text-xs" width={130} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Leads" fill="hsl(var(--status-lost))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LastUpdatedBadge() {
  const { lastUpdated, isLoading } = useSheetsData();
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
        style={{ color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted) / 0.5)' }}>
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Atualizando...</span>
      </div>
    );
  }
  if (!lastUpdated) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
      style={{ color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted) / 0.5)' }}>
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span>Atualizado {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: ptBR })}</span>
    </div>
  );
}

function DashboardInner() {
  return (
    <DateRangeProvider>
      <div className="space-y-6 max-w-[1600px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-muted-foreground">Visão geral</p>
            <h1 className="text-3xl font-bold leading-none">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <LastUpdatedBadge />
            <GlobalDateRangePicker />
          </div>
        </div>

        {/* Meta Comercial */}
        <MetaComercialCard />

        {/* Tabs */}
        <Tabs defaultValue="vendas">
          <TabsList className="mb-2">
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="metas">Metas</TabsTrigger>
          </TabsList>

          <TabsContent value="vendas" className="mt-4"><VendasTab /></TabsContent>
          <TabsContent value="marketing" className="mt-4"><MarketingTab /></TabsContent>
          <TabsContent value="geral" className="mt-4"><VisaoGeralTab /></TabsContent>
          <TabsContent value="metas" className="mt-4"><MetasTab /></TabsContent>
        </Tabs>
      </div>
    </DateRangeProvider>
  );
}

export function Dashboard() {
  return (
    <SheetsDataProvider>
      <DashboardInner />
    </SheetsDataProvider>
  );
}
