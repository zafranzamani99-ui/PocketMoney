// PocketMoney Compliance & Regulatory Service
// Handles tax automation, government integration, and regulatory compliance

import { supabase } from '../lib/supabase';

export interface ComplianceRecord {
  id: string;
  user_id: string;
  compliance_type: 'tax' | 'ssm' | 'license' | 'permits' | 'certifications';
  record_type: 'filing' | 'renewal' | 'audit' | 'inspection' | 'application';
  title: string;
  description?: string;
  due_date?: string;
  completion_date?: string;
  status: 'pending' | 'completed' | 'overdue' | 'exempt';
  documents?: any;
  reminder_settings?: any;
  government_agency?: string;
  reference_number?: string;
  fees_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaxRecord {
  id: string;
  user_id: string;
  tax_period: string;
  tax_type: 'gst' | 'sst' | 'income_tax' | 'withholding' | 'stamp_duty';
  gross_income: number;
  taxable_income: number;
  tax_amount: number;
  paid_amount: number;
  currency_id?: string;
  filing_status: 'draft' | 'filed' | 'paid' | 'audited';
  filing_date?: string;
  payment_due_date?: string;
  documents?: any;
  calculated_by: 'system' | 'manual' | 'accountant';
  created_at: string;
  updated_at: string;
}

export interface GovernmentGrant {
  id: string;
  user_id: string;
  grant_name: string;
  agency: string;
  grant_type: 'startup' | 'expansion' | 'technology' | 'export' | 'sustainability';
  amount: number;
  currency_id?: string;
  application_date?: string;
  approval_date?: string;
  disbursement_date?: string;
  status: 'applied' | 'approved' | 'rejected' | 'disbursed' | 'completed';
  requirements?: any;
  milestones?: any;
  reporting_schedule?: any;
  documents?: any;
  created_at: string;
  updated_at: string;
}

export interface TaxCalculation {
  period: string;
  gross_income: number;
  deductions: {
    business_expenses: number;
    depreciation: number;
    other_allowances: number;
    total: number;
  };
  taxable_income: number;
  tax_breakdown: {
    gst_sst: number;
    income_tax: number;
    withholding_tax: number;
    total: number;
  };
  payment_schedule: Array<{
    due_date: string;
    amount: number;
    tax_type: string;
  }>;
}

export interface ComplianceStatus {
  total_requirements: number;
  completed: number;
  pending: number;
  overdue: number;
  due_soon: number; // Due within 30 days
  compliance_score: number; // 0-100
  upcoming_deadlines: ComplianceRecord[];
  critical_items: ComplianceRecord[];
}

class ComplianceService {
  // ============================================================================
  // TAX AUTOMATION
  // ============================================================================

