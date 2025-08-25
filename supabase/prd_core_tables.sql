-- PocketMoney Core Tables for PRD Requirements
-- Essential tables missing from current schema for MVP functionality

-- ============================================================================
-- WHATSAPP INTEGRATION TABLES
-- ============================================================================

-- WhatsApp message extractions
CREATE TABLE IF NOT EXISTS public.whatsapp_extractions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message_content TEXT NOT NULL,
  extracted_data JSONB,
  source_type TEXT CHECK (source_type IN ('order', 'payment', 'customer_inquiry', 'delivery_confirmation')) NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
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

-- WhatsApp message patterns for ML training
CREATE TABLE IF NOT EXISTS public.whatsapp_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_type TEXT CHECK (pattern_type IN ('order', 'payment', 'delivery', 'inquiry')) NOT NULL,
  language TEXT CHECK (language IN ('en', 'ms', 'zh')) NOT NULL,
  regex_pattern TEXT NOT NULL,
  sample_text TEXT NOT NULL,
  expected_extraction JSONB NOT NULL,
  accuracy_score DECIMAL(3,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- VOICE INPUT PROCESSING TABLES
-- ============================================================================

-- Voice input logs and transcriptions
CREATE TABLE IF NOT EXISTS public.voice_inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  audio_file_url TEXT,
  audio_duration_seconds INTEGER,
  transcribed_text TEXT,
  parsed_intent JSONB, -- {"type": "expense", "amount": 50.00, "category": "food"}
  confidence_score DECIMAL(3,2),
  language_detected TEXT,
  processing_status TEXT CHECK (processing_status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  error_message TEXT,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Voice command patterns for training
CREATE TABLE IF NOT EXISTS public.voice_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_type TEXT CHECK (command_type IN ('add_expense', 'add_sale', 'check_balance', 'daily_report')) NOT NULL,
  language TEXT CHECK (language IN ('en', 'ms')) NOT NULL,
  sample_phrase TEXT NOT NULL,
  expected_intent JSONB NOT NULL,
  accuracy_score DECIMAL(3,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SUBSCRIPTION AND PREMIUM FEATURES
-- ============================================================================

-- User subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  tier TEXT CHECK (tier IN ('free', 'premium')) NOT NULL DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'trial')) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  auto_renewal BOOLEAN DEFAULT FALSE,
  payment_method TEXT,
  monthly_price DECIMAL(10,2),
  currency TEXT DEFAULT 'MYR',
  stripe_subscription_id TEXT,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature usage tracking for limits
CREATE TABLE IF NOT EXISTS public.feature_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  feature_name TEXT NOT NULL, -- 'receipt_scan', 'whatsapp_extract', 'voice_input', 'google_sheets_sync'
  usage_count INTEGER DEFAULT 0,
  month_year TEXT NOT NULL, -- '2024-01'
  limit_exceeded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_name, month_year)
);

-- ============================================================================
-- RECEIPT PROCESSING ENHANCEMENTS
-- ============================================================================

-- Receipt processing queue
CREATE TABLE IF NOT EXISTS public.receipt_processing_queue (
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

-- OCR confidence tracking
CREATE TABLE IF NOT EXISTS public.ocr_accuracy_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE NOT NULL,
  processing_method TEXT NOT NULL,
  confidence_scores JSONB, -- {"store_name": 0.95, "total_amount": 0.88, "date": 0.92}
  manual_corrections JSONB, -- {"store_name": {"extracted": "Giant", "corrected": "Giant Hypermarket"}}
  accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5), -- user rating
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- GOOGLE SHEETS INTEGRATION
-- ============================================================================

-- Google Sheets sync status per user
CREATE TABLE IF NOT EXISTS public.google_sheets_sync (
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
  oauth_refresh_token TEXT, -- encrypted
  oauth_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, spreadsheet_id)
);

-- Sync operation logs
CREATE TABLE IF NOT EXISTS public.sync_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  sync_type TEXT CHECK (sync_type IN ('manual', 'automatic', 'initial_setup')) NOT NULL,
  operation TEXT CHECK (operation IN ('export_expenses', 'export_orders', 'export_customers', 'import_data')) NOT NULL,
  status TEXT CHECK (status IN ('started', 'in_progress', 'completed', 'failed')) DEFAULT 'started',
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- GAMIFICATION ENHANCEMENTS
-- ============================================================================

-- Achievement definitions
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT,
  category TEXT CHECK (category IN ('transactions', 'revenue', 'streak', 'features', 'milestones')) NOT NULL,
  points_reward INTEGER DEFAULT 0,
  premium_days_reward INTEGER DEFAULT 0,
  unlock_criteria JSONB NOT NULL, -- {"type": "receipt_count", "threshold": 10}
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  metric_name TEXT NOT NULL, -- 'receipts_scanned', 'orders_created', 'daily_streak'
  current_value INTEGER DEFAULT 0,
  all_time_value INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, metric_name)
);

-- ============================================================================
-- ANALYTICS AND REPORTING
-- ============================================================================

