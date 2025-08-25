-- PocketMoney Post-MVP Database Schema
-- Enhanced schema to support marketplace, financial services, and enterprise features

-- ============================================================================
-- ENHANCED CORE TABLES
-- ============================================================================

-- Enhanced Users table for multi-business support
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_address JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_category VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_documents JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'freemium';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;

-- Business Locations table for multi-location support
CREATE TABLE IF NOT EXISTS public.business_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address JSONB NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  business_hours JSONB,
  contact_info JSONB,
  location_type VARCHAR(50) DEFAULT 'main', -- main, branch, franchise
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-currency support
CREATE TABLE IF NOT EXISTS public.currencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(3) UNIQUE NOT NULL, -- MYR, USD, SGD
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  exchange_rate_to_base DECIMAL(10,6) DEFAULT 1.0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default currencies
INSERT INTO public.currencies (code, name, symbol) VALUES
('MYR', 'Malaysian Ringgit', 'RM'),
('USD', 'US Dollar', '$'),
('SGD', 'Singapore Dollar', 'S$'),
('EUR', 'Euro', '€'),
('GBP', 'British Pound', '£')
ON CONFLICT (code) DO NOTHING;

-- Enhanced Wallets with multi-currency
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS currency_id UUID REFERENCES public.currencies(id);
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS external_account_id VARCHAR(255);
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS bank_integration_status VARCHAR(20);
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS account_number_encrypted TEXT;

-- Update existing wallets to use MYR by default
UPDATE public.wallets SET currency_id = (SELECT id FROM public.currencies WHERE code = 'MYR') WHERE currency_id IS NULL;

-- ============================================================================
-- MARKETPLACE AND SUPPLY CHAIN TABLES
-- ============================================================================

-- Product Categories
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES public.product_categories(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address JSONB,
  business_registration VARCHAR(100),
  payment_terms VARCHAR(100),
  rating DECIMAL(3,2) DEFAULT 0.00,
  verification_status VARCHAR(20) DEFAULT 'pending',
  verification_documents JSONB,
  tags JSONB, -- ["halal", "local", "sustainable"]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products/Inventory table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  sku VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.product_categories(id),
  unit_price DECIMAL(12,2),
  cost_price DECIMAL(12,2),
  currency_id UUID REFERENCES public.currencies(id),
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  supplier_id UUID REFERENCES public.suppliers(id),
  product_images JSONB,
  attributes JSONB, -- color, size, weight, etc.
  tags JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id),
  po_number VARCHAR(100) UNIQUE,
  status VARCHAR(20) DEFAULT 'draft', -- draft, sent, confirmed, delivered, cancelled
  total_amount DECIMAL(12,2),
  currency_id UUID REFERENCES public.currencies(id),
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  notes TEXT,
  terms_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  received_quantity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketplace Listings
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  listing_type VARCHAR(20) DEFAULT 'product', -- product, service, excess_inventory
  price DECIMAL(12,2),
  currency_id UUID REFERENCES public.currencies(id),
  minimum_order_quantity INTEGER DEFAULT 1,
  availability_status VARCHAR(20) DEFAULT 'available',
  visibility VARCHAR(20) DEFAULT 'public', -- public, private, group_only
  marketplace_category VARCHAR(100),
  listing_images JSONB,
  shipping_info JSONB,
  expires_at TIMESTAMP WITH TIME ZONE,
  featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Purchase Campaigns
CREATE TABLE IF NOT EXISTS public.group_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_quantity INTEGER NOT NULL,
  current_quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(12,2),
  group_price DECIMAL(12,2),
  currency_id UUID REFERENCES public.currencies(id),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled, expired
  minimum_participants INTEGER DEFAULT 2,
  current_participants INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Purchase Participants
CREATE TABLE IF NOT EXISTS public.group_purchase_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_purchase_id UUID REFERENCES public.group_purchases(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  commitment_amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'committed', -- committed, paid, delivered, cancelled
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_purchase_id, participant_id)
);

-- ============================================================================
-- FINANCIAL SERVICES TABLES
-- ============================================================================

