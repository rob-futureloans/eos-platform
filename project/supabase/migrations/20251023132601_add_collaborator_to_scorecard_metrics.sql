/*
  # Add Collaborator Column to Scorecard Metrics

  1. Changes
    - Add `collaborator` column to `scorecard_metrics` table
      - Type: text
      - Nullable: true (optional field)
      - Default: empty string
    
  2. Purpose
    - Allow tracking of collaborators for each scorecard metric
    - Collaborators can be selected from users or entered freehand
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scorecard_metrics' AND column_name = 'collaborator'
  ) THEN
    ALTER TABLE scorecard_metrics ADD COLUMN collaborator text DEFAULT '';
  END IF;
END $$;
