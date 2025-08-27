import React from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,

} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { CreatePhaseData, UpdatePhaseData } from '../types/adminTemplates';

interface PhaseFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePhaseData) => Promise<void>;
  initialData?: UpdatePhaseData;
  mode: 'create' | 'edit';
}

export function PhaseForm({ 
  opened, 
  onClose, 
  onSubmit, 
  initialData,
  mode
}: PhaseFormProps) {
  const form = useForm<CreatePhaseData>({
    initialValues: {
      name: initialData?.name || '',
      description: initialData?.description || ''
    },
    validate: {
      name: (value) => value.trim() ? null : 'Phase name is required'
    }
  });

  // Update form values when initialData changes (for edit mode)
  React.useEffect(() => {
    if (initialData && mode === 'edit') {
      form.setValues({
        name: initialData.name || '',
        description: initialData.description || ''
      });
    } else if (mode === 'create') {
      form.reset();
    }
  }, [initialData, mode, opened]);

  const handleSubmit = async (values: CreatePhaseData) => {
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error('Error submitting phase:', error);
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
      title={mode === 'create' ? 'Add Phase' : 'Edit Phase'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Phase Name"
            placeholder="Enter phase name"
            required
            {...form.getInputProps('name')}
          />



          <Textarea
            label="Description"
            placeholder="Enter phase description (optional)"
            rows={3}
            {...form.getInputProps('description')}
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Add Phase' : 'Update Phase'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
