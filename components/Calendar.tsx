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
  // Monday-first, as UK calendars are printed.
  const daysOfWeek = [
    { key: "mon", label: "Mo" },
    { key: "tue", label: "Tu" },
    { key: "wed", label: "We" },
    { key: "thu", label: "Th" },
    { key: "fri", label: "Fr" },
    { key: "sat", label: "Sa" },
    { key: "sun", label: "Su" },
  ];

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
  // getDay() is Sunday-first; shift so Monday is column 0.
  const startingDay = (firstDayOfMonth.getDay() + 6) % 7;

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
      <button
        key={day}
        type="button"
        onClick={() => toggleDate(day)}
        aria-pressed={isSelected}
        className={`app-calendar__day${
          isSelected
            ? " app-calendar__day--selected"
            : isToday
              ? " app-calendar__day--today"
              : ""
        }`}
      >
        <span className="sr-only">
          {date.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        <span aria-hidden="true">{day}</span>
      </button>
    );
  }

  return (
    <div className="app-calendar">
      <div className="app-calendar__header">
        <button
          type="button"
          onClick={prevMonth}
          className="app-calendar__nav"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h3 className="app-calendar__month" aria-live="polite">
          {currentDate.toLocaleString("en-GB", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          className="app-calendar__nav"
          aria-label="Next month"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="app-calendar__grid">
        {daysOfWeek.map((day) => (
          <div
            key={day.key}
            className="app-calendar__weekday"
            aria-hidden="true"
          >
            {day.label}
          </div>
        ))}
        {calendarDays}
      </div>
      {selectedDates.length > 0 && (
        <p style={{ marginBottom: 0 }}>
          <button
            type="button"
            onClick={() => onDateChange([])}
            className="app-button app-button--secondary"
            style={{ marginTop: "var(--space-2)" }}
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Clear selected days
          </button>
        </p>
      )}
    </div>
  );
};

export default Calendar;
