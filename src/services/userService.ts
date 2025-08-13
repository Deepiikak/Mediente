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

class UserService {
  // Get all users with optional filters
  async getUsers(filters?: UserFilters): Promise<User[]> {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
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

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUsers:', error);
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

  // Get departments
  async getDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('department')
        .not('department', 'is', null);

      if (error) {
        console.error('Error fetching departments:', error);
        throw new Error(error.message);
      }

      // Get unique departments
      const uniqueDepartments = [...new Set(data.map(item => item.department))];
      return uniqueDepartments.map((dept, index) => ({
        id: index.toString(),
        name: dept
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

  // Get audit logs
  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching audit logs:', error);
        throw new Error(error.message);
      }

      return data || [];
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
        const { data: bucketData, error: bucketError } = await supabase.storage
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
      const { data, error } = await supabase.storage
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

  // Import users from CSV
  async importUsersFromCSV(csvData: string, adminUserId: string): Promise<{ success: number; errors: string[] }> {
    try {
      const lines = csvData.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
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
