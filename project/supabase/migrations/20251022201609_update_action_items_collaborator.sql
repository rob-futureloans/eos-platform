/*
  # Update Action Items to use Collaborator field

  1. Changes
    - Rename `owner` column to `collaborator` in action_items table
    - This allows for both users from the system and external collaborators

  2. Notes
    - Existing data will be preserved
    - The collaborator field can now contain either a user name from the system or a free-form name
*/

-- Rename owner to collaborator in action_items table
ALTER TABLE action_items RENAME COLUMN owner TO collaborator;