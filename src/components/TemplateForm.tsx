import React, { useState } from 'react';
import {
  Modal,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
  Text,
  ActionIcon,
  Box,
  Divider,
  Textarea,
  Badge,
  Card,
  Title,
  ScrollArea,
} from '@mantine/core';
import { CustomTree, type TreeNode } from './CustomTree';
import { useForm, yupResolver } from '@mantine/form';
import { IconPlus, IconTrash, IconEdit, IconChevronRight, IconChevronDown } from '@tabler/icons-react';
import { templateFormSchema, defaultTemplateFormData } from '../utils/templateValidation';
import { type templateFormType, type projectStepType, type categoryType } from '../types/adminTemplates';

interface TemplateFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: templateFormType) => void;
  initialData?: templateFormType;
  mode: 'create' | 'edit';
}

const categoryOptions: { value: categoryType; label: string }[] = [
  { value: 'monitor', label: 'Monitor' },
  { value: 'coordinate', label: 'Coordinate' },
  { value: 'execute', label: 'Execute' },
];

export function TemplateForm({ opened, onClose, onSubmit, initialData, mode }: TemplateFormProps) {
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [editingNode, setEditingNode] = useState<string | null>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const form = useForm<templateFormType>({
    initialValues: initialData || {
      ...defaultTemplateFormData,
      phase: {
        ...defaultTemplateFormData.phase,
        id: generateId(),
      }
    },
    validate: yupResolver(templateFormSchema),
  });

  console.log('Form initialized with values:', form.values);

  const addStep = (parentSteps: projectStepType[], parentIndex?: number) => {
    const newStep: projectStepType = {
      id: generateId(),
      index: parentSteps.length,
      name: '',
      category: 'monitor',
      steps: [],
    };

    if (parentIndex !== undefined) {
      parentSteps[parentIndex].steps = parentSteps[parentIndex].steps || [];
      parentSteps[parentIndex].steps!.push(newStep);
    } else {
      form.values.phase.steps.push(newStep);
    }
    form.setFieldValue('phase.steps', [...form.values.phase.steps]);
  };

  const removeStep = (stepId: string, parentSteps: projectStepType[], parentIndex?: number) => {
    if (parentIndex !== undefined) {
      const filteredSteps = parentSteps[parentIndex].steps?.filter(step => step.id !== stepId) || [];
      parentSteps[parentIndex].steps = filteredSteps;
      form.setFieldValue('phase.steps', [...form.values.phase.steps]);
    } else {
      const filteredSteps = form.values.phase.steps.filter(step => step.id !== stepId);
      form.setFieldValue('phase.steps', filteredSteps);
    }
  };

  const updateStep = (stepId: string, updates: Partial<projectStepType>, parentSteps: projectStepType[], parentIndex?: number) => {
    if (parentIndex !== undefined) {
      const stepIndex = parentSteps[parentIndex].steps?.findIndex(step => step.id === stepId);
      if (stepIndex !== undefined && stepIndex >= 0) {
        parentSteps[parentIndex].steps![stepIndex] = { ...parentSteps[parentIndex].steps![stepIndex], ...updates };
        form.setFieldValue('phase.steps', [...form.values.phase.steps]);
      }
    } else {
      const stepIndex = form.values.phase.steps.findIndex(step => step.id === stepId);
      if (stepIndex >= 0) {
        form.setFieldValue(`phase.steps.${stepIndex}`, { ...form.values.phase.steps[stepIndex], ...updates });
      }
    }
  };

  const renderStepForm = (step: projectStepType, parentSteps: projectStepType[], parentIndex?: number) => (
    <Card key={step.id} p="xs" withBorder mb="xs">
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={500}>Step: {step.name || 'Unnamed Step'}</Text>
        <Group gap="xs">
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={() => setEditingNode(editingNode === step.id ? null : step.id)}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="red"
            onClick={() => removeStep(step.id, parentSteps, parentIndex)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {editingNode === step.id && (
        <Stack gap="xs">
          <TextInput
            label="Step Name"
            placeholder="Enter step name"
            value={step.name}
            onChange={(e) => updateStep(step.id, { name: e.target.value }, parentSteps, parentIndex)}
            size="xs"
          />
          <Select
            label="Category"
            data={categoryOptions}
            value={step.category}
            onChange={(value) => updateStep(step.id, { category: value as categoryType }, parentSteps, parentIndex)}
            size="xs"
          />
          <NumberInput
            label="Index"
            value={step.index}
            onChange={(value) => updateStep(step.id, { index: value || 0 }, parentSteps, parentIndex)}
            size="xs"
            min={0}
          />
          
          {step.steps && step.steps.length > 0 && (
            <Box>
              <Text size="xs" fw={500} mb="xs">Sub-steps:</Text>
              {step.steps.map((subStep, subIndex) => 
                renderStepForm(subStep, step.steps!, subIndex)
              )}
            </Box>
          )}
          
          <Button
            size="xs"
            variant="outline"
            leftSection={<IconPlus size={14} />}
            onClick={() => addStep(step.steps || [], undefined)}
          >
            Add Sub-step
          </Button>
        </Stack>
      )}
    </Card>
  );

  const renderTreeNodes = (steps: projectStepType[], parentSteps: projectStepType[], parentIndex?: number): TreeNode[] => {
    return steps.map((step, index) => ({
      id: step.id,
      label: step.name || 'Unnamed Step',
      icon: <Badge color={step.category === 'monitor' ? 'blue' : step.category === 'coordinate' ? 'green' : 'orange'}>
        {step.category}
      </Badge>,
      children: step.steps && step.steps.length > 0 ? renderTreeNodes(step.steps, step.steps, index) : [],
      data: { step, parentSteps, parentIndex }
    }));
  };

  const handleSubmit = (values: templateFormType) => {
    console.log('Form submitted with values:', values);
    onSubmit(values);
    onClose();
    form.reset();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`${mode === 'create' ? 'Create' : 'Edit'} Project Template`}
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {/* Basic Template Info */}
          <Card withBorder p="md">
            <Title order={6} mb="md">Template Information</Title>
            <Group grow>
              <TextInput
                label="Template Name"
                placeholder="Enter template name"
                required
                {...form.getInputProps('name')}
              />
              <NumberInput
                label="Template Index"
                placeholder="0"
                required
                min={0}
                {...form.getInputProps('index')}
              />
            </Group>
          </Card>

          {/* Phase Information */}
          <Card withBorder p="md">
            <Title order={6} mb="md">Phase Information</Title>
            <Group grow>
              <TextInput
                label="Phase Name"
                placeholder="Enter phase name"
                required
                {...form.getInputProps('phase.name')}
              />
              <NumberInput
                label="Phase Index"
                placeholder="0"
                required
                min={0}
                {...form.getInputProps('phase.index')}
              />
            </Group>
          </Card>

          {/* Steps Tree */}
          <Card withBorder p="md">
            <Group justify="space-between" mb="md">
              <Title order={6}>Project Steps</Title>
              <Button
                size="sm"
                leftSection={<IconPlus size={16} />}
                onClick={() => addStep(form.values.phase.steps)}
              >
                Add Step
              </Button>
            </Group>

            {/* Tree View */}
            <Box mb="md">
              <CustomTree
                data={renderTreeNodes(form.values.phase.steps, form.values.phase.steps)}
                expanded={expandedNodes}
                onExpandedChange={setExpandedNodes}
                nodeExpansionIcon={<IconChevronRight size={16} />}
                nodeCollapseIcon={<IconChevronDown size={16} />}
                onNodeClick={(node) => {
                  if (node.children && node.children.length > 0) {
                    setExpandedNodes(prev => 
                      prev.includes(node.id) 
                        ? prev.filter(id => id !== node.id)
                        : [...prev, node.id]
                    );
                  }
                }}
              />
            </Box>

            {/* Step Forms */}
            <Stack gap="xs">
              {form.values.phase.steps.map((step, index) => 
                renderStepForm(step, form.values.phase.steps, index)
              )}
            </Stack>
          </Card>

          {/* Form Actions */}
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose}>
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
