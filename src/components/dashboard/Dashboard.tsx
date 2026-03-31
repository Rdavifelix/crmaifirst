import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useDashboardStats, 
  useLeadsByStatus, 
  useLeadsBySource, 
  useLeadsByDay,
  useLossReasons 
} from '@/hooks/useDashboard';
import { LEAD_STATUSES, LeadStatus } from '@/lib/constants';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

export function Dashboard() {
  const { data: stats } = useDashboardStats();
  const { data: leadsByStatus } = useLeadsByStatus();
  const { data: leadsBySource } = useLeadsBySource();
  const { data: leadsByDay } = useLeadsByDay(30);
  const { data: lossReasons } = useLossReasons();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      notation: 'compact',
    }).format(value);
  };

  const statusColors = Object.entries(LEAD_STATUSES).reduce((acc, [key, value]) => {
    acc[key] = `hsl(var(--${value.color}))`;
    return acc;
  }, {} as Record<string, string>);

  const pieData = leadsByStatus?.map(item => ({
    name: LEAD_STATUSES[item.status as LeadStatus]?.label || item.status,
    value: item.count,
    color: statusColors[item.status] || '#888',
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do seu funil de vendas
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.leadsThisMonth || 0} nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {(stats?.conversionRate || 0) > 10 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-status-won" />
                  <span className="text-status-won">Acima da média</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-status-lost" />
                  <span className="text-status-lost">Abaixo da média</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.avgDealValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por venda fechada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo no Funil</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgTimeInFunnel || 0} dias</div>
            <p className="text-xs text-muted-foreground">
              Média até fechar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue highlight */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Receita Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            {formatCurrency(stats?.totalRevenue || 0)}
          </div>
          <p className="text-muted-foreground mt-1">
            Soma de todas as vendas fechadas
          </p>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leads por dia */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Dia</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={leadsByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(v) => v.split('-').slice(1).join('/')}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  name="Leads" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="won" 
                  name="Fechados" 
                  stroke="hsl(var(--status-won))" 
                  fill="hsl(var(--status-won) / 0.2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Funil - Pizza */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição do Funil</CardTitle>
            <CardDescription>Leads por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leads por origem */}
        <Card>
          <CardHeader>
            <CardTitle>Performance por Origem</CardTitle>
            <CardDescription>Quais canais trazem mais resultados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadsBySource?.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis 
                  type="category" 
                  dataKey="source" 
                  className="text-xs" 
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" name="Total" fill="hsl(var(--primary))" radius={4} />
                <Bar dataKey="won" name="Fechados" fill="hsl(var(--status-won))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Motivos de perda */}
        <Card>
          <CardHeader>
            <CardTitle>Motivos de Perda</CardTitle>
            <CardDescription>Por que leads não fecham</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={lossReasons} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis 
                  type="category" 
                  dataKey="reason" 
                  className="text-xs" 
                  width={120}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" name="Leads" fill="hsl(var(--status-lost))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}