// PocketMoney Analytics & Business Intelligence Service
// Provides advanced analytics, market intelligence, and predictive insights

import { supabase } from '../lib/supabase';

export interface BusinessMetrics {
  id: string;
  user_id: string;
  business_location_id?: string;
  metric_date: string;
  revenue: number;
  expenses: number;
  profit: number;
  transactions_count: number;
  customers_count: number;
  new_customers_count: number;
  inventory_value: number;
  currency_id?: string;
  additional_metrics?: any;
  created_at: string;
}

export interface MarketIntelligence {
  id: string;
  industry: string;
  region: string;
  data_type: string;
  metric_name: string;
  metric_value: number;
  data_source: string;
  confidence_score: number;
  report_date: string;
  metadata?: any;
  created_at: string;
}

export interface PredictiveInsight {
  type: 'cash_flow' | 'demand' | 'market_trend' | 'customer_behavior';
  prediction: any;
  confidence: number;
  timeframe: string;
  factors: string[];
  recommendation: string;
}

export interface BusinessRecommendation {
  id: string;
  type: 'pricing' | 'inventory' | 'marketing' | 'expansion' | 'cost_reduction';
  title: string;
  description: string;
  impact_estimate: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  priority: 'low' | 'medium' | 'high';
  data_sources: string[];
  created_at: string;
}

export interface DashboardData {
  kpis: {
    revenue: { current: number; previous: number; change_percent: number };
    profit: { current: number; previous: number; change_percent: number };
    customers: { current: number; previous: number; change_percent: number };
    orders: { current: number; previous: number; change_percent: number };
  };
  trends: {
    revenue_trend: Array<{ date: string; value: number }>;
    profit_trend: Array<{ date: string; value: number }>;
    customer_trend: Array<{ date: string; value: number }>;
  };
  insights: PredictiveInsight[];
  recommendations: BusinessRecommendation[];
}

class AnalyticsIntelligenceService {
  // ============================================================================
  // BUSINESS METRICS COLLECTION
  // ============================================================================

