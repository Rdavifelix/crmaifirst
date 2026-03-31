-- Add Instagram fields to leads table
ALTER TABLE public.leads
ADD COLUMN instagram_username text,
ADD COLUMN instagram_data jsonb;

-- Create table to store Instagram posts and stories with transcriptions
CREATE TABLE public.lead_instagram_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content_type text NOT NULL, -- 'post', 'story', 'reel'
  instagram_id text,
  media_url text,
  thumbnail_url text,
  caption text,
  transcription text, -- AI transcription of image/video content
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  taken_at timestamp with time zone,
  raw_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_instagram_content ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Instagram content is viewable by authenticated users" 
ON public.lead_instagram_content 
FOR SELECT 
USING (true);

CREATE POLICY "Instagram content can be created by authenticated users" 
ON public.lead_instagram_content 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Instagram content can be deleted by authenticated users" 
ON public.lead_instagram_content 
FOR DELETE 
USING (true);

-- Create index for better performance
CREATE INDEX idx_lead_instagram_content_lead_id ON public.lead_instagram_content(lead_id);
CREATE INDEX idx_leads_instagram_username ON public.leads(instagram_username) WHERE instagram_username IS NOT NULL;