-- Loan Applications
CREATE TABLE IF NOT EXISTS public.loan_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  loan_type VARCHAR(50) NOT NULL, -- working_capital, equipment, inventory, expansion
  requested_amount DECIMAL(12,2),
  currency_id UUID REFERENCES public.currencies(id),
  purpose TEXT,
  business_financials JSONB,
  credit_score INTEGER,
  application_status VARCHAR(20) DEFAULT 'submitted',
  lender_id UUID,
  lender_name VARCHAR(255),
  interest_rate DECIMAL(5,4),
  term_months INTEGER,
  monthly_payment DECIMAL(12,2),
  approval_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  documents JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insurance Policies
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  policy_type VARCHAR(50) NOT NULL, -- liability, property, business_interruption, cyber
  provider VARCHAR(100),
  policy_number VARCHAR(100),
  coverage_amount DECIMAL(12,2),
  premium_amount DECIMAL(12,2),
  currency_id UUID REFERENCES public.currencies(id),
  policy_start_date DATE,
  policy_end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  beneficiaries JSONB,
  claims_history JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investment Opportunities
CREATE TABLE IF NOT EXISTS public.investment_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  investment_type VARCHAR(50), -- equity, revenue_share, loan
  target_amount DECIMAL(12,2),
  minimum_investment DECIMAL(12,2),
  current_amount DECIMAL(12,2) DEFAULT 0,
  currency_id UUID REFERENCES public.currencies(id),
  expected_return_rate DECIMAL(5,4),
  investment_term_months INTEGER,
  risk_level VARCHAR(20), -- low, medium, high
  status VARCHAR(20) DEFAULT 'open', -- open, funded, closed
  deadline TIMESTAMP WITH TIME ZONE,
  business_plan JSONB,
  financial_projections JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investments
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.investment_opportunities(id),
  amount DECIMAL(12,2),
  currency_id UUID REFERENCES public.currencies(id),
  investment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_returns JSONB,
  actual_returns JSONB,
  status VARCHAR(20) DEFAULT 'active', -- active, matured, defaulted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COMPLIANCE AND REGULATORY TABLES
-- ============================================================================

-- Compliance Records
CREATE TABLE IF NOT EXISTS public.compliance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  compliance_type VARCHAR(50) NOT NULL, -- tax, ssm, license, permits
  record_type VARCHAR(50), -- filing, renewal, audit, inspection
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  completion_date DATE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, overdue, exempt
  documents JSONB,
  reminder_settings JSONB,
  government_agency VARCHAR(100),
  reference_number VARCHAR(100),
  fees_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax Records
CREATE TABLE IF NOT EXISTS public.tax_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tax_period VARCHAR(20), -- 2024-Q1, 2024-Annual
  tax_type VARCHAR(50), -- gst, sst, income_tax, withholding
  gross_income DECIMAL(12,2),
  taxable_income DECIMAL(12,2),
  tax_amount DECIMAL(12,2),
  paid_amount DECIMAL(12,2) DEFAULT 0,
  currency_id UUID REFERENCES public.currencies(id),
  filing_status VARCHAR(20) DEFAULT 'draft', -- draft, filed, paid, audited
  filing_date TIMESTAMP WITH TIME ZONE,
  payment_due_date DATE,
  documents JSONB,
  calculated_by VARCHAR(20) DEFAULT 'system', -- system, manual, accountant
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Government Grants and Incentives
CREATE TABLE IF NOT EXISTS public.government_grants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  grant_name VARCHAR(255) NOT NULL,
  agency VARCHAR(100),
  grant_type VARCHAR(50), -- startup, expansion, technology, export
  amount DECIMAL(12,2),
  currency_id UUID REFERENCES public.currencies(id),
  application_date TIMESTAMP WITH TIME ZONE,
  approval_date TIMESTAMP WITH TIME ZONE,
  disbursement_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'applied', -- applied, approved, rejected, disbursed, completed
  requirements JSONB,
  milestones JSONB,
  reporting_schedule JSONB,
  documents JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS AND BUSINESS INTELLIGENCE TABLES
-- ============================================================================

