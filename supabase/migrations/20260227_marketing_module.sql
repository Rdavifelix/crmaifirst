-- =============================================================
-- Marketing Module — 7 novas tabelas
-- =============================================================

-- 1. marketing_accounts — Conexão com Meta Ads
CREATE TABLE IF NOT EXISTS marketing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR NOT NULL DEFAULT 'meta',
  account_id VARCHAR NOT NULL,
  account_name VARCHAR,
  access_token TEXT NOT NULL,
  page_id VARCHAR,
  page_name VARCHAR,
  pixel_id VARCHAR,
  currency VARCHAR DEFAULT 'BRL',
  timezone VARCHAR DEFAULT 'America/Sao_Paulo',
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disconnected')),
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mkt_accounts_user ON marketing_accounts(user_id);

-- 2. marketing_campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES marketing_accounts(id) ON DELETE CASCADE,
  meta_campaign_id VARCHAR UNIQUE,
  name VARCHAR NOT NULL,
  objective VARCHAR DEFAULT 'OUTCOME_LEADS',
  status VARCHAR DEFAULT 'PAUSED' CHECK (status IN ('ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED')),
  daily_budget DECIMAL(12,2),
  lifetime_budget DECIMAL(12,2),
  special_ad_categories JSONB DEFAULT '[]'::jsonb,
  buying_type VARCHAR DEFAULT 'AUCTION',
  metrics JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  stop_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_account ON marketing_campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_status ON marketing_campaigns(status);

-- 3. marketing_adsets
CREATE TABLE IF NOT EXISTS marketing_adsets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  meta_adset_id VARCHAR UNIQUE,
  name VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'PAUSED' CHECK (status IN ('ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED')),
  daily_budget DECIMAL(12,2),
  lifetime_budget DECIMAL(12,2),
  billing_event VARCHAR DEFAULT 'IMPRESSIONS',
  optimization_goal VARCHAR DEFAULT 'LEAD_GENERATION',
  bid_strategy VARCHAR DEFAULT 'LOWEST_COST_WITHOUT_CAP',
  targeting JSONB DEFAULT '{}'::jsonb,
  promoted_object JSONB DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  stop_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mkt_adsets_campaign ON marketing_adsets(campaign_id);

-- 4. marketing_ads
CREATE TABLE IF NOT EXISTS marketing_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adset_id UUID REFERENCES marketing_adsets(id) ON DELETE CASCADE,
  meta_ad_id VARCHAR UNIQUE,
  name VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'PAUSED' CHECK (status IN ('ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED')),
  creative JSONB DEFAULT '{}'::jsonb,
  tracking_specs JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mkt_ads_adset ON marketing_ads(adset_id);

-- 5. marketing_creatives
CREATE TABLE IF NOT EXISTS marketing_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES marketing_accounts(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  image_url TEXT,
  image_hash VARCHAR,
  storage_path TEXT,
  format VARCHAR DEFAULT '1:1' CHECK (format IN ('1:1', '9:16', '4:5', '16:9')),
  angle VARCHAR CHECK (angle IN ('dor', 'oportunidade', 'resultado', 'curiosidade', 'autoridade')),
  headline TEXT,
  primary_text TEXT,
  description TEXT,
  cta VARCHAR DEFAULT 'LEARN_MORE',
  meta_image_id VARCHAR,
  used_in_ads INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mkt_creatives_account ON marketing_creatives(account_id);

-- 6. marketing_copilot_conversations
CREATE TABLE IF NOT EXISTS marketing_copilot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR DEFAULT 'Nova conversa',
  messages JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mkt_copilot_user ON marketing_copilot_conversations(user_id);

-- 7. marketing_landing_pages
CREATE TABLE IF NOT EXISTS marketing_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES marketing_accounts(id) ON DELETE SET NULL,
  title VARCHAR NOT NULL,
  slug VARCHAR UNIQUE,
  html_content TEXT,
  css_content TEXT,
  url TEXT,
  form_config JSONB DEFAULT '{}'::jsonb,
  is_published BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE marketing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_copilot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_landing_pages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own marketing data
CREATE POLICY "users_manage_own_accounts" ON marketing_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_view_campaigns" ON marketing_campaigns FOR ALL USING (EXISTS (SELECT 1 FROM marketing_accounts WHERE id = marketing_campaigns.account_id AND user_id = auth.uid()));
CREATE POLICY "users_view_adsets" ON marketing_adsets FOR ALL USING (EXISTS (SELECT 1 FROM marketing_campaigns c JOIN marketing_accounts a ON a.id = c.account_id WHERE c.id = marketing_adsets.campaign_id AND a.user_id = auth.uid()));
CREATE POLICY "users_view_ads" ON marketing_ads FOR ALL USING (EXISTS (SELECT 1 FROM marketing_adsets s JOIN marketing_campaigns c ON c.id = s.campaign_id JOIN marketing_accounts a ON a.id = c.account_id WHERE s.id = marketing_ads.adset_id AND a.user_id = auth.uid()));
CREATE POLICY "users_manage_creatives" ON marketing_creatives FOR ALL USING (account_id IS NULL OR EXISTS (SELECT 1 FROM marketing_accounts WHERE id = marketing_creatives.account_id AND user_id = auth.uid()));
CREATE POLICY "users_manage_copilot" ON marketing_copilot_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_manage_lps" ON marketing_landing_pages FOR ALL USING (account_id IS NULL OR EXISTS (SELECT 1 FROM marketing_accounts WHERE id = marketing_landing_pages.account_id AND user_id = auth.uid()));
