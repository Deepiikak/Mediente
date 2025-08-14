export type categoryType = "monitor" | "coordinate" | "execute";

export type projectStepType = {
  id: string;
  index: number;
  name: string;
  category: categoryType;
  description?: string;
  metadata?: Record<string, unknown>;
  steps?: projectStepType[];
};

export type phaseType = {
  id: string;
  index: number;
  name: string;
  description?: string;
  steps: projectStepType[];
};

export type templateType = {
  id: string;
  index: number;
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
  phases: phaseType[];
  created_at: Date;
  updated_at?: Date;
};

// ==================== FORM TYPES ====================

// Step-by-step creation types
export type CreateTemplateData = {
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
};

export type CreatePhaseData = {
  name: string;
  description?: string;
};

export type CreateStepData = {
  name: string;
  category: categoryType;
  description?: string;
  metadata?: Record<string, unknown>;
  parentStepId?: string;
};

// Update types
export type UpdateTemplateData = Partial<CreateTemplateData>;
export type UpdatePhaseData = Partial<CreatePhaseData>;
export type UpdateStepData = Partial<CreateStepData>;

// Legacy form type for compatibility
export type templateFormType = Omit<templateType, 'id' | 'created_at' | 'updated_at'>;

// UI State types
export type TemplateEditMode = 'view' | 'edit-template' | 'add-phase' | 'edit-phase' | 'add-step' | 'edit-step';

export type TemplateWorkflowState = {
  currentTemplate: templateType | null;
  currentPhase: phaseType | null;
  currentStep: projectStepType | null;
  mode: TemplateEditMode;
  isLoading: boolean;
};
