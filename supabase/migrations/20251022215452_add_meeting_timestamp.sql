/*
  # Add Meeting Timestamp to L10 Notes

  1. Changes
    - Add `meeting_timestamp` column to `l10_notes` table
    - This allows multiple meetings to be saved on the same date
    - Each meeting will have a unique timestamp identifier
    
  2. Migration Details
    - Adds nullable timestamptz column with default of now()
    - Existing records will get the current timestamp
    - Creates index for better query performance on timestamp
    
  3. Security
    - No changes to RLS policies
    - Maintains existing access controls
*/

-- Add meeting_timestamp column to l10_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'l10_notes' AND column_name = 'meeting_timestamp'
  ) THEN
    ALTER TABLE l10_notes ADD COLUMN meeting_timestamp timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_l10_notes_meeting_timestamp ON l10_notes(meeting_timestamp);
CREATE INDEX IF NOT EXISTS idx_l10_notes_meeting_date_timestamp ON l10_notes(meeting_date, meeting_timestamp);