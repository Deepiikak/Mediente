// Project status enum
export type ProjectStatusType = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

// Task status enum (Jira-style)
export type TaskStatusType = 'pending' | 'ongoing' | 'completed' | 'escalated' | 'blocked' | 'cancelled';

// Task category enum (from templates)
export type TaskCategoryType = 'pre_production' | 'production' | 'post_production' | 'administrative' | 'creative' | 'technical' | 'logistics';

// Base project type
export interface Project {
  project_id: string;
  project_name: string;
  project_description: string | null;
  project_status: ProjectStatusType;
  project_start_date: string | null;
  project_end_date: string | null;
  template_id: string;
  template_snapshot: Record<string, unknown>; // JSONB data
  is_archived: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Project with statistics
export interface ProjectWithStats extends Project {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  escalated_tasks: number;
  assigned_roles: number;
  unassigned_roles: number;
}

// Project role (updated for crew model)
export interface ProjectRole {
  project_role_id: string;
  project_id: string;
  role_id: string;
  role_name: string;
  department_id: string;
  department_name: string;
  required_count: number;
  filled_count: number;
  is_active: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Project crew member
export interface ProjectCrew {
  project_crew_id: string;
  project_id: string;
  user_id: string;
  role_id: string;
  role_name: string;
  department_id: string;
  department_name: string;
  is_lead: boolean;
  is_active: boolean;
  joined_date: string | null;
  left_date: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Project crew member with user details
export interface ProjectCrewWithUser extends ProjectCrew {
  user_name: string;
  user_email: string;
  user_first_name?: string;
  user_last_name?: string;
  user_phone?: string;
  task_count: number;
  completed_task_count: number;
}

// Project role with crew details
export interface ProjectRoleWithCrew extends ProjectRole {
  crew_members: ProjectCrewWithUser[];
  task_count: number;
  completed_task_count: number;
}

// Legacy: Project role with user details (for backward compatibility)
export interface ProjectRoleWithUser extends ProjectRole {
  assigned_user_id?: string | null;
  assigned_user_name?: string;
  assigned_user_email?: string;
  task_count: number;
  completed_task_count: number;
}

// Project task (updated for crew model)
export interface ProjectTask {
  project_task_id: string;
  project_id: string;
  task_name: string;
  task_description: string | null;
  phase_name: string;
  phase_order: number;
  step_name: string;
  step_order: number;
  task_order: number;
  estimated_hours: number | null;
  actual_hours: number | null;
  assigned_project_role_id: string | null;
  assigned_project_crew_id: string | null;
  parent_task_id: string | null;
  task_status: TaskStatusType;
  category: TaskCategoryType | null;
  checklist_items: Array<{ text: string; completed: boolean }>;
  expected_start_time: string | null;
  expected_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  is_critical: boolean;
  escalation_reason: string | null;
  escalated_at: string | null;
  file_attachments: Array<{ name: string; url: string; type: string; size: number }>;
  comments: Array<{ text: string; author: string; created_at: string }>;
  started_at: string | null; // Legacy field
  completed_at: string | null; // Legacy field
  is_archived: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Project task with crew and role details
export interface ProjectTaskWithCrew extends ProjectTask {
  assigned_crew_member?: ProjectCrewWithUser;
  assigned_role_name?: string;
  assigned_department_name?: string;
}

// Legacy interface for backwards compatibility
export interface ProjectTaskWithUser extends ProjectTask {
  assigned_user_name?: string;
  assigned_user_email?: string;
  assigned_role_name?: string;
  assigned_department_name?: string;
}

// Request types
export interface CreateProjectRequest {
  project_name: string;
  project_description?: string;
  template_id: string;
  project_start_date?: string;
}

export interface UpdateProjectRequest {
  project_name?: string;
  project_description?: string;
  project_status?: ProjectStatusType;
  project_start_date?: string;
  project_end_date?: string;
}

export interface AssignUserToRoleRequest {
  project_role_id: string;
  user_id: string;
}

// New crew management request types
export interface AddCrewMemberRequest {
  project_id: string;
  user_id?: string; // If user exists
  role_id: string;
  is_lead?: boolean;
  notes?: string;
  // For new users
  user_email?: string;
  user_name?: string;
  user_first_name?: string;
  user_last_name?: string;
  user_phone?: string;
}

export interface UpdateCrewMemberRequest {
  project_crew_id: string;
  is_lead?: boolean;
  notes?: string;
}

export interface AssignTaskToCrewRequest {
  project_task_id: string;
  project_crew_id: string;
}

export interface StartTaskCrewRequest {
  project_task_id: string;
  project_crew_id?: string;
}

export interface UpdateProjectTaskRequest {
  task_name?: string;
  task_description?: string;
  estimated_hours?: number;
  checklist_items?: Array<{ text: string; completed: boolean }>;
}

export interface StartTaskRequest {
  project_task_id: string;
  user_id?: string;
}

export interface CompleteTaskRequest {
  project_task_id: string;
}

// Filter types
export interface ProjectFilters {
  is_archived?: boolean;
  search?: string;
  project_status?: ProjectStatusType;
  template_id?: string;
  created_by?: string;
  start_date_from?: string;
  start_date_to?: string;
}

export interface ProjectTaskFilters {
  is_archived?: boolean;
  search?: string;
  task_status?: TaskStatusType;
  assigned_crew_id?: string | null;
  assigned_role_id?: string;
  category?: TaskCategoryType;
  phase_name?: string;
}

export interface ProjectRoleFilters {
  role_id?: string;
  department_id?: string;
  is_active?: boolean;
}

export interface ProjectCrewFilters {
  role_id?: string;
  department_id?: string;
  user_id?: string;
  is_lead?: boolean;
  is_active?: boolean;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PaginatedProjectsResponse = PaginatedResponse<Project>;
export type PaginatedProjectTasksResponse = PaginatedResponse<ProjectTask>;
export type PaginatedProjectRolesResponse = PaginatedResponse<ProjectRole>;
export type PaginatedProjectCrewResponse = PaginatedResponse<ProjectCrew>;

// Re-export for backwards compatibility
export type ProjectType = Project;