-- Business Metrics (for analytics)
CREATE TABLE IF NOT EXISTS public.business_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  business_location_id UUID REFERENCES public.business_locations(id),
  metric_date DATE NOT NULL,
  revenue DECIMAL(12,2) DEFAULT 0,
  expenses DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  transactions_count INTEGER DEFAULT 0,
  customers_count INTEGER DEFAULT 0,
  new_customers_count INTEGER DEFAULT 0,
  inventory_value DECIMAL(12,2) DEFAULT 0,
  currency_id UUID REFERENCES public.currencies(id),
  additional_metrics JSONB, -- custom KPIs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, business_location_id, metric_date)
);

-- Market Intelligence Data
CREATE TABLE IF NOT EXISTS public.market_intelligence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry VARCHAR(100) NOT NULL,
  region VARCHAR(100) NOT NULL,
  data_type VARCHAR(50), -- pricing, demand, competition, trends
  metric_name VARCHAR(100),
  metric_value DECIMAL(12,2),
  data_source VARCHAR(100),
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  report_date DATE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Behavior Analytics
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50), -- screen_view, feature_use, transaction_complete
  event_name VARCHAR(100),
  screen_name VARCHAR(100),
  feature_used VARCHAR(100),
  session_id VARCHAR(100),
  device_type VARCHAR(50),
  app_version VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INTEGRATION AND API TABLES
-- ============================================================================

-- API Integration Logs
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL, -- bank, ecommerce, government, payment
  service_name VARCHAR(100),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  request_payload JSONB,
  response_payload JSONB,
  status_code INTEGER,
  processing_time_ms INTEGER,
  error_message TEXT,
  correlation_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Third-party Integrations
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'connected', -- connected, disconnected, error
  credentials_encrypted TEXT, -- encrypted API keys/tokens
  settings JSONB,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ENHANCED ORDERS AND TRANSACTIONS
-- ============================================================================

