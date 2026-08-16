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

  // Dates arrive as strings from the parser; only reformat the ones we can
  // read, rather than risk showing "Invalid Date".
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
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

  const dailyTotals = [...data.dailyTotals].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div>
      <h2 style={{ fontSize: "var(--font-size-heading-m)" }}>
        Your expense report
      </h2>

      <div className="app-total" style={{ marginTop: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--font-size-lead)" }}>Expense total</span>
        <span className="app-total__amount">{formatCurrency(data.total)}</span>
        <p className="app-total__meta">
          {dailyTotals.length}{" "}
          {dailyTotals.length === 1 ? "workday" : "workdays"} across{" "}
          {data.monthlySummaries.length}{" "}
          {data.monthlySummaries.length === 1 ? "month" : "months"}
        </p>
      </div>

      <h3
        style={{
          fontSize: "var(--font-size-heading-s)",
          marginTop: "var(--space-5)",
        }}
      >
        Spend by month
      </h3>

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
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              gap: "var(--space-1)",
              paddingTop: "var(--space-1)",
            }}
          >
            {data.monthlySummaries.map((summary) => (
              <div
                key={summary.month}
                style={{
                  flex: "1 1 0",
                  textAlign: "center",
                  fontSize: "var(--font-size-caption)",
                  color: "var(--colour-ink-secondary)",
                }}
              >
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
          <h3
            style={{
              fontSize: "var(--font-size-heading-s)",
              marginTop: "var(--space-5)",
            }}
          >
            Day by day
          </h3>
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
