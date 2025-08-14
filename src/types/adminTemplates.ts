export type categoryType = "monitor" | "coordinate" | "execute";

export type projectStepType = {
  id: string;
  index: number;
  name: string;
  category: categoryType;
  description?: string;
  metadata?: Record<string, any>;
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
  is_public?: boolean;
  tags?: string[];
  phase: phaseType;
  created_at: Date;
  updated_at?: Date;
};

export type templateFormType = Omit<templateType, 'id' | 'created_at' | 'updated_at'>;
