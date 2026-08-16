import React from "react";
import { SummaryReportData } from "../types";

interface SummaryReportProps {
  data: SummaryReportData;
}

const SummaryReport: React.FC<SummaryReportProps> = ({ data }) => {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
  };

  const formatMonthShort = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString("en-GB", { month: "short" });
  };

  // "YYYY-MM-DD" through the Date string parser is treated as UTC midnight and
  // then rendered in local time, which shifts the day for anyone west of UTC.
  // Build the date from its parts instead, as formatMonth does.
  const parseDate = (dateStr: string) => {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!parts) return null;
    return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  };

  // Dates arrive as strings from the parser; only reformat the ones we can
  // read, rather than risk showing "Invalid Date".
  const formatDate = (dateStr: string) => {
    const date = parseDate(dateStr);
    if (!date) return dateStr;
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const maxMonthlyTotal = Math.max(
    ...data.monthlySummaries.map((s) => s.total),
    0
  );

  // ISO dates sort correctly as plain strings, with no timezone in play.
  const dailyTotals = [...data.dailyTotals].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return (
    <div>
      <h2 className="app-heading-m">Your expense report</h2>

      <div className="app-total">
        <span className="app-total__label">Expense total</span>
        <span className="app-total__amount">{formatCurrency(data.total)}</span>
        <p className="app-total__meta">
          {dailyTotals.length}{" "}
          {dailyTotals.length === 1 ? "workday" : "workdays"} across{" "}
          {data.monthlySummaries.length}{" "}
          {data.monthlySummaries.length === 1 ? "month" : "months"}
        </p>
      </div>

      <h3 className="app-subheading">Spend by month</h3>

      {data.monthlySummaries.length > 0 && (
        <>
          <div className="app-chart" aria-hidden="true">
            {data.monthlySummaries.map((summary) => (
              <div key={summary.month} className="app-chart__column">
                <div
                  className="app-chart__bar"
                  style={{
                    height:
                      maxMonthlyTotal > 0
                        ? `${(summary.total / maxMonthlyTotal) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="app-chart__labels">
            {data.monthlySummaries.map((summary) => (
              <div key={summary.month} className="app-chart__label">
                {formatMonthShort(summary.month)}
              </div>
            ))}
          </div>
        </>
      )}

      <table className="app-table">
        <caption className="sr-only">Total spend for each month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col" className="app-table__numeric">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.monthlySummaries.map((summary) => (
            <tr key={summary.month}>
              <td>{formatMonth(summary.month)}</td>
              <td className="app-table__numeric">
                {formatCurrency(summary.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {dailyTotals.length > 0 && (
        <>
          <h3 className="app-subheading">Day by day</h3>
          <table className="app-table">
            <caption className="sr-only">Total spend for each workday</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col" className="app-table__numeric">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {dailyTotals.map((day) => (
                <tr key={day.date}>
                  <td>{formatDate(day.date)}</td>
                  <td className="app-table__numeric">
                    {formatCurrency(day.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default SummaryReport;
