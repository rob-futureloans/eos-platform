/*
  # Add Time Period Management for Scorecard Metrics

  1. Changes to scorecard_metrics table
    - Add `time_period_type` (enum: 'month', 'quarter')
    - Add `time_period_value` (text: month name or quarter name)
    - Add `time_period_year` (integer: year)
    - Add `week1_start_date`, `week1_end_date`
    - Add `week2_start_date`, `week2_end_date`
    - Add `week3_start_date`, `week3_end_date`
    - Add `week4_start_date`, `week4_end_date`
  
  2. Purpose
    - Allow users to select a month or quarter for metrics tracking
    - Automatically calculate week date ranges based on the selected period
    - Provide better context for metric tracking periods
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scorecard_metrics' AND column_name = 'time_period_type'
  ) THEN
    ALTER TABLE scorecard_metrics
    ADD COLUMN time_period_type text DEFAULT 'month',
    ADD COLUMN time_period_value text DEFAULT '',
    ADD COLUMN time_period_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer,
    ADD COLUMN week1_start_date date,
    ADD COLUMN week1_end_date date,
    ADD COLUMN week2_start_date date,
    ADD COLUMN week2_end_date date,
    ADD COLUMN week3_start_date date,
    ADD COLUMN week3_end_date date,
    ADD COLUMN week4_start_date date,
    ADD COLUMN week4_end_date date;
  END IF;
END $$;