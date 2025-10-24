export type MetricPeriodType = 'weekly' | 'monthly' | 'quarterly';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export const QUARTER_MONTHS: Record<Quarter, string[]> = {
  'Q1': ['January', 'February', 'March'],
  'Q2': ['April', 'May', 'June'],
  'Q3': ['July', 'August', 'September'],
  'Q4': ['October', 'November', 'December']
};

export type PeriodRange = {
  periodNumber: number;
  startDate: string;
  endDate: string;
  label: string;
};

export function getCurrentQuarter(): Quarter {
  const month = new Date().getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getYearOptions(): number[] {
  const currentYear = getCurrentYear();
  const years = [2025];

  for (let year = 2026; year <= currentYear + 1; year++) {
    if (!years.includes(year)) {
      years.push(year);
    }
  }

  return years.sort();
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStartDate(year: number, quarter: Quarter, weekNumber: number): Date {
  const quarterMonthIndex = QUARTERS.indexOf(quarter) * 3;
  const quarterStart = new Date(year, quarterMonthIndex, 1);

  const dayOfWeek = quarterStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;

  const firstMonday = new Date(quarterStart);
  firstMonday.setDate(quarterStart.getDate() + daysToMonday);

  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  return weekStart;
}

function getMonthRange(year: number, quarter: Quarter, monthIndex: number): PeriodRange {
  const quarterMonthIndex = QUARTERS.indexOf(quarter) * 3 + monthIndex;
  const monthNames = QUARTER_MONTHS[quarter];

  const startDate = new Date(year, quarterMonthIndex, 1);
  const endDate = new Date(year, quarterMonthIndex + 1, 0);

  return {
    periodNumber: monthIndex + 1,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    label: monthNames[monthIndex]
  };
}

function getWeekRange(year: number, quarter: Quarter, weekNumber: number): PeriodRange {
  const weekStart = getWeekStartDate(year, quarter, weekNumber);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    periodNumber: weekNumber,
    startDate: formatDate(weekStart),
    endDate: formatDate(weekEnd),
    label: `Week ${weekNumber}`
  };
}

export function calculatePeriods(
  type: MetricPeriodType,
  quarter: Quarter,
  year: number
): PeriodRange[] {
  if (type === 'weekly') {
    return Array.from({ length: 5 }, (_, i) => getWeekRange(year, quarter, i + 1));
  }

  if (type === 'monthly') {
    return Array.from({ length: 3 }, (_, i) => getMonthRange(year, quarter, i));
  }

  return [];
}
