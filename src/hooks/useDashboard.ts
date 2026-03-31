import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export interface DashboardStats {
  totalLeads: number;
  leadsThisMonth: number;
  conversionRate: number;
  avgDealValue: number;
  avgTimeInFunnel: number;
  totalRevenue: number;
}

export interface LeadsByStatus {
  status: string;
  count: number;
}

export interface LeadsBySource {
  source: string;
  count: number;
  won: number;
  revenue: number;
}

export interface LeadsByDay {
  date: string;
  count: number;
  won: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      // Total leads
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // Leads this month
      const { count: leadsThisMonth } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Won leads and revenue
      const { data: wonLeads } = await supabase
        .from('leads')
        .select('deal_value, entered_at, closed_at')
        .eq('status', 'won');

      const totalWon = wonLeads?.length || 0;
      const totalRevenue = wonLeads?.reduce((sum, l) => sum + (l.deal_value || 0), 0) || 0;
      const avgDealValue = totalWon > 0 ? totalRevenue / totalWon : 0;

      // Conversion rate
      const conversionRate = totalLeads ? (totalWon / totalLeads) * 100 : 0;

      // Average time in funnel (days)
      const avgTimeInFunnel = wonLeads?.length
        ? wonLeads.reduce((sum, l) => {
            if (l.entered_at && l.closed_at) {
              const days = (new Date(l.closed_at).getTime() - new Date(l.entered_at).getTime()) / (1000 * 60 * 60 * 24);
              return sum + days;
            }
            return sum;
          }, 0) / wonLeads.length
        : 0;

      return {
        totalLeads: totalLeads || 0,
        leadsThisMonth: leadsThisMonth || 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgDealValue: Math.round(avgDealValue),
        avgTimeInFunnel: Math.round(avgTimeInFunnel * 10) / 10,
        totalRevenue,
      } as DashboardStats;
    },
  });
}

export function useLeadsByStatus() {
  return useQuery({
    queryKey: ['leads-by-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('status');

      const statusCounts: Record<string, number> = {};
      data?.forEach((lead) => {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      });

      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })) as LeadsByStatus[];
    },
  });
}

export function useLeadsBySource() {
  return useQuery({
    queryKey: ['leads-by-source'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('utm_source, status, deal_value');

      const sourceData: Record<string, { count: number; won: number; revenue: number }> = {};
      data?.forEach((lead) => {
        const source = lead.utm_source || 'Direto';
        if (!sourceData[source]) {
          sourceData[source] = { count: 0, won: 0, revenue: 0 };
        }
        sourceData[source].count++;
        if (lead.status === 'won') {
          sourceData[source].won++;
          sourceData[source].revenue += lead.deal_value || 0;
        }
      });

      return Object.entries(sourceData)
        .map(([source, data]) => ({ source, ...data }))
        .sort((a, b) => b.count - a.count) as LeadsBySource[];
    },
  });
}

export function useLeadsByDay(days: number = 30) {
  return useQuery({
    queryKey: ['leads-by-day', days],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), days));
      
      const { data } = await supabase
        .from('leads')
        .select('created_at, status')
        .gte('created_at', startDate.toISOString());

      const dayData: Record<string, { count: number; won: number }> = {};
      
      // Initialize all days
      for (let i = 0; i <= days; i++) {
        const date = format(subDays(new Date(), days - i), 'yyyy-MM-dd');
        dayData[date] = { count: 0, won: 0 };
      }

      data?.forEach((lead) => {
        const date = format(new Date(lead.created_at), 'yyyy-MM-dd');
        if (dayData[date]) {
          dayData[date].count++;
          if (lead.status === 'won') {
            dayData[date].won++;
          }
        }
      });

      return Object.entries(dayData)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)) as LeadsByDay[];
    },
  });
}

export function useLossReasons() {
  return useQuery({
    queryKey: ['loss-reasons'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('loss_reason')
        .eq('status', 'lost')
        .not('loss_reason', 'is', null);

      const reasonCounts: Record<string, number> = {};
      data?.forEach((lead) => {
        if (lead.loss_reason) {
          reasonCounts[lead.loss_reason] = (reasonCounts[lead.loss_reason] || 0) + 1;
        }
      });

      return Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
    },
  });
}