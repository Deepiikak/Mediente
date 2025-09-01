import supabase from '../supabase';
import type {
  Project,
  ProjectTask,
  ProjectWithStats,
  ProjectTaskWithUser,
  ProjectRoleWithUser,
  CreateProjectRequest,
  UpdateProjectRequest,
  UpdateProjectTaskRequest,
  StartTaskRequest,
  CompleteTaskRequest,
  ProjectFilters,
  ProjectTaskFilters,
  ProjectRoleFilters,
  PaginationParams,
  PaginatedProjectsResponse,
  PaginatedProjectTasksResponse,
  PaginatedProjectRolesResponse,
  TaskStatusType
} from '../types/project';

// Project CRUD Operations
export const projectService = {
  // Get all projects with pagination and filters
  async getPaginated(
    pagination: PaginationParams = {},
    filters: ProjectFilters = {}
  ): Promise<PaginatedProjectsResponse> {
    const { page = 1, pageSize = 20 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false); // Default to non-archived
    }

    if (filters.search) {
      query = query.or(`project_name.ilike.%${filters.search}%,project_description.ilike.%${filters.search}%`);
    }

    if (filters.project_status) {
      query = query.eq('project_status', filters.project_status);
    }

    if (filters.template_id) {
      query = query.eq('template_id', filters.template_id);
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    if (filters.start_date_from) {
      query = query.gte('project_start_date', filters.start_date_from);
    }

    if (filters.start_date_to) {
      query = query.lte('project_start_date', filters.start_date_to);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
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

  // Get project by ID
  async getById(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Get project with statistics
  async getByIdWithStats(projectId: string): Promise<ProjectWithStats | null> {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (projectError) {
      if (projectError.code === 'PGRST116') return null;
      throw projectError;
    }

    // Get task statistics
    const { data: taskStats, error: taskStatsError } = await supabase
      .from('project_tasks')
      .select('task_status')
      .eq('project_id', projectId)
      .eq('is_archived', false);

    if (taskStatsError) throw taskStatsError;

    // Get role statistics (updated for crew model)
    const { data: roleStats, error: roleStatsError } = await supabase
      .from('project_roles')
      .select('required_count, filled_count')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (roleStatsError) throw roleStatsError;

    const tasks = taskStats || [];
    const roles = roleStats || [];

    return {
      ...project,
      total_tasks: tasks.length,
      completed_tasks: tasks.filter(t => t.task_status === 'completed').length,
      in_progress_tasks: tasks.filter(t => t.task_status === 'ongoing').length,
      pending_tasks: tasks.filter(t => t.task_status === 'pending').length,
      escalated_tasks: tasks.filter(t => t.task_status === 'escalated').length,
      assigned_roles: roles.filter(r => r.filled_count > 0).length,
      unassigned_roles: roles.filter(r => r.filled_count === 0).length
    };
  },

  // Create project from template
  async createFromTemplate(request: CreateProjectRequest): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .rpc('create_project_from_template', {
        p_project_name: request.project_name,
        p_project_description: request.project_description || null,
        p_template_id: request.template_id,
        p_project_start_date: request.project_start_date || null,
        p_created_by: user.email || user.id
      });

    if (error) throw error;

    // Get the created project
    const project = await this.getById(data);
    if (!project) throw new Error('Failed to retrieve created project');
    
    // Initialize project tasks with runtime engine
    try {
      await projectTaskService.initializeProjectTasks(data);
    } catch (initError) {
      console.warn('Failed to initialize project tasks:', initError);
      // Don't fail project creation if automation fails
    }
    
    return project;
  },

  // Update project
  async update(projectId: string, updates: UpdateProjectRequest): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_by: user.email || user.id
      })
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete project (archive)
  async delete(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('projects')
      .update({
        is_archived: true,
        updated_by: user.email || user.id
      })
      .eq('project_id', projectId);

    if (error) throw error;
  }
};

