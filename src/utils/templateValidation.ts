import * as yup from 'yup';
import { type categoryType, type projectStepType, type phaseType, type templateFormType } from '../types/adminTemplates';

const projectStepSchema: yup.ObjectSchema<projectStepType> = yup.object({
  id: yup.string().required('Step ID is required'),
  index: yup.number().required('Step index is required').min(0, 'Index must be 0 or greater'),
  name: yup.string().required('Step name is required').min(1, 'Step name must be at least 1 character'),
  category: yup.string().oneOf(['monitor', 'coordinate', 'execute'] as const).required('Category is required'),
  steps: yup.array().of(yup.lazy(() => projectStepSchema)).optional(),
});

const phaseSchema: yup.ObjectSchema<phaseType> = yup.object({
  id: yup.string().required('Phase ID is required'),
  index: yup.number().required('Phase index is required').min(0, 'Index must be 0 or greater'),
  name: yup.string().required('Phase name is required').min(1, 'Phase name must be at least 1 character'),
  steps: yup.array().of(projectStepSchema).optional().default([]),
});

export const templateFormSchema: yup.ObjectSchema<templateFormType> = yup.object({
  index: yup.number().required('Template index is required').min(0, 'Index must be 0 or greater'),
  name: yup.string().required('Template name is required').min(1, 'Template name must be at least 1 character'),
  phase: phaseSchema,
});

export const defaultTemplateFormData: templateFormType = {
  index: 0,
  name: '',
  description: '',
  status: 'active',
  is_public: false,
  tags: [],
  phase: {
    id: '',
    index: 0,
    name: '',
    description: '',
    steps: [{
      id: 'default-step',
      index: 0,
      name: 'Default Step',
      category: 'monitor' as const,
      description: 'Default step created automatically',
      metadata: {},
      steps: []
    }]
  }
};
