import React from "react";
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon } from "./Icons";

interface CalendarProps {
  selectedDates: Date[];
  onDateChange: (dates: Date[]) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  selectedDates,
  onDateChange,
  currentDate,
  setCurrentDate,
}) => {
  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDay = firstDayOfMonth.getDay();

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const toggleDate = (day: number) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    const dateIndex = selectedDates.findIndex((d) => isSameDay(d, date));

    if (dateIndex > -1) {
      onDateChange(selectedDates.filter((_, i) => i !== dateIndex));
    } else {
      onDateChange([...selectedDates, date]);
    }
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const calendarDays = [];
  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(<div key={`empty-${i}`}></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    const isSelected = selectedDates.some((d) => isSameDay(d, date));
    const isToday = isSameDay(new Date(), date);

    calendarDays.push(
      <div key={day} className="flex items-center justify-center">
        <button
          onClick={() => toggleDate(day)}
          className={`w-9 h-9 flex items-center justify-center text-sm rounded-full transition-all duration-200
            ${
              isSelected
                ? "bg-sky-600 text-white font-semibold shadow-md hover:bg-sky-700"
                : isToday
                  ? "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-200 font-semibold"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
        >
          {day}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4 bg-white/50 dark:bg-slate-800/40 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 backdrop-blur-lg">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">{calendarDays}</div>
      {selectedDates.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onDateChange([])}
            className="flex items-center text-sm font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 transition-colors"
            aria-label="Clear selected dates"
          >
            <TrashIcon className="w-4 h-4 mr-1.5" />
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default Calendar;
