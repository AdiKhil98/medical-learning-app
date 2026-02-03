-- ============================================
-- Affiliate / Referral System
-- Created: 2026-02-03
-- ============================================

-- ============================================
-- 1. AFFILIATES TABLE
-- People who promote KP Med with referral links
-- ============================================
CREATE TABLE IF NOT EXISTS affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.2000,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'banned')),
  payout_method text CHECK (payout_method IN ('paypal', 'bank_transfer', 'wise')),
  payout_details jsonb,
  total_clicks integer DEFAULT 0,
  total_registrations integer DEFAULT 0,
  total_conversions integer DEFAULT 0,
  total_earned numeric(10,2) DEFAULT 0.00,
  total_paid numeric(10,2) DEFAULT 0.00,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE affiliates IS 'Affiliate partners who promote KP Med with referral links';
COMMENT ON COLUMN affiliates.commission_rate IS 'Commission rate as decimal (0.2000 = 20%)';
COMMENT ON COLUMN affiliates.affiliate_code IS 'Unique code used in referral URLs (e.g. kpmed.de/land?ref=CODE)';

CREATE INDEX idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX idx_affiliates_email ON affiliates(email);
CREATE INDEX idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX idx_affiliates_status ON affiliates(status);

-- ============================================
-- 2. REFERRAL CLICKS TABLE
-- Tracks every click on a referral link
-- ============================================
CREATE TABLE IF NOT EXISTS referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  affiliate_code text NOT NULL,
  landing_page text,
  ip_hash text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE referral_clicks IS 'Tracks clicks on affiliate referral links';

CREATE INDEX idx_referral_clicks_affiliate ON referral_clicks(affiliate_id);
CREATE INDEX idx_referral_clicks_code ON referral_clicks(affiliate_code);
CREATE INDEX idx_referral_clicks_created ON referral_clicks(created_at);

-- ============================================
-- 3. REFERRALS TABLE
-- Successful registrations from referral links
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  registered_at timestamptz DEFAULT now(),
  converted boolean DEFAULT false,
  converted_at timestamptz,

  UNIQUE(referred_user_id)
);

COMMENT ON TABLE referrals IS 'Users who registered through a referral link';

CREATE INDEX idx_referrals_affiliate ON referrals(affiliate_id);
CREATE INDEX idx_referrals_user ON referrals(referred_user_id);

-- ============================================
-- 4. REFERRAL COMMISSIONS TABLE
-- Commission earned per conversion/payment
-- ============================================
CREATE TABLE IF NOT EXISTS referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  referral_id uuid REFERENCES referrals(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lemonsqueezy_order_id text,
  sale_amount numeric(10,2) NOT NULL,
  commission_rate numeric(5,4) NOT NULL,
  commission_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reversed')),
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  paid_at timestamptz,
  reversed_at timestamptz,
  payout_id uuid
);

COMMENT ON TABLE referral_commissions IS 'Commission records for affiliate conversions';

CREATE INDEX idx_commissions_affiliate ON referral_commissions(affiliate_id);
CREATE INDEX idx_commissions_referral ON referral_commissions(referral_id);
CREATE INDEX idx_commissions_status ON referral_commissions(status);
CREATE INDEX idx_commissions_payout ON referral_commissions(payout_id);

-- ============================================
-- 5. REFERRAL PAYOUTS TABLE
-- Actual payouts made to affiliates
-- ============================================
CREATE TABLE IF NOT EXISTS referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  commission_count integer NOT NULL DEFAULT 0,
  payout_method text NOT NULL,
  payout_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

COMMENT ON TABLE referral_payouts IS 'Payout records for affiliate commissions';

CREATE INDEX idx_payouts_affiliate ON referral_payouts(affiliate_id);
CREATE INDEX idx_payouts_status ON referral_payouts(status);

-- ============================================
-- 6. ADD referred_by TO USERS TABLE
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by text;

COMMENT ON COLUMN users.referred_by IS 'Affiliate code of the referrer (if user came from a referral link)';

CREATE INDEX idx_users_referred_by ON users(referred_by);

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

