import React, { useState, useCallback, useEffect } from "react";
import { TravelEntry, SummaryReportData } from "./types";
import { extractTravelDataFromFile } from "./services/geminiService";
import { startExpenseTrace } from "./services/langfuseService";
import FileUpload from "./components/FileUpload";
import Calendar from "./components/Calendar";
import SummaryReport from "./components/SummaryReport";
import Loader from "./components/Loader";
import { SunIcon, MoonIcon, StartOverIcon } from "./components/Icons";

interface LoadingState {
  active: boolean;
  message: string;
  progress: number;
}

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined" && localStorage.getItem("theme")) {
      return localStorage.getItem("theme") as "light" | "dark";
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <MoonIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
      ) : (
        <SunIcon className="w-5 h-5 text-yellow-500" />
      )}
    </button>
  );
};

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
          const fileResults: TravelEntry[][] = [];
          let hasError = false;
          let errorMessage: string | null = null;

          for (let i = 0; i < fileTasks.length; i += MAX_CONCURRENT_FILES) {
            if (hasError) break; // Stop processing if error occurred

            const batch = fileTasks.slice(i, i + MAX_CONCURRENT_FILES);
            const batchPromises = batch.map(async (task) => {
              try {
                const entries = await task.task();
                const completed = fileResults.length + batch.indexOf(task) + 1;
                const progress = (completed / files.length) * 100;
                setLoadingState((prevState) => ({
                  ...prevState,
                  progress: progress,
                }));
                return { success: true, entries };
              } catch (error: unknown) {
                const err = error as Error;
                return {
                  success: false,
                  entries: [],
                  error: err.message || `Failed to process ${task.file.name}`,
                };
              }
            });

            const batchResults = await Promise.all(batchPromises);

            // Check for errors and stop on first error
            for (const result of batchResults) {
              if (!result.success) {
                hasError = true;
                errorMessage =
                  result.error || "An error occurred while processing files.";
                break;
              }
              fileResults.push(result.entries);
            }
          }

          if (hasError && errorMessage) {
            throw new Error(errorMessage);
          }

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="absolute top-0 right-0 p-4">
        <ThemeToggle />
      </div>

      <div className="max-w-4xl mx-auto">
        <header className="text-center my-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            TFL Journey{" "}
            <span className="bg-gradient-to-r from-sky-500 to-cyan-500 text-transparent bg-clip-text">
              Expense Calculator
            </span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Upload your TfL contactless & Oyster statements to automatically
            calculate your journey expenses.
          </p>
        </header>

        {canReset && !loadingState.active && (
          <div className="text-center mb-8 animate-fade-in">
            <button
              onClick={handleResetAll}
              className="inline-flex items-center text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 transition-colors"
              aria-label="Reset all fields and start over"
            >
              <StartOverIcon className="w-5 h-5 mr-2" />
              Start Over
            </button>
          </div>
        )}

        <main className="space-y-12">
          <section id="step-1" className="transition-opacity duration-500">
            <h2 className="text-2xl font-bold mb-4 text-slate-700 dark:text-slate-200 flex items-center">
              <span className="flex items-center justify-center w-8 h-8 mr-3 bg-sky-500 text-white rounded-full font-bold">
                1
              </span>
              Upload TfL Statements
            </h2>
            <FileUpload
              onFilesSelected={handleFilesSelected}
              disabled={loadingState.active}
            />
          </section>

          {hasFiles && (
            <section id="step-2" className="animate-fade-in space-y-8">
              <h2 className="text-2xl font-bold mb-4 text-slate-700 dark:text-slate-200 flex items-center">
                <span className="flex items-center justify-center w-8 h-8 mr-3 bg-sky-500 text-white rounded-full font-bold">
                  2
                </span>
                Select Workdays & Calculate
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <Calendar
                  selectedDates={selectedDates}
                  onDateChange={handleDateChange}
                  currentDate={currentCalendarDate}
                  setCurrentDate={setCurrentCalendarDate}
                />
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Once your dates are selected, press the button to generate
                    your expense report.
                  </p>
                  <button
                    onClick={processExpenses}
                    disabled={
                      loadingState.active ||
                      files.length === 0 ||
                      selectedDates.length === 0
                    }
                    className="w-full max-w-xs bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-bold py-4 px-6 rounded-lg hover:shadow-xl hover:scale-105 disabled:from-gray-400 disabled:to-gray-400 dark:disabled:from-slate-600 dark:disabled:to-slate-600 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-300 ease-in-out text-lg shadow-lg"
                  >
                    {loadingState.active ? "Analyzing..." : "Generate Report"}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section id="step-3-summary">
            <div className="relative min-h-[200px] flex items-center justify-center">
              {loadingState.active && (
                <Loader
                  message={loadingState.message}
                  progress={loadingState.progress}
                />
              )}
              {error && (
                <div className="text-center text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-4 rounded-lg animate-fade-in w-full">
                  <p className="font-semibold">An Error Occurred</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}
              {!loadingState.active && !error && summary && (
                <SummaryReport data={summary} />
              )}
              {!loadingState.active && !error && !summary && hasFiles && (
                <div className="text-center text-slate-500 dark:text-slate-400 animate-fade-in">
                  <p>Select your workdays on the calendar to proceed.</p>
                </div>
              )}
            </div>
          </section>
        </main>

        <footer className="mt-16 mb-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Built with ❤️ by Femi Akinlotan + 🤖
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
