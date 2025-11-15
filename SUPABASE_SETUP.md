# Supabase Setup Guide

This guide will walk you through setting up Supabase for the AINAA Clinic Dashboard application.

## Table of Contents

1. [Create Supabase Project](#create-supabase-project)
2. [Database Schema Setup](#database-schema-setup)
3. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
4. [Authentication Setup](#authentication-setup)
5. [Environment Variables](#environment-variables)
6. [Storage Setup (Optional)](#storage-setup-optional)
7. [Migration Instructions](#migration-instructions)
8. [Troubleshooting](#troubleshooting)

## Create Supabase Project

1. **Sign up for Supabase**
   - Go to [https://supabase.com](https://supabase.com)
   - Click "Start your project"
   - Sign up using GitHub, GitLab, or email

2. **Create a new project**
   - Click "New Project"
   - Fill in the project details:
     - **Name:** AINAA Clinic Dashboard
     - **Database Password:** Choose a strong password (save this securely)
     - **Region:** Select the closest region to your users
     - **Pricing Plan:** Free tier is sufficient for development
   - Click "Create new project"
   - Wait for the project to be provisioned (2-3 minutes)

3. **Locate your project credentials**
   - Once created, go to Project Settings (gear icon)
   - Navigate to "API" section
   - Copy the following:
     - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
     - **anon/public key** (starts with `eyJ...`)

## Database Schema Setup

### 1. Create the Patients Table

Navigate to the SQL Editor in your Supabase dashboard and run the following SQL:

```sql
-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0 AND age <= 150),
  gender VARCHAR(50) NOT NULL,
  contact VARCHAR(50) NOT NULL,
  address TEXT,
  medical_history TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_gender ON patients(gender);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. Create the Appointments Table (Optional)

```sql
-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  appointment_type VARCHAR(100) NOT NULL,
  doctor_name VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Create trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3. Create Analytics/Metrics View (Optional)

```sql
-- Create a view for patient analytics
CREATE OR REPLACE VIEW patient_analytics AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_patients,
  COUNT(*) FILTER (WHERE gender = 'Male') as male_count,
  COUNT(*) FILTER (WHERE gender = 'Female') as female_count,
  AVG(age) as average_age,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_patients_30d
FROM patients
WHERE status = 'active'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

## Row Level Security (RLS) Policies

Enable RLS and create policies to secure your data:

```sql
-- Enable Row Level Security on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all patients
CREATE POLICY "Allow authenticated users to read patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert patients
CREATE POLICY "Allow authenticated users to insert patients"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update patients
CREATE POLICY "Allow authenticated users to update patients"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to delete patients
CREATE POLICY "Allow authenticated users to delete patients"
  ON patients
  FOR DELETE
  TO authenticated
  USING (true);

-- If using appointments table, enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users full access to appointments
CREATE POLICY "Allow authenticated users to manage appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

### Alternative: More Restrictive Policies

If you want users to only access their own data:

```sql
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow authenticated users to read patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to insert patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to update patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to delete patients" ON patients;

-- Policy: Users can only read patients they created
CREATE POLICY "Users can read own patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Policy: Users can only insert with their own user ID
CREATE POLICY "Users can insert own patients"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can only update their own patients
CREATE POLICY "Users can update own patients"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can only delete their own patients
CREATE POLICY "Users can delete own patients"
  ON patients
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
```

## Authentication Setup

### 1. Enable Email Authentication

1. Go to Authentication > Providers in Supabase dashboard
2. Enable "Email" provider
3. Configure email templates (optional)
4. Set up email confirmation if needed

### 2. Create Admin User

Via SQL Editor:

```sql
-- Note: You should create users through the Supabase Auth UI or signup flow
-- This is just for reference on how to check users

-- View all users
SELECT * FROM auth.users;
```

Or via Supabase Dashboard:
1. Go to Authentication > Users
2. Click "Add user"
3. Enter email and password
4. Click "Create user"

### 3. Configure Auth Settings (Optional)

1. Go to Authentication > Settings
2. Configure:
   - **Site URL:** Your application URL
   - **Redirect URLs:** Add authorized redirect URLs
   - **JWT expiry:** Adjust as needed (default: 3600 seconds)
   - **Email Templates:** Customize confirmation, reset password emails

## Environment Variables

After setting up Supabase, create a `.env` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### How to find these values:

1. **VITE_SUPABASE_URL:**
   - Go to Project Settings > API
   - Copy "Project URL"

2. **VITE_SUPABASE_ANON_KEY:**
   - Go to Project Settings > API
   - Copy "Project API keys" > "anon" > "public"

**Important:** Never commit the `.env` file to version control. Always use `.env.example` as a template.

## Storage Setup (Optional)

If you need to store patient documents or images:

### 1. Create Storage Bucket

```sql
-- Create a storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false);
```

### 2. Set Storage Policies

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patient-documents');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'patient-documents');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'patient-documents' AND auth.uid() = owner);
```

## Migration Instructions

### Initial Setup (First Time)

1. Run all SQL scripts in order:
   - Database Schema Setup
   - Row Level Security Policies
   - Authentication Setup
   - Storage Setup (if needed)

### Applying Future Migrations

Create migration files in your project:

```bash
# Create migrations folder
mkdir -p supabase/migrations

# Create new migration file
touch supabase/migrations/001_initial_schema.sql
```

To apply migrations manually:
1. Copy SQL from migration file
2. Paste into Supabase SQL Editor
3. Click "Run"

### Backup Before Major Changes

```sql
-- Backup patients table
CREATE TABLE patients_backup AS SELECT * FROM patients;

-- Restore if needed
INSERT INTO patients SELECT * FROM patients_backup;
```

## Data Seeding (Development)

For testing purposes, you can seed sample data:

```sql
-- Insert sample patients
INSERT INTO patients (name, age, gender, contact, address, medical_history, status)
VALUES
  ('Ahmad bin Abdullah', 45, 'Male', '+60123456789', '123 Jalan Merdeka, Kuala Lumpur', 'Diabetes Type 2, Hypertension', 'active'),
  ('Siti Nurhaliza', 32, 'Female', '+60198765432', '456 Jalan Raja, Petaling Jaya', 'Asthma', 'active'),
  ('Chen Wei Ming', 58, 'Male', '+60176543210', '789 Jalan Ipoh, Kuala Lumpur', 'High Cholesterol', 'active'),
  ('Priya Devi', 28, 'Female', '+60134567890', '321 Jalan Bukit Bintang, Kuala Lumpur', 'None', 'active'),
  ('Raj Kumar', 65, 'Male', '+60145678901', '654 Jalan Ampang, Kuala Lumpur', 'Heart Disease, Diabetes', 'active');

-- Insert sample appointments (if appointments table exists)
INSERT INTO appointments (patient_id, appointment_date, appointment_type, doctor_name, status)
SELECT
  id,
  NOW() + (random() * 30 || ' days')::interval,
  (ARRAY['Checkup', 'Follow-up', 'Consultation', 'Emergency'])[floor(random() * 4 + 1)],
  (ARRAY['Dr. Ahmad', 'Dr. Lee', 'Dr. Siti', 'Dr. Kumar'])[floor(random() * 4 + 1)],
  'scheduled'
FROM patients
LIMIT 10;
```

## Troubleshooting

### Common Issues

**Issue: Cannot connect to Supabase**
- Verify your Project URL and anon key are correct
- Check if the Supabase project is active
- Ensure your IP is not blocked

**Issue: RLS policies preventing access**
- Check if RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'patients';`
- Verify policies are created: `SELECT * FROM pg_policies WHERE tablename = 'patients';`
- Test with authenticated user in SQL Editor

**Issue: Queries are slow**
- Check indexes are created
- Analyze query performance with `EXPLAIN ANALYZE`
- Consider adding more indexes for frequently queried columns

**Issue: Authentication errors**
- Verify user exists in auth.users table
- Check JWT token is valid
- Ensure redirect URLs are properly configured

### Testing Database Connection

Run this in SQL Editor to verify setup:

```sql
-- Test database connection
SELECT
  'Database is working!' as message,
  current_database() as database_name,
  current_timestamp as server_time;

-- Check patients table structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;

-- Verify RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'patients';
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Support

For Supabase-specific issues:
- [Supabase GitHub Discussions](https://github.com/supabase/supabase/discussions)
- [Supabase Discord](https://discord.supabase.com)

For project-specific issues, refer to the main README.md file.

---

Last updated: 2025-11-15
