import { createClient } from '@/lib/supabase/client';

export interface RegistrationStatus {
  allowed: boolean;
  current_count: number;
  max_users: number;
  message: string;
}

/**
 * Check if new user registration is allowed
 */
export async function checkRegistrationStatus(): Promise<RegistrationStatus | null> {
  try {
    console.log('🔍 Checking registration status...');
    const supabase = createClient();

    const { data, error } = await supabase
      .rpc('can_register_new_user')
      .single();

    if (error) {
      console.error('❌ Error checking registration status:', error);
      return null;
    }

    console.log('✅ Registration status:', data);
    return data as RegistrationStatus;
  } catch (error) {
    console.error('❌ Exception checking registration:', error);
    return null;
  }
}

/**
 * Add email to waitlist
 */
export async function joinWaitlist(data: {
  email: string;
  name?: string;
  reason?: string;
  referral_code?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('waitlist')
      .insert([{
        email: data.email,
        name: data.name || null,
        reason: data.reason || null,
        referral_code: data.referral_code || null,
      }]);

    if (error) {
      // Handle duplicate email
      if (error.code === '23505') {
        return { success: false, error: 'This email is already on the waitlist.' };
      }
      console.error('Error joining waitlist:', error);
      return { success: false, error: 'Failed to join waitlist. Please try again.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception joining waitlist:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Get current active user count (for admin)
 */
export async function getActiveUserCount(): Promise<number | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .rpc('get_active_user_count');

    if (error) {
      console.error('Error getting user count:', error);
      return null;
    }

    return data as number;
  } catch (error) {
    console.error('Exception getting user count:', error);
    return null;
  }
}
