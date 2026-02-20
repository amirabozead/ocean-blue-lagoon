-- Create table for OOS (Out of Service) Periods
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ocean_oos_periods (
  id TEXT PRIMARY KEY,
  room_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_oos_periods_room_number ON ocean_oos_periods(room_number);
CREATE INDEX IF NOT EXISTS idx_oos_periods_dates ON ocean_oos_periods(start_date, end_date);

-- Enable Row Level Security (RLS)
ALTER TABLE ocean_oos_periods ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on oos_periods" ON ocean_oos_periods
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE ocean_oos_periods IS 'Stores Out of Service room periods with date ranges';
