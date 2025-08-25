// PocketMoney Financial Services Hub
// Handles lending, insurance, investments, and payment solutions

import { supabase } from '../lib/supabase';

export interface LoanApplication {
  id: string;
  user_id: string;
  loan_type: 'working_capital' | 'equipment' | 'inventory' | 'expansion';
  requested_amount: number;
  currency_id?: string;
  purpose?: string;
  business_financials?: any;
  credit_score?: number;
  application_status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  lender_id?: string;
  lender_name?: string;
  interest_rate?: number;
  term_months?: number;
  monthly_payment?: number;
  approval_date?: string;
  rejection_reason?: string;
  documents?: any;
  created_at: string;
  updated_at: string;
}

export interface InsurancePolicy {
  id: string;
  user_id: string;
  policy_type: 'liability' | 'property' | 'business_interruption' | 'cyber' | 'health';
  provider?: string;
  policy_number?: string;
  coverage_amount: number;
  premium_amount: number;
  currency_id?: string;
  policy_start_date?: string;
  policy_end_date?: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  beneficiaries?: any;
  claims_history?: any;
  created_at: string;
  updated_at: string;
}

export interface InvestmentOpportunity {
  id: string;
  business_id: string;
  title: string;
  description?: string;
  investment_type: 'equity' | 'revenue_share' | 'loan';
  target_amount: number;
  minimum_investment: number;
  current_amount: number;
  currency_id?: string;
  expected_return_rate?: number;
  investment_term_months?: number;
  risk_level: 'low' | 'medium' | 'high';
  status: 'open' | 'funded' | 'closed';
  deadline?: string;
  business_plan?: any;
  financial_projections?: any;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  investor_id: string;
  opportunity_id: string;
  amount: number;
  currency_id?: string;
  investment_date: string;
  expected_returns?: any;
  actual_returns?: any;
  status: 'active' | 'matured' | 'defaulted';
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  transaction_type: 'payment' | 'refund' | 'transfer' | 'loan_repayment';
  amount: number;
  currency_id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method: string;
  reference_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface CreditScore {
  user_id: string;
  score: number;
  factors: {
    payment_history: number;
    business_age: number;
    revenue_stability: number;
    debt_to_income: number;
    industry_risk: number;
  };
  last_updated: string;
}

class FinancialServicesHub {
  // ============================================================================
  // LENDING SERVICES
  // ============================================================================

