/*
  # Add issue type flags to issues table

  1. Changes
    - Add `is_rock` boolean column to track if issue is related to a Rock
    - Add `is_metric` boolean column to track if issue is related to a Metric
    - Add `related_metric_id` to link issues to specific metrics
    - Add `related_rock_id` to link issues to specific rocks
    
  2. Notes
    - Default both flags to false
    - Issues can be flagged as Rock, Metric, or Both (when both flags are true)
    - Related IDs help track which specific rock/metric the issue is associated with
*/

-- Add new columns to issues table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'issues' AND column_name = 'is_rock'
  ) THEN
    ALTER TABLE issues ADD COLUMN is_rock boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'issues' AND column_name = 'is_metric'
  ) THEN
    ALTER TABLE issues ADD COLUMN is_metric boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'issues' AND column_name = 'related_metric_id'
  ) THEN
    ALTER TABLE issues ADD COLUMN related_metric_id uuid REFERENCES metrics(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'issues' AND column_name = 'related_rock_id'
  ) THEN
    ALTER TABLE issues ADD COLUMN related_rock_id uuid REFERENCES rocks(id) ON DELETE SET NULL;
  END IF;
END $$;