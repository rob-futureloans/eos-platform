/*
  # Seed Initial Demo Data

  1. Sample Data
    - Add sample rocks from the wireframe
    - Add sample scorecard metrics
    - Add sample issues
    - Add milestones and action items for rocks

  2. Purpose
    - Provide realistic demo data for users to explore
    - Demonstrate the full functionality of the platform
*/

-- Insert sample rocks
INSERT INTO rocks (owner, rock, measurable, status, progress, week_number, due_date, notes) VALUES
  ('Everyone', 'Journey of the client and contacts through the process', 'Complete client journey map with all touchpoints documented and optimized', 'on-track', 30, 4, '2025-12-31', 'Journey mapping workshops scheduled for next week'),
  ('Andy', 'Launch employee Spiff-per-loan recruiting program', 'Program designed, approved, and 3 new hires recruited', 'at-risk', 15, 4, '2025-12-31', 'Waiting on leadership approval for Spiff structure'),
  ('Jason', 'Transition to correspondent lending model', 'Correspondent channel operational with first 5 loans closed', 'on-track', 45, 4, '2025-12-31', 'Partnership agreements 80% complete, workflows being documented');

-- Insert sample scorecard metrics
INSERT INTO scorecard_metrics (category, metric, owner, goal, week1, week2, week3, week4, related_rock) VALUES
  ('Sales & Marketing', 'New Leads Generated', 'Andrea', 50, 48, 52, 45, 53, 'Andrea - Lead tracking system'),
  ('Sales & Marketing', 'Lead Conversion Rate %', 'Andrea', 25, 22, 24, 21, 26, 'Andrea - Lead tracking system'),
  ('Production', 'Loans in Pipeline', 'Nate', 75, 72, 78, 74, 76, 'Nate - Production forecast model'),
  ('Production', 'Loans Closed This Week', 'Jason', 15, 14, 16, 13, 15, 'Jason - Correspondent lending transition'),
  ('Operations', 'Avg Processing Time (Days)', 'Jaime', 21, 23, 22, 21, 20, 'Jaime - Ops KPI dashboard'),
  ('Customer Experience', 'Client Satisfaction Score', 'Everyone', 9.0, 8.8, 9.1, 9.0, 9.2, 'Everyone - Client journey mapping');

-- Insert sample issues
INSERT INTO issues (issue, priority, owner, status) VALUES
  ('CRM data cleanup blocking Andrea''s Rock', 'high', 'Andrea', 'open'),
  ('Leadership approval needed for recruiting Spiff', 'high', 'Andy', 'open'),
  ('Correspondent partnership contract negotiation', 'medium', 'Jason', 'in-progress');

-- Get rock IDs and insert milestones and action items
DO $$
DECLARE
  rock1_id uuid;
  rock2_id uuid;
  rock3_id uuid;
BEGIN
  -- Get the IDs of the rocks we just inserted
  SELECT id INTO rock1_id FROM rocks WHERE owner = 'Everyone' LIMIT 1;
  SELECT id INTO rock2_id FROM rocks WHERE owner = 'Andy' LIMIT 1;
  SELECT id INTO rock3_id FROM rocks WHERE owner = 'Jason' LIMIT 1;

  -- Insert milestones for rock 1
  INSERT INTO milestones (rock_id, task, complete, due_date, sort_order) VALUES
    (rock1_id, 'Map current state', true, '2025-10-30', 0),
    (rock1_id, 'Identify friction points', false, '2025-11-07', 1),
    (rock1_id, 'Design optimized journey', false, '2025-11-28', 2),
    (rock1_id, 'Implement improvements', false, '2025-12-15', 3),
    (rock1_id, 'Measure satisfaction', false, '2025-12-31', 4);

  -- Insert action items for rock 1
  INSERT INTO action_items (rock_id, task, owner, complete) VALUES
    (rock1_id, 'Schedule journey mapping workshop', 'Everyone', true),
    (rock1_id, 'Interview 5 recent clients', 'Everyone', false);

  -- Insert milestones for rock 2
  INSERT INTO milestones (rock_id, task, complete, due_date, sort_order) VALUES
    (rock2_id, 'Document recruiting gameplan', true, '2025-10-24', 0),
    (rock2_id, 'Design Spiff structure', false, '2025-10-31', 1),
    (rock2_id, 'Launch pilot program', false, '2025-11-14', 2),
    (rock2_id, 'Track referrals', false, '2025-12-15', 3),
    (rock2_id, 'Evaluate ROI', false, '2025-12-31', 4);

  -- Insert action items for rock 2
  INSERT INTO action_items (rock_id, task, owner, complete) VALUES
    (rock2_id, 'Present Spiff proposal to leadership', 'Andy', false),
    (rock2_id, 'Get budget approval', 'Andy', false);

  -- Insert milestones for rock 3
  INSERT INTO milestones (rock_id, task, complete, due_date, sort_order) VALUES
    (rock3_id, 'Finalize partnerships', false, '2025-11-15', 0),
    (rock3_id, 'Document processes', false, '2025-11-22', 1),
    (rock3_id, 'Train team', false, '2025-12-05', 2),
    (rock3_id, 'Pilot first loans', false, '2025-12-20', 3),
    (rock3_id, 'Refine processes', false, '2025-12-31', 4);

  -- Insert action items for rock 3
  INSERT INTO action_items (rock_id, task, owner, complete) VALUES
    (rock3_id, 'Finalize investor agreement terms', 'Jason', false),
    (rock3_id, 'Create correspondent workflow document', 'Jason', false);
END $$;