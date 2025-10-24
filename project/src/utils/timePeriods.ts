export type TimePeriodType = 'month' | 'quarter';

export interface WeekRange {
  startDate: string;
  endDate: string;
}

export interface TimePeriod {
  type: TimePeriodType;
  value: string;
  year: number;
  weeks: [WeekRange, WeekRange, WeekRange, WeekRange];
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getMonthStartDate(month: string, year: number): Date {
  const monthIndex = MONTHS.indexOf(month);
  return new Date(year, monthIndex, 1);
}

function getQuarterStartDate(quarter: string, year: number): Date {
  const quarterIndex = QUARTERS.indexOf(quarter);
  return new Date(year, quarterIndex * 3, 1);
}

function getWeeksInPeriod(startDate: Date, numWeeks: number): [WeekRange, WeekRange, WeekRange, WeekRange] {
  const weeks: WeekRange[] = [];

  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (i * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    weeks.push({
      startDate: formatDate(weekStart),
      endDate: formatDate(weekEnd)
    });
  }

  return weeks as [WeekRange, WeekRange, WeekRange, WeekRange];
}

export function calculateTimePeriod(
  type: TimePeriodType,
  value: string,
  year: number
): TimePeriod {
  let startDate: Date;

  if (type === 'month') {
    startDate = getMonthStartDate(value, year);
  } else {
    startDate = getQuarterStartDate(value, year);
  }

  const weeks = getWeeksInPeriod(startDate, 4);

  return {
    type,
    value,
    year,
    weeks
  };
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getYearOptions(): number[] {
  const currentYear = getCurrentYear();
  return [currentYear - 1, currentYear, currentYear + 1];
}
