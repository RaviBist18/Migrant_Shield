-- ---------------------------------------------------------------------------
-- MigrantShield — Row Level Security: contracts table
-- Run once against your Supabase PostgreSQL instance
-- ---------------------------------------------------------------------------

-- Step 1: Enable RLS on contracts table
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Step 2: Force RLS even for table owner (prevents accidental bypass)
ALTER TABLE contracts FORCE ROW LEVEL SECURITY;-

-- Step 3: SELECT policy — users can only read their own contracts
CREATE POLICY "users_select_own_contracts"
ON contracts
FOR SELECT
USING (auth.uid() = user_id);

-- Step 4: INSERT policy — users can only insert rows for themselves
CREATE POLICY "users_insert_own_contracts"
ON contracts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 5: UPDATE policy — Phase 5 worker updates status field
-- Service role bypasses RLS — no user-facing UPDATE policy needed yet
-- Uncomment and scope if user-initiated updates required in future phases:
-- CREATE POLICY "users_update_own_contracts"
-- ON contracts
-- FOR UPDATE
-- USING (auth.uid() = user_id);

-- Step 6: DELETE — blocked entirely at RLS level (no policy = no access)
-- Migrant worker contract records must not be deletable by users
-- Admin deletion handled via service role only

-- ---------------------------------------------------------------------------
-- Verify RLS is active (run in Supabase SQL editor to confirm)
-- ---------------------------------------------------------------------------
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'contracts';