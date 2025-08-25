-- PocketMoney Complete Backend Setup
-- This script sets up all essential tables and functions for the app

-- ============================================================================
-- DROP EXISTING TABLES (for clean setup)
-- ============================================================================

DROP TABLE IF EXISTS public.whatsapp_extractions CASCADE;
DROP TABLE IF EXISTS public.voice_inputs CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.feature_usage CASCADE;
DROP TABLE IF EXISTS public.receipt_processing_queue CASCADE;
DROP TABLE IF EXISTS public.google_sheets_sync CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.daily_snapshots CASCADE;

-- ============================================================================
-- CORE TABLES (Enhanced from existing schema)
-- ============================================================================

-- Subscriptions and premium features
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier TEXT CHECK (tier IN ('free', 'premium')) NOT NULL DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'trial')) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  auto_renewal BOOLEAN DEFAULT FALSE,
  payment_method TEXT,
  monthly_price DECIMAL(10,2),
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature usage tracking
CREATE TABLE public.feature_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  feature_name TEXT NOT NULL, -- 'receipt_scan', 'whatsapp_extract', 'voice_input'
  usage_count INTEGER DEFAULT 0,
  month_year TEXT NOT NULL, -- '2024-01'
  limit_exceeded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_name, month_year)
);

-- WhatsApp integration
CREATE TABLE public.whatsapp_extractions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message_content TEXT NOT NULL,
  extracted_data JSONB,
  source_type TEXT CHECK (source_type IN ('order', 'payment', 'customer_inquiry', 'delivery_confirmation')) NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.00,
  customer_phone TEXT,
  customer_name TEXT,
  order_amount DECIMAL(10,2),
  payment_method TEXT,
  status TEXT CHECK (status IN ('pending', 'processed', 'failed', 'manual_review')) DEFAULT 'pending',
  processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL
);

-- Voice input processing
CREATE TABLE public.voice_inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  audio_file_url TEXT,
  audio_duration_seconds INTEGER,
  transcribed_text TEXT,
  parsed_intent JSONB,
  confidence_score DECIMAL(3,2),
  language_detected TEXT,
  processing_status TEXT CHECK (processing_status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  error_message TEXT,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Receipt processing queue
CREATE TABLE public.receipt_processing_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'manual_review')) DEFAULT 'queued',
  processing_method TEXT CHECK (processing_method IN ('groq_ai', 'ml_kit', 'manual')) NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Google Sheets integration
CREATE TABLE public.google_sheets_sync (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  spreadsheet_id TEXT NOT NULL,
  spreadsheet_name TEXT,
  sheet_id TEXT,
  sheet_name TEXT,
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT CHECK (sync_status IN ('connected', 'syncing', 'error', 'disconnected')) DEFAULT 'connected',
  error_message TEXT,
  oauth_refresh_token TEXT, -- Should be encrypted in production
  oauth_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, spreadsheet_id)
);

-- Achievements system
CREATE TABLE public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT,
  category TEXT CHECK (category IN ('transactions', 'revenue', 'streak', 'features', 'milestones')) NOT NULL,
  points_reward INTEGER DEFAULT 0,
  premium_days_reward INTEGER DEFAULT 0,
  unlock_criteria JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  metric_name TEXT NOT NULL,
  current_value INTEGER DEFAULT 0,
  all_time_value INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, metric_name)
);

-- Daily business snapshots
CREATE TABLE public.daily_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_expenses DECIMAL(12,2) DEFAULT 0,
  net_profit DECIMAL(12,2) DEFAULT 0,
  transactions_count INTEGER DEFAULT 0,
  new_customers_count INTEGER DEFAULT 0,
  receipts_processed INTEGER DEFAULT 0,
  voice_commands_used INTEGER DEFAULT 0,
  whatsapp_extractions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON public.subscriptions(expires_at);

CREATE INDEX idx_feature_usage_user_month ON public.feature_usage(user_id, month_year);
CREATE INDEX idx_feature_usage_feature_name ON public.feature_usage(feature_name);

CREATE INDEX idx_whatsapp_extractions_user_id ON public.whatsapp_extractions(user_id);
CREATE INDEX idx_whatsapp_extractions_status ON public.whatsapp_extractions(status);
CREATE INDEX idx_whatsapp_extractions_created_at ON public.whatsapp_extractions(created_at DESC);

