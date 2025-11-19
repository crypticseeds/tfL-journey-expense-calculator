export interface TravelEntry {
  date: string; // YYYY-MM-DD format
  amount: number;
}

export interface MonthlySummary {
  month: string; // YYYY-MM format
  total: number;
}

export interface SummaryReportData {
  monthlySummaries: MonthlySummary[];
  total: number;
  dailyTotals: { date: string; total: number }[];
}
