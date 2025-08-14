
import React from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Select,

} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { CreateTemplateData, UpdateTemplateData } from '../types/adminTemplates';

interface TemplateFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTemplateData) => Promise<void>;
  initialData?: UpdateTemplateData;
  mode: 'create' | 'edit';
}

export function TemplateForm({ 
  opened, 
  onClose, 
  onSubmit, 
  initialData,
  mode
}: TemplateFormProps) {
  const form = useForm<CreateTemplateData>({
    initialValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      status: initialData?.status || 'active'
    },
    validate: {
      name: (value) => value.trim() ? null : 'Template name is required'
    }
  });

  // Update form values when initialData changes (for edit mode)
  React.useEffect(() => {
    if (initialData && mode === 'edit') {
      form.setValues({
        name: initialData.name || '',
        description: initialData.description || '',
        status: initialData.status || 'active'
      });
    } else if (mode === 'create') {
      form.reset();
    }
  }, [initialData, mode, opened]);

  const handleSubmit = async (values: CreateTemplateData) => {
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error('Error submitting template:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={mode === 'create' ? 'Create Template' : 'Edit Template'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Template Name"
            placeholder="Enter template name"
            required
            {...form.getInputProps('name')}
          />



          <Textarea
            label="Description"
            placeholder="Enter template description (optional)"
            rows={3}
            {...form.getInputProps('description')}
          />

          <Select
            label="Status"
            data={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'archived', label: 'Archived' }
            ]}
            {...form.getInputProps('status')}
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Create Template' : 'Update Template'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
