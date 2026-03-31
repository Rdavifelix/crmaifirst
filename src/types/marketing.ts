export interface MarketingAccount {
  id: string;
  profile_id: string;
  platform: 'meta';
  account_id: string;
  account_name: string | null;
  access_token: string;
  page_id: string | null;
  page_name: string | null;
  pixel_id: string | null;
  currency: string;
  timezone: string;
  status: 'active' | 'expired' | 'disconnected';
  token_expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
export type CreativeAngle = 'dor' | 'oportunidade' | 'resultado' | 'curiosidade' | 'autoridade';
export type CreativeFormat = '1:1' | '9:16' | '4:5' | '16:9';

export interface MarketingCampaign {
  id: string;
  account_id: string;
  meta_campaign_id: string | null;
  name: string;
  objective: string;
  status: CampaignStatus;
  daily_budget: number | null;
  lifetime_budget: number | null;
  special_ad_categories: string[];
  buying_type: string;
  metrics: CampaignMetrics;
  last_synced_at: string | null;
  start_time: string | null;
  stop_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingAdSet {
  id: string;
  campaign_id: string;
  meta_adset_id: string | null;
  name: string;
  status: CampaignStatus;
  daily_budget: number | null;
  lifetime_budget: number | null;
  billing_event: string;
  optimization_goal: string;
  bid_strategy: string;
  targeting: AdSetTargeting;
  promoted_object: Record<string, unknown>;
  metrics: CampaignMetrics;
  last_synced_at: string | null;
  start_time: string | null;
  stop_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingAd {
  id: string;
  adset_id: string;
  meta_ad_id: string | null;
  name: string;
  status: CampaignStatus;
  creative: AdCreative;
  tracking_specs: Record<string, unknown>[];
  metrics: CampaignMetrics;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingCreative {
  id: string;
  account_id: string | null;
  prompt: string;
  image_url: string | null;
  image_hash: string | null;
  storage_path: string | null;
  format: CreativeFormat;
  angle: CreativeAngle | null;
  headline: string | null;
  primary_text: string | null;
  description: string | null;
  cta: string;
  meta_image_id: string | null;
  used_in_ads: number;
  created_at: string;
  updated_at: string;
}

export interface CopilotConversation {
  id: string;
  profile_id: string;
  title: string;
  messages: CopilotMessage[];
  context: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignMetrics {
  impressions?: number;
  clicks?: number;
  spend?: number;
  ctr?: number;
  cpc?: number;
  cpl?: number;
  leads?: number;
  reach?: number;
  frequency?: number;
  actions?: Record<string, number>;
}

export interface AdSetTargeting {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    regions?: Array<{ key: string; name: string }>;
    cities?: Array<{ key: string; name: string; radius?: number }>;
  };
  interests?: Array<{ id: string; name: string }>;
  behaviors?: Array<{ id: string; name: string }>;
  custom_audiences?: Array<{ id: string; name: string }>;
  publisher_platforms?: string[];
}

export interface AdCreative {
  image_hash?: string;
  image_url?: string;
  video_id?: string;
  title?: string;
  body?: string;
  description?: string;
  call_to_action_type?: string;
  link?: string;
  page_id?: string;
}

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: CopilotAction;
}

export interface CopilotAction {
  type: 'create_campaign' | 'generate_creative' | 'sync_data' | 'update_status' | 'show_metrics' | 'upload_image';
  params?: Record<string, unknown>;
  description?: string;
  status: 'pending' | 'confirmed' | 'executed' | 'failed';
}

export interface CreateCampaignRequest {
  account_id: string;
  name: string;
  objective: string;
  daily_budget: number;
  status?: CampaignStatus;
  adsets: CreateAdSetRequest[];
}

export interface CreateAdSetRequest {
  name: string;
  daily_budget: number;
  targeting: AdSetTargeting;
  optimization_goal?: string;
  billing_event?: string;
  bid_strategy?: string;
  ads: CreateAdRequest[];
}

export interface CreateAdRequest {
  name: string;
  creative: AdCreative;
  status?: CampaignStatus;
}

export interface GenerateCreativeRequest {
  prompt: string;
  format: CreativeFormat;
  angle: CreativeAngle;
  headline?: string;
  primary_text?: string;
  account_id?: string;
}
