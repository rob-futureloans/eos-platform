import { Metric, MetricGoal } from '../lib/supabase';

export type MetricStatus = 'on-track' | 'off-track' | 'no-data';

export interface MetricWithGoal extends Metric {
  currentGoal: MetricGoal | null;
  variance: number | null;
  variancePercent: number | null;
  status: MetricStatus;
}

export function calculateVariance(actual: number | null, goal: number): number | null {
  if (actual === null) return null;
  return actual - goal;
}

export function calculateVariancePercent(actual: number | null, goal: number): number | null {
  if (actual === null || goal === 0) return null;
  return ((actual - goal) / goal) * 100;
}

export function calculateStatus(
  actual: number | null,
  goal: number,
  measurementType: 'currency' | 'count' | 'percentage'
): MetricStatus {
  if (actual === null) return 'no-data';

  const threshold = 0.9;
  const achievementRate = actual / goal;

  return achievementRate >= threshold ? 'on-track' : 'off-track';
}

export function formatMetricValue(value: number | null, type: 'currency' | 'count' | 'percentage'): string {
  if (value === null) return '--';

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'count':
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
}

export function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

export function getWeekDateRange(weekNumber: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, 0, 1);
  const daysToAdd = (weekNumber - 1) * 7;
  start.setDate(start.getDate() + daysToAdd);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return { start, end };
}

export function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}
