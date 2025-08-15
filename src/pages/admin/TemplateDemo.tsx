import React, { useState } from 'react';
import { Container, Title, Button, Group, Card, Text, Stack, Badge } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { TemplateForm } from '../../oldCode/TemplateForm';
import type { templateFormType, templateType } from '../../types/adminTemplates';

export default function TemplateDemo() {
  const [templates, setTemplates] = useState<templateType[]>([]);
  const [formOpened, setFormOpened] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<templateFormType | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const handleCreateTemplate = () => {
    setFormMode('create');
    setEditingTemplate(null);
    setFormOpened(true);
  };

  const handleSubmitTemplate = (data: templateFormType) => {
    if (formMode === 'create') {
      const newTemplate: templateType = {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date(),
      };
      setTemplates([...templates, newTemplate]);
    } else {
      // Handle edit - update existing template
      setTemplates(templates.map(t => 
        t.name === editingTemplate?.name ? { ...t, ...data } : t
      ));
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
        <Title order={2}>Template Form Demo</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleCreateTemplate}
        >
          Create Template
        </Button>
      </Group>

      {templates.length === 0 ? (
        <Card p="xl" ta="center">
          <Text c="dimmed" size="lg">
            No templates created yet. Create your first project template to test the form.
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
