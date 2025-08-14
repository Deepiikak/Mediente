import supabase from '../supabase';
import type { 
  templateType, 
  phaseType, 
  projectStepType, 
  categoryType,
  CreateTemplateData,
  CreatePhaseData,
  CreateStepData,
  UpdateTemplateData,
  UpdatePhaseData,
  UpdateStepData
} from '../types/adminTemplates';

class TemplateService {
  // ==================== TEMPLATE OPERATIONS ====================
  
  // Get all active templates with their phases and steps (non-archived)
  async getTemplates(): Promise<templateType[]> {
    try {
      const { data, error } = await supabase
        .from('admin_templates')
        .select(`
          *,
          template_phases!inner (
            *,
            template_steps (
              *
            )
          )
        `)
        .is('archived_at', null)
        .is('template_phases.archived_at', null)
        .order('index', { ascending: true });

      if (error) {
        console.error('Error fetching templates:', error);
        throw new Error(error.message);
      }

      return (data || []).map(this.transformTemplate);
    } catch (error) {
      console.error('Error in getTemplates:', error);
      throw error;
    }
  }

  // Get archived templates for admin review
  async getArchivedTemplates(): Promise<Record<string, unknown>[]> {
    try {
      const { data, error } = await supabase.rpc('get_archived_templates');

      if (error) {
        console.error('Error fetching archived templates:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getArchivedTemplates:', error);
      throw error;
    }
  }

  // Get template by ID with full structure (only active items)
  async getTemplateById(id: string): Promise<templateType | null> {
    try {
      const { data, error } = await supabase
        .from('admin_templates')
        .select(`
          *,
          template_phases!inner (
            *,
            template_steps (
              *
            )
          )
        `)
        .eq('id', id)
        .is('archived_at', null)
        .is('template_phases.archived_at', null)
        .single();

      if (error) {
        console.error('Error fetching template:', error);
        throw new Error(error.message);
      }

      return data ? this.transformTemplate(data) : null;
    } catch (error) {
      console.error('Error in getTemplateById:', error);
      throw error;
    }
  }

  // Create new template (step 1)
  async createTemplate(templateData: CreateTemplateData): Promise<templateType> {
    try {
      // Auto-calculate index based on existing templates count
      const nextIndex = await this.getNextTemplateIndex();
      
      const { data, error } = await supabase
        .from('admin_templates')
        .insert([{
          name: templateData.name,
          index: nextIndex,
          description: templateData.description,
          status: templateData.status || 'active'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
        throw new Error(error.message);
      }

      return this.transformTemplate({
        ...data,
        template_phases: []
      });
    } catch (error) {
      console.error('Error in createTemplate:', error);
      throw error;
    }
  }

  // Update template
  async updateTemplate(id: string, templateData: UpdateTemplateData): Promise<templateType> {
    try {
      const updateData: Record<string, string | undefined> = {};
      if (templateData.name !== undefined) updateData.name = templateData.name;
      if (templateData.description !== undefined) updateData.description = templateData.description;
      if (templateData.status !== undefined) updateData.status = templateData.status;

      const { data, error } = await supabase
        .from('admin_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating template:', error);
        throw new Error(error.message);
      }

      // Get full template with phases and steps
      return await this.getTemplateById(id) || data;
    } catch (error) {
      console.error('Error in updateTemplate:', error);
      throw error;
    }
  }

  // Archive template (soft delete)
  async archiveTemplate(id: string, userId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('archive_template', {
        template_uuid: id,
        user_id: userId,
        reason: reason || 'Archived by user'
      });

      if (error) {
        console.error('Error archiving template:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error in archiveTemplate:', error);
      throw error;
    }
  }

  // Restore archived template
  async restoreTemplate(id: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('restore_template', {
        template_uuid: id,
        user_id: userId
      });

      if (error) {
        console.error('Error restoring template:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error in restoreTemplate:', error);
      throw error;
    }
  }

  // ==================== PHASE OPERATIONS ====================

  // Add phase to template (step 2)
  async createPhase(templateId: string, phaseData: CreatePhaseData): Promise<phaseType> {
    try {
      // Auto-calculate index based on existing phases count for this template
      const nextIndex = await this.getNextPhaseIndex(templateId);
      
      const { data, error } = await supabase
        .from('template_phases')
        .insert([{
          template_id: templateId,
          name: phaseData.name,
          index: nextIndex,
          description: phaseData.description
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating phase:', error);
        throw new Error(error.message);
      }

      return this.transformPhase({
        ...data,
        template_steps: []
      });
    } catch (error) {
      console.error('Error in createPhase:', error);
      throw error;
    }
  }

  // Update phase
  async updatePhase(phaseId: string, phaseData: UpdatePhaseData): Promise<phaseType> {
    try {
      const updateData: Record<string, string | undefined> = {};
      if (phaseData.name !== undefined) updateData.name = phaseData.name;
      if (phaseData.description !== undefined) updateData.description = phaseData.description;

      const { data, error } = await supabase
        .from('template_phases')
        .update(updateData)
        .eq('id', phaseId)
        .select()
        .single();

      if (error) {
        console.error('Error updating phase:', error);
        throw new Error(error.message);
      }

      return this.transformPhase({
        ...data,
        template_steps: []
      });
    } catch (error) {
      console.error('Error in updatePhase:', error);
      throw error;
    }
  }

  // Archive phase (soft delete)
  async archivePhase(phaseId: string, userId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('archive_phase', {
        phase_uuid: phaseId,
        user_id: userId,
        reason: reason || 'Archived by user'
      });

      if (error) {
        console.error('Error archiving phase:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error in archivePhase:', error);
      throw error;
    }
  }

  // ==================== STEP OPERATIONS ====================

  // Add step to phase (step 3)
  async createStep(phaseId: string, stepData: CreateStepData): Promise<projectStepType> {
    try {
      // Auto-calculate index based on existing steps count at the same level
      const nextIndex = await this.getNextStepIndex(phaseId, stepData.parentStepId);
      
      const { data, error } = await supabase
        .from('template_steps')
        .insert([{
          phase_id: phaseId,
          parent_step_id: stepData.parentStepId || null,
          name: stepData.name,
          index: nextIndex,
          category: stepData.category,
          description: stepData.description,
          metadata: stepData.metadata || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating step:', error);
        throw new Error(error.message);
      }

      return this.transformStep(data);
    } catch (error) {
      console.error('Error in createStep:', error);
      throw error;
    }
  }

  // Update step
  async updateStep(stepId: string, stepData: UpdateStepData): Promise<projectStepType> {
    try {
      const updateData: Record<string, string | Record<string, unknown> | undefined> = {};
      if (stepData.name !== undefined) updateData.name = stepData.name;
      if (stepData.category !== undefined) updateData.category = stepData.category;
      if (stepData.description !== undefined) updateData.description = stepData.description;
      if (stepData.metadata !== undefined) updateData.metadata = stepData.metadata;

      const { data, error } = await supabase
        .from('template_steps')
        .update(updateData)
        .eq('id', stepId)
        .select()
        .single();

      if (error) {
        console.error('Error updating step:', error);
        throw new Error(error.message);
      }

      return this.transformStep(data);
    } catch (error) {
      console.error('Error in updateStep:', error);
      throw error;
    }
  }

  // Archive step (soft delete)
  async archiveStep(stepId: string, userId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('archive_step', {
        step_uuid: stepId,
        user_id: userId,
        reason: reason || 'Archived by user'
      });

      if (error) {
        console.error('Error archiving step:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error in archiveStep:', error);
      throw error;
    }
  }

  // Reorder steps within the same parent/level
  async reorderSteps(stepReorders: { stepId: string; newIndex: number }[]): Promise<void> {
    try {
      // Use a transaction to update all indices atomically
      const { error } = await supabase.rpc('reorder_template_steps', {
        step_reorders: stepReorders
      });

      if (error) {
        console.error('Error reordering steps:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error in reorderSteps:', error);
      throw error;
    }
  }

  // Reorder phases within a template
  async reorderPhases(phaseReorders: { phaseId: string; newIndex: number }[]): Promise<void> {
    try {
      console.log('🔄 Reordering phases:', phaseReorders);
      
      // Use a transaction to update all indices atomically
      const { data, error } = await supabase.rpc('reorder_template_phases', {
        phase_reorders: phaseReorders
      });

      console.log('📡 Supabase RPC response:', { data, error });

      if (error) {
        console.error('❌ Error reordering phases:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ Phase reordering successful');
    } catch (error) {
      console.error('💥 Error in reorderPhases:', error);
      throw error;
    }
  }

  // Get steps for a phase with hierarchy
  async getPhaseSteps(phaseId: string): Promise<projectStepType[]> {
    try {
      const { data, error } = await supabase
        .from('template_steps')
        .select('*')
        .eq('phase_id', phaseId)
        .order('index', { ascending: true });

      if (error) {
        console.error('Error fetching steps:', error);
        throw new Error(error.message);
      }

      return this.buildStepHierarchy(data || []);
    } catch (error) {
      console.error('Error in getPhaseSteps:', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  // Transform database template to typed template
  private transformTemplate = (dbTemplate: Record<string, unknown>): templateType => {
    return {
      id: dbTemplate.id as string,
      name: dbTemplate.name as string,
      index: dbTemplate.index as number,
      description: dbTemplate.description as string | undefined,
      status: dbTemplate.status as 'active' | 'inactive' | 'archived' | undefined,
      phases: ((dbTemplate.template_phases as Record<string, unknown>[]) || []).map(phase => this.transformPhase(phase)),
      created_at: new Date(dbTemplate.created_at as string),
      updated_at: dbTemplate.updated_at ? new Date(dbTemplate.updated_at as string) : undefined
    };
  }

  // Transform database phase to typed phase
  private transformPhase = (dbPhase: Record<string, unknown>): phaseType => {
    return {
      id: dbPhase.id as string,
      name: dbPhase.name as string,
      index: dbPhase.index as number,
      description: dbPhase.description as string | undefined,
      steps: this.buildStepHierarchy((dbPhase.template_steps as Record<string, unknown>[]) || [])
    };
  }

  // Transform database step to typed step
  private transformStep = (dbStep: Record<string, unknown>): projectStepType => {
    return {
      id: dbStep.id as string,
      name: dbStep.name as string,
      index: dbStep.index as number,
      category: dbStep.category as categoryType,
      description: dbStep.description as string | undefined,
      metadata: dbStep.metadata as Record<string, unknown> | undefined,
      steps: [] // Will be populated by buildStepHierarchy
    };
  }

  // Build hierarchical step structure from flat array
  private buildStepHierarchy = (steps: Record<string, unknown>[]): projectStepType[] => {
    const stepMap = new Map<string, projectStepType>();
    const rootSteps: projectStepType[] = [];

    // First pass: create all steps
    steps.forEach(step => {
      stepMap.set(step.id as string, this.transformStep(step));
    });

    // Second pass: build hierarchy
    steps.forEach(step => {
      const transformedStep = stepMap.get(step.id as string)!;
      
      if (step.parent_step_id) {
        const parent = stepMap.get(step.parent_step_id as string);
        if (parent) {
          if (!parent.steps) parent.steps = [];
          parent.steps.push(transformedStep);
        }
      } else {
        rootSteps.push(transformedStep);
      }
    });

    // Sort all levels by index
    const sortSteps = (steps: projectStepType[]) => {
      steps.sort((a, b) => a.index - b.index);
      steps.forEach(step => {
        if (step.steps && step.steps.length > 0) {
          sortSteps(step.steps);
        }
      });
    };

    sortSteps(rootSteps);
    return rootSteps;
  }

  // Get next available index for templates
  async getNextTemplateIndex(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('admin_templates')
        .select('index')
        .order('index', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting next template index:', error);
        return 0;
      }

      return data && data.length > 0 ? data[0].index + 1 : 0;
    } catch (error) {
      console.error('Error in getNextTemplateIndex:', error);
      return 0;
    }
  }

  // Get next available index for phases in a template
  async getNextPhaseIndex(templateId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('template_phases')
        .select('index')
        .eq('template_id', templateId)
        .order('index', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting next phase index:', error);
        return 0;
      }

      return data && data.length > 0 ? data[0].index + 1 : 0;
    } catch (error) {
      console.error('Error in getNextPhaseIndex:', error);
      return 0;
    }
  }

  // Get next available index for steps in a phase
  async getNextStepIndex(phaseId: string, parentStepId?: string): Promise<number> {
    try {
      let query = supabase
        .from('template_steps')
        .select('index')
        .eq('phase_id', phaseId);

      if (parentStepId) {
        query = query.eq('parent_step_id', parentStepId);
      } else {
        query = query.is('parent_step_id', null);
      }

      const { data, error } = await query
        .order('index', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting next step index:', error);
        return 0;
      }

      return data && data.length > 0 ? data[0].index + 1 : 0;
    } catch (error) {
      console.error('Error in getNextStepIndex:', error);
      return 0;
    }
  }
}

export default new TemplateService();
