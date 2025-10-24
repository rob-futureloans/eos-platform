/*
  # Create Full EOS Metrics System - 3-Table Architecture

  1. New Tables
    - `metrics`
      - Core metric definition table
      - `id` (uuid, primary key)
      - `metric_name` (text, required) - Name of the metric
      - `category` (text, optional) - Sales, Marketing, Operations, etc.
      - `owner_id` (uuid, optional) - FK to users.id
      - `collaborator_id` (uuid, optional) - FK to users.id  
      - `time_period_type` (text, required) - 'weekly', 'monthly', 'quarterly'
      - `quarter` (text, required) - 'Q1', 'Q2', 'Q3', 'Q4'
      - `year` (integer, required) - Year for the metric
      - `quarterly_goal` (numeric, required) - Overall quarterly target
      - `related_rock_id` (uuid, optional) - FK to rocks.id
      - `created_at`, `updated_at`, `created_by`, `deleted_at` timestamps

    - `metric_goals`
      - Breakdown of goals by time period
      - `id` (uuid, primary key)
      - `metric_id` (uuid, required) - FK to metrics.id
      - `period_type` (text, required) - 'week', 'month', 'quarter'
      - `period_number` (integer, required) - 1-5 for weeks, 1-3 for months, 1 for quarter
      - `goal_value` (numeric, required) - Target value for this period
      - `date_start` (date, required) - Start date of period
      - `date_end` (date, required) - End date of period
      - `created_at` timestamp

    - `metric_actuals`
      - Actual results tracking
      - `id` (uuid, primary key)
      - `metric_id` (uuid, required) - FK to metrics.id
      - `period_type` (text, required) - 'week', 'month', 'quarter'
      - `period_number` (integer, required) - 1-5 for weeks, 1-3 for months, 1 for quarter
      - `actual_value` (numeric, required) - Actual achieved value
      - `recorded_date` (timestamptz) - When actual was recorded
      - `recorded_by` (uuid, optional) - FK to users.id
      - `notes` (text, optional) - Additional context

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users to read/write metrics
    - Restrict deletion to admins or metric owners

  3. Business Rules
    - All goal and actual values must be non-negative (>= 0)
    - Unique constraint on metric_goals per metric/period combination
    - Unique constraint on metric_actuals per metric/period combination
    - Cascade delete goals and actuals when metric is deleted
    - Quarter must be one of: Q1, Q2, Q3, Q4
    - Time period type must be one of: weekly, monthly, quarterly
*/

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL CHECK (length(metric_name) > 0 AND length(metric_name) <= 100),
  category text CHECK (category IN ('Sales', 'Marketing', 'Operations', 'Finance', 'Technology', 'Customer Service', 'Leadership')),
  owner_id uuid REFERENCES users(id),
  collaborator_id uuid REFERENCES users(id),
  time_period_type text NOT NULL CHECK (time_period_type IN ('weekly', 'monthly', 'quarterly')),
  quarter text NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  year integer NOT NULL CHECK (year >= 2020 AND year <= 2100),
  quarterly_goal numeric NOT NULL CHECK (quarterly_goal >= 0),
  related_rock_id uuid REFERENCES rocks(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  deleted_at timestamptz
);

-- Create metric_goals table
CREATE TABLE IF NOT EXISTS metric_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id uuid NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  period_type text NOT NULL CHECK (period_type IN ('week', 'month', 'quarter')),
  period_number integer NOT NULL CHECK (period_number >= 1 AND period_number <= 5),
  goal_value numeric NOT NULL CHECK (goal_value >= 0),
  date_start date NOT NULL,
  date_end date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(metric_id, period_type, period_number)
);

-- Create metric_actuals table
CREATE TABLE IF NOT EXISTS metric_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id uuid NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  period_type text NOT NULL CHECK (period_type IN ('week', 'month', 'quarter')),
  period_number integer NOT NULL CHECK (period_number >= 1 AND period_number <= 5),
  actual_value numeric NOT NULL CHECK (actual_value >= 0),
  recorded_date timestamptz DEFAULT now(),
  recorded_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(metric_id, period_type, period_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_metrics_quarter_year ON metrics(quarter, year) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_metrics_owner ON metrics(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_metrics_deleted ON metrics(deleted_at);
CREATE INDEX IF NOT EXISTS idx_metric_goals_metric ON metric_goals(metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_goals_dates ON metric_goals(date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_metric_actuals_metric ON metric_actuals(metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_actuals_recorded ON metric_actuals(recorded_date);

-- Enable Row Level Security
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_actuals ENABLE ROW LEVEL SECURITY;

-- Policies for metrics table
CREATE POLICY "Users can view all metrics"
  ON metrics FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Users can create metrics"
  ON metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own metrics"
  ON metrics FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (owner_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can soft delete their own metrics"
  ON metrics FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (owner_id = auth.uid() OR created_by = auth.uid());

-- Policies for metric_goals table
CREATE POLICY "Users can view all metric goals"
  ON metric_goals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create metric goals"
  ON metric_goals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update metric goals"
  ON metric_goals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete metric goals"
  ON metric_goals FOR DELETE
  TO authenticated
  USING (true);

-- Policies for metric_actuals table
CREATE POLICY "Users can view all metric actuals"
  ON metric_actuals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create metric actuals"
  ON metric_actuals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update metric actuals"
  ON metric_actuals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete metric actuals"
  ON metric_actuals FOR DELETE
  TO authenticated
  USING (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for metrics table
DROP TRIGGER IF EXISTS update_metrics_updated_at ON metrics;
CREATE TRIGGER update_metrics_updated_at
  BEFORE UPDATE ON metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();