-- Daily business snapshots
CREATE TABLE IF NOT EXISTS public.daily_snapshots (
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

-- Category spending patterns
CREATE TABLE IF NOT EXISTS public.spending_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  week_of_year INTEGER NOT NULL, -- 1-52
  year INTEGER NOT NULL,
  average_amount DECIMAL(10,2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  trend TEXT CHECK (trend IN ('increasing', 'decreasing', 'stable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, week_of_year, year)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- WhatsApp extractions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_extractions_user_id ON public.whatsapp_extractions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_extractions_status ON public.whatsapp_extractions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_extractions_source_type ON public.whatsapp_extractions(source_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_extractions_created_at ON public.whatsapp_extractions(created_at DESC);

-- Voice inputs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_inputs_user_id ON public.voice_inputs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_inputs_status ON public.voice_inputs(processing_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_inputs_created_at ON public.voice_inputs(created_at DESC);

-- Subscriptions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);

-- Feature usage indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_usage_user_month ON public.feature_usage(user_id, month_year);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_usage_feature_name ON public.feature_usage(feature_name);

-- Receipt processing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receipt_processing_status ON public.receipt_processing_queue(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receipt_processing_user_id ON public.receipt_processing_queue(user_id);

-- Google Sheets sync indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_google_sheets_sync_user_id ON public.google_sheets_sync(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_operations_user_id ON public.sync_operations(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_operations_status ON public.sync_operations(status);

-- Analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_snapshots_user_date ON public.daily_snapshots(user_id, snapshot_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spending_patterns_user_year ON public.spending_patterns(user_id, year, week_of_year);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.whatsapp_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_accuracy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_sheets_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spending_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for WhatsApp extractions
CREATE POLICY "Users can manage own WhatsApp extractions" ON public.whatsapp_extractions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for voice inputs
CREATE POLICY "Users can manage own voice inputs" ON public.voice_inputs
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for feature usage
CREATE POLICY "Users can view own feature usage" ON public.feature_usage
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for receipt processing
CREATE POLICY "Users can view own receipt processing" ON public.receipt_processing_queue
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for OCR accuracy
CREATE POLICY "Users can view own OCR logs" ON public.ocr_accuracy_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.receipts 
      WHERE receipts.id = ocr_accuracy_logs.receipt_id 
      AND receipts.user_id = auth.uid()
    )
  );

-- RLS Policies for Google Sheets sync
CREATE POLICY "Users can manage own Google Sheets sync" ON public.google_sheets_sync
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sync operations" ON public.sync_operations
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for achievements (read-only for authenticated users)
CREATE POLICY "Authenticated users can view achievements" ON public.achievements
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for user progress
CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for analytics
CREATE POLICY "Users can view own daily snapshots" ON public.daily_snapshots
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own spending patterns" ON public.spending_patterns
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for patterns (admin only for write)
CREATE POLICY "Authenticated users can view patterns" ON public.whatsapp_patterns
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view voice patterns" ON public.voice_patterns
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- TRIGGERS AND AUTOMATED FUNCTIONS
-- ============================================================================

-- Update timestamps trigger function (reuse existing)
CREATE TRIGGER update_whatsapp_extractions_updated_at BEFORE UPDATE ON public.whatsapp_extractions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_patterns_updated_at BEFORE UPDATE ON public.whatsapp_patterns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_usage_updated_at BEFORE UPDATE ON public.feature_usage 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_sheets_sync_updated_at BEFORE UPDATE ON public.google_sheets_sync 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize default achievements
CREATE OR REPLACE FUNCTION public.initialize_default_achievements()
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.achievements (name, description, icon, category, points_reward, premium_days_reward, unlock_criteria) VALUES
  ('First Receipt', 'Scan your first receipt', '📸', 'transactions', 10, 7, '{"type": "receipt_count", "threshold": 1}'),
  ('Receipt Master', '10 receipts scanned', '🎯', 'transactions', 50, 0, '{"type": "receipt_count", "threshold": 10}'),
  ('First Sale', 'Record your first sale', '💰', 'revenue', 15, 3, '{"type": "order_count", "threshold": 1}'),
  ('Profitable Day', 'First day with positive profit', '📈', 'revenue', 25, 0, '{"type": "daily_profit", "threshold": 0.01}'),
  ('Week Warrior', '7-day tracking streak', '🔥', 'streak', 30, 14, '{"type": "daily_streak", "threshold": 7}'),
  ('Voice Commander', 'Use voice input 5 times', '🎤', 'features', 20, 0, '{"type": "voice_usage", "threshold": 5}'),
  ('WhatsApp Pro', 'Extract 10 WhatsApp orders', '📱', 'features', 35, 0, '{"type": "whatsapp_extractions", "threshold": 10}'),
  ('Sheet Sync', 'Connect Google Sheets', '📊', 'features', 40, 7, '{"type": "google_sheets_connected", "threshold": 1}'),
  ('Customer Magnet', '10 unique customers', '👥', 'milestones', 45, 0, '{"type": "customer_count", "threshold": 10}'),
  ('Expense Tracker', '50 expenses recorded', '💸', 'transactions', 35, 0, '{"type": "expense_count", "threshold": 50}')
  ON CONFLICT (name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Initialize achievements
SELECT public.initialize_default_achievements();

-- Function to update user progress and check achievements
CREATE OR REPLACE FUNCTION public.update_user_progress(
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
$$ LANGUAGE plpgsql;

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id UUID)
RETURNS TABLE(achievement_name TEXT, premium_days INTEGER) AS $$
DECLARE
  achievement_record RECORD;
  progress_record RECORD;
  criteria_met BOOLEAN;
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
    
    -- Check criteria based on type
    IF achievement_record.unlock_criteria->>'type' = 'receipt_count' THEN
      SELECT INTO progress_record * FROM public.user_progress 
      WHERE user_id = p_user_id AND metric_name = 'receipts_scanned';
      
      IF progress_record.all_time_value >= (achievement_record.unlock_criteria->>'threshold')::INTEGER THEN
        criteria_met := TRUE;
      END IF;
    END IF;
    
    -- Add more criteria checks as needed for other achievement types
    
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
$$ LANGUAGE plpgsql;