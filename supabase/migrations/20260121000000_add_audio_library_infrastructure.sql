-- Audio Library Infrastructure Migration
-- Creates tables, functions, and columns needed for the audio subscription feature

-- ============================================================================
-- 1. Create audio_subscriptions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audio_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    library_type TEXT NOT NULL CHECK (library_type IN ('fsp_audio', 'kp_audio')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Payment provider fields
    provider TEXT DEFAULT 'lemonsqueezy',
    provider_subscription_id TEXT,
    provider_customer_id TEXT,
    -- Prevent duplicate active subscriptions
    UNIQUE(user_id, library_type, status) -- One active subscription per type per user
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audio_subscriptions_user_id ON public.audio_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_subscriptions_library_type ON public.audio_subscriptions(library_type);
CREATE INDEX IF NOT EXISTS idx_audio_subscriptions_status ON public.audio_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_audio_subscriptions_expires_at ON public.audio_subscriptions(expires_at);

-- Enable RLS
ALTER TABLE public.audio_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own audio subscriptions" ON public.audio_subscriptions;
CREATE POLICY "Users can view own audio subscriptions" ON public.audio_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage audio subscriptions" ON public.audio_subscriptions;
CREATE POLICY "Service role can manage audio subscriptions" ON public.audio_subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable realtime for subscription changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.audio_subscriptions;

-- ============================================================================
-- 2. Create has_audio_access() RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_audio_access(
    p_user_id UUID,
    p_library_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has an active subscription for the given library type
    RETURN EXISTS(
        SELECT 1
        FROM public.audio_subscriptions
        WHERE user_id = p_user_id
          AND library_type = p_library_type
          AND status = 'active'
          AND expires_at > NOW()
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_audio_access(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 3. Add audio_url columns to content tables
-- ============================================================================

-- Add audio_url to fsp_bibliothek
ALTER TABLE public.fsp_bibliothek
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add audio_url to fsp_anamnese
ALTER TABLE public.fsp_anamnese
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add audio_url to fsp_fachbegriffe
ALTER TABLE public.fsp_fachbegriffe
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add audio_url to kp_medical_content
ALTER TABLE public.kp_medical_content
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create indexes for filtering by audio_url (topics with audio)
CREATE INDEX IF NOT EXISTS idx_fsp_bibliothek_audio ON public.fsp_bibliothek(audio_url) WHERE audio_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fsp_anamnese_audio ON public.fsp_anamnese(audio_url) WHERE audio_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fsp_fachbegriffe_audio ON public.fsp_fachbegriffe(audio_url) WHERE audio_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kp_medical_content_audio ON public.kp_medical_content(audio_url) WHERE audio_url IS NOT NULL;

-- ============================================================================
-- 4. Helper function to grant audio access (for webhooks/admin)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_audio_access(
    p_user_id UUID,
    p_library_type TEXT,
    p_duration_days INTEGER DEFAULT 30,
    p_provider_subscription_id TEXT DEFAULT NULL,
    p_provider_customer_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription_id UUID;
BEGIN
    -- Cancel any existing active subscription of this type
    UPDATE public.audio_subscriptions
    SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = p_user_id
      AND library_type = p_library_type
      AND status = 'active';

    -- Create new subscription
    INSERT INTO public.audio_subscriptions (
        user_id,
        library_type,
        status,
        starts_at,
        expires_at,
        provider_subscription_id,
        provider_customer_id
    ) VALUES (
        p_user_id,
        p_library_type,
        'active',
        NOW(),
        NOW() + (p_duration_days || ' days')::INTERVAL,
        p_provider_subscription_id,
        p_provider_customer_id
    )
    RETURNING id INTO v_subscription_id;

    RETURN v_subscription_id;
END;
$$;

-- ============================================================================
-- 5. Function to revoke/cancel audio access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.revoke_audio_access(
    p_user_id UUID,
    p_library_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.audio_subscriptions
    SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = p_user_id
      AND library_type = p_library_type
      AND status = 'active';

    RETURN FOUND;
END;
$$;

-- ============================================================================
-- 6. Function to extend audio subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION public.extend_audio_access(
    p_user_id UUID,
    p_library_type TEXT,
    p_additional_days INTEGER DEFAULT 30
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_expires_at TIMESTAMPTZ;
BEGIN
    UPDATE public.audio_subscriptions
    SET
        expires_at = GREATEST(expires_at, NOW()) + (p_additional_days || ' days')::INTERVAL,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND library_type = p_library_type
      AND status = 'active'
    RETURNING expires_at INTO v_new_expires_at;

    RETURN v_new_expires_at;
END;
$$;

-- ============================================================================
-- 7. Trigger to auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_audio_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audio_subscription_updated_at ON public.audio_subscriptions;
CREATE TRIGGER trigger_audio_subscription_updated_at
    BEFORE UPDATE ON public.audio_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_audio_subscription_timestamp();

-- ============================================================================
-- 8. Add comment documentation
-- ============================================================================

COMMENT ON TABLE public.audio_subscriptions IS 'Stores user subscriptions to audio content libraries (FSP Audio €7/mo, KP Audio €10/mo)';
COMMENT ON COLUMN public.audio_subscriptions.library_type IS 'Type of audio library: fsp_audio or kp_audio';
COMMENT ON COLUMN public.audio_subscriptions.status IS 'Subscription status: active, cancelled, or expired';
COMMENT ON FUNCTION public.has_audio_access IS 'Check if a user has active access to a specific audio library';
COMMENT ON FUNCTION public.grant_audio_access IS 'Grant audio access to a user (used by payment webhooks)';
COMMENT ON FUNCTION public.revoke_audio_access IS 'Revoke/cancel audio access for a user';
COMMENT ON FUNCTION public.extend_audio_access IS 'Extend an existing audio subscription';
