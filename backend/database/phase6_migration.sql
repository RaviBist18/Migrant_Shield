-- =============================================================
-- FILE: backend/database/phase6_migration.sql
-- MigrantShield Phase 6 Schema Migration
-- =============================================================

-- -------------------------------------------------------------
-- TABLE 1: reports
-- Tracks generated PDF assets linked to parent contracts
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    report_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID NOT NULL REFERENCES public.contracts(contract_id) ON DELETE CASCADE,
    pdf_url         TEXT NOT NULL,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    downloaded_count INTEGER NOT NULL DEFAULT 0
);

-- Index for fast contract lookups
CREATE INDEX IF NOT EXISTS idx_reports_contract_id 
    ON public.reports(contract_id);

-- -------------------------------------------------------------
-- TABLE 2: human_review_queue
-- Tracks contracts requiring manual legal review
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.human_review_queue (
    review_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID NOT NULL REFERENCES public.contracts(contract_id) ON DELETE CASCADE,
    reason          TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for queue processing order
CREATE INDEX IF NOT EXISTS idx_human_review_queue_status 
    ON public.human_review_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_human_review_queue_contract_id 
    ON public.human_review_queue(contract_id);

-- -------------------------------------------------------------
-- RLS: reports
-- Workers read only their own reports via contracts join
-- -------------------------------------------------------------
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Worker read: owns parent contract
CREATE POLICY "reports_select_owner"
    ON public.reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contracts c
            WHERE c.contract_id = reports.contract_id
              AND c.user_id = auth.uid()
        )
    );

-- Insert: service role only (background worker uses service key)
-- No INSERT policy = only service_role bypasses RLS on insert

-- -------------------------------------------------------------
-- RLS: human_review_queue
-- Workers insert only. Admins read via service role.
-- No worker SELECT policy = workers cannot enumerate queue.
-- -------------------------------------------------------------
ALTER TABLE public.human_review_queue ENABLE ROW LEVEL SECURITY;

-- Worker insert: owns parent contract
CREATE POLICY "hrq_insert_owner"
    ON public.human_review_queue
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contracts c
            WHERE c.contract_id = human_review_queue.contract_id
              AND c.user_id = auth.uid()
        )
    );

-- No SELECT policy for workers.
-- Admin reads via service_role key which bypasses RLS entirely.
-- If scoped admin JWT needed later, add separate admin role policy.

-- -------------------------------------------------------------
-- GRANT: ensure authenticated role has table access
-- Service role bypasses; anon role explicitly denied
-- -------------------------------------------------------------
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT INSERT ON public.human_review_queue TO authenticated;

REVOKE ALL ON public.reports FROM anon;
REVOKE ALL ON public.human_review_queue FROM anon;

-- -------------------------------------------------------------
-- SEQUENCE GRANT for downloaded_count increments
-- -------------------------------------------------------------
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;