  async calculateTaxes(userId: string, period: string): Promise<TaxCalculation | null> {
    try {
      // Get business data for the period
      const [startDate, endDate] = this.parseTaxPeriod(period);
      
      // Get income data
      const { data: orders } = await supabase
        .from('orders')
        .select('amount, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Get expense data
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, category, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Get user business information
      const { data: user } = await supabase
        .from('users')
        .select('business_type, business_registration_number')
        .eq('id', userId)
        .single();

      if (!orders || !expenses || !user) {
        console.error('Insufficient data for tax calculation');
        return null;
      }

      // Calculate gross income
      const grossIncome = orders.reduce((sum, order) => sum + order.amount, 0);

      // Calculate deductions
      const businessExpenses = expenses
        .filter(e => this.isDeductibleExpense(e.category))
        .reduce((sum, e) => sum + e.amount, 0);

      const depreciation = this.calculateDepreciation(userId, startDate, endDate);
      const otherAllowances = this.calculateOtherAllowances(grossIncome, user.business_type);

      const totalDeductions = businessExpenses + depreciation + otherAllowances;
      const taxableIncome = Math.max(0, grossIncome - totalDeductions);

      // Calculate tax breakdown
      const gstSst = this.calculateGSTSST(grossIncome, user.business_type);
      const incomeTax = this.calculateIncomeTax(taxableIncome, user.business_type);
      const withholdingTax = this.calculateWithholdingTax(grossIncome);

      const totalTax = gstSst + incomeTax + withholdingTax;

      // Generate payment schedule
      const paymentSchedule = this.generatePaymentSchedule(period, {
        gst_sst: gstSst,
        income_tax: incomeTax,
        withholding_tax: withholdingTax
      });

      const taxCalculation: TaxCalculation = {
        period,
        gross_income: grossIncome,
        deductions: {
          business_expenses: businessExpenses,
          depreciation,
          other_allowances: otherAllowances,
          total: totalDeductions
        },
        taxable_income: taxableIncome,
        tax_breakdown: {
          gst_sst: gstSst,
          income_tax: incomeTax,
          withholding_tax: withholdingTax,
          total: totalTax
        },
        payment_schedule: paymentSchedule
      };

      return taxCalculation;
    } catch (error) {
      console.error('Error calculating taxes:', error);
      return null;
    }
  }

  private parseTaxPeriod(period: string): [string, string] {
    // Parse period like "2024-Q1" or "2024-Annual"
    if (period.includes('Q')) {
      const [year, quarter] = period.split('-Q');
      const quarterNum = parseInt(quarter);
      const startMonth = (quarterNum - 1) * 3;
      const endMonth = startMonth + 2;
      
      return [
        `${year}-${String(startMonth + 1).padStart(2, '0')}-01`,
        `${year}-${String(endMonth + 1).padStart(2, '0')}-${new Date(parseInt(year), endMonth + 1, 0).getDate()}`
      ];
    } else if (period.includes('Annual')) {
      const year = period.split('-')[0];
      return [`${year}-01-01`, `${year}-12-31`];
    } else {
      // Monthly format like "2024-03"
      const [year, month] = period.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      return [`${year}-${month}-01`, `${year}-${month}-${lastDay}`];
    }
  }

  private isDeductibleExpense(category: string): boolean {
    const deductibleCategories = [
      'Office Supplies', 'Marketing', 'Transportation', 'Professional Services',
      'Equipment', 'Software', 'Insurance', 'Training', 'Utilities', 'Rent'
    ];
    return deductibleCategories.includes(category);
  }

  private calculateDepreciation(userId: string, startDate: string, endDate: string): number {
    // Simplified depreciation calculation - would be more complex in real implementation
    // Assuming 20% annual depreciation on equipment purchases
    return 0; // Placeholder - would calculate based on equipment purchases
  }

  private calculateOtherAllowances(grossIncome: number, businessType: string): number {
    // Business allowances based on income and type
    let allowanceRate = 0.05; // 5% default
    
    if (businessType === 'Food') allowanceRate = 0.08; // Higher for food businesses
    if (businessType === 'Online') allowanceRate = 0.03; // Lower for online businesses
    
    return grossIncome * allowanceRate;
  }

  private calculateGSTSST(grossIncome: number, businessType: string): number {
    // Malaysia GST/SST calculation
    const gstThreshold = 500000; // RM 500k annual threshold for GST registration
    
    if (grossIncome > gstThreshold) {
      return grossIncome * 0.06; // 6% GST
    } else {
      // SST for certain business types
      if (['Retail', 'Service'].includes(businessType)) {
        return grossIncome * 0.06; // 6% SST
      }
    }
    
    return 0;
  }

  private calculateIncomeTax(taxableIncome: number, businessType: string): number {
    // Malaysian corporate tax rates (simplified)
    if (taxableIncome <= 600000) {
      return taxableIncome * 0.17; // 17% for first RM 600k
    } else {
      return 600000 * 0.17 + (taxableIncome - 600000) * 0.24; // 24% above RM 600k
    }
  }

  private calculateWithholdingTax(grossIncome: number): number {
    // Simplified withholding tax calculation
    return grossIncome * 0.01; // 1% withholding tax
  }

  private generatePaymentSchedule(period: string, taxes: any): Array<{
    due_date: string;
    amount: number;
    tax_type: string;
  }> {
    const schedule = [];
    const [year] = period.split('-');
    
    // Monthly GST/SST payments
    if (taxes.gst_sst > 0) {
      const monthlyGST = taxes.gst_sst / 12;
      for (let month = 1; month <= 12; month++) {
        schedule.push({
          due_date: `${year}-${String(month).padStart(2, '0')}-30`,
          amount: monthlyGST,
          tax_type: 'GST/SST'
        });
      }
    }
    
    // Quarterly income tax installments
    if (taxes.income_tax > 0) {
      const quarterlyIncome = taxes.income_tax / 4;
      for (let quarter = 1; quarter <= 4; quarter++) {
        const month = quarter * 3;
        schedule.push({
          due_date: `${year}-${String(month).padStart(2, '0')}-30`,
          amount: quarterlyIncome,
          tax_type: 'Income Tax'
        });
      }
    }
    
    return schedule.sort((a, b) => a.due_date.localeCompare(b.due_date));
  }

  async saveTaxRecord(taxData: Omit<TaxRecord, 'id' | 'created_at' | 'updated_at'>): Promise<TaxRecord | null> {
    try {
      const { data, error } = await supabase
        .from('tax_records')
        .insert(taxData)
        .select()
        .single();

      if (error) {
        console.error('Error saving tax record:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error saving tax record:', error);
      return null;
    }
  }

  async getTaxRecords(userId: string, filters?: {
    tax_type?: string;
    tax_period?: string;
    filing_status?: string;
  }): Promise<TaxRecord[]> {
    try {
      let query = supabase
        .from('tax_records')
        .select('*')
        .eq('user_id', userId)
        .order('tax_period', { ascending: false });

      if (filters?.tax_type) {
        query = query.eq('tax_type', filters.tax_type);
      }

      if (filters?.tax_period) {
        query = query.eq('tax_period', filters.tax_period);
      }

      if (filters?.filing_status) {
        query = query.eq('filing_status', filters.filing_status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tax records:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching tax records:', error);
      return [];
    }
  }

  // ============================================================================
  // COMPLIANCE MANAGEMENT
  // ============================================================================

  async createComplianceRecord(recordData: Omit<ComplianceRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ComplianceRecord | null> {
    try {
      const { data, error } = await supabase
        .from('compliance_records')
        .insert(recordData)
        .select()
        .single();

      if (error) {
        console.error('Error creating compliance record:', error);
        return null;
      }

      // Set up reminders
      if (recordData.due_date && recordData.reminder_settings) {
        await this.setupComplianceReminders(data.id, recordData.due_date, recordData.reminder_settings);
      }

      return data;
    } catch (error) {
      console.error('Error creating compliance record:', error);
      return null;
    }
  }

  async getComplianceRecords(userId: string, filters?: {
    compliance_type?: string;
    status?: string;
    due_soon?: boolean;
    overdue?: boolean;
  }): Promise<ComplianceRecord[]> {
    try {
      let query = supabase
        .from('compliance_records')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (filters?.compliance_type) {
        query = query.eq('compliance_type', filters.compliance_type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.due_soon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query = query.lte('due_date', thirtyDaysFromNow.toISOString().split('T')[0]);
      }

      if (filters?.overdue) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('due_date', today).eq('status', 'pending');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching compliance records:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching compliance records:', error);
      return [];
    }
  }

  async getComplianceStatus(userId: string): Promise<ComplianceStatus | null> {
    try {
      const allRecords = await this.getComplianceRecords(userId);
      
      const completed = allRecords.filter(r => r.status === 'completed').length;
      const pending = allRecords.filter(r => r.status === 'pending').length;
      const overdue = allRecords.filter(r => 
        r.status === 'pending' && r.due_date && r.due_date < new Date().toISOString().split('T')[0]
      ).length;
      
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const dueSoon = allRecords.filter(r =>
        r.status === 'pending' && 
        r.due_date && 
        r.due_date <= thirtyDaysFromNow.toISOString().split('T')[0] &&
        r.due_date >= new Date().toISOString().split('T')[0]
      ).length;

      const complianceScore = allRecords.length > 0 ? 
        Math.round((completed / allRecords.length) * 100 - (overdue * 10)) : 100;

      const upcomingDeadlines = allRecords
        .filter(r => r.status === 'pending' && r.due_date)
        .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
        .slice(0, 5);

      const criticalItems = allRecords.filter(r => 
        (r.status === 'pending' && r.due_date && r.due_date < new Date().toISOString().split('T')[0]) ||
        (r.compliance_type === 'license' && r.status === 'pending')
      );

      return {
        total_requirements: allRecords.length,
        completed,
        pending,
        overdue,
        due_soon: dueSoon,
        compliance_score: Math.max(0, complianceScore),
        upcoming_deadlines: upcomingDeadlines,
        critical_items: criticalItems
      };
    } catch (error) {
      console.error('Error getting compliance status:', error);
      return null;
    }
  }

  async updateComplianceStatus(recordId: string, status: string, completionDate?: string): Promise<boolean> {
    try {
      const updateData: any = { status };
      
      if (status === 'completed' && completionDate) {
        updateData.completion_date = completionDate;
      }

      const { error } = await supabase
        .from('compliance_records')
        .update(updateData)
        .eq('id', recordId);

      if (error) {
        console.error('Error updating compliance status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating compliance status:', error);
      return false;
    }
  }

  // ============================================================================
  // GOVERNMENT INTEGRATION
  // ============================================================================

  async discoverGrantOpportunities(businessProfile: {
    business_type: string;
    business_category?: string;
    annual_revenue: number;
    employee_count: number;
    location: string;
  }): Promise<any[]> {
    try {
      // Mock grant opportunities - in real implementation, this would integrate with government APIs
      const mockGrants = [
        {
          grant_name: 'SME Digitalization Grant',
          agency: 'SME Corp Malaysia',
          grant_type: 'technology',
          max_amount: 50000,
          description: 'Support SMEs in digital transformation initiatives',
          eligibility: ['Annual revenue < RM 50M', 'Malaysian company', 'Technology adoption'],
          application_deadline: '2024-12-31',
          funding_ratio: 0.8, // 80% funding
          requirements: {
            business_plan: true,
            quotations: true,
            financial_statements: true
          }
        },
        {
          grant_name: 'Export Market Development Grant',
          agency: 'MATRADE',
          grant_type: 'export',
          max_amount: 200000,
          description: 'Support export market development activities',
          eligibility: ['Established business', 'Export potential', 'Malaysian products'],
          application_deadline: '2024-11-30',
          funding_ratio: 0.7,
          requirements: {
            export_plan: true,
            market_research: true,
            company_profile: true
          }
        },
        {
          grant_name: 'Green Technology Financing Scheme',
          agency: 'Malaysian Green Technology Corporation',
          grant_type: 'sustainability',
          max_amount: 1000000,
          description: 'Promote adoption of green technology solutions',
          eligibility: ['Green technology adoption', 'Environmental impact', 'Malaysian company'],
          application_deadline: '2025-03-31',
          funding_ratio: 0.6,
          requirements: {
            green_technology_plan: true,
            environmental_impact_assessment: true,
            technical_specifications: true
          }
        }
      ];

      // Filter grants based on business profile
      const eligibleGrants = mockGrants.filter(grant => {
        if (grant.grant_type === 'export' && businessProfile.annual_revenue < 100000) return false;
        if (grant.grant_type === 'technology' && businessProfile.business_type === 'Food') return false;
        return true;
      });

      return eligibleGrants;
    } catch (error) {
      console.error('Error discovering grant opportunities:', error);
      return [];
    }
  }

  async applyForGrant(grantApplication: Omit<GovernmentGrant, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<GovernmentGrant | null> {
    try {
      const { data, error } = await supabase
        .from('government_grants')
        .insert({
          ...grantApplication,
          status: 'applied',
          application_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error applying for grant:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error applying for grant:', error);
      return null;
    }
  }

  async getGovernmentGrants(userId: string, status?: string): Promise<GovernmentGrant[]> {
    try {
      let query = supabase
        .from('government_grants')
        .select('*')
        .eq('user_id', userId)
        .order('application_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching government grants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching government grants:', error);
      return [];
    }
  }

  // ============================================================================
  // AUTOMATION AND REMINDERS
  // ============================================================================

  private async setupComplianceReminders(recordId: string, dueDate: string, reminderSettings: any): Promise<void> {
    try {
      // This would integrate with a notification service
      const reminders = [];
      
      if (reminderSettings.days_before) {
        reminderSettings.days_before.forEach((days: number) => {
          const reminderDate = new Date(dueDate);
          reminderDate.setDate(reminderDate.getDate() - days);
          
          reminders.push({
            record_id: recordId,
            reminder_date: reminderDate.toISOString(),
            reminder_type: 'email',
            message: `Compliance requirement due in ${days} days`
          });
        });
      }

      // In a real implementation, these would be stored and processed by a background job
      console.log('Reminders set up:', reminders);
    } catch (error) {
      console.error('Error setting up reminders:', error);
    }
  }

  async generateComplianceReport(userId: string, period: string): Promise<any> {
    try {
      const [startDate, endDate] = this.parseTaxPeriod(period);
      
      const complianceRecords = await this.getComplianceRecords(userId);
      const taxRecords = await this.getTaxRecords(userId);
      const grants = await this.getGovernmentGrants(userId);

      const report = {
        period,
        generated_at: new Date().toISOString(),
        compliance_summary: {
          total_requirements: complianceRecords.length,
          completed: complianceRecords.filter(r => r.status === 'completed').length,
          pending: complianceRecords.filter(r => r.status === 'pending').length,
          overdue: complianceRecords.filter(r => 
            r.status === 'pending' && r.due_date && r.due_date < new Date().toISOString().split('T')[0]
          ).length
        },
        tax_summary: {
          total_filings: taxRecords.length,
          filed: taxRecords.filter(t => t.filing_status === 'filed').length,
          paid: taxRecords.filter(t => t.filing_status === 'paid').length,
          outstanding_amount: taxRecords
            .filter(t => t.filing_status !== 'paid')
            .reduce((sum, t) => sum + (t.tax_amount - t.paid_amount), 0)
        },
        grants_summary: {
          applications: grants.length,
          approved: grants.filter(g => g.status === 'approved').length,
          disbursed: grants.filter(g => g.status === 'disbursed').length,
          total_approved_amount: grants
            .filter(g => g.status === 'approved' || g.status === 'disbursed')
            .reduce((sum, g) => sum + g.amount, 0)
        },
        recommendations: this.generateComplianceRecommendations(complianceRecords, taxRecords)
      };

      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      return null;
    }
  }

  private generateComplianceRecommendations(complianceRecords: ComplianceRecord[], taxRecords: TaxRecord[]): string[] {
    const recommendations = [];

    // Check for overdue items
    const overdueCount = complianceRecords.filter(r => 
      r.status === 'pending' && r.due_date && r.due_date < new Date().toISOString().split('T')[0]
    ).length;

    if (overdueCount > 0) {
      recommendations.push(`Address ${overdueCount} overdue compliance requirements immediately`);
    }

    // Check for unfiled taxes
    const unfiledTaxes = taxRecords.filter(t => t.filing_status === 'draft').length;
    if (unfiledTaxes > 0) {
      recommendations.push(`Complete ${unfiledTaxes} pending tax filings`);
    }

    // Check for upcoming deadlines
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const upcomingDeadlines = complianceRecords.filter(r =>
      r.status === 'pending' && 
      r.due_date && 
      r.due_date <= thirtyDaysFromNow.toISOString().split('T')[0]
    ).length;

    if (upcomingDeadlines > 0) {
      recommendations.push(`Prepare for ${upcomingDeadlines} compliance deadlines in the next 30 days`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All compliance requirements are up to date');
    }

    return recommendations;
  }
}

export const complianceService = new ComplianceService();