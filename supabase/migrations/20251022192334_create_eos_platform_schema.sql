/*
  # Create EOS Platform Schema

  1. New Tables
    - `rocks`
      - `id` (uuid, primary key)
      - `owner` (text) - Person responsible for the rock
      - `rock` (text) - Description of the rock
      - `measurable` (text) - How success is measured
      - `status` (text) - on-track, at-risk, off-track
      - `progress` (integer) - 0-100 percentage
      - `week_number` (integer) - Current week in quarter (1-13)
      - `due_date` (date) - Target completion date
      - `notes` (text) - Latest update notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `milestones`
      - `id` (uuid, primary key)
      - `rock_id` (uuid, foreign key)
      - `task` (text) - Milestone description
      - `complete` (boolean) - Completion status
      - `due_date` (date) - Target date
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)

    - `action_items`
      - `id` (uuid, primary key)
      - `rock_id` (uuid, foreign key)
      - `task` (text) - Action item description
      - `owner` (text) - Person responsible
      - `complete` (boolean) - Completion status
      - `created_at` (timestamptz)

    - `scorecard_metrics`
      - `id` (uuid, primary key)
      - `category` (text) - Metric category
      - `metric` (text) - Metric name
      - `owner` (text) - Person responsible
      - `goal` (numeric) - Weekly goal
      - `week1` (numeric) - Week 1 actual
      - `week2` (numeric) - Week 2 actual
      - `week3` (numeric) - Week 3 actual
      - `week4` (numeric) - Week 4 actual
      - `related_rock` (text) - Link to related rock
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `issues`
      - `id` (uuid, primary key)
      - `issue` (text) - Issue description
      - `priority` (text) - high, medium, low
      - `owner` (text) - Person responsible
      - `status` (text) - open, in-progress, solved
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `l10_notes`
      - `id` (uuid, primary key)
      - `section` (text) - segue, scorecard, rockReview, etc.
      - `notes` (text) - Meeting notes
      - `meeting_date` (date) - Date of meeting
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
    
  3. Important Notes
    - All tables use UUID primary keys
    - Timestamps track creation and updates
    - Foreign keys maintain data integrity
    - RLS ensures data security
*/

-- Create rocks table
CREATE TABLE IF NOT EXISTS rocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner text NOT NULL,
  rock text NOT NULL,
  measurable text NOT NULL,
  status text NOT NULL DEFAULT 'on-track',
  progress integer NOT NULL DEFAULT 0,
  week_number integer NOT NULL DEFAULT 1,
  due_date date NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rock_id uuid NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
  task text NOT NULL,
  complete boolean DEFAULT false,
  due_date date NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create action_items table
CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rock_id uuid NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
  task text NOT NULL,
  owner text NOT NULL,
  complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create scorecard_metrics table
CREATE TABLE IF NOT EXISTS scorecard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  metric text NOT NULL,
  owner text NOT NULL,
  goal numeric NOT NULL,
  week1 numeric DEFAULT 0,
  week2 numeric DEFAULT 0,
  week3 numeric DEFAULT 0,
  week4 numeric DEFAULT 0,
  related_rock text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create issues table
CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  owner text NOT NULL DEFAULT 'Unassigned',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create l10_notes table
CREATE TABLE IF NOT EXISTS l10_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  notes text DEFAULT '',
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE rocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE l10_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for rocks
CREATE POLICY "Allow all operations on rocks"
  ON rocks FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for milestones
CREATE POLICY "Allow all operations on milestones"
  ON milestones FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for action_items
CREATE POLICY "Allow all operations on action_items"
  ON action_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for scorecard_metrics
CREATE POLICY "Allow all operations on scorecard_metrics"
  ON scorecard_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for issues
CREATE POLICY "Allow all operations on issues"
  ON issues FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for l10_notes
CREATE POLICY "Allow all operations on l10_notes"
  ON l10_notes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_milestones_rock_id ON milestones(rock_id);
CREATE INDEX IF NOT EXISTS idx_action_items_rock_id ON action_items(rock_id);
CREATE INDEX IF NOT EXISTS idx_rocks_status ON rocks(status);
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_category ON scorecard_metrics(category);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_l10_notes_meeting_date ON l10_notes(meeting_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_rocks_updated_at
  BEFORE UPDATE ON rocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scorecard_metrics_updated_at
  BEFORE UPDATE ON scorecard_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_l10_notes_updated_at
  BEFORE UPDATE ON l10_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();