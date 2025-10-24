/*
  # Add Actual Value to Metric Goals

  1. Changes
    - Add `actual_value` column to store the actual achieved value for each period
    - Defaults to NULL (not yet entered)
    - Nullable to support "No Data Yet" state
  
  2. Purpose
    - Enables inline editing of actual values in the scorecard
    - Supports variance calculations (actual - goal)
    - Tracks performance against goals over time
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'metric_goals' AND column_name = 'actual_value'
  ) THEN
    ALTER TABLE metric_goals ADD COLUMN actual_value numeric DEFAULT NULL;
  END IF;
END $$;