// Project Roles Operations
export const projectRoleService = {
  // Get roles for a project with pagination
  async getByProjectId(
    projectId: string,
    pagination: PaginationParams = {},
    filters: ProjectRoleFilters = {}
  ): Promise<PaginatedProjectRolesResponse> {
    const { page = 1, pageSize = 50 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('project_roles')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    // Apply filters
    if (filters.role_id) {
      query = query.eq('role_id', filters.role_id);
    }

    if (filters.department_id) {
      query = query.eq('department_id', filters.department_id);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    } else {
      query = query.eq('is_active', true);
    }

    const { data, error, count } = await query
      .order('role_name')
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

  // Get roles with basic information (for legacy compatibility)
  async getByProjectIdWithDetails(projectId: string): Promise<ProjectRoleWithUser[]> {
    const { data, error } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('department_name')
      .order('role_name');

    if (error) throw error;

    // Get task counts for each role
    const rolesWithCounts = await Promise.all(
      (data || []).map(async (role) => {
        const { data: taskCounts, error: taskError } = await supabase
          .from('project_tasks')
          .select('task_status')
          .eq('project_id', projectId)
          .eq('assigned_project_role_id', role.project_role_id)
          .eq('is_archived', false);

        if (taskError) throw taskError;

        const tasks = taskCounts || [];

        // For legacy compatibility, show first crew member as "assigned user"
        const { data: firstCrew } = await supabase
          .from('project_crew')
          .select('user_id, users:user_id(name, email)')
          .eq('project_id', projectId)
          .eq('role_id', role.role_id)
          .eq('is_active', true)
          .order('is_lead', { ascending: false })
          .limit(1);

        const firstCrewMember = firstCrew?.[0];

        return {
          ...role,
          assigned_user_id: firstCrewMember?.user_id || null,
          assigned_user_name: firstCrewMember?.users?.[0]?.name,
          assigned_user_email: firstCrewMember?.users?.[0]?.email,
          task_count: tasks.length,
          completed_task_count: tasks.filter(t => t.task_status === 'completed').length
        };
      })
    );

    return rolesWithCounts;
  },

  // Legacy: Assign user to project role (deprecated - use projectCrewService instead)
  async assignUser(): Promise<void> {
    throw new Error('This method is deprecated. Use projectCrewService.addCrewMember() instead.');
  },

  // Legacy: Unassign user from project role (deprecated - use projectCrewService instead)
  async unassignUser(): Promise<void> {
    throw new Error('This method is deprecated. Use projectCrewService.removeCrewMember() instead.');
  }
};

// Project Tasks Operations
export const projectTaskService = {
  // Get tasks for a project with pagination and filters
  async getByProjectId(
    projectId: string,
    pagination: PaginationParams = {},
    filters: ProjectTaskFilters = {}
  ): Promise<PaginatedProjectTasksResponse> {
    const { page = 1, pageSize = 50 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('project_tasks')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    // Apply filters
    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false);
    }

    if (filters.search) {
      query = query.or(`task_name.ilike.%${filters.search}%,task_description.ilike.%${filters.search}%`);
    }

    if (filters.task_status) {
      query = query.eq('task_status', filters.task_status);
    }

    if (filters.assigned_crew_id !== undefined) {
      if (filters.assigned_crew_id === null || filters.assigned_crew_id === '') {
        query = query.is('assigned_project_crew_id', null);
      } else {
        query = query.eq('assigned_project_crew_id', filters.assigned_crew_id);
      }
    }

    if (filters.assigned_role_id) {
      query = query.eq('assigned_role_id', filters.assigned_role_id);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.phase_name) {
      query = query.eq('phase_name', filters.phase_name);
    }

    const { data, error, count } = await query
      .order('phase_order')
      .order('step_order')
      .order('task_order')
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

  // Get tasks with crew and role information
  async getByProjectIdWithDetails(projectId: string): Promise<ProjectTaskWithUser[]> {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        project_crew:assigned_project_crew_id(
          user_id,
          role_name,
          department_name,
          users:user_id(name, email)
        ),
        project_roles:assigned_project_role_id(role_name, department_name)
      `)
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .order('phase_order')
      .order('step_order')
      .order('task_order');

    if (error) throw error;

    return (data || []).map(task => ({
      ...task,
      assigned_user_name: task.project_crew?.users?.name,
      assigned_user_email: task.project_crew?.users?.email,
      assigned_role_name: task.project_crew?.role_name || task.project_roles?.role_name,
      assigned_department_name: task.project_crew?.department_name || task.project_roles?.department_name
    }));
  },

  // Get task by ID
  async getById(taskId: string): Promise<ProjectTask | null> {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_task_id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Update task
  async update(taskId: string, updates: UpdateProjectTaskRequest): Promise<ProjectTask> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('project_tasks')
      .update({
        ...updates,
        updated_by: user.email || user.id
      })
      .eq('project_task_id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Start a task (updated for crew model)
  async startTask(request: StartTaskRequest): Promise<void> {
    const { error } = await supabase
      .rpc('start_project_task', {
        p_project_task_id: request.project_task_id,
        p_project_crew_id: null // Will auto-assign from available crew
      });

    if (error) throw error;
  },

  // Complete a task
  async completeTask(request: CompleteTaskRequest): Promise<void> {
    const { error } = await supabase
      .rpc('complete_project_task', {
        p_project_task_id: request.project_task_id
      });

    if (error) throw error;
  },

  // Get next available tasks for a user (updated for crew model)
  async getNextTasksForUser(userId: string, limit: number = 10): Promise<ProjectTaskWithUser[]> {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        projects!inner(project_name, project_status),
        project_crew:assigned_project_crew_id!inner(
          user_id,
          role_name,
          department_name
        )
      `)
      .eq('project_crew.user_id', userId)
      .eq('task_status', 'ready')
      .eq('is_archived', false)
      .eq('projects.project_status', 'active')
      .order('phase_order')
      .order('step_order')
      .order('task_order')
      .limit(limit);

    if (error) throw error;

    return (data || []).map(task => ({
      ...task,
      assigned_user_name: task.project_crew?.users?.name,
      assigned_user_email: task.project_crew?.users?.email,
      assigned_role_name: task.project_crew?.role_name,
      assigned_department_name: task.project_crew?.department_name
    }));
  },

  // Get task hierarchy (parent/child relationships)
  async getTaskHierarchy(projectId: string): Promise<ProjectTask[]> {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .order('phase_order')
      .order('step_order')
      .order('task_order');

    if (error) throw error;

    // Build hierarchy tree
    const tasks = data || [];
    const rootTasks: ProjectTask[] = [];
    const taskMap = new Map<string, ProjectTask & { children?: ProjectTask[] }>();

    // Create a map of all tasks
    tasks.forEach(task => {
      taskMap.set(task.project_task_id, { ...task, children: [] });
    });

    // Build hierarchy
    tasks.forEach(task => {
      const taskWithChildren = taskMap.get(task.project_task_id)!;
      if (task.parent_task_id) {
        const parent = taskMap.get(task.parent_task_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(taskWithChildren);
        }
      } else {
        rootTasks.push(taskWithChildren);
      }
    });

    return rootTasks;
  },

  // AUTOMATION FUNCTIONS

  // Auto-assign task with deadline calculation
  async autoAssignTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .rpc('auto_assign_task_with_deadline', {
        p_project_task_id: taskId
      });

    if (error) throw error;
  },

  // Check for escalated tasks
  async checkTaskEscalations(): Promise<void> {
    const { error } = await supabase
      .rpc('check_task_escalations');

    if (error) throw error;
  },

  // Update project status based on task statuses
  async updateProjectStatusFromTasks(projectId: string): Promise<void> {
    const { error } = await supabase
      .rpc('update_project_status_from_tasks', {
        p_project_id: projectId
      });

    if (error) throw error;
  },

  // Complete task with automation (triggers next tasks, assignments, etc.)
  async completeTaskWithAutomation(taskId: string): Promise<void> {
    const { error } = await supabase
      .rpc('complete_task_with_automation', {
        p_project_task_id: taskId
      });

    if (error) throw error;
  },

  // Run escalation checks for all active projects
  async runEscalationChecks(): Promise<void> {
    const { error } = await supabase
      .rpc('run_escalation_checks');

    if (error) throw error;
  },

  // Get ready tasks (no unmet dependencies, can be started)
  async getReadyTasks(projectId: string): Promise<ProjectTaskWithUser[]> {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        project_crew:assigned_project_crew_id(
          user_id,
          role_name,
          department_name,
          users:user_id(name, email, first_name, last_name)
        ),
        project_roles:assigned_project_role_id(role_name, department_name)
      `)
      .eq('project_id', projectId)
      .eq('task_status', 'pending')
      .eq('is_archived', false)
      .order('phase_order')
      .order('step_order')
      .order('task_order');

    if (error) throw error;

    return (data || []).map(task => ({
      ...task,
      assigned_user_name: task.project_crew?.users?.name || 
                          `${task.project_crew?.users?.first_name || ''} ${task.project_crew?.users?.last_name || ''}`.trim(),
      assigned_user_email: task.project_crew?.users?.email,
      assigned_role_name: task.project_crew?.role_name || task.project_roles?.role_name,
      assigned_department_name: task.project_crew?.department_name || task.project_roles?.department_name
    }));
  },

  // Get ongoing tasks (currently being worked on)
  async getOngoingTasks(projectId: string): Promise<ProjectTaskWithUser[]> {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        project_crew:assigned_project_crew_id(
          user_id,
          role_name,
          department_name,
          users:user_id(name, email, first_name, last_name)
        ),
        project_roles:assigned_project_role_id(role_name, department_name)
      `)
      .eq('project_id', projectId)
      .eq('task_status', 'ongoing')
      .eq('is_archived', false)
      .order('expected_end_time')
      .order('phase_order')
      .order('step_order')
      .order('task_order');

    if (error) throw error;

    return (data || []).map(task => ({
      ...task,
      assigned_user_name: task.project_crew?.users?.name || 
                          `${task.project_crew?.users?.first_name || ''} ${task.project_crew?.users?.last_name || ''}`.trim(),
      assigned_user_email: task.project_crew?.users?.email,
      assigned_role_name: task.project_crew?.role_name || task.project_roles?.role_name,
      assigned_department_name: task.project_crew?.department_name || task.project_roles?.department_name
    }));
  },

  // Get escalated tasks
  async getEscalatedTasks(projectId: string): Promise<ProjectTaskWithUser[]> {
    const { data, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        project_crew:assigned_project_crew_id(
          user_id,
          role_name,
          department_name,
          users:user_id(name, email, first_name, last_name)
        ),
        project_roles:assigned_project_role_id(role_name, department_name)
      `)
      .eq('project_id', projectId)
      .eq('task_status', 'escalated')
      .eq('is_archived', false)
      .order('escalated_at')
      .order('expected_end_time');

    if (error) throw error;

    return (data || []).map(task => ({
      ...task,
      assigned_user_name: task.project_crew?.users?.name || 
                          `${task.project_crew?.users?.first_name || ''} ${task.project_crew?.users?.last_name || ''}`.trim(),
      assigned_user_email: task.project_crew?.users?.email,
      assigned_role_name: task.project_crew?.role_name || task.project_roles?.role_name,
      assigned_department_name: task.project_crew?.department_name || task.project_roles?.department_name
    }));
  },

  // Start task with auto-assignment
  async startTaskWithAutomation(taskId: string): Promise<void> {
    // First check if task can be auto-assigned
    await this.autoAssignTask(taskId);
    
    // If no error, the task was auto-assigned and started
    // The database function handles the transition to 'ongoing' status
  },

  // Update task status manually (with automation triggers)
  async updateTaskStatus(taskId: string, newStatus: 'pending' | 'ongoing' | 'completed' | 'escalated'): Promise<void> {
    if (newStatus === 'completed') {
      // Use automation function for completion
      await this.completeTaskWithAutomation(taskId);
    } else if (newStatus === 'ongoing') {
      // Use automation function for starting
      await this.startTaskWithAutomation(taskId);
    } else {
      // Manual status update
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('project_tasks')
        .update({
          task_status: newStatus,
          updated_by: user.email || user.id,
          ...(newStatus === 'escalated' && {
            escalated_at: new Date().toISOString(),
            escalation_reason: 'Manually escalated'
          })
        })
        .eq('project_task_id', taskId);

      if (error) throw error;
    }
  },

  // Bulk operations for automation
  async runProjectAutomation(projectId: string): Promise<void> {
    try {
      // Run escalation checks
      await this.checkTaskEscalations();
      
      // Update project status based on task statuses
      await this.updateProjectStatusFromTasks(projectId);
      
    } catch (error) {
      console.error('Error running project automation:', error);
      throw error;
    }
  },

  // RUNTIME ENGINE FUNCTIONS

  // Compute ready set (tasks that can be started)
  async computeReadySet(projectId: string): Promise<Array<{
    project_task_id: string;
    task_name: string;
    phase_order: number;
    step_order: number;
    task_order: number;
    assigned_project_role_id: string;
    has_crew_assignment: boolean;
  }>> {
    const { data, error } = await supabase
      .rpc('compute_ready_set', {
        p_project_id: projectId
      });

    if (error) throw error;
    return data || [];
  },

  // Auto-start ready tasks with concurrency control
  async autoStartReadyTasks(projectId: string, maxConcurrent: number = 10): Promise<number> {
    const { data, error } = await supabase
      .rpc('auto_start_ready_tasks', {
        p_project_id: projectId,
        p_max_concurrent: maxConcurrent
      });

    if (error) throw error;
    return data || 0;
  },

  // Start task with smart assignment
  async startTaskWithAssignment(taskId: string): Promise<void> {
    const { error } = await supabase
      .rpc('start_task_with_assignment', {
        p_project_task_id: taskId
      });

    if (error) throw error;
  },

  // Complete task with flow triggering
  async completeTaskWithFlow(taskId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('complete_task_with_flow', {
        p_project_task_id: taskId
      });

    if (error) throw error;
    return data || 0;
  },

  // Run escalation cron job
  async runEscalationCron(): Promise<number> {
    const { data, error } = await supabase
      .rpc('escalation_cron');

    if (error) throw error;
    return data || 0;
  },

  // Initialize project tasks after creation
  async initializeProjectTasks(projectId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('initialize_project_tasks', {
        p_project_id: projectId
      });

    if (error) throw error;
    return data || 0;
  },

  // Refresh ready queue materialized view
  async refreshReadyQueue(): Promise<void> {
    const { error } = await supabase
      .rpc('refresh_ready_queue');

    if (error) throw error;
  },

  // Get actionable tasks with cursor pagination
  async getActionableTasks(
    projectId: string,
    cursor?: { expected_end?: string; id?: string },
    limit: number = 50
  ): Promise<Array<{
    project_task_id: string;
    task_name: string;
    task_status: string;
    phase_order: number;
    step_order: number;
    task_order: number;
    expected_end_time: string | null;
    assigned_crew_member_name: string | null;
    is_critical: boolean;
    has_next_page: boolean;
  }>> {
    const { data, error } = await supabase
      .rpc('get_actionable_tasks', {
        p_project_id: projectId,
        p_cursor_expected_end: cursor?.expected_end || null,
        p_cursor_id: cursor?.id || null,
        p_limit: limit
      });

    if (error) throw error;
    return data || [];
  },

  // Enhanced status update using runtime engine
  async updateTaskStatusWithEngine(taskId: string, newStatus: TaskStatusType): Promise<number> {
    if (newStatus === 'completed') {
      // Use flow-aware completion
      return await this.completeTaskWithFlow(taskId);
    } else if (newStatus === 'ongoing') {
      // Use smart assignment
      await this.startTaskWithAssignment(taskId);
      return 0;
    } else {
      // Manual status update
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData: Record<string, unknown> = {
        task_status: newStatus,
        updated_by: user.email || user.id
      };

      // Special handling for different status transitions
      if (newStatus === 'escalated') {
        updateData.escalated_at = new Date().toISOString();
        updateData.escalation_reason = 'Manually escalated';
      } else if (newStatus === 'blocked') {
        updateData.escalation_reason = 'Manually blocked';
      } else if (newStatus === 'cancelled') {
        updateData.actual_end_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('project_tasks')
        .update(updateData)
        .eq('project_task_id', taskId);

      if (error) throw error;
      return 0;
    }
  },

  // Enhanced project automation with runtime engine
  async runFullProjectAutomation(projectId: string): Promise<{
    escalatedCount: number;
    startedCount: number;
    refreshed: boolean;
  }> {
    try {
      // Refresh ready queue
      await this.refreshReadyQueue();
      
      // Run escalation checks
      const escalatedCount = await this.runEscalationCron();
      
      // Auto-start ready tasks
      const startedCount = await this.autoStartReadyTasks(projectId);
      
      // Update project status
      await this.updateProjectStatusFromTasks(projectId);
      
      return {
        escalatedCount,
        startedCount,
        refreshed: true
      };
    } catch (error) {
      console.error('Error running full project automation:', error);
      throw error;
    }
  },

  // Get project task statistics for performance
  async getProjectTaskStats(projectId: string): Promise<{
    total: number;
    ready: number;
    ongoing: number;
    completed: number;
    escalated: number;
    unassigned: number;
  }> {
    const { data: tasks, error } = await supabase
      .from('project_tasks')
      .select('task_status, assigned_project_crew_id')
      .eq('project_id', projectId)
      .eq('is_archived', false);

    if (error) throw error;

    const stats = {
      total: tasks?.length || 0,
      ready: 0,
      ongoing: 0,
      completed: 0,
      escalated: 0,
      blocked: 0,
      cancelled: 0,
      unassigned: 0
    };

    tasks?.forEach(task => {
      switch (task.task_status) {
        case 'pending':
          stats.ready++;
          break;
        case 'ongoing':
          stats.ongoing++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'escalated':
          stats.escalated++;
          break;
        case 'blocked':
          stats.blocked++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }

      if (!task.assigned_project_crew_id) {
        stats.unassigned++;
      }
    });

    return stats;
  }
};