-- AFFILIATES: Admins can do everything, affiliates can view their own record
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all affiliates"
  ON affiliates FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Affiliates can view their own record"
  ON affiliates FOR SELECT TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- REFERRAL CLICKS: Admins can manage, affiliates can view their own
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all referral clicks"
  ON referral_clicks FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Affiliates can view their own clicks"
  ON referral_clicks FOR SELECT TO authenticated
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- REFERRALS: Admins can manage, affiliates can view their own
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all referrals"
  ON referrals FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Affiliates can view their own referrals"
  ON referrals FOR SELECT TO authenticated
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- REFERRAL COMMISSIONS: Admins can manage, affiliates can view their own
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all commissions"
  ON referral_commissions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Affiliates can view their own commissions"
  ON referral_commissions FOR SELECT TO authenticated
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- REFERRAL PAYOUTS: Admins can manage, affiliates can view their own
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all payouts"
  ON referral_payouts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Affiliates can view their own payouts"
  ON referral_payouts FOR SELECT TO authenticated
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ============================================
-- 8. RPC FUNCTIONS
-- ============================================

-- Function: Record a referral click (called from frontend, no auth required for anonymous visitors)
CREATE OR REPLACE FUNCTION record_referral_click(
  p_affiliate_code text,
  p_landing_page text DEFAULT NULL,
  p_ip_hash text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_affiliate affiliates;
BEGIN
  -- Look up the affiliate
  SELECT * INTO v_affiliate FROM affiliates WHERE affiliate_code = p_affiliate_code AND status = 'active';

  IF v_affiliate.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or inactive affiliate code');
  END IF;

  -- Record the click
  INSERT INTO referral_clicks (affiliate_id, affiliate_code, landing_page, ip_hash, user_agent)
  VALUES (v_affiliate.id, p_affiliate_code, p_landing_page, p_ip_hash, p_user_agent);

  -- Update click counter
  UPDATE affiliates SET total_clicks = total_clicks + 1, updated_at = now() WHERE id = v_affiliate.id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_referral_click TO anon;
GRANT EXECUTE ON FUNCTION record_referral_click TO authenticated;

-- Function: Register a referral (called when a referred user signs up)
CREATE OR REPLACE FUNCTION register_referral(
  p_referred_user_id uuid,
  p_affiliate_code text
)
RETURNS json AS $$
DECLARE
  v_affiliate affiliates;
  v_existing referrals;
BEGIN
  -- Check if user is already referred
  SELECT * INTO v_existing FROM referrals WHERE referred_user_id = p_referred_user_id;
  IF v_existing.id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'User already has a referral');
  END IF;

  -- Look up the affiliate
  SELECT * INTO v_affiliate FROM affiliates WHERE affiliate_code = p_affiliate_code AND status = 'active';

  IF v_affiliate.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or inactive affiliate code');
  END IF;

  -- Prevent self-referral
  IF v_affiliate.user_id = p_referred_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Self-referral not allowed');
  END IF;

  -- Also check email match for self-referral
  IF v_affiliate.email = (SELECT email FROM auth.users WHERE id = p_referred_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Self-referral not allowed');
  END IF;

  -- Create the referral record
  INSERT INTO referrals (affiliate_id, referred_user_id)
  VALUES (v_affiliate.id, p_referred_user_id);

  -- Update the user's referred_by field
  UPDATE users SET referred_by = p_affiliate_code WHERE id = p_referred_user_id;

  -- Update registration counter
  UPDATE affiliates SET total_registrations = total_registrations + 1, updated_at = now() WHERE id = v_affiliate.id;

  RETURN json_build_object('success', true, 'affiliate_name', v_affiliate.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION register_referral TO authenticated;

-- Function: Create commission (called from webhook handler via service role)
CREATE OR REPLACE FUNCTION create_referral_commission(
  p_referred_user_id uuid,
  p_sale_amount numeric,
  p_lemonsqueezy_order_id text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_referral referrals;
  v_affiliate affiliates;
  v_commission_amount numeric(10,2);
BEGIN
  -- Find the referral record for this user
  SELECT * INTO v_referral FROM referrals WHERE referred_user_id = p_referred_user_id;

  IF v_referral.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No referral found for this user');
  END IF;

  -- Get the affiliate
  SELECT * INTO v_affiliate FROM affiliates WHERE id = v_referral.affiliate_id AND status = 'active';

  IF v_affiliate.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Affiliate not found or inactive');
  END IF;

  -- Calculate commission
  v_commission_amount := ROUND(p_sale_amount * v_affiliate.commission_rate, 2);

  -- Create commission record
  INSERT INTO referral_commissions (
    affiliate_id, referral_id, referred_user_id,
    lemonsqueezy_order_id, sale_amount, commission_rate, commission_amount
  ) VALUES (
    v_affiliate.id, v_referral.id, p_referred_user_id,
    p_lemonsqueezy_order_id, p_sale_amount, v_affiliate.commission_rate, v_commission_amount
  );

  -- Mark referral as converted (if first time)
  IF NOT v_referral.converted THEN
    UPDATE referrals SET converted = true, converted_at = now() WHERE id = v_referral.id;
    UPDATE affiliates SET total_conversions = total_conversions + 1, updated_at = now() WHERE id = v_affiliate.id;
  END IF;

  -- Update total earned
  UPDATE affiliates SET total_earned = total_earned + v_commission_amount, updated_at = now() WHERE id = v_affiliate.id;

  RETURN json_build_object(
    'success', true,
    'commission_amount', v_commission_amount,
    'affiliate_name', v_affiliate.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service role should call this (from webhook handler)
REVOKE EXECUTE ON FUNCTION create_referral_commission FROM anon;
REVOKE EXECUTE ON FUNCTION create_referral_commission FROM authenticated;

-- Function: Get affiliate stats (for affiliate dashboard)
CREATE OR REPLACE FUNCTION get_affiliate_stats()
RETURNS json AS $$
DECLARE
  v_affiliate affiliates;
  v_pending_amount numeric(10,2);
  v_recent_commissions json;
  v_monthly_clicks integer;
  v_monthly_registrations integer;
BEGIN
  -- Get affiliate by current user's email
  SELECT * INTO v_affiliate FROM affiliates
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'active';

  IF v_affiliate.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not an affiliate');
  END IF;

  -- Get pending commission amount
  SELECT COALESCE(SUM(commission_amount), 0) INTO v_pending_amount
  FROM referral_commissions
  WHERE affiliate_id = v_affiliate.id AND status IN ('pending', 'approved');

  -- Get clicks this month
  SELECT COUNT(*) INTO v_monthly_clicks
  FROM referral_clicks
  WHERE affiliate_id = v_affiliate.id
  AND created_at >= date_trunc('month', now());

  -- Get registrations this month
  SELECT COUNT(*) INTO v_monthly_registrations
  FROM referrals
  WHERE affiliate_id = v_affiliate.id
  AND registered_at >= date_trunc('month', now());

  -- Get recent commissions
  SELECT json_agg(c) INTO v_recent_commissions
  FROM (
    SELECT commission_amount, sale_amount, status, created_at
    FROM referral_commissions
    WHERE affiliate_id = v_affiliate.id
    ORDER BY created_at DESC
    LIMIT 10
  ) c;

  RETURN json_build_object(
    'success', true,
    'affiliate', json_build_object(
      'name', v_affiliate.name,
      'code', v_affiliate.affiliate_code,
      'commission_rate', v_affiliate.commission_rate,
      'status', v_affiliate.status
    ),
    'stats', json_build_object(
      'total_clicks', v_affiliate.total_clicks,
      'total_registrations', v_affiliate.total_registrations,
      'total_conversions', v_affiliate.total_conversions,
      'total_earned', v_affiliate.total_earned,
      'total_paid', v_affiliate.total_paid,
      'pending_amount', v_pending_amount,
      'monthly_clicks', v_monthly_clicks,
      'monthly_registrations', v_monthly_registrations
    ),
    'recent_commissions', COALESCE(v_recent_commissions, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_affiliate_stats TO authenticated;

-- Function: Check if current user is an affiliate
CREATE OR REPLACE FUNCTION is_affiliate()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM affiliates
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_affiliate TO authenticated;