  async recordBusinessMetrics(metricsData: Omit<BusinessMetrics, 'id' | 'created_at'>): Promise<BusinessMetrics | null> {
    try {
      const { data, error } = await supabase
        .from('business_metrics')
        .upsert(metricsData, {
          onConflict: 'user_id,business_location_id,metric_date',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording business metrics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error recording business metrics:', error);
      return null;
    }
  }

  async calculateDailyMetrics(userId: string, date: string): Promise<BusinessMetrics | null> {
    try {
      // Get orders for the day
      const { data: orders } = await supabase
        .from('orders')
        .select('amount, customer_id, created_at')
        .eq('user_id', userId)
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`);

      // Get expenses for the day
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`);

      // Get customer data
      const { data: customers } = await supabase
        .from('customers')
        .select('id, created_at')
        .eq('user_id', userId);

      // Get inventory value
      const { data: products } = await supabase
        .from('products')
        .select('stock_quantity, cost_price')
        .eq('user_id', userId)
        .eq('is_active', true);

      // Calculate metrics
      const revenue = orders?.reduce((sum, order) => sum + order.amount, 0) || 0;
      const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const profit = revenue - totalExpenses;
      const transactionsCount = orders?.length || 0;
      
      const uniqueCustomers = new Set(orders?.map(o => o.customer_id).filter(Boolean));
      const customersCount = uniqueCustomers.size;
      
      const newCustomersToday = customers?.filter(c => 
        c.created_at >= `${date}T00:00:00` && c.created_at < `${date}T23:59:59`
      ).length || 0;

      const inventoryValue = products?.reduce((sum, product) => 
        sum + (product.stock_quantity * (product.cost_price || 0)), 0
      ) || 0;

      // Get default currency
      const { data: currency } = await supabase
        .from('currencies')
        .select('id')
        .eq('code', 'MYR')
        .single();

      const metricsData: Omit<BusinessMetrics, 'id' | 'created_at'> = {
        user_id: userId,
        metric_date: date,
        revenue,
        expenses: totalExpenses,
        profit,
        transactions_count: transactionsCount,
        customers_count: customersCount,
        new_customers_count: newCustomersToday,
        inventory_value: inventoryValue,
        currency_id: currency?.id
      };

      return await this.recordBusinessMetrics(metricsData);
    } catch (error) {
      console.error('Error calculating daily metrics:', error);
      return null;
    }
  }

  async getBusinessMetrics(userId: string, filters: {
    start_date?: string;
    end_date?: string;
    location_id?: string;
    aggregation?: 'day' | 'week' | 'month';
  }): Promise<BusinessMetrics[]> {
    try {
      let query = supabase
        .from('business_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('metric_date', { ascending: true });

      if (filters.start_date) {
        query = query.gte('metric_date', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('metric_date', filters.end_date);
      }

      if (filters.location_id) {
        query = query.eq('business_location_id', filters.location_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching business metrics:', error);
        return [];
      }

      // Apply aggregation if needed
      if (filters.aggregation && filters.aggregation !== 'day') {
        return this.aggregateMetrics(data || [], filters.aggregation);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching business metrics:', error);
      return [];
    }
  }

  private aggregateMetrics(metrics: BusinessMetrics[], aggregation: 'week' | 'month'): BusinessMetrics[] {
    const grouped = new Map<string, BusinessMetrics[]>();

    metrics.forEach(metric => {
      const date = new Date(metric.metric_date);
      let key: string;

      if (aggregation === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else { // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    });

    return Array.from(grouped.entries()).map(([key, groupMetrics]) => ({
      id: `aggregated-${key}`,
      user_id: groupMetrics[0].user_id,
      business_location_id: groupMetrics[0].business_location_id,
      metric_date: key,
      revenue: groupMetrics.reduce((sum, m) => sum + m.revenue, 0),
      expenses: groupMetrics.reduce((sum, m) => sum + m.expenses, 0),
      profit: groupMetrics.reduce((sum, m) => sum + m.profit, 0),
      transactions_count: groupMetrics.reduce((sum, m) => sum + m.transactions_count, 0),
      customers_count: Math.max(...groupMetrics.map(m => m.customers_count)),
      new_customers_count: groupMetrics.reduce((sum, m) => sum + m.new_customers_count, 0),
      inventory_value: groupMetrics[groupMetrics.length - 1].inventory_value, // Latest value
      currency_id: groupMetrics[0].currency_id,
      created_at: new Date().toISOString()
    }));
  }

  // ============================================================================
  // DASHBOARD ANALYTICS
  // ============================================================================

  async getDashboardData(userId: string, timeframe: 'day' | 'week' | 'month' | 'quarter'): Promise<DashboardData | null> {
    try {
      const { startDate, endDate, previousStartDate, previousEndDate } = this.getDateRanges(timeframe);

      // Get current period metrics
      const currentMetrics = await this.getBusinessMetrics(userId, {
        start_date: startDate,
        end_date: endDate
      });

      // Get previous period metrics for comparison
      const previousMetrics = await this.getBusinessMetrics(userId, {
        start_date: previousStartDate,
        end_date: previousEndDate
      });

      // Calculate KPIs
      const currentTotals = this.calculateTotals(currentMetrics);
      const previousTotals = this.calculateTotals(previousMetrics);

      const kpis = {
        revenue: {
          current: currentTotals.revenue,
          previous: previousTotals.revenue,
          change_percent: this.calculateChangePercent(currentTotals.revenue, previousTotals.revenue)
        },
        profit: {
          current: currentTotals.profit,
          previous: previousTotals.profit,
          change_percent: this.calculateChangePercent(currentTotals.profit, previousTotals.profit)
        },
        customers: {
          current: currentTotals.customers,
          previous: previousTotals.customers,
          change_percent: this.calculateChangePercent(currentTotals.customers, previousTotals.customers)
        },
        orders: {
          current: currentTotals.transactions,
          previous: previousTotals.transactions,
          change_percent: this.calculateChangePercent(currentTotals.transactions, previousTotals.transactions)
        }
      };

      // Create trends
      const trends = {
        revenue_trend: currentMetrics.map(m => ({ date: m.metric_date, value: m.revenue })),
        profit_trend: currentMetrics.map(m => ({ date: m.metric_date, value: m.profit })),
        customer_trend: currentMetrics.map(m => ({ date: m.metric_date, value: m.customers_count }))
      };

      // Generate insights and recommendations
      const insights = await this.generatePredictiveInsights(userId, currentMetrics);
      const recommendations = await this.generateBusinessRecommendations(userId, currentMetrics);

      return {
        kpis,
        trends,
        insights,
        recommendations
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return null;
    }
  }

  private getDateRanges(timeframe: string) {
    const now = new Date();
    let startDate: string, endDate: string, previousStartDate: string, previousEndDate: string;

    switch (timeframe) {
      case 'day':
        endDate = now.toISOString().split('T')[0];
        startDate = endDate;
        const previousDay = new Date(now);
        previousDay.setDate(now.getDate() - 1);
        previousEndDate = previousDay.toISOString().split('T')[0];
        previousStartDate = previousEndDate;
        break;

      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        
        const previousWeekEnd = new Date(startOfWeek);
        previousWeekEnd.setDate(startOfWeek.getDate() - 1);
        const previousWeekStart = new Date(previousWeekEnd);
        previousWeekStart.setDate(previousWeekEnd.getDate() - 6);
        previousStartDate = previousWeekStart.toISOString().split('T')[0];
        previousEndDate = previousWeekEnd.toISOString().split('T')[0];
        break;

      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = startOfMonth.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        
        const previousMonthEnd = new Date(startOfMonth);
        previousMonthEnd.setDate(startOfMonth.getDate() - 1);
        const previousMonthStart = new Date(previousMonthEnd.getFullYear(), previousMonthEnd.getMonth(), 1);
        previousStartDate = previousMonthStart.toISOString().split('T')[0];
        previousEndDate = previousMonthEnd.toISOString().split('T')[0];
        break;

      case 'quarter':
      default:
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        startDate = quarterStart.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        
        const previousQuarterEnd = new Date(quarterStart);
        previousQuarterEnd.setDate(quarterStart.getDate() - 1);
        const previousQuarterStart = new Date(previousQuarterEnd.getFullYear(), Math.floor(previousQuarterEnd.getMonth() / 3) * 3, 1);
        previousStartDate = previousQuarterStart.toISOString().split('T')[0];
        previousEndDate = previousQuarterEnd.toISOString().split('T')[0];
        break;
    }

    return { startDate, endDate, previousStartDate, previousEndDate };
  }

  private calculateTotals(metrics: BusinessMetrics[]) {
    return {
      revenue: metrics.reduce((sum, m) => sum + m.revenue, 0),
      profit: metrics.reduce((sum, m) => sum + m.profit, 0),
      customers: Math.max(...metrics.map(m => m.customers_count), 0),
      transactions: metrics.reduce((sum, m) => sum + m.transactions_count, 0)
    };
  }

  private calculateChangePercent(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // ============================================================================
  // PREDICTIVE ANALYTICS
  // ============================================================================

  async generatePredictiveInsights(userId: string, recentMetrics: BusinessMetrics[]): Promise<PredictiveInsight[]> {
    try {
      const insights: PredictiveInsight[] = [];

      // Cash flow prediction
      const cashFlowInsight = await this.predictCashFlow(userId, recentMetrics);
      if (cashFlowInsight) insights.push(cashFlowInsight);

      // Demand forecasting
      const demandInsight = await this.predictDemand(userId, recentMetrics);
      if (demandInsight) insights.push(demandInsight);

      // Market trend analysis
      const marketInsight = await this.analyzeMarketTrends(userId, recentMetrics);
      if (marketInsight) insights.push(marketInsight);

      // Customer behavior prediction
      const customerInsight = await this.predictCustomerBehavior(userId, recentMetrics);
      if (customerInsight) insights.push(customerInsight);

      return insights;
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      return [];
    }
  }

  private async predictCashFlow(userId: string, metrics: BusinessMetrics[]): Promise<PredictiveInsight | null> {
    if (metrics.length < 7) return null; // Need at least a week of data

    try {
      // Simple linear regression for cash flow prediction
      const revenues = metrics.map(m => m.revenue);
      const expenses = metrics.map(m => m.expenses);
      
      const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
      const avgExpenses = expenses.reduce((a, b) => a + b, 0) / expenses.length;
      
      // Calculate trend
      const revenueGrowth = this.calculateTrendSlope(revenues);
      const expenseGrowth = this.calculateTrendSlope(expenses);
      
      // Predict next 30 days
      const projectedRevenue = avgRevenue + (revenueGrowth * 30);
      const projectedExpenses = avgExpenses + (expenseGrowth * 30);
      const projectedCashFlow = projectedRevenue - projectedExpenses;
      
      const confidence = Math.min(0.9, metrics.length / 30); // Higher confidence with more data
      
      let recommendation = 'Continue current financial management';
      if (projectedCashFlow < 0) {
        recommendation = 'Consider cost reduction or revenue enhancement strategies';
      } else if (projectedCashFlow > avgRevenue * 0.5) {
        recommendation = 'Strong cash flow predicted - consider expansion opportunities';
      }

      return {
        type: 'cash_flow',
        prediction: {
          projected_revenue: Math.round(projectedRevenue),
          projected_expenses: Math.round(projectedExpenses),
          projected_cash_flow: Math.round(projectedCashFlow),
          timeframe: '30 days'
        },
        confidence,
        timeframe: '30 days',
        factors: ['Revenue trend', 'Expense trend', 'Historical patterns'],
        recommendation
      };
    } catch (error) {
      console.error('Error predicting cash flow:', error);
      return null;
    }
  }

  private async predictDemand(userId: string, metrics: BusinessMetrics[]): Promise<PredictiveInsight | null> {
    if (metrics.length < 14) return null; // Need at least 2 weeks of data

    try {
      const transactions = metrics.map(m => m.transactions_count);
      const avgTransactions = transactions.reduce((a, b) => a + b, 0) / transactions.length;
      const transactionGrowth = this.calculateTrendSlope(transactions);
      
      // Predict next 7 days
      const projectedDemand = avgTransactions + (transactionGrowth * 7);
      const changePercent = ((projectedDemand - avgTransactions) / avgTransactions) * 100;
      
      const confidence = Math.min(0.85, metrics.length / 21);
      
      let recommendation = 'Maintain current inventory levels';
      if (changePercent > 20) {
        recommendation = 'Increase inventory to meet growing demand';
      } else if (changePercent < -20) {
        recommendation = 'Consider promotional activities to boost demand';
      }

      return {
        type: 'demand',
        prediction: {
          projected_daily_transactions: Math.round(projectedDemand),
          change_percent: Math.round(changePercent),
          trend: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable'
        },
        confidence,
        timeframe: '7 days',
        factors: ['Transaction history', 'Growth trend', 'Seasonal patterns'],
        recommendation
      };
    } catch (error) {
      console.error('Error predicting demand:', error);
      return null;
    }
  }

  private async analyzeMarketTrends(userId: string, metrics: BusinessMetrics[]): Promise<PredictiveInsight | null> {
    try {
      // Get user's business type for industry comparison
      const { data: user } = await supabase
        .from('users')
        .select('business_type, business_category')
        .eq('id', userId)
        .single();

      if (!user) return null;

      // Get market intelligence data for comparison
      const { data: marketData } = await supabase
        .from('market_intelligence')
        .select('*')
        .eq('industry', user.business_type || user.business_category)
        .order('report_date', { ascending: false })
        .limit(30);

      if (!marketData || marketData.length === 0) return null;

      // Compare user performance to market averages
      const userRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0) / metrics.length;
      const marketAvgRevenue = marketData
        .filter(d => d.metric_name === 'average_revenue')
        .reduce((sum, d) => sum + d.metric_value, 0) / marketData.length;

      const performanceRatio = userRevenue / marketAvgRevenue;
      
      let recommendation = 'Continue monitoring market trends';
      if (performanceRatio > 1.2) {
        recommendation = 'Outperforming market - consider premium positioning';
      } else if (performanceRatio < 0.8) {
        recommendation = 'Below market average - analyze competitive positioning';
      }

      return {
        type: 'market_trend',
        prediction: {
          market_position: performanceRatio > 1.1 ? 'above_average' : performanceRatio < 0.9 ? 'below_average' : 'average',
          performance_ratio: Math.round(performanceRatio * 100) / 100,
          market_growth_rate: 5.2 // This would come from actual market data
        },
        confidence: 0.75,
        timeframe: 'Current',
        factors: ['Industry benchmarks', 'Market growth data', 'Competitive analysis'],
        recommendation
      };
    } catch (error) {
      console.error('Error analyzing market trends:', error);
      return null;
    }
  }

  private async predictCustomerBehavior(userId: string, metrics: BusinessMetrics[]): Promise<PredictiveInsight | null> {
    try {
      const customerCounts = metrics.map(m => m.customers_count);
      const newCustomers = metrics.map(m => m.new_customers_count);
      
      const avgCustomers = customerCounts.reduce((a, b) => a + b, 0) / customerCounts.length;
      const avgNewCustomers = newCustomers.reduce((a, b) => a + b, 0) / newCustomers.length;
      
      const customerGrowthRate = this.calculateTrendSlope(customerCounts);
      const acquisitionRate = avgNewCustomers / avgCustomers;
      
      // Predict customer retention and acquisition
      const projectedCustomers = avgCustomers + (customerGrowthRate * 30);
      const churnRate = Math.max(0, 1 - (customerGrowthRate / avgCustomers)); // Simplified churn calculation
      
      let recommendation = 'Focus on customer retention strategies';
      if (acquisitionRate > 0.1) {
        recommendation = 'Strong acquisition - optimize onboarding process';
      } else if (churnRate > 0.2) {
        recommendation = 'High churn detected - implement retention campaigns';
      }

      return {
        type: 'customer_behavior',
        prediction: {
          projected_customers: Math.round(projectedCustomers),
          acquisition_rate: Math.round(acquisitionRate * 100) / 100,
          estimated_churn_rate: Math.round(churnRate * 100) / 100,
          growth_trend: customerGrowthRate > 0 ? 'growing' : 'declining'
        },
        confidence: 0.7,
        timeframe: '30 days',
        factors: ['Customer acquisition', 'Retention patterns', 'Transaction frequency'],
        recommendation
      };
    } catch (error) {
      console.error('Error predicting customer behavior:', error);
      return null;
    }
  }

  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squared indices
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  // ============================================================================
  // BUSINESS RECOMMENDATIONS
  // ============================================================================

  async generateBusinessRecommendations(userId: string, metrics: BusinessMetrics[]): Promise<BusinessRecommendation[]> {
    try {
      const recommendations: BusinessRecommendation[] = [];

      // Analyze profitability
      const profitabilityRec = this.analyzeProfitability(metrics);
      if (profitabilityRec) recommendations.push(profitabilityRec);

      // Analyze inventory management
      const inventoryRec = await this.analyzeInventoryManagement(userId);
      if (inventoryRec) recommendations.push(inventoryRec);

      // Analyze customer acquisition
      const customerRec = this.analyzeCustomerAcquisition(metrics);
      if (customerRec) recommendations.push(customerRec);

      // Analyze operational efficiency
      const operationalRec = this.analyzeOperationalEfficiency(metrics);
      if (operationalRec) recommendations.push(operationalRec);

      return recommendations.slice(0, 5); // Return top 5 recommendations
    } catch (error) {
      console.error('Error generating business recommendations:', error);
      return [];
    }
  }

  private analyzeProfitability(metrics: BusinessMetrics[]): BusinessRecommendation | null {
    if (metrics.length === 0) return null;

    const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
    const totalExpenses = metrics.reduce((sum, m) => sum + m.expenses, 0);
    const profitMargin = totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0;

    if (profitMargin < 0.1) { // Less than 10% profit margin
      return {
        id: 'profitability-improvement',
        type: 'cost_reduction',
        title: 'Improve Profit Margins',
        description: `Your current profit margin is ${(profitMargin * 100).toFixed(1)}%. Consider reviewing your pricing strategy and reducing operational costs.`,
        impact_estimate: `Potential to increase profit by 15-25%`,
        difficulty: 'medium',
        timeframe: '2-4 weeks',
        priority: 'high',
        data_sources: ['Revenue data', 'Expense analysis'],
        created_at: new Date().toISOString()
      };
    }

    return null;
  }

  private async analyzeInventoryManagement(userId: string): Promise<BusinessRecommendation | null> {
    try {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!products || products.length === 0) return null;

      const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);
      const overstockedProducts = products.filter(p => p.stock_quantity > p.low_stock_threshold * 10);

      if (lowStockProducts.length > products.length * 0.2) { // More than 20% low stock
        return {
          id: 'inventory-management',
          type: 'inventory',
          title: 'Optimize Inventory Levels',
          description: `${lowStockProducts.length} products are running low on stock. Consider implementing automated reordering.`,
          impact_estimate: 'Reduce stockouts by 60-80%',
          difficulty: 'easy',
          timeframe: '1-2 weeks',
          priority: 'medium',
          data_sources: ['Inventory levels', 'Sales velocity'],
          created_at: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error('Error analyzing inventory management:', error);
      return null;
    }
  }

  private analyzeCustomerAcquisition(metrics: BusinessMetrics[]): BusinessRecommendation | null {
    if (metrics.length < 7) return null;

    const recentNewCustomers = metrics.slice(-7).reduce((sum, m) => sum + m.new_customers_count, 0);
    const avgNewCustomersPerWeek = recentNewCustomers;

    if (avgNewCustomersPerWeek < 2) { // Less than 2 new customers per week
      return {
        id: 'customer-acquisition',
        type: 'marketing',
        title: 'Boost Customer Acquisition',
        description: 'Your customer acquisition rate is below optimal. Consider implementing referral programs or digital marketing campaigns.',
        impact_estimate: 'Increase customer acquisition by 30-50%',
        difficulty: 'medium',
        timeframe: '3-6 weeks',
        priority: 'medium',
        data_sources: ['Customer data', 'Acquisition trends'],
        created_at: new Date().toISOString()
      };
    }

    return null;
  }

  private analyzeOperationalEfficiency(metrics: BusinessMetrics[]): BusinessRecommendation | null {
    if (metrics.length === 0) return null;

    const avgTransactionsPerDay = metrics.reduce((sum, m) => sum + m.transactions_count, 0) / metrics.length;
    const avgRevenuePerTransaction = metrics.reduce((sum, m) => sum + m.revenue, 0) / 
                                   metrics.reduce((sum, m) => sum + m.transactions_count, 0);

    if (avgTransactionsPerDay > 0 && avgRevenuePerTransaction < 50) { // Low transaction value
      return {
        id: 'operational-efficiency',
        type: 'pricing',
        title: 'Increase Average Transaction Value',
        description: `Your average transaction value is RM${avgRevenuePerTransaction.toFixed(2)}. Consider upselling or bundling strategies.`,
        impact_estimate: 'Increase revenue by 20-35% without more customers',
        difficulty: 'easy',
        timeframe: '1-3 weeks',
        priority: 'high',
        data_sources: ['Transaction data', 'Product performance'],
        created_at: new Date().toISOString()
      };
    }

    return null;
  }

  // ============================================================================
  // MARKET INTELLIGENCE
  // ============================================================================

  async getMarketIntelligence(industry: string, region: string = 'Malaysia'): Promise<MarketIntelligence[]> {
    try {
      const { data, error } = await supabase
        .from('market_intelligence')
        .select('*')
        .eq('industry', industry)
        .eq('region', region)
        .order('report_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching market intelligence:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching market intelligence:', error);
      return [];
    }
  }

  async recordMarketIntelligence(intelligenceData: Omit<MarketIntelligence, 'id' | 'created_at'>): Promise<MarketIntelligence | null> {
    try {
      const { data, error } = await supabase
        .from('market_intelligence')
        .insert(intelligenceData)
        .select()
        .single();

      if (error) {
        console.error('Error recording market intelligence:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error recording market intelligence:', error);
      return null;
    }
  }

  // ============================================================================
  // PERFORMANCE BENCHMARKING
  // ============================================================================

  async getPerformanceBenchmarks(userId: string): Promise<any> {
    try {
      // Get user's business information
      const { data: user } = await supabase
        .from('users')
        .select('business_type, business_category')
        .eq('id', userId)
        .single();

      if (!user) return null;

      // Get user's recent metrics
      const userMetrics = await this.getBusinessMetrics(userId, {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last 30 days
      });

      // Get industry benchmarks (simulated - would come from aggregated data)
      const benchmarks = {
        industry_average: {
          daily_revenue: 850,
          profit_margin: 0.15,
          customer_acquisition_rate: 0.08,
          transaction_frequency: 12
        },
        top_quartile: {
          daily_revenue: 1500,
          profit_margin: 0.25,
          customer_acquisition_rate: 0.15,
          transaction_frequency: 20
        },
        user_performance: {
          daily_revenue: userMetrics.reduce((sum, m) => sum + m.revenue, 0) / userMetrics.length,
          profit_margin: this.calculateProfitMargin(userMetrics),
          customer_acquisition_rate: userMetrics.reduce((sum, m) => sum + m.new_customers_count, 0) / userMetrics.length,
          transaction_frequency: userMetrics.reduce((sum, m) => sum + m.transactions_count, 0) / userMetrics.length
        }
      };

      return benchmarks;
    } catch (error) {
      console.error('Error getting performance benchmarks:', error);
      return null;
    }
  }

  private calculateProfitMargin(metrics: BusinessMetrics[]): number {
    const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
    const totalExpenses = metrics.reduce((sum, m) => sum + m.expenses, 0);
    return totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0;
  }
}

export const analyticsIntelligenceService = new AnalyticsIntelligenceService();