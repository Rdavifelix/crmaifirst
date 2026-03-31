import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Candidate {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  signature_analysis: any | null;
  signature_status: string;
  status: string;
  interview_score: number | null;
  interview_analysis: any | null;
  meet_link: string | null;
  meet_event_id: string | null;
  created_by: string | null;
  token: string;
  notes: string | null;
  position: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewSession {
  id: string;
  candidate_id: string;
  profile_id: string | null;
  status: string;
  transcriptions: any;
  ai_analysis: any | null;
  ai_score: number | null;
  ai_sentiment: string | null;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export function useCandidates(statusFilter?: string) {
  return useQuery({
    queryKey: ['candidates', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('candidates' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Candidate[];
    },
  });
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: ['candidates', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates' as any)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as Candidate;
    },
    enabled: !!id,
  });
}

export function useCandidateByToken(token: string) {
  return useQuery({
    queryKey: ['candidates', 'token', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates' as any)
        .select('*')
        .eq('token', token)
        .single();
      if (error) throw error;
      return data as unknown as Candidate;
    },
    enabled: !!token,
  });
}

export function useInterviewSessions(candidateId: string) {
  return useQuery({
    queryKey: ['interview-sessions', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_sessions' as any)
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as InterviewSession[];
    },
    enabled: !!candidateId,
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (candidate: {
      name: string;
      email: string;
      phone: string;
      position: string;
      photo_url?: string;
      token: string;
    }) => {
      const { data, error } = await supabase
        .from('candidates' as any)
        .insert([candidate])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Candidate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Candidate> & { id: string }) => {
      const { data, error } = await supabase
        .from('candidates' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Candidate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast({ title: 'Candidato atualizado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar candidato', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateInterviewSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: {
      candidate_id: string;
      profile_id: string;
    }) => {
      const { data, error } = await supabase
        .from('interview_sessions' as any)
        .insert([session])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as InterviewSession;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['interview-sessions', vars.candidate_id] });
    },
  });
}

export function useUpdateInterviewSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InterviewSession> & { id: string }) => {
      const { data, error } = await supabase
        .from('interview_sessions' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as InterviewSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-sessions'] });
    },
  });
}

export function useGenerateCandidateToken() {
  return useMutation({
    mutationFn: async (data: { position: string; created_by: string }) => {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const { data: candidate, error } = await supabase
        .from('candidates' as any)
        .insert([{
          token,
          position: data.position,
          created_by: data.created_by,
          status: 'registered',
          signature_status: 'pending',
        }])
        .select()
        .single();
      if (error) throw error;
      return candidate as unknown as Candidate;
    },
  });
}