-- Enhanced Orders with marketplace support
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS marketplace_listing_id UUID REFERENCES public.marketplace_listings(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS group_purchase_id UUID REFERENCES public.group_purchases(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency_id UUID REFERENCES public.currencies(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6) DEFAULT 1.0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_info JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Order Items (detailed breakdown)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Expenses with better categorization
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS currency_id UUID REFERENCES public.currencies(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6) DEFAULT 1.0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.purchase_orders(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_schedule JSONB;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Business Locations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_locations_user_id ON public.business_locations(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_locations_is_primary ON public.business_locations(is_primary);

-- Suppliers indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_verification_status ON public.suppliers(verification_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_rating ON public.suppliers(rating);

-- Products indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active ON public.products(is_active);

-- Marketplace indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_seller_id ON public.marketplace_listings(seller_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_product_id ON public.marketplace_listings(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(availability_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_category ON public.marketplace_listings(marketplace_category);

-- Financial services indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_user_id ON public.loan_applications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_status ON public.loan_applications(application_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insurance_policies_user_id ON public.insurance_policies(user_id);

-- Analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_metrics_user_date ON public.business_metrics(user_id, metric_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_analytics_user_date ON public.user_analytics(user_id, created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_locations
CREATE POLICY "Users can manage own business locations" ON public.business_locations
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for currencies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view currencies" ON public.currencies
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS policies for suppliers
CREATE POLICY "Users can manage own suppliers" ON public.suppliers
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for products
CREATE POLICY "Users can manage own products" ON public.products
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for marketplace_listings
CREATE POLICY "Users can manage own listings" ON public.marketplace_listings
  FOR ALL USING (auth.uid() = seller_id);

CREATE POLICY "Users can view public marketplace listings" ON public.marketplace_listings
  FOR SELECT USING (visibility = 'public' OR auth.uid() = seller_id);

-- RLS policies for financial services
CREATE POLICY "Users can manage own loan applications" ON public.loan_applications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own insurance policies" ON public.insurance_policies
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for compliance
CREATE POLICY "Users can manage own compliance records" ON public.compliance_records
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for analytics
CREATE POLICY "Users can view own business metrics" ON public.business_metrics
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers to tables that need them
CREATE TRIGGER update_business_locations_updated_at BEFORE UPDATE ON public.business_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_total(order_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_amount DECIMAL(12,2) := 0;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO total_amount
  FROM public.order_items
  WHERE order_id = order_id_param;
  
  UPDATE public.orders 
  SET amount = total_amount 
  WHERE id = order_id_param;
  
  RETURN total_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to update group purchase stats
CREATE OR REPLACE FUNCTION update_group_purchase_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.group_purchases 
  SET 
    current_quantity = (
      SELECT COALESCE(SUM(quantity), 0) 
      FROM public.group_purchase_participants 
      WHERE group_purchase_id = NEW.group_purchase_id 
        AND status = 'committed'
    ),
    current_participants = (
      SELECT COUNT(*) 
      FROM public.group_purchase_participants 
      WHERE group_purchase_id = NEW.group_purchase_id 
        AND status = 'committed'
    )
  WHERE id = NEW.group_purchase_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_purchase_stats_trigger 
AFTER INSERT OR UPDATE OR DELETE ON public.group_purchase_participants 
FOR EACH ROW EXECUTE FUNCTION update_group_purchase_stats();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Business summary view
CREATE OR REPLACE VIEW public.business_summary AS
SELECT 
  u.id as user_id,
  u.business_name,
  u.business_type,
  u.business_category,
  u.subscription_tier,
  COUNT(DISTINCT bl.id) as locations_count,
  COUNT(DISTINCT p.id) as products_count,
  COUNT(DISTINCT s.id) as suppliers_count,
  COUNT(DISTINCT o.id) as orders_count,
  COALESCE(SUM(o.amount), 0) as total_revenue
FROM public.users u
LEFT JOIN public.business_locations bl ON u.id = bl.user_id
LEFT JOIN public.products p ON u.id = p.user_id AND p.is_active = true
LEFT JOIN public.suppliers s ON u.id = s.user_id
LEFT JOIN public.orders o ON u.id = o.user_id
GROUP BY u.id, u.business_name, u.business_type, u.business_category, u.subscription_tier;

-- Marketplace listings with product details
CREATE OR REPLACE VIEW public.marketplace_with_products AS
SELECT 
  ml.*,
  p.name as product_name,
  p.description as product_description,
  p.sku,
  pc.name as category_name,
  u.business_name as seller_name,
  s.name as supplier_name,
  s.rating as supplier_rating
FROM public.marketplace_listings ml
JOIN public.products p ON ml.product_id = p.id
LEFT JOIN public.product_categories pc ON p.category_id = pc.id
JOIN public.users u ON ml.seller_id = u.id
LEFT JOIN public.suppliers s ON p.supplier_id = s.id
WHERE ml.availability_status = 'available' 
  AND p.is_active = true;

-- Financial services summary
CREATE OR REPLACE VIEW public.financial_services_summary AS
SELECT 
  u.id as user_id,
  u.business_name,
  COUNT(DISTINCT la.id) as loan_applications_count,
  COUNT(DISTINCT ip.id) as insurance_policies_count,
  COUNT(DISTINCT inv.id) as investments_count,
  COALESCE(SUM(CASE WHEN la.application_status = 'approved' THEN la.requested_amount END), 0) as approved_loans_amount,
  COALESCE(SUM(ip.coverage_amount), 0) as total_insurance_coverage,
  COALESCE(SUM(inv.amount), 0) as total_investments
FROM public.users u
LEFT JOIN public.loan_applications la ON u.id = la.user_id
LEFT JOIN public.insurance_policies ip ON u.id = ip.user_id
LEFT JOIN public.investments inv ON u.id = inv.investor_id
GROUP BY u.id, u.business_name;

-- Compliance status summary
CREATE OR REPLACE VIEW public.compliance_status AS
SELECT 
  u.id as user_id,
  u.business_name,
  COUNT(*) as total_requirements,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN cr.status = 'pending' AND cr.due_date < CURRENT_DATE THEN 1 END) as overdue_count,
  COUNT(CASE WHEN cr.status = 'pending' AND cr.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as due_soon_count
FROM public.users u
LEFT JOIN public.compliance_records cr ON u.id = cr.user_id
GROUP BY u.id, u.business_name;