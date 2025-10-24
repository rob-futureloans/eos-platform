-- Add Meeting Off-Track Metrics
--
-- 1. New Tables
--    - meeting_off_track_metrics
--      - id (uuid, primary key)
--      - meeting_date (date) - The date of the meeting
--      - meeting_timestamp (timestamptz) - Unique timestamp for the meeting session
--      - metric_id (uuid) - References the metric from metrics table
--      - metric_name (text) - Snapshot of metric name at time of capture
--      - goal_value (numeric) - Snapshot of goal value
--      - actual_value (numeric) - Snapshot of actual value
--      - variance (numeric) - Calculated variance
--      - variance_percent (numeric) - Calculated variance percentage
--      - period_type (text) - week, month, or quarter
--      - period_number (integer) - Which period (e.g., week 1, month 3, Q2)
--      - owner_id (uuid) - References the metric owner
--      - created_at (timestamptz)
--
-- 2. Security
--    - Enable RLS on meeting_off_track_metrics table
--    - Add policy for authenticated users to read all meeting metrics
--    - Add policy for authenticated users to insert meeting metrics
--    - Add policy for authenticated users to delete meeting metrics
--
-- 3. Indexes
--    - Index on meeting_timestamp for fast retrieval by meeting
--    - Index on metric_id for tracking metric history

CREATE TABLE IF NOT EXISTS meeting_off_track_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL,
  meeting_timestamp timestamptz NOT NULL,
  metric_id uuid REFERENCES metrics(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  goal_value numeric NOT NULL,
  actual_value numeric NOT NULL,
  variance numeric NOT NULL,
  variance_percent numeric NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('week', 'month', 'quarter')),
  period_number integer NOT NULL,
  owner_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_off_track_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meeting off-track metrics"
  ON meeting_off_track_metrics FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert meeting off-track metrics"
  ON meeting_off_track_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete meeting off-track metrics"
  ON meeting_off_track_metrics FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_meeting_off_track_metrics_timestamp 
  ON meeting_off_track_metrics(meeting_timestamp);

CREATE INDEX IF NOT EXISTS idx_meeting_off_track_metrics_metric_id 
  ON meeting_off_track_metrics(metric_id);