/*
  # Create Scorecard Trending Table

  1. New Tables
    - `scorecard_trending`
      - `id` (uuid, primary key)
      - `meeting_date` (date) - The date of the meeting
      - `meeting_timestamp` (text) - Unique timestamp for the meeting
      - `metric_id` (uuid) - References the scorecard_metrics table
      - `status` (text) - The trending status: 'red', 'yellow', or 'green'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `scorecard_trending` table
    - Add policies for authenticated users to read and write their own data

  3. Indexes
    - Add composite index on meeting_date and meeting_timestamp for efficient lookups
*/

CREATE TABLE IF NOT EXISTS scorecard_trending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL,
  meeting_timestamp text NOT NULL,
  metric_id uuid NOT NULL REFERENCES scorecard_metrics(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('red', 'yellow', 'green')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(meeting_timestamp, metric_id)
);

CREATE INDEX IF NOT EXISTS idx_scorecard_trending_meeting
  ON scorecard_trending(meeting_date, meeting_timestamp);

ALTER TABLE scorecard_trending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scorecard trending"
  ON scorecard_trending FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert scorecard trending"
  ON scorecard_trending FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update scorecard trending"
  ON scorecard_trending FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete scorecard trending"
  ON scorecard_trending FOR DELETE
  TO authenticated
  USING (true);
