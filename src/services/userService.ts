import supabase from '../supabase';
import type { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  AuditLog, 
  UserFilters, 
  BulkActionData,
  Department,
  ReportingManager 
} from '../types/userManagement';

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class UserService {
  // Get users with pagination and filters
  async getUsers(
    page: number = 1, 
    pageSize: number = 10, 
    filters?: UserFilters
  ): Promise<PaginatedResponse<User>> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply filters
      if (filters?.search) {
        const searchTerm = filters.search.trim();
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (filters?.role && filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }

      if (filters?.department && filters.department !== 'all') {
        query = query.eq('department', filters.department);
      }

      if (filters?.status !== undefined && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: data || [],
        count: totalCount,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      console.error('Error in getUsers:', error);
      throw error;
    }
  }

  // Get all users for dropdown/select components (without pagination)
  async getAllUsers(filters?: Omit<UserFilters, 'search'>): Promise<User[]> {
    try {
      let query = supabase
        .from('users')
        .select('id, name, email, role, department, status')
        .eq('status', true)
        .order('name', { ascending: true });

      if (filters?.role && filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }

      if (filters?.department && filters.department !== 'all') {
        query = query.eq('department', filters.department);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching all users:', error);
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  }

  // Create new user
  async createUser(userData: CreateUserData, adminUserId: string, photoFile?: File): Promise<User> {
    try {
      let photoUrl = userData.photo_url;
      
      // If photo file is provided, try to upload it first
      if (photoFile) {
        try {
          const tempUserId = `temp-${Date.now()}`;
          photoUrl = await this.uploadUserPhoto(photoFile, tempUserId);
        } catch (photoError) {
          console.warn('Photo upload failed, continuing without photo:', photoError);
          // Continue without photo - user will still be created
          photoUrl = undefined;
        }
      }

      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...userData,
          photo_url: photoUrl,
          created_by: adminUserId,
          updated_by: adminUserId
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        throw new Error(error.message);
      }

      // Log the action
      await this.logAuditAction('CREATE_USER', adminUserId, data.id, {
        action: 'User created',
        userData
      });

      return data;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  // Update user
  async updateUser(id: string, userData: UpdateUserData, adminUserId: string, photoFile?: File): Promise<User> {
    try {
      // Get old values for audit log
      const oldUser = await this.getUserById(id);
      
      let photoUrl = userData.photo_url;
      
      // If photo file is provided, try to upload it first
      if (photoFile) {
        try {
          photoUrl = await this.uploadUserPhoto(photoFile, id);
        } catch (photoError) {
          console.warn('Photo upload failed, keeping existing photo:', photoError);
          // Keep existing photo URL if upload fails
          photoUrl = oldUser?.photo_url;
        }
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          ...userData,
          photo_url: photoUrl,
          updated_by: adminUserId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw new Error(error.message);
      }

      // Log the action
      await this.logAuditAction('UPDATE_USER', adminUserId, id, {
        action: 'User updated',
        oldValues: oldUser,
        newValues: data
      });

      return data;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }

  // Soft delete user
  async deleteUser(id: string, adminUserId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status: false,
          updated_by: adminUserId
        })
        .eq('id', id);

      if (error) {
        console.error('Error deleting user:', error);
        throw new Error(error.message);
      }

      // Log the action
      await this.logAuditAction('DELETE_USER', adminUserId, id, {
        action: 'User soft deleted'
      });
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }

  // Bulk operations
  async bulkUpdateUsers(bulkData: BulkActionData, adminUserId: string): Promise<void> {
    try {
      const { userIds, action, value } = bulkData;
      
      let updateData: any = { updated_by: adminUserId };

      switch (action) {
        case 'activate':
          updateData.status = true;
          break;
        case 'deactivate':
          updateData.status = false;
          break;
        case 'changeRole':
          updateData.role = value;
          break;
        case 'changeDepartment':
          updateData.department = value;
          break;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .in('id', userIds);

      if (error) {
        console.error('Error in bulk update:', error);
        throw new Error(error.message);
      }

      // Log the bulk action
      await this.logAuditAction('BULK_UPDATE', adminUserId, undefined, {
        action: `Bulk ${action}`,
        userIds,
        value
      });
    } catch (error) {
      console.error('Error in bulkUpdateUsers:', error);
      throw error;
    }
  }

  // Get departments with user counts
  async getDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('department')
        .not('department', 'is', null)
        .eq('status', true);

      if (error) {
        console.error('Error fetching departments:', error);
        throw new Error(`Failed to fetch departments: ${error.message}`);
      }

      // Get unique departments and count users
      const departmentCounts: Record<string, number> = {};
      data.forEach(item => {
        departmentCounts[item.department] = (departmentCounts[item.department] || 0) + 1;
      });

      return Object.entries(departmentCounts).map(([name, count], index) => ({
        id: index.toString(),
        name,
        description: `${count} active users`
      }));
    } catch (error) {
      console.error('Error in getDepartments:', error);
      throw error;
    }
  }

  // Get reporting managers (HODs and Associates)
  async getReportingManagers(): Promise<ReportingManager[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role, department')
        .in('role', ['HOD', 'Associate'])
        .eq('status', true)
        .order('name');

      if (error) {
        console.error('Error fetching reporting managers:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getReportingManagers:', error);
      throw error;
    }
  }

  // Get audit logs with pagination
  async getAuditLogs(
    page: number = 1, 
    pageSize: number = 50, 
    targetUserId?: string
  ): Promise<PaginatedResponse<AuditLog & { admin_name?: string; target_name?: string }>> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          admin_users!audit_logs_admin_user_fkey(name),
          users!audit_logs_target_user_fkey(name)
        `, { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(from, to);

      if (targetUserId) {
        query = query.eq('target_user', targetUserId);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }

      const transformedData = (data || []).map(log => ({
        ...log,
        admin_name: log.admin_users?.name,
        target_name: log.users?.name
      }));

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: transformedData,
        count: totalCount,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      console.error('Error in getAuditLogs:', error);
      throw error;
    }
  }

  // Log audit action
  private async logAuditAction(
    action: string, 
    adminUserId: string, 
    targetUserId?: string, 
    details?: any
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          action,
          admin_user: adminUserId,
          target_user: targetUserId,
          details,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw error for audit logging failures
    }
  }

  // Export users to CSV
  async exportUsersToCSV(filters?: UserFilters): Promise<string> {
    try {
      const users = await this.getUsers(filters);
      
      const headers = ['Name', 'Email', 'Role', 'Department', 'Reporting Manager', 'Status', 'Last Login', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...users.map(user => [
          user.name,
          user.email,
          user.role,
          user.department,
          user.reporting_manager || '',
          user.status ? 'Active' : 'Inactive',
          user.last_login ? new Date(user.last_login).toLocaleDateString() : '',
          new Date(user.created_at).toLocaleDateString()
        ].join(','))
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting users to CSV:', error);
      throw error;
    }
  }

  // Upload user photo
  async uploadUserPhoto(file: File, userId: string): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      
      // First, try to create the bucket if it doesn't exist
      try {
        const { error: bucketError } = await supabase.storage
          .createBucket('user-photos', {
            public: true,
            allowedMimeTypes: ['image/*'],
            fileSizeLimit: 5242880 // 5MB limit
          });
        
        if (bucketError && !bucketError.message.includes('already exists')) {
          console.warn('Bucket creation warning:', bucketError);
        }
      } catch (bucketCreateError) {
        console.warn('Bucket creation failed, trying to use existing:', bucketCreateError);
      }

      // Now try to upload the file
      const { error } = await supabase.storage
        .from('user-photos')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading photo:', error);
        throw new Error(error.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadUserPhoto:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    recentUsers: number;
    departmentStats: Record<string, number>;
    roleStats: Record<string, number>;
  }> {
    try {
      const [totalResult, statusResult, recentResult, departmentResult, roleResult] = await Promise.all([
        // Total users count
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true }),
        
        // Status breakdown
        supabase
          .from('users')
          .select('status', { count: 'exact' })
          .eq('status', true),
        
        // Recent users (last 30 days)
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Department breakdown
        supabase
          .from('users')
          .select('department')
          .eq('status', true),
        
        // Role breakdown
        supabase
          .from('users')
          .select('role')
          .eq('status', true)
      ]);

      const totalUsers = totalResult.count || 0;
      const activeUsers = statusResult.count || 0;
      const recentUsers = recentResult.count || 0;
      
      // Calculate department stats
      const departmentStats: Record<string, number> = {};
      departmentResult.data?.forEach(item => {
        departmentStats[item.department] = (departmentStats[item.department] || 0) + 1;
      });

      // Calculate role stats
      const roleStats: Record<string, number> = {};
      roleResult.data?.forEach(item => {
        roleStats[item.role] = (roleStats[item.role] || 0) + 1;
      });

      return {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        recentUsers,
        departmentStats,
        roleStats
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      throw error;
    }
  }

  // Search users with advanced filtering
  async searchUsers(
    searchTerm: string,
    limit: number = 10
  ): Promise<User[]> {
    try {
      if (!searchTerm.trim()) {
        return [];
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, department, status, photo_url')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .eq('status', true)
        .order('name')
        .limit(limit);

      if (error) {
        console.error('Error searching users:', error);
        throw new Error(`Failed to search users: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchUsers:', error);
      throw error;
    }
  }

  // Import users from CSV
  async importUsersFromCSV(csvData: string, adminUserId: string): Promise<{ success: number; errors: string[] }> {
    try {
      const lines = csvData.split('\n').filter(line => line.trim());
      // const headers = lines[0].split(','); // Reserved for future field mapping
      const users = lines.slice(1);
      
      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < users.length; i++) {
        try {
          const values = users[i].split(',');
          const userData: CreateUserData = {
            name: values[0]?.trim() || '',
            email: values[1]?.trim() || '',
            role: (values[2]?.trim() as 'HOD' | 'Associate' | 'Crew') || 'Crew',
            department: values[3]?.trim() || '',
            reporting_manager: values[4]?.trim() || undefined,
            status: values[5]?.trim().toLowerCase() === 'active'
          };

          // Validate required fields
          if (!userData.name || !userData.email || !userData.department) {
            errors.push(`Row ${i + 2}: Missing required fields`);
            continue;
          }

          // Validate role
          if (!['Admin', 'HOD', 'Associate', 'Crew'].includes(userData.role)) {
            errors.push(`Row ${i + 2}: Invalid role ${userData.role}`);
            continue;
          }

          await this.createUser(userData, adminUserId);
          successCount++;
        } catch (error) {
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { success: successCount, errors };
    } catch (error) {
      console.error('Error importing users from CSV:', error);
      throw error;
    }
  }
}

export default new UserService();
