export type categoryType = "monitor" | "coordinate" | "execute";

export type projectChecklistType = {
  id: string;
  index: number;
  name: string;
  description?: string;
};

export type projectTaskType = {
  id: string;
  index: number;
  name: string;
  category: categoryType;
  owner: string; // role id
  assigned_to: string[]; // role ids
  duration: number; // in days
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dependencies: string[]; // task ids
  subtasks: projectTaskType[];
  description?: string;
  checklists?: projectChecklistType[];

};

export type projectStepType = {
  id: string;
  index: number;
  name: string;
  category: categoryType;
  description?: string;
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
  created_by: string; // created user id
  updated_by: string; // current user id
};


