import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Button,
  Group,
  Card,
  Text,
  Stack,
  ActionIcon,
  Badge,
  Modal,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconEye } from '@tabler/icons-react';
import { TemplateForm } from '../../components/TemplateForm';
import type { templateFormType, templateType } from '../../types/adminTemplates';
import templateService from '../../services/templateService';

export default function AdminTemplate() {
  const [templates, setTemplates] = useState<templateType[]>([]);
  const [formOpened, setFormOpened] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<templateFormType | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [loading, setLoading] = useState(true);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      console.log('Loading templates...');
      setLoading(true);
      const fetchedTemplates = await templateService.getTemplates();
      console.log('Templates loaded:', fetchedTemplates);
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      alert(`Error loading templates: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setFormMode('create');
    setEditingTemplate(null);
    setFormOpened(true);
  };

  const handleEditTemplate = (template: templateType) => {
    setFormMode('edit');
    setEditingTemplateId(template.id);
    setEditingTemplate({
      index: template.index,
      name: template.name,
      phase: template.phase,
    });
    setFormOpened(true);
  };

  const handleSubmitTemplate = async (data: templateFormType) => {
    try {
      console.log('Submitting template data:', data);
      
      if (formMode === 'create') {
        console.log('Creating new template...');
        const newTemplate = await templateService.createTemplate(data);
        console.log('Template created successfully:', newTemplate);
        setTemplates([...templates, newTemplate]);
        setFormOpened(false);
      } else {
        // Handle edit - update existing template
        if (editingTemplateId) {
          console.log('Updating existing template...');
          const updatedTemplate = await templateService.updateTemplate(editingTemplateId, data);
          console.log('Template updated successfully:', updatedTemplate);
          setTemplates(templates.map(t => 
            t.id === updatedTemplate.id ? updatedTemplate : t
          ));
          setFormOpened(false);
        }
      }
    } catch (error) {
      console.error('Error submitting template:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      // You should add proper error handling/notifications here
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await templateService.deleteTemplate(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      // You should add proper error handling/notifications here
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'monitor': return 'blue';
      case 'coordinate': return 'green';
      case 'execute': return 'orange';
      default: return 'gray';
    }
  };

  const renderStepTree = (steps: any[], level = 0) => {
    return steps.map((step, index) => (
      <div key={step.id} style={{ marginLeft: level * 20 }}>
        <Group gap="xs">
          <Text size="sm">• {step.name}</Text>
          <Badge size="xs" color={getCategoryColor(step.category)}>
            {step.category}
          </Badge>
        </Group>
        {step.steps && step.steps.length > 0 && renderStepTree(step.steps, level + 1)}
      </div>
    ));
  };

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Project Templates</Title>
        <Group>
          <Button
            variant="outline"
            onClick={loadTemplates}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateTemplate}
          >
            Create Template
          </Button>
        </Group>
      </Group>

      {loading ? (
        <Card p="xl" ta="center">
          <Text c="dimmed" size="lg">Loading templates...</Text>
        </Card>
      ) : templates.length === 0 ? (
        <Card p="xl" ta="center">
          <Text c="dimmed" size="lg">
            No templates created yet. Create your first project template to get started.
          </Text>
        </Card>
      ) : (
        <Stack gap="md">
          {templates.map((template) => (
            <Card key={template.id} withBorder p="md">
              <Group justify="space-between" mb="md">
                <div>
                  <Title order={4} mb="xs">{template.name}</Title>
                  <Text size="sm" c="dimmed">
                    Phase: {template.phase.name} | Index: {template.index}
                  </Text>
                </div>
                <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>

              <div>
                <Text size="sm" fw={500} mb="xs">Steps:</Text>
                {template.phase.steps.length > 0 ? (
                  renderStepTree(template.phase.steps)
                ) : (
                  <Text size="sm" c="dimmed">No steps defined</Text>
                )}
              </div>
            </Card>
          ))}
        </Stack>
      )}

      <TemplateForm
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        onSubmit={handleSubmitTemplate}
        initialData={editingTemplate || undefined}
        mode={formMode}
      />
    </Container>
  );
}