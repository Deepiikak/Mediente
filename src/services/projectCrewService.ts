import supabase from '../supabase';
import type {
  ProjectCrew,
  ProjectCrewWithUser,
  ProjectRoleWithCrew,
  AddCrewMemberRequest,
  UpdateCrewMemberRequest,
  AssignTaskToCrewRequest,
  StartTaskCrewRequest,
  ProjectCrewFilters,
  PaginationParams,
  PaginatedProjectCrewResponse
} from '../types/project';

// Project Crew Operations
export const projectCrewService = {
  // Get crew members for a project
  async getByProjectId(
    projectId: string,
    pagination: PaginationParams = {},
    filters: ProjectCrewFilters = {}
  ): Promise<PaginatedProjectCrewResponse> {
    const { page = 1, pageSize = 50 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('project_crew')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    // Apply filters
    if (filters.role_id) {
      query = query.eq('role_id', filters.role_id);
    }

    if (filters.department_id) {
      query = query.eq('department_id', filters.department_id);
    }

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.is_lead !== undefined) {
      query = query.eq('is_lead', filters.is_lead);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    } else {
      query = query.eq('is_active', true); // Default to active crew
    }

    const { data, error, count } = await query
      .order('department_name')
      .order('role_name')
      .order('is_lead', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages
    };
  },

  // Get crew members with user details and task counts
  async getByProjectIdWithDetails(projectId: string): Promise<ProjectCrewWithUser[]> {
    const { data, error } = await supabase
      .rpc('get_project_crew_with_details', {
        p_project_id: projectId
      });

    if (error) throw error;

    return data || [];
  },

  // Get roles with crew assignments
  async getRolesWithCrew(projectId: string): Promise<ProjectRoleWithCrew[]> {
    // Get project roles
    const { data: roles, error: rolesError } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('department_name')
      .order('role_name');

    if (rolesError) throw rolesError;

    // Get crew members for each role
    const rolesWithCrew = await Promise.all(
      (roles || []).map(async (role) => {
        const crewMembers = await this.getByProjectIdWithDetails(projectId);
        const roleCrewMembers = crewMembers.filter(
          crew => crew.role_id === role.role_id && crew.is_active
        );

        // Get task counts for this role
        const { data: taskCounts, error: taskError } = await supabase
          .from('project_tasks')
          .select('task_status')
          .eq('project_id', projectId)
          .eq('assigned_project_role_id', role.project_role_id)
          .eq('is_archived', false);

        if (taskError) throw taskError;

        const tasks = taskCounts || [];

        return {
          ...role,
          crew_members: roleCrewMembers,
          task_count: tasks.length,
          completed_task_count: tasks.filter(t => t.task_status === 'completed').length
        };
      })
    );

    return rolesWithCrew;
  },

  // Add crew member to project
  async addCrewMember(request: AddCrewMemberRequest): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let userId = request.user_id;

    // If no user_id provided, create or update user first
    if (!userId && request.user_email && request.user_name) {
      const { data: newUserId, error: userError } = await supabase
        .rpc('add_or_update_user_for_project', {
          p_email: request.user_email,
          p_name: request.user_name,
          p_first_name: request.user_first_name || null,
          p_last_name: request.user_last_name || null,
          p_phone: request.user_phone || null,
          p_created_by: user.email || user.id
        });

      if (userError) throw userError;
      userId = newUserId;
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Add crew member to project
    const { data, error } = await supabase
      .rpc('add_crew_member_to_project', {
        p_project_id: request.project_id,
        p_user_id: userId,
        p_role_id: request.role_id,
        p_is_lead: request.is_lead || false,
        p_notes: request.notes || null,
        p_created_by: user.email || user.id
      });

    if (error) throw error;
    return data;
  },

  // Remove crew member from project
  async removeCrewMember(projectCrewId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .rpc('remove_crew_member_from_project', {
        p_project_crew_id: projectCrewId,
        p_updated_by: user.email || user.id
      });

    if (error) throw error;
  },

  // Update crew member
  async updateCrewMember(request: UpdateCrewMemberRequest): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('project_crew')
      .update({
        is_lead: request.is_lead,
        notes: request.notes,
        updated_by: user.email || user.id
      })
      .eq('project_crew_id', request.project_crew_id);

    if (error) throw error;
  },

  // Assign task to crew member
  async assignTaskToCrew(request: AssignTaskToCrewRequest): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .rpc('assign_task_to_crew_member', {
        p_project_task_id: request.project_task_id,
        p_project_crew_id: request.project_crew_id,
        p_updated_by: user.email || user.id
      });

    if (error) throw error;
  },

  // Start task with crew member
  async startTaskWithCrew(request: StartTaskCrewRequest): Promise<void> {
    const { error } = await supabase
      .rpc('start_project_task_crew', {
        p_project_task_id: request.project_task_id,
        p_project_crew_id: request.project_crew_id || null
      });

    if (error) throw error;
  },

  // Get available users for a project (not already in the project)
  async getAvailableUsers(projectId: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  }>> {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, first_name, last_name, phone')
      .eq('status', true)
      .eq('employment_status', 'active')
      .not('id', 'in', `(
        select user_id 
        from project_crew 
        where project_id = '${projectId}' 
        and is_active = true
      )`);

    if (error) throw error;
    return data || [];
  },

  // Search users by email/name for adding to project
  async searchUsers(searchTerm: string, limit: number = 20): Promise<Array<{
    id: string;
    name: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  }>> {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, first_name, last_name, phone')
      .eq('status', true)
      .eq('employment_status', 'active')
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
};
