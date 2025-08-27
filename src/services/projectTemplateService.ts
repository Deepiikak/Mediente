import supabase from '../supabase';
import type {
  ProjectTemplate,
  TemplatePhase,
  PhaseStep,
  StepTask,
  CreateProjectTemplateRequest,
  UpdateProjectTemplateRequest,
  CreateTemplatePhaseRequest,
  UpdateTemplatePhaseRequest,
  CreatePhaseStepRequest,
  UpdatePhaseStepRequest,
  CreateStepTaskRequest,
  UpdateStepTaskRequest,
  PaginationParams,
  TemplateFilters,
  PhaseFilters,
  StepFilters,
  TaskFilters,
  PaginatedTemplatesResponse,
  PaginatedPhasesResponse,
  PaginatedStepsResponse,
  PaginatedTasksResponse,
  TemplateRole
} from '../types/templates';

// Project Templates CRUD
export const projectTemplateService = {
  // Get all templates (legacy - use getPaginated for production)
  async getAll(): Promise<ProjectTemplate[]> {
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('is_archived', false)
      .order('template_name')
      .limit(100); // Limit to prevent large queries

    if (error) throw error;
    return data || [];
  },

  // Get templates with pagination and filters
  async getPaginated(
    pagination: PaginationParams = {},
    filters: TemplateFilters = {}
  ): Promise<PaginatedTemplatesResponse> {
    const { page = 1, pageSize = 20 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('project_templates')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false); // Default to non-archived
    }

    if (filters.search) {
      query = query.or(`template_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    const { data, error, count } = await query
      .order('template_name')
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

  // Get template by ID
  async getById(templateId: string): Promise<ProjectTemplate | null> {
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Create template
  async create(template: CreateProjectTemplateRequest): Promise<ProjectTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('project_templates')
      .insert({
        ...template,
        created_by: user.email || user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update template
  async update(templateId: string, updates: UpdateProjectTemplateRequest): Promise<ProjectTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('project_templates')
      .update({
        ...updates,
        updated_by: user.email || user.id
      })
      .eq('template_id', templateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete template (archive)
  async delete(templateId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('project_templates')
      .update({
        is_archived: true,
        updated_by: user.email || user.id
      })
      .eq('template_id', templateId);

    if (error) throw error;
  }
};

// Template Phases CRUD
export const templatePhaseService = {
  // Get phases by template ID (legacy - use getPaginated for production)
  async getByTemplateId(templateId: string): Promise<TemplatePhase[]> {
    const { data, error } = await supabase
      .from('template_phases')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_archived', false)
      .order('phase_order')
      .limit(100); // Limit to prevent large queries

    if (error) throw error;
    return data || [];
  },

  // Get phases with pagination and filters
  async getPaginated(
    pagination: PaginationParams = {},
    filters: PhaseFilters = {}
  ): Promise<PaginatedPhasesResponse> {
    const { page = 1, pageSize = 20 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('template_phases')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.template_id) {
      query = query.eq('template_id', filters.template_id);
    }

    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false);
    }

    if (filters.search) {
      query = query.or(`phase_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('phase_order')
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

  // Get phase by ID
  async getById(phaseId: string): Promise<TemplatePhase | null> {
    const { data, error } = await supabase
      .from('template_phases')
      .select('*')
      .eq('phase_id', phaseId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Create phase
  async create(phase: CreateTemplatePhaseRequest): Promise<TemplatePhase> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next order number
    const { data: existingPhases } = await supabase
      .from('template_phases')
      .select('phase_order')
      .eq('template_id', phase.template_id)
      .order('phase_order', { ascending: false })
      .limit(1);

    const nextOrder = existingPhases && existingPhases.length > 0 
      ? existingPhases[0].phase_order + 1 
      : 1;

    const { data, error } = await supabase
      .from('template_phases')
      .insert({
        ...phase,
        phase_order: phase.phase_order || nextOrder,
        created_by: user.email || user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update phase
  async update(phaseId: string, updates: UpdateTemplatePhaseRequest): Promise<TemplatePhase> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('template_phases')
      .update({
        ...updates,
        updated_by: user.email || user.id
      })
      .eq('phase_id', phaseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete phase (archive)
  async delete(phaseId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('template_phases')
      .update({
        is_archived: true,
        updated_by: user.email || user.id
      })
      .eq('phase_id', phaseId);

    if (error) throw error;
  },

  // Reorder phases
  async reorder(templateId: string, phaseOrders: { phase_id: string; phase_order: number }[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    for (const { phase_id, phase_order } of phaseOrders) {
      const { error } = await supabase
        .from('template_phases')
        .update({
          phase_order,
          updated_by: user.email || user.id
        })
        .eq('phase_id', phase_id)
        .eq('template_id', templateId);

      if (error) throw error;
    }
  }
};

// Phase Steps CRUD
export const phaseStepService = {
  // Get steps by phase ID (legacy - use getPaginated for production)
  async getByPhaseId(phaseId: string): Promise<PhaseStep[]> {
    const { data, error } = await supabase
      .from('phase_steps')
      .select('*')
      .eq('phase_id', phaseId)
      .eq('is_archived', false)
      .order('step_order')
      .limit(100); // Limit to prevent large queries

    if (error) throw error;
    return data || [];
  },

  // Get steps with pagination and filters
  async getPaginated(
    pagination: PaginationParams = {},
    filters: StepFilters = {}
  ): Promise<PaginatedStepsResponse> {
    const { page = 1, pageSize = 20 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('phase_steps')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.phase_id) {
      query = query.eq('phase_id', filters.phase_id);
    }

    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false);
    }

    if (filters.search) {
      query = query.or(`step_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('step_order')
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

  // Get step by ID
  async getById(stepId: string): Promise<PhaseStep | null> {
    const { data, error } = await supabase
      .from('phase_steps')
      .select('*')
      .eq('step_id', stepId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Create step
  async create(step: CreatePhaseStepRequest): Promise<PhaseStep> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next order number
    const { data: existingSteps } = await supabase
      .from('phase_steps')
      .select('step_order')
      .eq('phase_id', step.phase_id)
      .order('step_order', { ascending: false })
      .limit(1);

    const nextOrder = existingSteps && existingSteps.length > 0 
      ? existingSteps[0].step_order + 1 
      : 1;

    const { data, error } = await supabase
      .from('phase_steps')
      .insert({
        ...step,
        step_order: step.step_order || nextOrder,
        created_by: user.email || user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update step
  async update(stepId: string, updates: UpdatePhaseStepRequest): Promise<PhaseStep> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('phase_steps')
      .update({
        ...updates,
        updated_by: user.email || user.id
      })
      .eq('step_id', stepId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete step (archive)
  async delete(stepId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('phase_steps')
      .update({
        is_archived: true,
        updated_by: user.email || user.id
      })
      .eq('step_id', stepId);

    if (error) throw error;
  },

  // Reorder steps
  async reorder(phaseId: string, stepOrders: { step_id: string; step_order: number }[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    for (const { step_id, step_order } of stepOrders) {
      const { error } = await supabase
        .from('phase_steps')
        .update({
          step_order,
          updated_by: user.email || user.id
        })
        .eq('step_id', step_id)
        .eq('phase_id', phaseId);

      if (error) throw error;
    }
  }
};

// Step Tasks CRUD
export const stepTaskService = {
  // Get tasks by step ID (legacy - use getPaginated for production)
  async getByStepId(stepId: string): Promise<StepTask[]> {
    const { data, error } = await supabase
      .from('step_tasks')
      .select('*')
      .eq('step_id', stepId)
      .eq('is_archived', false)
      .order('task_order')
      .limit(100); // Limit to prevent large queries

    if (error) throw error;
    return data || [];
  },

  // Get tasks with pagination and filters
  async getPaginated(
    pagination: PaginationParams = {},
    filters: TaskFilters = {}
  ): Promise<PaginatedTasksResponse> {
    const { page = 1, pageSize = 20 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('step_tasks')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.step_id) {
      query = query.eq('step_id', filters.step_id);
    }

    if (filters.assigned_role_id) {
      query = query.eq('assigned_role_id', filters.assigned_role_id);
    }

    if (filters.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived);
    } else {
      query = query.eq('is_archived', false);
    }

    if (filters.search) {
      query = query.or(`task_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
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

  // Get task by ID
  async getById(taskId: string): Promise<StepTask | null> {
    const { data, error } = await supabase
      .from('step_tasks')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Create task
  async create(task: CreateStepTaskRequest): Promise<StepTask> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next order number
    const { data: existingTasks } = await supabase
      .from('step_tasks')
      .select('task_order')
      .eq('step_id', task.step_id)
      .order('task_order', { ascending: false })
      .limit(1);

    const nextOrder = existingTasks && existingTasks.length > 0 
      ? existingTasks[0].task_order + 1 
      : 1;

    const { data, error } = await supabase
      .from('step_tasks')
      .insert({
        ...task,
        task_order: task.task_order || nextOrder,
        created_by: user.email || user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update task
  async update(taskId: string, updates: UpdateStepTaskRequest): Promise<StepTask> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('step_tasks')
      .update({
        ...updates,
        updated_by: user.email || user.id
      })
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete task (archive)
  async delete(taskId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('step_tasks')
      .update({
        is_archived: true,
        updated_by: user.email || user.id
      })
      .eq('task_id', taskId);

    if (error) throw error;
  },

  // Reorder tasks
  async reorder(stepId: string, taskOrders: { task_id: string; task_order: number }[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    for (const { task_id, task_order } of taskOrders) {
      const { error } = await supabase
        .from('step_tasks')
        .update({
          task_order,
          updated_by: user.email || user.id
        })
        .eq('task_id', task_id)
        .eq('step_id', stepId);

      if (error) throw error;
    }
  }
};

// Template Role Service (optimized for role selection in templates)
export const templateRoleService = {
  // Get roles for template assignment with search
  async getRolesForTemplates(
    search?: string,
    limit: number = 50
  ): Promise<TemplateRole[]> {
    let query = supabase
      .from('department_roles')
      .select(`
        role_id,
        role_name,
        departments!inner(department_name),
        is_archived
      `)
      .eq('is_archived', false)
      .order('role_name')
      .limit(limit);

    if (search) {
      query = query.or(`role_name.ilike.%${search}%,departments.department_name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(role => ({
      role_id: role.role_id,
      role_name: role.role_name,
      department_name: role.departments?.department_name,
      is_archived: role.is_archived
    }));
  },

  // Get role by ID for display
  async getRoleById(roleId: string): Promise<TemplateRole | null> {
    const { data, error } = await supabase
      .from('department_roles')
      .select(`
        role_id,
        role_name,
        departments!inner(department_name),
        is_archived
      `)
      .eq('role_id', roleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      role_id: data.role_id,
      role_name: data.role_name,
      department_name: data.departments?.department_name,
      is_archived: data.is_archived
    };
  }
};
