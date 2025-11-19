import React, { useEffect, useState } from 'react';
import { SummaryReportData } from '../types';

interface SummaryReportProps {
  data: SummaryReportData;
}

const CHART_COLORS = ['#0ea5e9', '#ec4899', '#10b981', '#f97316', '#8b5cf6', '#3b82f6'];

const SummaryReport: React.FC<SummaryReportProps> = ({ data }) => {
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setChartReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };
  
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  
  const formatMonthShort = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'short' });
  };

  const getNiceMaxValue = (value: number) => {
    if (value <= 0) return 50;
    const powerOf10 = Math.pow(10, Math.floor(Math.log10(value)));
    const msd = Math.ceil(value / powerOf10);
    if (msd > 5) return 10 * powerOf10;
    if (msd > 2) return 5 * powerOf10;
    return 2 * powerOf10;
  };

  const maxMonthlyTotal = Math.max(...data.monthlySummaries.map(s => s.total), 0);
  const yAxisMax = getNiceMaxValue(maxMonthlyTotal);
  const yAxisLabels = [yAxisMax, yAxisMax * 0.75, yAxisMax * 0.5, yAxisMax * 0.25, 0];

  return (
    <div className="w-full p-6 sm:p-8 bg-white/60 dark:bg-slate-800/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        Expense Summary
      </h2>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">Monthly Totals</h3>
          
          {data.monthlySummaries.length > 0 ? (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <div className="flex gap-4">
                    <div className="flex flex-col justify-between h-48 text-right text-xs text-slate-500 dark:text-slate-400 shrink-0 w-16 pr-2 border-r border-slate-200 dark:border-slate-700">
                        {yAxisLabels.map((label, index) => (
                            <span key={index} className={index !== yAxisLabels.length - 1 ? '-mb-2' : ''}>
                                {formatCurrency(label).replace(/\.00$/, '')}
                            </span>
                        ))}
                    </div>

                    <div className="relative flex-grow h-48">
                        <div className="absolute inset-0 flex flex-col justify-between">
                            {yAxisLabels.map((_, index) => (
                                <div key={index} className="w-full border-t border-slate-200/80 dark:border-slate-700/80"></div>
                            ))}
                        </div>
                        
                        <div className="absolute inset-0 flex justify-around items-end gap-4 px-2">
                            {data.monthlySummaries.map((summary, index) => {
                                const barHeight = yAxisMax > 0 ? (summary.total / yAxisMax) * 100 : 0;
                                return (
                                    <div key={summary.month} className="h-full w-full flex flex-col items-center justify-end group relative">
                                        <div className="absolute -top-7 hidden group-hover:block bg-slate-800 text-white text-xs font-bold py-1 px-2 rounded-md shadow-lg transition-opacity duration-200 whitespace-nowrap z-10">
                                            {formatCurrency(summary.total)}
                                        </div>
                                        <div
                                            className="w-full rounded-t-md transition-all duration-500 ease-out"
                                            style={{ 
                                                height: chartReady ? `${Math.min(barHeight, 100)}%` : '0%',
                                                backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                                            }}
                                        ></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex mt-2">
                    <div className="shrink-0 w-16 pr-2 border-r border-transparent"></div>
                    <div className="flex-grow flex justify-around gap-4 px-2">
                        {data.monthlySummaries.map(summary => (
                            <div key={summary.month} className="w-full text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {formatMonthShort(summary.month)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">No monthly data to display.</div>
          )}

          <div className="space-y-2">
            {data.monthlySummaries.map((summary, index) => (
              <div key={summary.month} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: CHART_COLORS[index % CHART_COLORS.length]}}></div>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{formatMonth(summary.month)}</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(summary.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {data.dailyTotals.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3">Daily Breakdown</h3>
            <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                {data.dailyTotals.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(day => (
                  <div key={day.date} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{day.date}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatCurrency(day.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t-2 border-dashed border-slate-300 dark:border-slate-600">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-lg shadow-lg">
                <span className="text-xl font-bold">Grand Total</span>
                <span className="text-xl font-bold">{formatCurrency(data.total)}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryReport;