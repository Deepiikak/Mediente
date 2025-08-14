export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'HOD' | 'Associate' | 'Crew';
  department: string;
  reporting_manager?: string;
  status: boolean;
  photo_url?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: 'Admin' | 'HOD' | 'Associate' | 'Crew';
  department: string;
  reporting_manager?: string;
  status?: boolean;
  photo_url?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'Admin' | 'HOD' | 'Associate' | 'Crew';
  department?: string;
  reporting_manager?: string;
  status?: boolean;
  photo_url?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  admin_user: string;
  target_user?: string;
  timestamp: string;
  ip_address?: string;
  device_details?: string;
  details?: any;
  old_values?: any;
  new_values?: any;
}

export interface UserFilters {
  search?: string;
  role?: 'Admin' | 'HOD' | 'Associate' | 'Crew' | 'all';
  department?: string;
  status?: boolean | 'all';
  last_login?: string;
}

export interface BulkActionData {
  userIds: string[];
  action: 'activate' | 'deactivate' | 'changeRole' | 'changeDepartment';
  value?: string;
}

export interface UserTableRow {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'HOD' | 'Associate' | 'Crew';
  department: string;
  reporting_manager?: string;
  status: boolean;
  last_login?: string;
  created_at: string;
  selected?: boolean;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface ReportingManager {
  id: string;
  name: string;
  role: 'HOD' | 'Associate';
  department: string;
}

export interface UserManagementStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  hodCount: number;
  associateCount: number;
  crewCount: number;
}
