import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeadTask } from './useLeadTasks';

export interface CalendarTask extends LeadTask {
  lead_name?: string;
  assigned_name?: string;
}

export interface UserAvailability {
  id: string;
  profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export function useCalendarTasks(startDate: string, endDate: string, filters?: {
  type?: string;
  assignedTo?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['calendar-tasks', startDate, endDate, filters],
    queryFn: async () => {
      let query = supabase
        .from('lead_tasks')
        .select('*, leads!inner(name)')
        .gte('scheduled_at', `${startDate}T00:00:00`)
        .lte('scheduled_at', `${endDate}T23:59:59`)
        .order('scheduled_at', { ascending: true });

      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profile names for assigned_to
      const assignedIds = [...new Set((data || []).map(t => t.assigned_to).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (assignedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assignedIds);
        profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Sem nome';
          return acc;
        }, {} as Record<string, string>);
      }

      return (data || []).map(t => ({
        ...t,
        lead_name: (t as any).leads?.name || null,
        assigned_name: t.assigned_to ? profileMap[t.assigned_to] : null,
      })) as CalendarTask[];
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useDayTasks(date: string) {
  return useCalendarTasks(date, date);
}

export function useCalendarStats(today: string, weekStart: string, weekEnd: string) {
  return useQuery({
    queryKey: ['calendar-stats', today, weekStart, weekEnd],
    queryFn: async () => {
      // Events today
      const { count: todayCount } = await supabase
        .from('lead_tasks')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', `${today}T00:00:00`)
        .lte('scheduled_at', `${today}T23:59:59`);

      // Meetings this week
      const { count: weekMeetings } = await supabase
        .from('lead_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'meeting')
        .gte('scheduled_at', `${weekStart}T00:00:00`)
        .lte('scheduled_at', `${weekEnd}T23:59:59`);

      // Overdue tasks
      const { count: overdue } = await supabase
        .from('lead_tasks')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'completed')
        .lt('scheduled_at', new Date().toISOString())
        .not('scheduled_at', 'is', null);

      // Next meeting
      const { data: nextMeetingData } = await supabase
        .from('lead_tasks')
        .select('title, scheduled_at')
        .eq('type', 'meeting')
        .neq('status', 'completed')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1);

      return {
        todayCount: todayCount || 0,
        weekMeetings: weekMeetings || 0,
        overdue: overdue || 0,
        nextMeeting: nextMeetingData?.[0] || null,
      };
    },
  });
}

export function useUserAvailability(profileId: string) {
  return useQuery({
    queryKey: ['user-availability', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_availability')
        .select('*')
        .eq('profile_id', profileId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data as UserAvailability[];
    },
    enabled: !!profileId,
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: {
      profile_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_available: boolean;
    }[]) => {
      // Upsert all 7 days
      const { error } = await supabase
        .from('user_availability')
        .upsert(items, { onConflict: 'profile_id,day_of_week' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-availability'] });
    },
  });
}