CREATE INDEX idx_voice_inputs_user_id ON public.voice_inputs(user_id);
CREATE INDEX idx_voice_inputs_status ON public.voice_inputs(processing_status);

CREATE INDEX idx_receipt_processing_user_id ON public.receipt_processing_queue(user_id);
CREATE INDEX idx_receipt_processing_status ON public.receipt_processing_queue(status);

CREATE INDEX idx_google_sheets_sync_user_id ON public.google_sheets_sync(user_id);
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_daily_snapshots_user_date ON public.daily_snapshots(user_id, snapshot_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_sheets_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own feature usage" ON public.feature_usage
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own WhatsApp extractions" ON public.whatsapp_extractions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own voice inputs" ON public.voice_inputs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own receipt processing" ON public.receipt_processing_queue
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own Google Sheets sync" ON public.google_sheets_sync
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view achievements" ON public.achievements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage own progress" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own snapshots" ON public.daily_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- ESSENTIAL BACKEND FUNCTIONS
-- ============================================================================

-- Function to transfer money between wallets (atomic transaction)
CREATE OR REPLACE FUNCTION transfer_between_wallets(
  from_wallet_id UUID,
  to_wallet_id UUID,
  transfer_amount DECIMAL(10,2)
)
RETURNS VOID AS $$
DECLARE
  from_balance DECIMAL(10,2);
BEGIN
  -- Check if wallets exist and get current balances
  SELECT balance INTO from_balance 
  FROM public.wallets 
  WHERE id = from_wallet_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source wallet not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE id = to_wallet_id) THEN
    RAISE EXCEPTION 'Destination wallet not found';
  END IF;
  
  -- Check sufficient balance
  IF from_balance < transfer_amount THEN
    RAISE EXCEPTION 'Insufficient balance in source wallet';
  END IF;
  
  -- Perform atomic transfer
  UPDATE public.wallets 
  SET balance = balance - transfer_amount 
  WHERE id = from_wallet_id;
  
  UPDATE public.wallets 
  SET balance = balance + transfer_amount 
  WHERE id = to_wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user progress
CREATE OR REPLACE FUNCTION update_user_progress(
  p_user_id UUID,
  p_metric_name TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, metric_name, current_value, all_time_value)
  VALUES (p_user_id, p_metric_name, p_increment, p_increment)
  ON CONFLICT (user_id, metric_name)
  DO UPDATE SET
    current_value = user_progress.current_value + p_increment,
    all_time_value = user_progress.all_time_value + p_increment,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment feature usage
