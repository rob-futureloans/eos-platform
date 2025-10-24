import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  title?: string;
  role: 'super_user' | 'user';
  created_at: string;
};

export type Rock = {
  id: string;
  rock: string;
  owner: string;
  measurable: string;
  status: 'on-track' | 'at-risk' | 'off-track';
  progress: number;
  due_date: string;
  notes: string;
  week_number: number;
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  id: string;
  rock_id: string;
  task: string;
  due_date: string;
  complete: boolean;
};

export type ActionItem = {
  id: string;
  rock_id: string;
  task: string;
  collaborator: string;
  complete: boolean;
};

export type RockWithDetails = Rock & {
  milestones: Milestone[];
  actionItems: ActionItem[];
};

export type ScorecardMetric = {
  id: string;
  category: string;
  metric: string;
  owner: string;
  collaborator: string;
  goal: number;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  related_rock: string;
  time_period_type: 'month' | 'quarter';
  time_period_value: string;
  time_period_year: number;
  created_at: string;
  updated_at: string;
};

export type Metric = {
  id: string;
  category: string | null;
  metric_name: string;
  owner_id: string | null;
  collaborator_id: string | null;
  time_period_type: 'weekly' | 'monthly' | 'quarterly';
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  quarterly_goal: number;
  related_rock_id: string | null;
  measurement_type: 'currency' | 'count' | 'percentage';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
};

export type MetricGoal = {
  id: string;
  metric_id: string;
  period_type: 'week' | 'month' | 'quarter';
  period_number: number;
  goal_value: number;
  actual_value: number | null;
  date_start: string;
  date_end: string;
  created_at: string;
};

export type Issue = {
  id: string;
  issue: string;
  priority: 'high' | 'medium' | 'low';
  owner: string;
  status: 'open' | 'in-progress' | 'solved';
  is_rock: boolean;
  is_metric: boolean;
  related_metric_id: string | null;
  related_rock_id: string | null;
  created_at: string;
};

export type L10Note = {
  id: string;
  section: string;
  notes: string;
  meeting_date: string;
  meeting_timestamp: string;
  created_at: string;
};

export type MeetingOffTrackMetric = {
  id: string;
  meeting_date: string;
  meeting_timestamp: string;
  metric_id: string;
  metric_name: string;
  goal_value: number;
  actual_value: number;
  variance: number;
  variance_percent: number;
  period_type: 'week' | 'month' | 'quarter';
  period_number: number;
  owner_id: string;
  created_at: string;
};
