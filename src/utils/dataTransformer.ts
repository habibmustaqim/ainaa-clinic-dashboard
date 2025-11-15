import { Customer, Transaction } from '../types';

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface CustomerSpendingAnalysis {
  customerId: string;
  customerName: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  firstVisit: string;
  lastVisit: string;
  daysSinceLastVisit: number;
  loyaltyScore: number;
}

export interface TransactionAggregation {
  totalRevenue: number;
  totalTransactions: number;
  averageTransaction: number;
  uniqueCustomers: number;
  returningCustomers: number;
  newCustomers: number;
}

export interface DateRangeData<T> {
  data: T[];
  startDate: string;
  endDate: string;
  totalDays: number;
}

/**
 * Transform transaction data for time-series charts
 */
export function transformTransactionsForChart(
  transactions: Transaction[],
  groupBy: 'day' | 'week' | 'month' | 'year' = 'day'
): ChartData {
  const grouped = groupTransactionsByDate(transactions, groupBy);

  const labels = Object.keys(grouped).sort();
  const data = labels.map(label => grouped[label].totalAmount);
  const counts = labels.map(label => grouped[label].count);

  return {
    labels,
    datasets: [
      {
        label: 'Revenue (RM)',
        data,
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 2,
      },
      {
        label: 'Transaction Count',
        data: counts,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
    ],
  };
}

/**
 * Transform customer spending data for top customers chart
 */
export function transformCustomerSpendingForChart(
  analyses: CustomerSpendingAnalysis[],
  limit: number = 10
): ChartData {
  const topCustomers = analyses
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);

  return {
    labels: topCustomers.map(c => c.customerName),
    datasets: [
      {
        label: 'Total Spent (RM)',
        data: topCustomers.map(c => c.totalSpent),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };
}

/**
 * Analyze customer spending patterns
 */
export function analyzeCustomerSpending(
  customers: Customer[],
  transactions: Transaction[]
): CustomerSpendingAnalysis[] {
  const customerMap = new Map(customers.map(c => [c.id, c]));
  const today = new Date();

  // Group transactions by customer
  const customerTransactions = new Map<string, Transaction[]>();
  transactions.forEach(transaction => {
    const existing = customerTransactions.get(transaction.customer_id) || [];
    customerTransactions.set(transaction.customer_id, [...existing, transaction]);
  });

  const analyses: CustomerSpendingAnalysis[] = [];

  customerTransactions.forEach((txns, customerId) => {
    const customer = customerMap.get(customerId);
    if (!customer) return;

    const totalSpent = txns.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = txns.length;
    const averageTransaction = totalSpent / transactionCount;

    const dates = txns
      .map(t => new Date(t.transaction_date))
      .sort((a, b) => a.getTime() - b.getTime());

    const firstVisit = dates[0].toISOString().split('T')[0];
    const lastVisit = dates[dates.length - 1].toISOString().split('T')[0];

    const daysSinceLastVisit = Math.floor(
      (today.getTime() - dates[dates.length - 1].getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate loyalty score (0-100)
    // Based on: recency, frequency, and monetary value
    const recencyScore = Math.max(0, 100 - daysSinceLastVisit);
    const frequencyScore = Math.min(100, transactionCount * 10);
    const monetaryScore = Math.min(100, (totalSpent / 100) * 10);
    const loyaltyScore = Math.round((recencyScore + frequencyScore + monetaryScore) / 3);

    analyses.push({
      customerId,
      customerName: customer.name,
      totalSpent,
      transactionCount,
      averageTransaction,
      firstVisit,
      lastVisit,
      daysSinceLastVisit,
      loyaltyScore,
    });
  });

  return analyses;
}

/**
 * Aggregate transaction data
 */
export function aggregateTransactions(
  transactions: Transaction[],
  customers: Customer[]
): TransactionAggregation {
  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = transactions.length;
  const averageTransaction = totalRevenue / totalTransactions || 0;

  const uniqueCustomerIds = new Set(transactions.map(t => t.customer_id));
  const uniqueCustomers = uniqueCustomerIds.size;

  // Count customers with more than one transaction
  const transactionCounts = new Map<string, number>();
  transactions.forEach(t => {
    transactionCounts.set(t.customer_id, (transactionCounts.get(t.customer_id) || 0) + 1);
  });

  const returningCustomers = Array.from(transactionCounts.values()).filter(count => count > 1).length;
  const newCustomers = uniqueCustomers - returningCustomers;

  return {
    totalRevenue,
    totalTransactions,
    averageTransaction,
    uniqueCustomers,
    returningCustomers,
    newCustomers,
  };
}

/**
 * Filter data by date range
 */
export function filterByDateRange<T extends { transaction_date?: string; created_at?: string }>(
  data: T[],
  startDate: string,
  endDate: string
): DateRangeData<T> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include the entire end date

  const filtered = data.filter(item => {
    const dateStr = item.transaction_date || item.created_at;
    if (!dateStr) return false;

    const itemDate = new Date(dateStr);
    return itemDate >= start && itemDate <= end;
  });

  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return {
    data: filtered,
    startDate,
    endDate,
    totalDays,
  };
}

/**
 * Group transactions by date period
 */
export function groupTransactionsByDate(
  transactions: Transaction[],
  groupBy: 'day' | 'week' | 'month' | 'year' = 'day'
): Record<string, { totalAmount: number; count: number; transactions: Transaction[] }> {
  const grouped: Record<string, { totalAmount: number; count: number; transactions: Transaction[] }> = {};

  transactions.forEach(transaction => {
    const date = new Date(transaction.transaction_date);
    let key: string;

    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = getWeekStart(date);
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
    }

    if (!grouped[key]) {
      grouped[key] = { totalAmount: 0, count: 0, transactions: [] };
    }

    grouped[key].totalAmount += transaction.amount;
    grouped[key].count += 1;
    grouped[key].transactions.push(transaction);
  });

  return grouped;
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Calculate growth rate between two periods
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get top customers by spending
 */
export function getTopCustomers(
  analyses: CustomerSpendingAnalysis[],
  limit: number = 10
): CustomerSpendingAnalysis[] {
  return analyses.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit);
}

/**
 * Get customers at risk (haven't visited recently)
 */
export function getAtRiskCustomers(
  analyses: CustomerSpendingAnalysis[],
  daysSinceLastVisit: number = 90
): CustomerSpendingAnalysis[] {
  return analyses
    .filter(a => a.daysSinceLastVisit >= daysSinceLastVisit)
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

/**
 * Calculate customer lifetime value (CLV)
 */
export function calculateCustomerLifetimeValue(
  analysis: CustomerSpendingAnalysis,
  projectionMonths: number = 12
): number {
  const firstVisitDate = new Date(analysis.firstVisit);
  const lastVisitDate = new Date(analysis.lastVisit);
  const monthsActive = Math.max(
    1,
    (lastVisitDate.getTime() - firstVisitDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const monthlyValue = analysis.totalSpent / monthsActive;
  return monthlyValue * projectionMonths;
}

/**
 * Transform data for service popularity chart
 */
export function transformServicePopularity(
  transactions: Transaction[]
): ChartData {
  const serviceCounts = new Map<string, number>();
  const serviceRevenue = new Map<string, number>();

  transactions.forEach(transaction => {
    const service = transaction.service_type || 'Unknown';
    serviceCounts.set(service, (serviceCounts.get(service) || 0) + 1);
    serviceRevenue.set(service, (serviceRevenue.get(service) || 0) + transaction.amount);
  });

  const services = Array.from(serviceCounts.keys()).sort(
    (a, b) => (serviceCounts.get(b) || 0) - (serviceCounts.get(a) || 0)
  );

  return {
    labels: services,
    datasets: [
      {
        label: 'Number of Transactions',
        data: services.map(s => serviceCounts.get(s) || 0),
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
      },
      {
        label: 'Revenue (RM)',
        data: services.map(s => serviceRevenue.get(s) || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
    ],
  };
}

/**
 * Calculate average transaction value by month
 */
export function calculateMonthlyAverages(
  transactions: Transaction[]
): { month: string; average: number; count: number }[] {
  const grouped = groupTransactionsByDate(transactions, 'month');

  return Object.entries(grouped)
    .map(([month, data]) => ({
      month,
      average: data.totalAmount / data.count,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Get customer retention rate
 */
export function calculateRetentionRate(
  transactions: Transaction[],
  periodMonths: number = 1
): number {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - periodMonths, 1);
  const previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - periodMonths * 2, 1);

  const currentPeriodCustomers = new Set(
    transactions
      .filter(t => new Date(t.transaction_date) >= periodStart)
      .map(t => t.customer_id)
  );

  const previousPeriodCustomers = new Set(
    transactions
      .filter(t => {
        const date = new Date(t.transaction_date);
        return date >= previousPeriodStart && date < periodStart;
      })
      .map(t => t.customer_id)
  );

  const retained = Array.from(previousPeriodCustomers).filter(id =>
    currentPeriodCustomers.has(id)
  ).length;

  return previousPeriodCustomers.size > 0
    ? (retained / previousPeriodCustomers.size) * 100
    : 0;
}
