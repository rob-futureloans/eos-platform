/*
  # Allow Anonymous Access to Metrics and Goals

  1. Changes
    - Add policies to allow anon role to insert, select, update, and delete metrics
    - Add policies to allow anon role to insert, select, update, and delete metric_goals
    - This enables the app to work without authentication
  
  2. Security Notes
    - These policies allow full access for anonymous users
    - In production, you would want proper authentication
*/

-- Drop existing anon policies if they exist and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anonymous users can view all metrics" ON metrics;
  DROP POLICY IF EXISTS "Anonymous users can create metrics" ON metrics;
  DROP POLICY IF EXISTS "Anonymous users can update metrics" ON metrics;
  DROP POLICY IF EXISTS "Anonymous users can delete metrics" ON metrics;
  DROP POLICY IF EXISTS "Anonymous users can view all metric goals" ON metric_goals;
  DROP POLICY IF EXISTS "Anonymous users can create metric goals" ON metric_goals;
  DROP POLICY IF EXISTS "Anonymous users can update metric goals" ON metric_goals;
  DROP POLICY IF EXISTS "Anonymous users can delete metric goals" ON metric_goals;
END $$;

-- Metrics table policies for anon role
CREATE POLICY "Anonymous users can view all metrics"
  ON metrics
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

CREATE POLICY "Anonymous users can create metrics"
  ON metrics
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update metrics"
  ON metrics
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete metrics"
  ON metrics
  FOR DELETE
  TO anon
  USING (true);

-- Metric goals table policies for anon role
CREATE POLICY "Anonymous users can view all metric goals"
  ON metric_goals
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create metric goals"
  ON metric_goals
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update metric goals"
  ON metric_goals
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete metric goals"
  ON metric_goals
  FOR DELETE
  TO anon
  USING (true);