  async submitLoanApplication(applicationData: Omit<LoanApplication, 'id' | 'created_at' | 'updated_at' | 'application_status'>): Promise<LoanApplication | null> {
    try {
      const { data, error } = await supabase
        .from('loan_applications')
        .insert({
          ...applicationData,
          application_status: 'submitted'
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting loan application:', error);
        return null;
      }

      // Trigger credit score calculation
      await this.calculateCreditScore(applicationData.user_id);

      return data;
    } catch (error) {
      console.error('Error submitting loan application:', error);
      return null;
    }
  }

  async getLoanApplications(userId: string, status?: string): Promise<LoanApplication[]> {
    try {
      let query = supabase
        .from('loan_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('application_status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching loan applications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching loan applications:', error);
      return [];
    }
  }

  async calculateLoanEligibility(userId: string, requestedAmount: number, loanType: string): Promise<{
    eligible: boolean;
    maxAmount: number;
    estimatedRate: number;
    factors: any;
  } | null> {
    try {
      // Get business metrics
      const { data: metrics } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('metric_date', { ascending: false })
        .limit(12); // Last 12 months

      // Get current loans
      const { data: currentLoans } = await supabase
        .from('loan_applications')
        .select('requested_amount, monthly_payment')
        .eq('user_id', userId)
        .eq('application_status', 'disbursed');

      if (!metrics || metrics.length === 0) {
        return {
          eligible: false,
          maxAmount: 0,
          estimatedRate: 0,
          factors: { reason: 'Insufficient business history' }
        };
      }

      // Calculate average monthly revenue
      const avgRevenue = metrics.reduce((sum, m) => sum + (m.revenue || 0), 0) / metrics.length;
      
      // Calculate debt-to-income ratio
      const monthlyDebtPayments = currentLoans?.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0) || 0;
      const debtToIncomeRatio = avgRevenue > 0 ? monthlyDebtPayments / avgRevenue : 1;

      // Eligibility factors
      const factors = {
        avgMonthlyRevenue: avgRevenue,
        businessAge: metrics.length,
        debtToIncomeRatio: debtToIncomeRatio,
        paymentHistory: 'good', // This would come from payment data
        creditScore: await this.getCreditScore(userId)
      };

      // Basic eligibility rules
      const eligible = avgRevenue >= 5000 && // Minimum RM 5k monthly revenue
                      debtToIncomeRatio < 0.4 && // Max 40% debt-to-income
                      metrics.length >= 3; // At least 3 months of data

      // Calculate max loan amount (6 months of revenue or requested amount, whichever is lower)
      const maxAmount = Math.min(avgRevenue * 6, requestedAmount);

      // Estimate interest rate based on risk factors
      let baseRate = 8.0; // Base rate of 8%
      
      if (debtToIncomeRatio > 0.3) baseRate += 2.0;
      if (avgRevenue < 10000) baseRate += 1.5;
      if (metrics.length < 6) baseRate += 1.0;

      const estimatedRate = Math.min(baseRate, 18.0); // Cap at 18%

      return {
        eligible,
        maxAmount: eligible ? maxAmount : 0,
        estimatedRate: eligible ? estimatedRate : 0,
        factors
      };
    } catch (error) {
      console.error('Error calculating loan eligibility:', error);
      return null;
    }
  }

  async calculateCreditScore(userId: string): Promise<CreditScore | null> {
    try {
      // Get business data for credit scoring
      const { data: metrics } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('metric_date', { ascending: false })
        .limit(24); // Last 24 months

      const { data: transactions } = await supabase
        .from('orders')
        .select('amount, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!metrics || metrics.length === 0) {
        return null;
      }

      // Calculate credit score factors (0-100 each)
      const factors = {
        payment_history: this.calculatePaymentHistory(transactions || []),
        business_age: Math.min(metrics.length * 4, 100), // 4 points per month, max 100
        revenue_stability: this.calculateRevenueStability(metrics),
        debt_to_income: this.calculateDebtToIncomeScore(userId),
        industry_risk: 75 // Default industry risk score
      };

      // Weighted credit score calculation
      const weights = {
        payment_history: 0.35,
        business_age: 0.15,
        revenue_stability: 0.30,
        debt_to_income: 0.15,
        industry_risk: 0.05
      };

      const score = Math.round(
        factors.payment_history * weights.payment_history +
        factors.business_age * weights.business_age +
        factors.revenue_stability * weights.revenue_stability +
        factors.debt_to_income * weights.debt_to_income +
        factors.industry_risk * weights.industry_risk
      );

      const creditScore: CreditScore = {
        user_id: userId,
        score: Math.max(300, Math.min(850, score * 8.5 + 150)), // Scale to 300-850 range
        factors,
        last_updated: new Date().toISOString()
      };

      return creditScore;
    } catch (error) {
      console.error('Error calculating credit score:', error);
      return null;
    }
  }

  private calculatePaymentHistory(transactions: any[]): number {
    if (transactions.length === 0) return 50;
    
    const onTimePayments = transactions.filter(t => t.status === 'completed').length;
    return Math.min(100, (onTimePayments / transactions.length) * 100);
  }

  private calculateRevenueStability(metrics: any[]): number {
    if (metrics.length < 3) return 30;
    
    const revenues = metrics.map(m => m.revenue || 0);
    const average = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const variance = revenues.reduce((a, b) => a + Math.pow(b - average, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);
    const cv = average > 0 ? stdDev / average : 1;
    
    // Lower coefficient of variation = higher stability score
    return Math.max(0, Math.min(100, 100 - (cv * 100)));
  }

  private async calculateDebtToIncomeScore(userId: string): Promise<number> {
    try {
      const { data: loans } = await supabase
        .from('loan_applications')
        .select('monthly_payment')
        .eq('user_id', userId)
        .eq('application_status', 'disbursed');

      const { data: recentMetrics } = await supabase
        .from('business_metrics')
        .select('revenue')
        .eq('user_id', userId)
        .order('metric_date', { ascending: false })
        .limit(3);

      if (!recentMetrics || recentMetrics.length === 0) return 50;

      const avgRevenue = recentMetrics.reduce((sum, m) => sum + (m.revenue || 0), 0) / recentMetrics.length;
      const totalDebt = loans?.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0) || 0;
      const debtToIncomeRatio = avgRevenue > 0 ? totalDebt / avgRevenue : 0;

      // Convert ratio to score (lower ratio = higher score)
      return Math.max(0, Math.min(100, 100 - (debtToIncomeRatio * 250)));
    } catch (error) {
      console.error('Error calculating debt-to-income score:', error);
      return 50;
    }
  }

  async getCreditScore(userId: string): Promise<number> {
    try {
      const creditScore = await this.calculateCreditScore(userId);
      return creditScore?.score || 650; // Default score
    } catch (error) {
      console.error('Error getting credit score:', error);
      return 650;
    }
  }

  // ============================================================================
  // INSURANCE SERVICES
  // ============================================================================

  async getInsuranceQuotes(businessData: {
    business_type: string;
    annual_revenue: number;
    employee_count: number;
    coverage_types: string[];
  }): Promise<any[]> {
    try {
      // Simulate insurance quote calculations
      const baseRates = {
        liability: 0.003, // 0.3% of revenue
        property: 0.005, // 0.5% of revenue
        business_interruption: 0.002, // 0.2% of revenue
        cyber: 0.001, // 0.1% of revenue
        health: 200 // RM 200 per employee per month
      };

      const quotes = businessData.coverage_types.map(coverageType => {
        let premium = 0;
        let coverage = 0;

        switch (coverageType) {
          case 'liability':
            coverage = Math.min(businessData.annual_revenue * 2, 1000000); // Max RM 1M
            premium = coverage * baseRates.liability;
            break;
          case 'property':
            coverage = businessData.annual_revenue;
            premium = coverage * baseRates.property;
            break;
          case 'business_interruption':
            coverage = businessData.annual_revenue * 0.5; // 6 months coverage
            premium = coverage * baseRates.business_interruption;
            break;
          case 'cyber':
            coverage = Math.min(businessData.annual_revenue, 500000); // Max RM 500k
            premium = coverage * baseRates.cyber;
            break;
          case 'health':
            coverage = businessData.employee_count * 50000; // RM 50k per employee
            premium = businessData.employee_count * baseRates.health * 12; // Annual premium
            break;
        }

        return {
          coverage_type: coverageType,
          coverage_amount: coverage,
          annual_premium: Math.round(premium),
          monthly_premium: Math.round(premium / 12),
          provider: 'PocketMoney Insurance Partner',
          features: this.getInsuranceFeatures(coverageType)
        };
      });

      return quotes;
    } catch (error) {
      console.error('Error getting insurance quotes:', error);
      return [];
    }
  }

  private getInsuranceFeatures(coverageType: string): string[] {
    const features = {
      liability: ['Third-party coverage', '24/7 legal support', 'Court representation'],
      property: ['Equipment coverage', 'Theft protection', 'Fire and flood coverage'],
      business_interruption: ['Lost income coverage', 'Operating expense coverage', 'Quick claim processing'],
      cyber: ['Data breach coverage', 'Cyber attack protection', 'Recovery assistance'],
      health: ['Medical coverage', 'Specialist consultations', 'Emergency treatment']
    };

    return features[coverageType as keyof typeof features] || [];
  }

  async createInsurancePolicy(policyData: Omit<InsurancePolicy, 'id' | 'created_at' | 'updated_at'>): Promise<InsurancePolicy | null> {
    try {
      const { data, error } = await supabase
        .from('insurance_policies')
        .insert(policyData)
        .select()
        .single();

      if (error) {
        console.error('Error creating insurance policy:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating insurance policy:', error);
      return null;
    }
  }

  async getInsurancePolicies(userId: string): Promise<InsurancePolicy[]> {
    try {
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching insurance policies:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching insurance policies:', error);
      return [];
    }
  }

  // ============================================================================
  // INVESTMENT PLATFORM
  // ============================================================================

  async createInvestmentOpportunity(opportunityData: Omit<InvestmentOpportunity, 'id' | 'created_at' | 'updated_at' | 'current_amount'>): Promise<InvestmentOpportunity | null> {
    try {
      const { data, error } = await supabase
        .from('investment_opportunities')
        .insert({
          ...opportunityData,
          current_amount: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating investment opportunity:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating investment opportunity:', error);
      return null;
    }
  }

  async getInvestmentOpportunities(filters?: {
    risk_level?: string;
    investment_type?: string;
    min_amount?: number;
    max_amount?: number;
    status?: string;
  }): Promise<InvestmentOpportunity[]> {
    try {
      let query = supabase
        .from('investment_opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.risk_level) {
        query = query.eq('risk_level', filters.risk_level);
      }

      if (filters?.investment_type) {
        query = query.eq('investment_type', filters.investment_type);
      }

      if (filters?.min_amount) {
        query = query.gte('minimum_investment', filters.min_amount);
      }

      if (filters?.max_amount) {
        query = query.lte('target_amount', filters.max_amount);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.eq('status', 'open');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching investment opportunities:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching investment opportunities:', error);
      return [];
    }
  }

  async makeInvestment(investmentData: Omit<Investment, 'id' | 'created_at' | 'updated_at' | 'investment_date' | 'status'>): Promise<Investment | null> {
    try {
      const { data, error } = await supabase
        .from('investments')
        .insert({
          ...investmentData,
          investment_date: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('Error making investment:', error);
        return null;
      }

      // Update opportunity current amount
      const { error: updateError } = await supabase
        .from('investment_opportunities')
        .update({
          current_amount: supabase.raw(`current_amount + ${investmentData.amount}`)
        })
        .eq('id', investmentData.opportunity_id);

      if (updateError) {
        console.error('Error updating opportunity amount:', updateError);
      }

      return data;
    } catch (error) {
      console.error('Error making investment:', error);
      return null;
    }
  }

  async getUserInvestments(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          opportunity:investment_opportunities(*)
        `)
        .eq('investor_id', userId)
        .order('investment_date', { ascending: false });

      if (error) {
        console.error('Error fetching user investments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user investments:', error);
      return [];
    }
  }

  // ============================================================================
  // PAYMENT SOLUTIONS
  // ============================================================================

  async processPayment(paymentData: {
    user_id: string;
    amount: number;
    currency_id: string;
    payment_method: string;
    reference_id?: string;
    metadata?: any;
  }): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
          ...paymentData,
          transaction_type: 'payment',
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error processing payment:', error);
        return null;
      }

      // Simulate payment processing
      setTimeout(async () => {
        await this.updatePaymentStatus(data.id, 'completed');
      }, 2000);

      return data;
    } catch (error) {
      console.error('Error processing payment:', error);
      return null;
    }
  }

  async updatePaymentStatus(transactionId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_transactions')
        .update({ status })
        .eq('id', transactionId);

      if (error) {
        console.error('Error updating payment status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      return false;
    }
  }

  async getPaymentHistory(userId: string, filters?: {
    transaction_type?: string;
    status?: string;
    date_range?: [string, string];
  }): Promise<PaymentTransaction[]> {
    try {
      let query = supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filters?.transaction_type) {
        query = query.eq('transaction_type', filters.transaction_type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.date_range) {
        query = query.gte('created_at', filters.date_range[0]).lte('created_at', filters.date_range[1]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching payment history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  // ============================================================================
  // FINANCIAL ANALYTICS
  // ============================================================================

  async getFinancialSummary(userId: string): Promise<any> {
    try {
      const [loans, insurance, investments, payments] = await Promise.all([
        this.getLoanApplications(userId),
        this.getInsurancePolicies(userId),
        this.getUserInvestments(userId),
        this.getPaymentHistory(userId)
      ]);

      const summary = {
        loans: {
          total_applications: loans.length,
          approved_count: loans.filter(l => l.application_status === 'approved').length,
          total_approved_amount: loans
            .filter(l => l.application_status === 'approved')
            .reduce((sum, l) => sum + (l.requested_amount || 0), 0),
          monthly_payments: loans
            .filter(l => l.application_status === 'disbursed')
            .reduce((sum, l) => sum + (l.monthly_payment || 0), 0)
        },
        insurance: {
          active_policies: insurance.filter(p => p.status === 'active').length,
          total_coverage: insurance
            .filter(p => p.status === 'active')
            .reduce((sum, p) => sum + p.coverage_amount, 0),
          monthly_premiums: insurance
            .filter(p => p.status === 'active')
            .reduce((sum, p) => sum + (p.premium_amount / 12), 0)
        },
        investments: {
          total_investments: investments.length,
          total_invested: investments.reduce((sum, i) => sum + i.amount, 0),
          active_investments: investments.filter(i => i.status === 'active').length
        },
        payments: {
          total_transactions: payments.length,
          successful_payments: payments.filter(p => p.status === 'completed').length,
          total_volume: payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0)
        }
      };

      return summary;
    } catch (error) {
      console.error('Error getting financial summary:', error);
      return null;
    }
  }
}

export const financialServicesHub = new FinancialServicesHub();