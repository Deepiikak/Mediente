import supabase from '../supabase';
import type { AdminUser, LoginCredentials, LoginResponse, PasswordResetResponse, ResetPasswordData } from '../types/auth';

class AuthService {
  // Admin login with email and password
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // First, authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) {
        return {
          user: null as any,
          session: null,
          error: authError.message
        };
      }

      // Then check if the user exists in admin_users table
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', credentials.email)
        .eq('is_active', true)
        .single();

      if (adminError || !adminUser) {
        // Sign out the user if they're not an admin
        await supabase.auth.signOut();
        return {
          user: null as any,
          session: null,
          error: 'Admin access only. Unauthorized user.'
        };
      }

      // Update last login timestamp
      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', adminUser.id);

      return {
        user: adminUser as AdminUser,
        session: authData.session,
        error: undefined
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        user: null as any,
        session: null,
        error: 'An unexpected error occurred during login'
      };
    }
  }

  // Logout admin user
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw new Error(error.message);
    }
  }

  // Get current admin user session
  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (error || !adminUser) {
        return null;
      }

      return adminUser as AdminUser;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Reset password
  async resetPassword(data: ResetPasswordData): Promise<PasswordResetResponse> {
    try {
      // Check if email exists in admin_users table
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', data.email)
        .eq('is_active', true)
        .single();

      if (adminError || !adminUser) {
        return {
          success: false,
          message: 'Email not found in admin records',
          error: 'Admin email not found'
        };
      }

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });

      if (error) {
        return {
          success: false,
          message: 'Failed to send reset email',
          error: error.message
        };
      }

      return {
        success: true,
        message: 'Password reset link has been sent to your email'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred',
        error: 'Unexpected error'
      };
    }
  }

  // Log failed login attempt
  async logFailedAttempt(email: string, ipAddress?: string): Promise<void> {
    try {
      await supabase
        .from('login_attempts')
        .insert({
          email,
          ip_address: ipAddress || 'unknown',
          success: false,
          attempted_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log login attempt:', error);
    }
  }

  // Check failed login attempts count
  async getFailedAttemptsCount(email: string): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('login_attempts')
        .select('id')
        .eq('email', email)
        .eq('success', false)
        .gte('attempted_at', oneHourAgo);

      if (error) {
        console.error('Failed to get login attempts:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Failed to get login attempts count:', error);
      return 0;
    }
  }
}

export default new AuthService();