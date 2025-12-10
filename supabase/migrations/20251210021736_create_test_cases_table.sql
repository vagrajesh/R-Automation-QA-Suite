/*
  # Create Test Cases Table

  1. New Tables
    - `test_cases`
      - `id` (uuid, primary key) - Auto-generated unique identifier
      - `test_case_id` (text) - Custom test case ID
      - `module` (text) - Module name
      - `test_case_title` (text) - Title of the test case
      - `test_case_description` (text) - Detailed description
      - `preconditions` (text) - Prerequisites for the test
      - `test_steps` (text) - Steps with \r\n separators
      - `expected_results` (text) - Expected outcome
      - `priority` (text) - P1, P2, or P3
      - `test_type` (text) - Integration or Functional
      - `risk_level` (text) - Critical, High, Medium, or Low
      - `linked_user_stories` (jsonb) - Array of linked user stories
      - `source_citations` (jsonb) - Array of source citations
      - `compliance_notes` (text) - Compliance information
      - `estimated_execution_time` (text) - Time estimate
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `test_cases` table
    - Add policy for authenticated users to read test cases
    - Add policy for authenticated users to insert test cases
    - Add policy for authenticated users to update test cases
    - Add policy for authenticated users to delete test cases
*/

CREATE TABLE IF NOT EXISTS test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id text NOT NULL,
  module text DEFAULT '',
  test_case_title text NOT NULL,
  test_case_description text DEFAULT '',
  preconditions text DEFAULT '',
  test_steps text DEFAULT '',
  expected_results text DEFAULT '',
  priority text DEFAULT 'P2' CHECK (priority IN ('P1', 'P2', 'P3')),
  test_type text DEFAULT 'Functional' CHECK (test_type IN ('Integration', 'Functional')),
  risk_level text DEFAULT 'Medium' CHECK (risk_level IN ('Critical', 'High', 'Medium', 'Low')),
  linked_user_stories jsonb DEFAULT '[]'::jsonb,
  source_citations jsonb DEFAULT '[]'::jsonb,
  compliance_notes text DEFAULT '',
  estimated_execution_time text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view test cases"
  ON test_cases
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert test cases"
  ON test_cases
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update test cases"
  ON test_cases
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete test cases"
  ON test_cases
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_test_cases_test_case_id ON test_cases(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_module ON test_cases(module);
CREATE INDEX IF NOT EXISTS idx_test_cases_priority ON test_cases(priority);