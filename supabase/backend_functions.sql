-- PocketMoney Backend Database Functions
-- Essential functions for services to work properly

-- ============================================================================
-- WALLET MANAGEMENT FUNCTIONS
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
  to_balance DECIMAL(10,2);
BEGIN
  -- Check if wallets exist and get current balances
  SELECT balance INTO from_balance 
  FROM public.wallets 
  WHERE id = from_wallet_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source wallet not found';
  END IF;
  
  SELECT balance INTO to_balance 
  FROM public.wallets 
  WHERE id = to_wallet_id;
  
  IF NOT FOUND THEN
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CUSTOMER MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to update customer statistics when orders change
CREATE OR REPLACE FUNCTION update_customer_stats(
  customer_id UUID,
  amount_change DECIMAL(10,2)
)
RETURNS VOID AS $$
DECLARE
  order_count INTEGER;
  latest_order_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current order count and latest order date
  SELECT 
    COUNT(*),
    MAX(created_at)
  INTO order_count, latest_order_date
  FROM public.orders 
  WHERE customer_id = update_customer_stats.customer_id;
  
  -- Update customer record
  UPDATE public.customers
  SET 
    total_spent = GREATEST(0, total_spent + amount_change),
    last_order_date = COALESCE(latest_order_date, last_order_date),
    updated_at = NOW()
  WHERE id = update_customer_stats.customer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get customers with order statistics
