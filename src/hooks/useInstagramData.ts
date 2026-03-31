import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InstagramProfile {
  id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  profile_pic_url_hd?: string;
  biography?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  is_private?: boolean;
  is_verified?: boolean;
  external_url?: string;
  category?: string;
  fetched_at?: string;
  posts_count?: number;
  stories_count?: number;
}

export interface InstagramContent {
  id: string;
  lead_id: string;
  content_type: 'post' | 'story' | 'reel';
  instagram_id: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  transcription: string | null;
  likes_count: number | null;
  comments_count: number | null;
  taken_at: string | null;
  raw_data: any;
  created_at: string;
}

export function useInstagramContent(leadId: string) {
  return useQuery({
    queryKey: ['instagram-content', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_instagram_content')
        .select('*')
        .eq('lead_id', leadId)
        .order('taken_at', { ascending: false });
      
      if (error) throw error;
      return data as InstagramContent[];
    },
    enabled: !!leadId,
  });
}

export function useEnrichInstagram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, instagramUsername }: { leadId: string; instagramUsername: string }) => {
      const { data, error } = await supabase.functions.invoke('enrich-instagram', {
        body: { leadId, instagramUsername }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to enrich Instagram data');
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['instagram-content', variables.leadId] });
      toast({ title: 'Dados do Instagram carregados!', description: 'Perfil e posts foram salvos.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao buscar Instagram', 
        description: error.message || 'Não foi possível buscar os dados', 
        variant: 'destructive' 
      });
    },
  });
}