CREATE OR REPLACE FUNCTION increment_feature_usage(
  p_user_id UUID,
  p_feature_name TEXT,
  p_month_year TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.feature_usage (user_id, feature_name, month_year, usage_count)
  VALUES (p_user_id, p_feature_name, p_month_year, 1)
  ON CONFLICT (user_id, feature_name, month_year)
  DO UPDATE SET 
    usage_count = feature_usage.usage_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feature limit based on subscription
CREATE OR REPLACE FUNCTION get_feature_limit(
  p_user_id UUID,
  p_feature_name TEXT
)
RETURNS INTEGER AS $$
DECLARE
  user_tier TEXT;
  feature_limit INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT COALESCE(s.tier, 'free') INTO user_tier
  FROM public.users u
  LEFT JOIN public.subscriptions s ON u.id = s.user_id AND s.status = 'active'
  WHERE u.id = p_user_id;
  
  -- Set limits based on feature and tier
  CASE p_feature_name
    WHEN 'receipt_scan' THEN
      feature_limit := CASE user_tier WHEN 'premium' THEN 999999 ELSE 30 END;
    WHEN 'whatsapp_extract' THEN
      feature_limit := CASE user_tier WHEN 'premium' THEN 999999 ELSE 50 END;
    WHEN 'voice_input' THEN
      feature_limit := CASE user_tier WHEN 'premium' THEN 999999 ELSE 20 END;
    WHEN 'google_sheets_sync' THEN
      feature_limit := CASE user_tier WHEN 'premium' THEN 999999 ELSE 0 END;
    ELSE
      feature_limit := 999999;
  END CASE;
  
  RETURN feature_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE(achievement_name TEXT, premium_days INTEGER) AS $$
DECLARE
  achievement_record RECORD;
  progress_record RECORD;
  criteria_met BOOLEAN;
  criteria_type TEXT;
  threshold_value INTEGER;
BEGIN
  FOR achievement_record IN 
    SELECT a.* FROM public.achievements a
    WHERE a.is_active = TRUE 
    AND a.id NOT IN (
      SELECT ua.achievement_id FROM public.user_achievements ua 
      WHERE ua.user_id = p_user_id
    )
  LOOP
    criteria_met := FALSE;
    criteria_type := achievement_record.unlock_criteria->>'type';
    threshold_value := (achievement_record.unlock_criteria->>'threshold')::INTEGER;
    
    -- Check different criteria types
    CASE criteria_type
      WHEN 'receipt_count' THEN
        SELECT INTO progress_record * FROM public.user_progress 
        WHERE user_id = p_user_id AND metric_name = 'receipts_scanned';
        
        IF progress_record.all_time_value >= threshold_value THEN
          criteria_met := TRUE;
        END IF;
        
      WHEN 'order_count' THEN
        SELECT INTO progress_record * FROM public.user_progress 
        WHERE user_id = p_user_id AND metric_name = 'orders_created';
        
        IF progress_record.all_time_value >= threshold_value THEN
          criteria_met := TRUE;
        END IF;
        
      WHEN 'expense_count' THEN
        SELECT INTO progress_record * FROM public.user_progress 
        WHERE user_id = p_user_id AND metric_name = 'expenses_created';
        
        IF progress_record.all_time_value >= threshold_value THEN
          criteria_met := TRUE;
        END IF;
    END CASE;
    
    -- Unlock achievement if criteria met
    IF criteria_met THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (p_user_id, achievement_record.id);
      
      -- Add premium days if reward exists
      IF achievement_record.premium_days_reward > 0 THEN
        INSERT INTO public.subscriptions (user_id, tier, status, expires_at)
        VALUES (
          p_user_id, 
          'premium', 
          'trial', 
          NOW() + INTERVAL '1 day' * achievement_record.premium_days_reward
        )
        ON CONFLICT (user_id) DO UPDATE SET
          expires_at = GREATEST(subscriptions.expires_at, EXCLUDED.expires_at);
      END IF;
      
      achievement_name := achievement_record.name;
      premium_days := achievement_record.premium_days_reward;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIALIZE DEFAULT DATA
-- ============================================================================

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, category, points_reward, premium_days_reward, unlock_criteria) VALUES
('First Receipt', 'Scan your first receipt', '📸', 'transactions', 10, 7, '{"type": "receipt_count", "threshold": 1}'),
('Receipt Master', '10 receipts scanned', '🎯', 'transactions', 50, 0, '{"type": "receipt_count", "threshold": 10}'),
('First Sale', 'Record your first sale', '💰', 'revenue', 15, 3, '{"type": "order_count", "threshold": 1}'),
('Week Warrior', '7-day tracking streak', '🔥', 'streak', 30, 14, '{"type": "daily_streak", "threshold": 7}'),
('Customer Magnet', '10 unique customers', '👥', 'milestones', 45, 0, '{"type": "customer_count", "threshold": 10}'),
('Expense Tracker', '50 expenses recorded', '💸', 'transactions', 35, 0, '{"type": "expense_count", "threshold": 50}')
ON CONFLICT (name) DO NOTHING;

-- Update existing user creation trigger to include default subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile
  INSERT INTO public.users (id, email, business_name, phone, business_type)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'business_type'
  );

  -- Create default cash wallet
  INSERT INTO public.wallets (user_id, name, type, is_primary)
  VALUES (NEW.id, 'Cash Wallet', 'cash', true);

  -- Create default user settings if table exists
  INSERT INTO public.user_settings (user_id, auto_sync_sheets)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create default free subscription
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION transfer_between_wallets TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_progress TO authenticated;
GRANT EXECUTE ON FUNCTION increment_feature_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_feature_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements TO authenticated;

-- ============================================================================
-- TRIGGER UPDATES
-- ============================================================================

-- Add update triggers for new tables
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_usage_updated_at BEFORE UPDATE ON public.feature_usage 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_sheets_sync_updated_at BEFORE UPDATE ON public.google_sheets_sync 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();