CREATE OR REPLACE FUNCTION get_customers_with_stats(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  total_spent DECIMAL(10,2),
  order_count BIGINT,
  last_order_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.total_spent,
    COUNT(o.id) as order_count,
    MAX(o.created_at) as last_order_date,
    c.created_at
  FROM public.customers c
  LEFT JOIN public.orders o ON c.id = o.customer_id
  WHERE c.user_id = p_user_id
  GROUP BY c.id, c.name, c.phone, c.email, c.total_spent, c.created_at
  ORDER BY c.total_spent DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FEATURE USAGE TRACKING FUNCTIONS
-- ============================================================================

-- Function to increment feature usage with automatic monthly reset
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
    
  -- Check if limit is exceeded (this would be checked by the service)
  UPDATE public.feature_usage
  SET limit_exceeded = CASE 
    WHEN usage_count > get_feature_limit(p_user_id, p_feature_name) THEN true
    ELSE false
  END
  WHERE user_id = p_user_id 
    AND feature_name = p_feature_name 
    AND month_year = p_month_year;
END;
$$ LANGUAGE plpgsql;

-- Function to get feature limit based on subscription tier
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ANALYTICS AND REPORTING FUNCTIONS
-- ============================================================================

-- Function to calculate daily business metrics
CREATE OR REPLACE FUNCTION calculate_daily_metrics(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_revenue DECIMAL(12,2),
  total_expenses DECIMAL(12,2),
  net_profit DECIMAL(12,2),
  transaction_count INTEGER,
  customer_count INTEGER,
  new_customer_count INTEGER
) AS $$
DECLARE
  date_start TIMESTAMP WITH TIME ZONE;
  date_end TIMESTAMP WITH TIME ZONE;
BEGIN
  date_start := p_date::timestamp;
  date_end := (p_date + INTERVAL '1 day')::timestamp;
  
  RETURN QUERY
  WITH daily_orders AS (
    SELECT 
      COALESCE(SUM(amount), 0) as revenue,
      COUNT(*) as order_count,
      COUNT(DISTINCT customer_id) as unique_customers
    FROM public.orders
    WHERE user_id = p_user_id 
      AND created_at >= date_start 
      AND created_at < date_end
  ),
  daily_expenses AS (
    SELECT 
      COALESCE(SUM(amount), 0) as expenses,
      COUNT(*) as expense_count
    FROM public.expenses
    WHERE user_id = p_user_id 
      AND created_at >= date_start 
      AND created_at < date_end
  ),
  new_customers AS (
    SELECT COUNT(*) as new_count
    FROM public.customers
    WHERE user_id = p_user_id
      AND created_at >= date_start 
      AND created_at < date_end
  )
  SELECT 
    do.revenue,
    de.expenses,
    (do.revenue - de.expenses) as profit,
    (do.order_count + de.expense_count)::INTEGER as transactions,
    do.unique_customers::INTEGER as customers,
    nc.new_count::INTEGER as new_customers
  FROM daily_orders do, daily_expenses de, new_customers nc;
END;
$$ LANGUAGE plpgsql;

-- Function to get top expense categories for a period
CREATE OR REPLACE FUNCTION get_top_expense_categories(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  category TEXT,
  total_amount DECIMAL(12,2),
  transaction_count BIGINT,
  percentage DECIMAL(5,2)
) AS $$
DECLARE
  total_expenses DECIMAL(12,2);
BEGIN
  -- Get total expenses for percentage calculation
  SELECT COALESCE(SUM(amount), 0) INTO total_expenses
  FROM public.expenses
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days;
    
  RETURN QUERY
  SELECT 
    e.category,
    SUM(e.amount) as total_amount,
    COUNT(*) as transaction_count,
    CASE 
      WHEN total_expenses > 0 THEN (SUM(e.amount) / total_expenses * 100)::DECIMAL(5,2)
      ELSE 0::DECIMAL(5,2)
    END as percentage
  FROM public.expenses e
  WHERE e.user_id = p_user_id
    AND e.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
  GROUP BY e.category
  ORDER BY total_amount DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEARCH AND FILTERING FUNCTIONS
-- ============================================================================

-- Function to search across expenses, orders, and customers
CREATE OR REPLACE FUNCTION global_search(
  p_user_id UUID,
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  result_type TEXT,
  result_id UUID,
  title TEXT,
  subtitle TEXT,
  amount DECIMAL(10,2),
  date TIMESTAMP WITH TIME ZONE,
  relevance_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  (
    -- Search expenses
    SELECT 
      'expense' as result_type,
      e.id as result_id,
      COALESCE(e.description, e.category) as title,
      e.category as subtitle,
      e.amount,
      e.created_at as date,
      CASE 
        WHEN e.description ILIKE '%' || p_search_term || '%' THEN 3
        WHEN e.category ILIKE '%' || p_search_term || '%' THEN 2
        ELSE 1
      END as relevance_score
    FROM public.expenses e
    WHERE e.user_id = p_user_id
      AND (
        e.description ILIKE '%' || p_search_term || '%' 
        OR e.category ILIKE '%' || p_search_term || '%'
      )
  )
  UNION ALL
  (
    -- Search orders
    SELECT 
      'order' as result_type,
      o.id as result_id,
      COALESCE(c.name, 'Order #' || LEFT(o.id::TEXT, 8)) as title,
      o.status as subtitle,
      o.amount,
      o.created_at as date,
      CASE 
        WHEN c.name ILIKE '%' || p_search_term || '%' THEN 3
        WHEN o.notes ILIKE '%' || p_search_term || '%' THEN 2
        ELSE 1
      END as relevance_score
    FROM public.orders o
    LEFT JOIN public.customers c ON o.customer_id = c.id
    WHERE o.user_id = p_user_id
      AND (
        c.name ILIKE '%' || p_search_term || '%'
        OR o.notes ILIKE '%' || p_search_term || '%'
        OR o.payment_method ILIKE '%' || p_search_term || '%'
      )
  )
  UNION ALL
  (
    -- Search customers
    SELECT 
      'customer' as result_type,
      c.id as result_id,
      c.name as title,
      COALESCE(c.phone, c.email) as subtitle,
      c.total_spent as amount,
      c.created_at as date,
      CASE 
        WHEN c.name ILIKE '%' || p_search_term || '%' THEN 3
        WHEN c.phone ILIKE '%' || p_search_term || '%' THEN 2
        ELSE 1
      END as relevance_score
    FROM public.customers c
    WHERE c.user_id = p_user_id
      AND (
        c.name ILIKE '%' || p_search_term || '%'
        OR c.phone ILIKE '%' || p_search_term || '%'
        OR c.email ILIKE '%' || p_search_term || '%'
      )
  )
  ORDER BY relevance_score DESC, date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA INTEGRITY AND CLEANUP FUNCTIONS
-- ============================================================================

-- Function to cleanup old processing queue entries
CREATE OR REPLACE FUNCTION cleanup_old_processing_queue()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete completed entries older than 30 days
  DELETE FROM public.receipt_processing_queue
  WHERE status = 'completed'
    AND processing_completed_at < NOW() - INTERVAL '30 days';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete failed entries older than 7 days
  DELETE FROM public.receipt_processing_queue
  WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '7 days';
    
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate customer totals (data integrity check)
CREATE OR REPLACE FUNCTION recalculate_customer_totals(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.customers
  SET 
    total_spent = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.orders
      WHERE customer_id = customers.id
    ),
    last_order_date = (
      SELECT MAX(created_at)
      FROM public.orders
      WHERE customer_id = customers.id
    ),
    updated_at = NOW()
  WHERE (p_user_id IS NULL OR user_id = p_user_id);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update wallet balances based on expenses
CREATE OR REPLACE FUNCTION recalculate_wallet_balances(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- This is a dangerous operation - should be used carefully
  -- It assumes starting balance was 0 and recalculates from expenses
  UPDATE public.wallets
  SET balance = GREATEST(0, 
    COALESCE((
      SELECT -SUM(amount)
      FROM public.expenses
      WHERE wallet_id = wallets.id
    ), 0)
  ),
  updated_at = NOW()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ACHIEVEMENT AND GAMIFICATION FUNCTIONS
-- ============================================================================

-- Enhanced function to check and unlock achievements
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
        
      WHEN 'daily_profit' THEN
        -- Check if user has had a profitable day
        IF EXISTS (
          SELECT 1 FROM public.daily_snapshots
          WHERE user_id = p_user_id AND net_profit > threshold_value
        ) THEN
          criteria_met := TRUE;
        END IF;
        
      WHEN 'daily_streak' THEN
        SELECT INTO progress_record * FROM public.user_progress 
        WHERE user_id = p_user_id AND metric_name = 'daily_streak';
        
        IF progress_record.current_value >= threshold_value THEN
          criteria_met := TRUE;
        END IF;
        
      WHEN 'voice_usage' THEN
        SELECT INTO progress_record * FROM public.user_progress 
        WHERE user_id = p_user_id AND metric_name = 'voice_commands_used';
        
        IF progress_record.all_time_value >= threshold_value THEN
          criteria_met := TRUE;
        END IF;
        
      WHEN 'whatsapp_extractions' THEN
        SELECT INTO progress_record * FROM public.user_progress 
        WHERE user_id = p_user_id AND metric_name = 'whatsapp_extractions';
        
        IF progress_record.all_time_value >= threshold_value THEN
          criteria_met := TRUE;
        END IF;
        
      WHEN 'customer_count' THEN
        IF (SELECT COUNT(*) FROM public.customers WHERE user_id = p_user_id) >= threshold_value THEN
          criteria_met := TRUE;
        END IF;
        
      WHEN 'google_sheets_connected' THEN
        IF EXISTS (
          SELECT 1 FROM public.google_sheets_sync 
          WHERE user_id = p_user_id AND sync_enabled = true
        ) THEN
          criteria_met := TRUE;
        END IF;
        
    END CASE;
    
    -- Unlock achievement if criteria met
    IF criteria_met THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (p_user_id, achievement_record.id);
      
      -- Log achievement unlock
      INSERT INTO public.gamification_logs (user_id, action, achievement_id, reward_type, reward_value)
      VALUES (
        p_user_id, 
        'achievement_unlocked', 
        achievement_record.id,
        CASE WHEN achievement_record.premium_days_reward > 0 THEN 'premium_days' ELSE 'points' END,
        COALESCE(achievement_record.premium_days_reward, achievement_record.points_reward)
      );
      
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

-- ============================================================================
-- AUTOMATIC MAINTENANCE TRIGGERS
-- ============================================================================

-- Function to create daily snapshots automatically
CREATE OR REPLACE FUNCTION create_daily_snapshot(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
  metrics_record RECORD;
BEGIN
  SELECT * INTO metrics_record FROM calculate_daily_metrics(p_user_id, p_date);
  
  INSERT INTO public.daily_snapshots (
    user_id,
    snapshot_date,
    total_revenue,
    total_expenses,
    net_profit,
    transactions_count,
    new_customers_count
  )
  VALUES (
    p_user_id,
    p_date,
    metrics_record.total_revenue,
    metrics_record.total_expenses,
    metrics_record.net_profit,
    metrics_record.transaction_count,
    metrics_record.new_customer_count
  )
  ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_expenses = EXCLUDED.total_expenses,
    net_profit = EXCLUDED.net_profit,
    transactions_count = EXCLUDED.transactions_count,
    new_customers_count = EXCLUDED.new_customers_count,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to run daily maintenance tasks
CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS TABLE(task_name TEXT, records_affected INTEGER) AS $$
BEGIN
  -- Cleanup old processing queue entries
  RETURN QUERY
  SELECT 'cleanup_processing_queue'::TEXT, cleanup_old_processing_queue();
  
  -- Create daily snapshots for active users (users with activity in last 7 days)
  RETURN QUERY
  WITH active_users AS (
    SELECT DISTINCT user_id
    FROM (
      SELECT user_id FROM public.expenses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      UNION
      SELECT user_id FROM public.orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    ) u
  ),
  snapshot_creation AS (
    SELECT user_id FROM active_users
  )
  SELECT 'create_daily_snapshots'::TEXT, COUNT(*)::INTEGER
  FROM snapshot_creation;
  
  -- Actually create the snapshots
  INSERT INTO public.daily_snapshots (
    user_id, snapshot_date, total_revenue, total_expenses, net_profit, 
    transactions_count, new_customers_count
  )
  SELECT 
    au.user_id,
    CURRENT_DATE,
    dm.total_revenue,
    dm.total_expenses, 
    dm.net_profit,
    dm.transaction_count,
    dm.new_customer_count
  FROM (
    SELECT DISTINCT user_id
    FROM (
      SELECT user_id FROM public.expenses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      UNION
      SELECT user_id FROM public.orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    ) u
  ) au
  CROSS JOIN LATERAL calculate_daily_metrics(au.user_id, CURRENT_DATE) dm
  ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_expenses = EXCLUDED.total_expenses,
    net_profit = EXCLUDED.net_profit,
    transactions_count = EXCLUDED.transactions_count,
    new_customers_count = EXCLUDED.new_customers_count;
    
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users for key functions
GRANT EXECUTE ON FUNCTION transfer_between_wallets TO authenticated;
GRANT EXECUTE ON FUNCTION update_customer_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_customers_with_stats TO authenticated;
GRANT EXECUTE ON FUNCTION increment_feature_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_feature_limit TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_daily_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_expense_categories TO authenticated;
GRANT EXECUTE ON FUNCTION global_search TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_progress TO authenticated;