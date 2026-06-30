export interface KPIValue {
  value: number;
  target?: number;
  budget?: number;
  margin?: number;
  runwayMonths?: number;
  change: number;
  status: string;
}

export interface KPIs {
  revenue: KPIValue;
  grossProfit: KPIValue;
  operatingExpenses: KPIValue;
  netIncome: KPIValue;
  cashBalance: KPIValue;
  dso: KPIValue;
  dpo: KPIValue;
}

export interface CashForecastItem {
  period: string;
  cashIn: number;
  cashOut: number;
  netFlow: number;
  balance: number;
}

export interface SalesForecastItem {
  period: string;
  actualRevenue: number;
  forecastRevenue: number;
  actualGP: number;
  forecastGP: number;
}

export interface FinancialCategory {
  name: string;
  value: number;
  change: number;
}

export interface FinancialSection {
  total: number;
  change: number;
  categories: FinancialCategory[];
}

export interface IncomeStatement {
  revenue: FinancialSection;
  cogs: FinancialSection;
  opex: FinancialSection;
  otherExpenses: FinancialSection;
}

export interface BalanceItem {
  name: string;
  value: number;
}

export interface BalanceSection {
  current: BalanceItem[];
  nonCurrent: BalanceItem[];
}

export interface BalanceSheet {
  assets: BalanceSection;
  liabilities: BalanceSection;
  equity: BalanceItem[];
}

export interface ARBucket {
  label: string;
  value: number;
  percent: number;
}

export interface DebtorItem {
  company: string;
  amount: number;
  days: number;
  risk: "Low" | "Medium" | "High";
}

export interface ARAging {
  totalOutstanding: number;
  buckets: ARBucket[];
  debtors: DebtorItem[];
}

export interface DashboardData {
  companyName: string;
  reportingPeriod: string;
  isLiveNetSuite: boolean;
  errorNotice?: string;
  kpis: KPIs;
  cashForecast: CashForecastItem[];
  salesForecast: SalesForecastItem[];
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  arAging: ARAging;
}

export interface NetSuiteStatus {
  configured: boolean;
  connected: boolean;
  message: string;
  missingKeys: string[];
  netsuiteDomain: string | null;
  accountInfo: {
    companyName: string;
    accountId: string;
  } | null;
}
