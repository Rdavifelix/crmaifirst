import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadMeeting {
  id: string;
  lead_id: string;
  profile_id: string;
  status: string;
  transcriptions: any;
  ai_summary: string | null;
  ai_key_points: any;
  ai_sentiment: string | null;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export function useLeadMeetings(leadId: string) {
  return useQuery({
    queryKey: ['lead-meetings', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_meetings' as any)
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as LeadMeeting[];
    },
    enabled: !!leadId,
  });
}
