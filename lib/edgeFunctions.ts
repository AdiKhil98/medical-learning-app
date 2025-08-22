import { supabase } from './supabase';

// Hardcode the Supabase URL for now to ensure it works
const SUPABASE_URL = 'https://pavjavrijaihnwbydfrk.supabase.co';

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
  };
};

// CORS Proxy function calls
export const corsProxy = {
  async get(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${SUPABASE_URL}/functions/v1/cors-proxy${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const headers = await getAuthHeaders();
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`CORS Proxy error: ${response.statusText}`);
    }

    return await response.json();
  },

  async post(endpoint: string, data: any) {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/cors-proxy${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`CORS Proxy error: ${response.statusText}`);
    }

    return await response.json();
  }
};

// Daily notifications function calls
export const dailyNotifications = {
  async sendDaily() {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-daily-notifications`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'send-daily-notifications' }),
    });

    if (!response.ok) {
      throw new Error(`Daily notifications error: ${response.statusText}`);
    }

    return await response.json();
  },

  async sendTest(pushToken: string, title?: string, body?: string) {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-daily-notifications`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        action: 'test-notification',
        push_token: pushToken,
        title,
        body
      }),
    });

    if (!response.ok) {
      throw new Error(`Test notification error: ${response.statusText}`);
    }

    return await response.json();
  }
};

// Admin user management function calls
export const adminUserManagement = {
  async makeUserAdmin(userId: string) {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-user-management`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        action: 'make-user-admin',
        user_id: userId
      }),
    });

    if (!response.ok) {
      throw new Error(`Admin management error: ${response.statusText}`);
    }

    return await response.json();
  },

  async fixUserProfile(userId: string) {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-user-management`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        action: 'fix-user-profile',
        user_id: userId
      }),
    });

    if (!response.ok) {
      throw new Error(`Fix user profile error: ${response.statusText}`);
    }

    return await response.json();
  },

  async updateNotificationSettings(userId: string, settings: {
    push_notifications_enabled: boolean;
    sound_vibration_enabled: boolean;
    push_token?: string;
  }) {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-user-management`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        action: 'update-notification-settings',
        user_id: userId,
        data: settings
      }),
    });

    if (!response.ok) {
      throw new Error(`Update notification settings error: ${response.statusText}`);
    }

    return await response.json();
  },

  async runDatabaseMigration() {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-user-management`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        action: 'run-database-migration'
      }),
    });

    if (!response.ok) {
      throw new Error(`Database migration error: ${response.statusText}`);
    }

    return await response.json();
  }
};