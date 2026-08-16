import React, { useState, useCallback, useRef, useEffect } from "react";
import { TravelEntry, SummaryReportData } from "./types";
import { extractTravelDataFromFile } from "./services/geminiService";
import { startExpenseTrace } from "./services/langfuseService";
import FileUpload from "./components/FileUpload";
import Calendar from "./components/Calendar";
import SummaryReport from "./components/SummaryReport";
import Loader from "./components/Loader";
import { JourneyMarker, StartOverIcon } from "./components/Icons";
import { runWithConcurrency } from "./services/concurrency";

interface LoadingState {
  active: boolean;
  message: string;
  progress: number;
}

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [summary, setSummary] = useState<SummaryReportData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    active: false,
    message: "",
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // GOV.UK error summary pattern: when a problem appears, move focus to it so
  // screen reader and keyboard users are told what went wrong.
  useEffect(() => {
    if (error) {
      errorSummaryRef.current?.focus();
    }
  }, [error]);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setSummary(null);
    setError(null);
  }, []);

  const handleDateChange = useCallback((dates: Date[]) => {
    setSelectedDates(dates);
    setSummary(null);
    setError(null);
  }, []);

  const processExpenses = async () => {
    if (files.length === 0 || selectedDates.length === 0) {
      setError(
        "Please upload at least one TfL statement and select your workdays."
      );
      return;
    }

    setLoadingState({
      active: true,
      message: "Preparing to analyze files...",
      progress: 0,
    });
    setError(null);
    setSummary(null);

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const traceWrapper = startExpenseTrace(sessionId, undefined, {
      fileCount: String(files.length),
      selectedDates: String(selectedDates.length),
    });

    try {
      await traceWrapper(
        async (rootSpan: {
          startObservation: (
            name: string,
            opts: unknown
          ) => { update: (data: unknown) => void; end: () => void };
          update: (data: unknown) => void;
        }) => {
          const allTravelEntries: TravelEntry[] = [];
          const MAX_CONCURRENT_FILES = 3;

          // Create file processing tasks
          const fileTasks = files.map((file, index) => ({
            file,
            index,
            task: async () => {
              const handleProgress = (message: string) => {
                setLoadingState((prevState) => ({
                  ...prevState,
                  message: `File ${index + 1}/${files.length}: ${message}`,
                }));
              };

              setLoadingState((prevState) => ({
                ...prevState,
                message: `Analyzing file ${index + 1} of ${files.length}: ${file.name}`,
              }));

              return await extractTravelDataFromFile(
                file,
                handleProgress,
                rootSpan
              );
            },
          }));

          // Process files with concurrency limit
          const fileResults = await runWithConcurrency<TravelEntry[]>(
            fileTasks.map(({ task }) => task),
            MAX_CONCURRENT_FILES,
            (completed, total) => {
              setLoadingState((prevState) => ({
                ...prevState,
                progress: (completed / total) * 100,
              }));
            }
          );

          // Flatten all results
          for (const entries of fileResults) {
            allTravelEntries.push(...entries);
          }

          setLoadingState({
            active: true,
            message: "Finalizing summary...",
            progress: 100,
          });

          const selectedWorkdayDates = new Set(
            selectedDates.map((d) => {
              const year = d.getFullYear();
              const month = (d.getMonth() + 1).toString().padStart(2, "0");
              const day = d.getDate().toString().padStart(2, "0");
              return `${year}-${month}-${day}`;
            })
          );

          const filteredEntries = allTravelEntries.filter(
            (entry) => entry.date && selectedWorkdayDates.has(entry.date)
          );

          const dailyTotalsMap = new Map<string, number>();
          filteredEntries.forEach((entry) => {
            dailyTotalsMap.set(
              entry.date,
              (dailyTotalsMap.get(entry.date) || 0) + entry.amount
            );
          });
          const dailyTotals = Array.from(dailyTotalsMap.entries()).map(
            ([date, total]) => ({ date, total })
          );

          const monthlySummariesMap = new Map<string, number>();
          filteredEntries.forEach((entry) => {
            const month = entry.date.substring(0, 7); // YYYY-MM
            monthlySummariesMap.set(
              month,
              (monthlySummariesMap.get(month) || 0) + entry.amount
            );
          });

          const monthlySummaries = Array.from(monthlySummariesMap.entries())
            .map(([month, total]) => ({ month, total }))
            .sort((a, b) => a.month.localeCompare(b.month));

          const total = filteredEntries.reduce(
            (acc, entry) => acc + entry.amount,
            0
          );

          setSummary({ monthlySummaries, total, dailyTotals });
        }
      );
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "An unknown error occurred.");
    } finally {
      setLoadingState({ active: false, message: "", progress: 0 });
    }
  };

  const handleResetAll = () => {
    setFiles([]);
    setSelectedDates([]);
    setCurrentCalendarDate(new Date());
    setSummary(null);
    setError(null);
    setLoadingState({ active: false, message: "", progress: 0 });
  };

  const hasFiles = files.length > 0;
  const canReset =
    files.length > 0 || selectedDates.length > 0 || summary || error;

  return (
    <>
      <header className="app-masthead">
        <div className="app-masthead__inner">
          <JourneyMarker className="w-8 h-8 shrink-0" />
          <span className="app-masthead__title">Journey expenses</span>
        </div>
      </header>
      <div className="app-service-strip">
        <div className="app-service-strip__inner">
          Work out what your TfL contactless and Oyster travel cost on the days
          you commuted.
        </div>
      </div>

      <main className="app-container app-main">
        <h1 className="app-heading-l">TfL journey expense calculator</h1>
        <p className="app-lead">
          Upload your contactless and Oyster statements, tell us which days you
          travelled for work, and get a dated breakdown you can put on an
          expense claim.
        </p>

        {error && (
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            role="alert"
            aria-labelledby="error-summary-title"
            className="app-error-summary"
          >
            <h2 id="error-summary-title" className="app-error-summary__title">
              There is a problem
            </h2>
            <p className="app-flush">{error}</p>
          </div>
        )}

        <section id="step-1" className="app-stage">
          <h2 className="app-stage__heading">
            <span className="app-stage__number">1</span>
            Upload your statements
          </h2>
          <FileUpload
            onFilesSelected={handleFilesSelected}
            disabled={loadingState.active}
          />
        </section>

        {hasFiles && (
          <section id="step-2" className="app-stage">
            <h2 className="app-stage__heading">
              <span className="app-stage__number">2</span>
              Select the days you travelled for work
            </h2>
            <div className="app-split">
              <Calendar
                selectedDates={selectedDates}
                onDateChange={handleDateChange}
                currentDate={currentCalendarDate}
                setCurrentDate={setCurrentCalendarDate}
              />
              <div className="app-split__panel">
                <p className="app-hint">
                  {selectedDates.length === 0
                    ? "No days selected yet."
                    : `${selectedDates.length} ${
                        selectedDates.length === 1 ? "day" : "days"
                      } selected.`}
                </p>
                <button
                  type="button"
                  className="app-button"
                  onClick={processExpenses}
                  disabled={
                    loadingState.active ||
                    files.length === 0 ||
                    selectedDates.length === 0
                  }
                >
                  {loadingState.active ? "Calculating" : "Calculate expenses"}
                </button>
                {canReset && !loadingState.active && (
                  <p className="app-reset-row">
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="app-button app-button--secondary"
                    >
                      <StartOverIcon className="w-4 h-4 mr-2" />
                      Start again
                    </button>
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <section id="step-3-summary" className="app-stage">
          {/* Always mounted, so the first progress message is announced: a
              live region that appears at the same time as its content is
              often missed by screen readers. */}
          <div role="status" aria-live="polite" className="sr-only">
            {loadingState.message}
          </div>
          {loadingState.active && (
            <Loader
              message={loadingState.message}
              progress={loadingState.progress}
            />
          )}
          {!loadingState.active && summary && <SummaryReport data={summary} />}
          {!loadingState.active && !summary && hasFiles && (
            <p className="app-hint">
              Your expense report will appear here once you have selected your
              workdays and calculated.
            </p>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <p>
            This is not a Transport for London service. It is not affiliated
            with, endorsed by, or connected to Transport for London. Oyster and
            TfL are trademarks of Transport for London.
          </p>
          <p className="app-flush">Built by Femi Akinlotan.</p>
        </div>
      </footer>
    </>
  );
};

export default App;
