import React from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Select,

  JsonInput
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { CreateStepData, UpdateStepData, projectStepType } from '../types/adminTemplates';

interface StepFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStepData) => Promise<void>;
  initialData?: UpdateStepData;
  mode: 'create' | 'edit';
  availableParentSteps?: projectStepType[];
}

export function StepForm({ 
  opened, 
  onClose, 
  onSubmit, 
  initialData,
  mode,
  availableParentSteps = []
}: StepFormProps) {
  const [metadataJson, setMetadataJson] = React.useState('');

  const form = useForm<CreateStepData>({
    initialValues: {
      name: initialData?.name || '',
      category: initialData?.category || 'monitor',
      description: initialData?.description || '',
      metadata: initialData?.metadata || undefined,
      parentStepId: initialData?.parentStepId || undefined
    },
    validate: {
      name: (value) => value.trim() ? null : 'Step name is required',
      category: (value) => value ? null : 'Category is required'
    }
  });

  // Update form values when initialData changes (for edit mode)
  React.useEffect(() => {
    if (initialData && mode === 'edit') {
      form.setValues({
        name: initialData.name || '',
        category: initialData.category || 'monitor',
        description: initialData.description || '',
        metadata: initialData.metadata || undefined,
        parentStepId: initialData.parentStepId || undefined
      });
      // Set the JSON string representation
      setMetadataJson(
        initialData.metadata 
          ? JSON.stringify(initialData.metadata, null, 2)
          : ''
      );
    } else if (mode === 'create') {
      form.reset();
      setMetadataJson('');
    }
  }, [initialData, mode, opened]);

  const handleSubmit = async (values: CreateStepData) => {
    try {
      // Parse metadata from JSON string
      let parsedMetadata: Record<string, unknown> | undefined = undefined;
      if (metadataJson.trim()) {
        try {
          parsedMetadata = JSON.parse(metadataJson) as Record<string, unknown>;
        } catch (e) {
          // If parsing fails, keep as undefined
          parsedMetadata = undefined;
        }
      }

      await onSubmit({
        ...values,
        metadata: parsedMetadata
      });
      form.reset();
      setMetadataJson('');
      onClose();
    } catch (error) {
      console.error('Error submitting step:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setMetadataJson('');
    onClose();
  };

  const categoryOptions = [
    { value: 'monitor', label: 'Monitor' },
    { value: 'coordinate', label: 'Coordinate' },
    { value: 'execute', label: 'Execute' }
  ];

  const parentStepOptions = availableParentSteps.map(step => ({
    value: step.id,
    label: `${step.name} (Index: ${step.index})`
  }));

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={mode === 'create' ? 'Add Step' : 'Edit Step'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Step Name"
            placeholder="Enter step name"
            required
            {...form.getInputProps('name')}
          />



          <Select
            label="Category"
            placeholder="Select step category"
            data={categoryOptions}
            required
            {...form.getInputProps('category')}
          />

          {parentStepOptions.length > 0 && (
            <Select
              label="Parent Step (Optional)"
              placeholder="Select parent step for nesting"
              data={parentStepOptions}
              clearable
              {...form.getInputProps('parentStepId')}
            />
          )}

          <Textarea
            label="Description"
            placeholder="Enter step description (optional)"
            rows={3}
            {...form.getInputProps('description')}
          />

          <JsonInput
            label="Metadata (Optional)"
            placeholder="Enter JSON metadata"
            validationError="Invalid JSON"
            formatOnBlur
            autosize
            minRows={2}
            maxRows={6}
            value={metadataJson}
            onChange={setMetadataJson}
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Add Step' : 'Update Step'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
