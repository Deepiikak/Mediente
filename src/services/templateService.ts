import supabase from '../supabase';
import type { 
  templateType, 
  templateFormType, 
  projectStepType, 
  phaseType 
} from '../types/adminTemplates';

class TemplateService {
  // Get all templates with their complete structure
  async getTemplates(): Promise<templateType[]> {
    try {
      const { data, error } = await supabase
        .from('admin_templates')
        .select(`
          *,
          template_phases (
            *,
            template_steps (
              *,
              template_steps (*)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      // Transform the data to match our templateType structure
      return (data || []).map(this.transformTemplateData);
    } catch (error) {
      console.error('Error in getTemplates:', error);
      throw error;
    }
  }

  // Get template by ID with complete structure
  async getTemplateById(id: string): Promise<templateType | null> {
    try {
      const { data, error } = await supabase
        .from('admin_templates')
        .select(`
          *,
          template_phases (
            *,
            template_steps (
              *,
              template_steps (*)
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch template: ${error.message}`);
      }

      return data ? this.transformTemplateData(data) : null;
    } catch (error) {
      console.error('Error in getTemplateById:', error);
      throw error;
    }
  }

  // Create new template with phase and steps
  async createTemplate(templateData: templateFormType): Promise<templateType> {
    try {
      console.log('Creating template:', templateData.name);
      
      // Start a transaction
      const { data: template, error: templateError } = await supabase
        .from('admin_templates')
        .insert({
          name: templateData.name,
          index: templateData.index,
          description: templateData.description || ''
        })
        .select()
        .single();

      if (templateError) {
        console.error('Template creation error:', templateError);
        throw new Error(`Failed to create template: ${templateError.message}`);
      }

      console.log('Template created successfully:', template.id);

      // Create phase
      const { data: phase, error: phaseError } = await supabase
        .from('template_phases')
        .insert({
          template_id: template.id,
          name: templateData.phase.name,
          index: templateData.phase.index,
          description: templateData.phase.description || ''
        })
        .select()
        .single();

      if (phaseError) {
        console.error('Phase creation error:', phaseError);
        throw new Error(`Failed to create phase: ${phaseError.message}`);
      }

      console.log('Phase created successfully:', phase.id);

      // Create steps recursively
      if (templateData.phase.steps.length > 0) {
        console.log(`Creating ${templateData.phase.steps.length} steps for phase ${phase.id}`);
        await this.createStepsRecursively(phase.id, templateData.phase.steps);
        console.log('Steps created successfully');
      } else {
        console.log('No steps to create for this phase');
      }

      // Return the complete template by constructing it directly
      const createdTemplate: templateType = {
        id: template.id,
        index: template.index,
        name: template.name,
        description: template.description || '',
        status: template.status || 'active',
        is_public: template.is_public || false,
        tags: template.tags || [],
        phase: {
          id: phase.id,
          index: phase.index,
          name: phase.name,
          description: phase.description || '',
          steps: templateData.phase.steps || []
        },
        created_at: new Date(template.created_at),
        updated_at: template.updated_at ? new Date(template.updated_at) : undefined
      };

      console.log('Template creation completed successfully:', createdTemplate.id);
      return createdTemplate;
    } catch (error) {
      console.error('Error in createTemplate:', error);
      throw error;
    }
  }

  // Update existing template
  async updateTemplate(id: string, templateData: templateFormType): Promise<templateType> {
    try {
      // Update template
      const { error: templateError } = await supabase
        .from('admin_templates')
        .update({
          name: templateData.name,
          index: templateData.index,
          description: templateData.description || ''
        })
        .eq('id', id);

      if (templateError) {
        throw new Error(`Failed to update template: ${templateError.message}`);
      }

      // Get the phase ID
      const { data: phase, error: phaseError } = await supabase
        .from('template_phases')
        .select('id')
        .eq('template_id', id)
        .single();

      if (phaseError) {
        throw new Error(`Failed to get phase: ${phaseError.message}`);
      }

      // Update phase
      const { error: phaseUpdateError } = await supabase
        .from('template_phases')
        .update({
          name: templateData.phase.name,
          index: templateData.phase.index,
          description: templateData.phase.description || ''
        })
        .eq('id', phase.id);

      if (phaseUpdateError) {
        throw new Error(`Failed to update phase: ${phaseUpdateError.message}`);
      }

      // Delete existing steps
      await this.deleteAllSteps(phase.id);

      // Create new steps
      if (templateData.phase.steps.length > 0) {
        await this.createStepsRecursively(phase.id, templateData.phase.steps);
      }

      // Return the updated template by constructing it directly
      const updatedTemplate: templateType = {
        id,
        index: templateData.index,
        name: templateData.name,
        description: templateData.description || '',
        status: templateData.status || 'active',
        is_public: templateData.is_public || false,
        tags: templateData.tags || [],
        phase: {
          id: phase.id,
          index: templateData.phase.index,
          name: templateData.phase.name,
          description: templateData.phase.description || '',
          steps: templateData.phase.steps || []
        },
        created_at: new Date(), // This will be updated by the database
        updated_at: new Date()
      };

      return updatedTemplate;
    } catch (error) {
      console.error('Error in updateTemplate:', error);
      throw error;
    }
  }

  // Delete template (soft delete by setting status to archived)
  async deleteTemplate(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_templates')
        .update({
          status: 'archived'
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete template: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteTemplate:', error);
      throw error;
    }
  }

  // Get templates by status
  async getTemplatesByStatus(status: 'active' | 'inactive' | 'archived'): Promise<templateType[]> {
    try {
      const { data, error } = await supabase
        .from('admin_templates')
        .select(`
          *,
          template_phases (
            *,
            template_steps (
              *,
              template_steps (*)
            )
          )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch templates by status: ${error.message}`);
      }

      return (data || []).map(this.transformTemplateData);
    } catch (error) {
      console.error('Error in getTemplatesByStatus:', error);
      throw error;
    }
  }

  // Get public templates
  async getPublicTemplates(): Promise<templateType[]> {
    try {
      const { data, error } = await supabase
        .from('admin_templates')
        .select(`
          *,
          template_phases (
            *,
            template_steps (
              *,
              template_steps (*)
            )
          )
        `)
        .eq('is_public', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch public templates: ${error.message}`);
      }

      return (data || []).map(this.transformTemplateData);
    } catch (error) {
      console.error('Error in getPublicTemplates:', error);
      throw error;
    }
  }

  // Search templates
  async searchTemplates(query: string): Promise<templateType[]> {
    try {
      const { data, error } = await supabase
        .from('admin_templates')
        .select(`
          *,
          template_phases (
            *,
            template_steps (
              *,
              template_steps (*)
            )
          )
        `)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to search templates: ${error.message}`);
      }

      return (data || []).map(this.transformTemplateData);
    } catch (error) {
      console.error('Error in searchTemplates:', error);
      throw error;
    }
  }

  // Duplicate template
  async duplicateTemplate(id: string): Promise<templateType> {
    try {
      const originalTemplate = await this.getTemplateById(id);
      if (!originalTemplate) {
        throw new Error('Template not found');
      }

      const duplicateData: templateFormType = {
        name: `${originalTemplate.name} (Copy)`,
        index: originalTemplate.index,
        phase: {
          id: '', // Will be generated
          name: originalTemplate.phase.name,
          index: originalTemplate.phase.index,
          steps: originalTemplate.phase.steps
        }
      };

      return this.createTemplate(duplicateData);
    } catch (error) {
      console.error('Error in duplicateTemplate:', error);
      throw error;
    }
  }

  // Update template status
  async updateTemplateStatus(id: string, status: 'active' | 'inactive' | 'archived'): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_templates')
        .update({
          status
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to update template status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in updateTemplateStatus:', error);
      throw error;
    }
  }

  // Toggle template public status
  async toggleTemplatePublicStatus(id: string): Promise<void> {
    try {
      const template = await this.getTemplateById(id);
      if (!template) {
        throw new Error('Template not found');
      }

      const { error } = await supabase
        .from('admin_templates')
        .update({
          is_public: !template.is_public
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to toggle template public status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in toggleTemplatePublicStatus:', error);
      throw error;
    }
  }

  // Helper method to create steps recursively
  private async createStepsRecursively(phaseId: string, steps: projectStepType[], parentStepId?: string): Promise<void> {
    for (const step of steps) {
      const { data: createdStep, error: stepError } = await supabase
        .from('template_steps')
        .insert({
          phase_id: phaseId,
          parent_step_id: parentStepId,
          name: step.name,
          index: step.index,
          category: step.category,
          description: step.description || '',
          metadata: step.metadata || {}
        })
        .select()
        .single();

      if (stepError) {
        throw new Error(`Failed to create step: ${stepError.message}`);
      }

      // Create nested steps if they exist
      if (step.steps && step.steps.length > 0) {
        await this.createStepsRecursively(phaseId, step.steps, createdStep.id);
      }
    }
  }

  // Helper method to delete all steps for a phase
  private async deleteAllSteps(phaseId: string): Promise<void> {
    const { error } = await supabase
      .from('template_steps')
      .delete()
      .eq('phase_id', phaseId);

    if (error) {
      throw new Error(`Failed to delete steps: ${error.message}`);
    }
  }

  // Helper method to transform database data to our template structure
  private transformTemplateData(data: any): templateType {
    const phase = data.template_phases?.[0];
    if (!phase) {
      console.warn(`Template ${data.id} (${data.name}) has no phase, creating default phase`);
      // Create a default phase if none exists
      const defaultPhase: phaseType = {
        id: `default-${data.id}`,
        index: 0,
        name: 'Default Phase',
        description: 'Default phase created automatically',
        steps: []
      };
      
      return {
        id: data.id,
        index: data.index,
        name: data.name,
        description: data.description || '',
        status: data.status || 'active',
        is_public: data.is_public || false,
        tags: data.tags || [],
        phase: defaultPhase,
        created_at: new Date(data.created_at),
        updated_at: data.updated_at ? new Date(data.updated_at) : undefined
      };
    }

    // Transform steps recursively
    const transformSteps = (steps: any[]): projectStepType[] => {
      if (!steps || !Array.isArray(steps)) return [];
      
      return steps.map(step => ({
        id: step.id,
        index: step.index,
        name: step.name,
        category: step.category || 'monitor',
        description: step.description || '',
        metadata: step.metadata || {},
        steps: step.template_steps ? transformSteps(step.template_steps) : []
      }));
    };

    const transformedPhase: phaseType = {
      id: phase.id,
      index: phase.index,
      name: phase.name,
      description: phase.description || '',
      steps: phase.template_steps ? transformSteps(phase.template_steps) : []
    };

    return {
      id: data.id,
      index: data.index,
      name: data.name,
      description: data.description || '',
      status: data.status || 'active',
      is_public: data.is_public || false,
      tags: data.tags || [],
      phase: transformedPhase,
      created_at: new Date(data.created_at),
      updated_at: data.updated_at ? new Date(data.updated_at) : undefined
    };
  }

  // Get template usage statistics
  async getTemplateUsageStats(templateId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('template_usage')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', templateId);

      if (error) {
        throw new Error(`Failed to fetch template usage stats: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getTemplateUsageStats:', error);
      throw error;
    }
  }

  // Record template usage
  async recordTemplateUsage(templateId: string, userId: string, usageType: string, projectId?: string, usageData?: Record<string, any>): Promise<void> {
    try {
      const { error } = await supabase
        .from('template_usage')
        .insert({
          template_id: templateId,
          used_by: userId,
          project_id: projectId,
          usage_type: usageType,
          usage_data: usageData || {}
        });

      if (error) {
        throw new Error(`Failed to record template usage: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in recordTemplateUsage:', error);
      throw error;
    }
  }
}

export default new TemplateService();
