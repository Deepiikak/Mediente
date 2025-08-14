import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Button,
  Group,
  Card,
  Text,
  Stack,
  ActionIcon,
  SegmentedControl,
  Breadcrumbs,
  Anchor,
  Divider,
  Loader,
  Center,
  Alert
} from '@mantine/core';
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconArrowLeft, 
  IconChevronRight,
  IconSettings,
  IconList,
  IconCalendarTime,
} from '@tabler/icons-react';
import { TemplateForm } from '../../components/TemplateForm';
import { PhaseForm } from '../../components/PhaseForm';
import { StepForm } from '../../components/StepForm';
import { DraggableStepTree } from '../../components/DraggableStepTree';
import { DraggablePhaseList } from '../../components/DraggablePhaseList';
import { GanttChartView } from '../../components/GanttChartView';
import ConfirmationDialog from '../../components/GenericConfirmationDialog';
import templateService from '../../services/templateService';
import type { 
  templateType, 
  phaseType, 
  projectStepType,
  CreateTemplateData,
  CreatePhaseData,
  CreateStepData,
  TemplateWorkflowState
  } from '../../types/adminTemplates';

type ViewMode = 'list' | 'gantt';
  
export default function AdminTemplate() {
  // Main state
  const [templates, setTemplates] = useState<templateType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Workflow state
  const [workflowState, setWorkflowState] = useState<TemplateWorkflowState>({
    currentTemplate: null,
    currentPhase: null,
    currentStep: null,
        mode: 'view',
    isLoading: false
  });

  const [viewMode, setViewMode] = useState<ViewMode>('list');
 
  // Form states
  const [templateFormOpened, setTemplateFormOpened] = useState(false);
  const [phaseFormOpened, setPhaseFormOpened] = useState(false);
  const [stepFormOpened, setStepFormOpened] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  
  // Delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    opened: boolean;
    type: 'template' | 'phase' | 'step';
    id: string;
    name: string;
  }>({
    opened: false,
    type: 'template',
    id: '',
    name: ''
  });

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTemplates = await templateService.getTemplates();
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // ==================== TEMPLATE OPERATIONS ====================

  const handleCreateTemplate = async () => {
    setFormMode('create');
    setTemplateFormOpened(true);
  };

  const handleEditTemplate = (template: templateType) => {
    setFormMode('edit');
    setWorkflowState(prev => ({ ...prev, currentTemplate: template }));
    setTemplateFormOpened(true);
  };

  const handleSubmitTemplate = async (data: CreateTemplateData) => {
    try {
      if (formMode === 'create') {
        const newTemplate = await templateService.createTemplate(data);
        setTemplates([...templates, newTemplate]);
      } else if (workflowState.currentTemplate) {
        const updatedTemplate = await templateService.updateTemplate(
          workflowState.currentTemplate.id, 
          data
        );
        setTemplates(templates.map(t => 
          t.id === updatedTemplate.id ? updatedTemplate : t
        ));
      }
      setTemplateFormOpened(false);
      setWorkflowState(prev => ({ ...prev, currentTemplate: null }));
    } catch (error) {
      console.error('Error submitting template:', error);
      throw error;
    }
  };

  const handleArchiveTemplate = (template: templateType) => {
    setDeleteConfirmation({
      opened: true,
      type: 'template',
      id: template.id,
      name: template.name
    });
  };

  const handleTemplateView = (template: templateType) => {
    setWorkflowState({
      currentTemplate: template,
      currentPhase: null,
      currentStep: null,
      mode: 'view',
      isLoading: false
    });
  };

  // ==================== PHASE OPERATIONS ====================

  const handleCreatePhase = () => {
    setFormMode('create');
    setPhaseFormOpened(true);
  };

  const handleEditPhase = (phase: phaseType) => {
    setFormMode('edit');
    setWorkflowState(prev => ({ ...prev, currentPhase: phase }));
    setPhaseFormOpened(true);
  };

  const handleSubmitPhase = async (data: CreatePhaseData) => {
    try {
      if (!workflowState.currentTemplate) return;

      if (formMode === 'create') {
        await templateService.createPhase(
          workflowState.currentTemplate.id,
          data
        );
      } else if (workflowState.currentPhase) {
        await templateService.updatePhase(workflowState.currentPhase.id, data);
      }
      
      // Reload template to get updated structure
      const updatedTemplate = await templateService.getTemplateById(
        workflowState.currentTemplate.id
      );
      if (updatedTemplate) {
        setWorkflowState(prev => ({ ...prev, currentTemplate: updatedTemplate }));
        setTemplates(templates.map(t => 
          t.id === updatedTemplate.id ? updatedTemplate : t
        ));
      }
      setPhaseFormOpened(false);
      setWorkflowState(prev => ({ ...prev, currentPhase: null }));
    } catch (error) {
      console.error('Error submitting phase:', error);
      throw error;
    }
  };

  const handleArchivePhase = (phase: phaseType) => {
    setDeleteConfirmation({
      opened: true,
      type: 'phase',
      id: phase.id,
      name: phase.name
    });
  };

  const handlePhaseView = (phase: phaseType) => {
    setWorkflowState(prev => ({
      ...prev,
      currentPhase: phase,
      currentStep: null,
      mode: 'view'
    }));
  };

  // ==================== STEP OPERATIONS ====================

  const handleCreateStep = (parentStep?: projectStepType) => {
    setFormMode('create');
    setWorkflowState(prev => ({ ...prev, currentStep: parentStep || null }));
    setStepFormOpened(true);
  };

  const handleEditStep = (step: projectStepType) => {
    setFormMode('edit');
    setWorkflowState(prev => ({ ...prev, currentStep: step }));
    setStepFormOpened(true);
  };

  const handleSubmitStep = async (data: CreateStepData) => {
    try {
      if (!workflowState.currentPhase) return;

      if (formMode === 'create') {
        await templateService.createStep(workflowState.currentPhase.id, data);
      } else if (workflowState.currentStep) {
        await templateService.updateStep(workflowState.currentStep.id, data);
      }

      // Reload template to get updated structure
      if (workflowState.currentTemplate) {
        const updatedTemplate = await templateService.getTemplateById(
          workflowState.currentTemplate.id
        );
        if (updatedTemplate) {
          setWorkflowState(prev => ({ 
            ...prev, 
            currentTemplate: updatedTemplate,
            currentPhase: updatedTemplate.phases[0] || null
          }));
          setTemplates(templates.map(t => 
            t.id === updatedTemplate.id ? updatedTemplate : t
          ));
        }
      }
      setStepFormOpened(false);
      setWorkflowState(prev => ({ ...prev, currentStep: null }));
    } catch (error) {
      console.error('Error submitting step:', error);
      throw error;
    }
  };

  const handleArchiveStep = (step: projectStepType) => {
    setDeleteConfirmation({
      opened: true,
      type: 'step',
      id: step.id,
      name: step.name
    });
  };

  // ==================== STEP REORDERING ====================

  const handleReorderSteps = async (stepReorders: { stepId: string; newIndex: number }[]) => {
    try {
      await templateService.reorderSteps(stepReorders);
      
      // Reload template to get updated structure
      if (workflowState.currentTemplate) {
        const updatedTemplate = await templateService.getTemplateById(
          workflowState.currentTemplate.id
        );
        if (updatedTemplate) {
          setWorkflowState(prev => ({ 
            ...prev, 
            currentTemplate: updatedTemplate,
            currentPhase: updatedTemplate.phases[0] || null
          }));
          setTemplates(templates.map(t => 
            t.id === updatedTemplate.id ? updatedTemplate : t
          ));
        }
      }
    } catch (error) {
      console.error('Error reordering steps:', error);
      throw error;
    }
  };

  const handleReorderPhases = async (phaseReorders: { phaseId: string; newIndex: number }[]) => {
    try {
      console.log('🎯 AdminTemplate: Starting phase reorder', phaseReorders);
      
      await templateService.reorderPhases(phaseReorders);
      
      console.log('📋 AdminTemplate: Phase reorder complete, reloading template...');
      
      // Reload template to get updated structure
      if (workflowState.currentTemplate) {
        const updatedTemplate = await templateService.getTemplateById(
          workflowState.currentTemplate.id
        );
        if (updatedTemplate) {
          console.log('🔄 AdminTemplate: Template reloaded, updating state');
          setWorkflowState(prev => ({ 
            ...prev, 
            currentTemplate: updatedTemplate
          }));
          setTemplates(templates.map(t => 
            t.id === updatedTemplate.id ? updatedTemplate : t
          ));
          console.log('✅ AdminTemplate: State updated successfully');
        }
      }
    } catch (error) {
      console.error('💥 AdminTemplate: Error reordering phases:', error);
      throw error;
    }
  };

  // ==================== DELETE CONFIRMATION ====================

  const handleConfirmArchive = async () => {
    try {
      const { type, id } = deleteConfirmation;
      // TODO: Get actual user ID from auth context
      const userId = 'current-user-id'; // This should come from authentication
      
      switch (type) {
        case 'template':
          await templateService.archiveTemplate(id, userId);
          setTemplates(templates.filter(t => t.id !== id));
          setWorkflowState({
            currentTemplate: null,
            currentPhase: null,
            currentStep: null,
            mode: 'view',
            isLoading: false
          });
          break;
          
        case 'phase':
          await templateService.archivePhase(id, userId);
          if (workflowState.currentTemplate) {
            const updatedTemplate = await templateService.getTemplateById(
              workflowState.currentTemplate.id
            );
            if (updatedTemplate) {
              setWorkflowState(prev => ({ 
                ...prev, 
                currentTemplate: updatedTemplate,
                currentPhase: null
              }));
              setTemplates(templates.map(t => 
                t.id === updatedTemplate.id ? updatedTemplate : t
              ));
            }
          }
          break;
          
        case 'step':
          await templateService.archiveStep(id, userId);
          if (workflowState.currentTemplate) {
            const updatedTemplate = await templateService.getTemplateById(
              workflowState.currentTemplate.id
            );
            if (updatedTemplate) {
              setWorkflowState(prev => ({ 
                ...prev, 
                currentTemplate: updatedTemplate,
                currentPhase: updatedTemplate.phases[0] || null
              }));
              setTemplates(templates.map(t => 
                t.id === updatedTemplate.id ? updatedTemplate : t
              ));
            }
          }
          break;
      }
      
      setDeleteConfirmation(prev => ({ ...prev, opened: false }));
    } catch (error) {
      console.error('Error archiving:', error);
    }
  };

  // ==================== NAVIGATION ====================

  const handleBackToTemplates = () => {
    setWorkflowState({
      currentTemplate: null,
      currentPhase: null,
      currentStep: null,
      mode: 'view',
      isLoading: false
    });
  };

  const handleBackToTemplate = () => {
    setWorkflowState(prev => ({
      ...prev,
      currentPhase: null,
      currentStep: null,
      mode: 'view'
    }));
  };

  // ==================== UTILITY FUNCTIONS ====================

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'monitor': return 'blue';
      case 'coordinate': return 'green';
      case 'execute': return 'orange';
      default: return 'gray';
    }
  };



  // ==================== BREADCRUMB NAVIGATION ====================

  const renderBreadcrumbs = () => {
    const items = [
      <Anchor key="templates" onClick={handleBackToTemplates}>
        Templates
      </Anchor>
    ];

    if (workflowState.currentTemplate) {
      items.push(
        <Anchor key="template" onClick={handleBackToTemplate}>
          {workflowState.currentTemplate.name}
        </Anchor>
      );
    }

    if (workflowState.currentPhase) {
      items.push(
        <Text key="phase">{workflowState.currentPhase.name}</Text>
      );
    }

    return <Breadcrumbs separator={<IconChevronRight size={14} />}>{items}</Breadcrumbs>;
  };

  // ==================== RENDER METHODS ====================

  const renderTemplatesList = () => (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Project Templates</Title>
        <Group>
          <Button variant="outline" onClick={loadTemplates} loading={loading}>
            Refresh
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreateTemplate}>
            Create Template
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : templates.length === 0 ? (
        <Card p="xl" ta="center">
          <Text c="dimmed" size="lg">
            No templates created yet. Create your first project template to get started.
          </Text>
        </Card>
      ) : (
        <Stack gap="md">
          {templates.map((template) => (
            <Card key={template.id} withBorder p="md" style={{ cursor: 'pointer' }}>
              <Group justify="space-between" mb="md">
                <div onClick={() => handleTemplateView(template)} style={{ flex: 1 }}>
                  <Title order={4} mb="xs">{template.name}</Title>
                  <Text size="sm" c="dimmed">
                    Phases: {template.phases.length} | Index: {template.index} | Status: {template.status}
                  </Text>
                  {template.description && (
                    <Text size="sm" mt="xs">{template.description}</Text>
                  )}
                </div>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => handleEditTemplate(template)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon 
                    variant="subtle" 
                    color="red" 
                    onClick={() => handleArchiveTemplate(template)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                  <ActionIcon 
                    variant="subtle" 
                    onClick={() => handleTemplateView(template)}
                  >
                    <IconSettings size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </>
  );

  const renderTemplateDetail = () => {
    const template = workflowState.currentTemplate!;
    
    return (
      <>
        <Group justify="space-between" mb="lg">
          <div>
            <Group mb="xs">
              <Button 
                variant="subtle" 
                leftSection={<IconArrowLeft size={16} />}
                onClick={handleBackToTemplates}
              >
                Back to Templates
              </Button>
            </Group>
            <Title order={2}>{template.name}</Title>
            {template.description && (
              <Text c="dimmed" mt="xs">{template.description}</Text>
            )}
          </div>
          <Group>
            <Button variant="outline" onClick={() => handleEditTemplate(template)}>
              Edit Template
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={handleCreatePhase}>
              Add Phase
            </Button>
          </Group>
        </Group>

        {/* View Mode Toggle */}
        <Group justify="center" mb="md">
          <SegmentedControl
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            data={[
              { 
                label: (
                  <Group gap="xs">
                    <IconList size={16} />
                    <span>List View</span>
                  </Group>
                ), 
                value: 'list' 
              },
              { 
                label: (
                  <Group gap="xs">
                    <IconCalendarTime size={16} />
                    <span>Timeline</span>
                  </Group>
                ), 
                value: 'gantt' 
              },
            ]}
          />
        </Group>

        {viewMode === 'list' ? (
          <Stack gap="md">
            {template.phases.length === 0 ? (
              <Card p="xl" ta="center">
                <Text c="dimmed" size="lg" mb="md">
                  No phases created yet. Add a phase to start building your template.
                </Text>
                <Button leftSection={<IconPlus size={16} />} onClick={handleCreatePhase}>
                  Add First Phase
                </Button>
              </Card>
            ) : (
              <DraggablePhaseList
                phases={template.phases}
                onReorder={handleReorderPhases}
                onEdit={handleEditPhase}
                onArchive={handleArchivePhase}
                onManageSteps={handlePhaseView}
              />
            )}
          </Stack>
        ) : (
          <GanttChartView
            template={template}
            getCategoryColor={getCategoryColor}
          />
        )}
      </>
    );
  };

  const renderPhaseDetail = () => {
    const phase = workflowState.currentPhase!;
    
    return (
      <>
        <Group justify="space-between" mb="lg">
          <div>
            <Group mb="xs">
              <Button 
                variant="subtle" 
                leftSection={<IconArrowLeft size={16} />}
                onClick={handleBackToTemplate}
              >
                Back to Template
              </Button>
            </Group>
            <Title order={2}>{phase.name}</Title>
            {phase.description && (
              <Text c="dimmed" mt="xs">{phase.description}</Text>
            )}
          </div>
          <Group>
            <Button variant="outline" onClick={() => handleEditPhase(phase)}>
              Edit Phase
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={() => handleCreateStep()}>
              Add Step
            </Button>
          </Group>
        </Group>

        <Stack gap="md">
          {phase.steps.length === 0 ? (
            <Card p="xl" ta="center">
              <Text c="dimmed" size="lg" mb="md">
                No steps created yet. Add steps to define the workflow for this phase.
              </Text>
              <Button leftSection={<IconPlus size={16} />} onClick={() => handleCreateStep()}>
                Add First Step
              </Button>
            </Card>
          ) : (
            <Card withBorder p="md">
              <Title order={4} mb="md">Steps</Title>
              <DraggableStepTree
                steps={phase.steps}
                onReorder={handleReorderSteps}
                onEdit={handleEditStep}
                onArchive={handleArchiveStep}
                onAddSubStep={handleCreateStep}
                getCategoryColor={getCategoryColor}
              />
            </Card>
          )}
        </Stack>
      </>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <Container size="xl" py="md">
      {renderBreadcrumbs()}
      <Divider my="md" />

      {!workflowState.currentTemplate && renderTemplatesList()}
      {workflowState.currentTemplate && !workflowState.currentPhase && renderTemplateDetail()}
      {workflowState.currentPhase && renderPhaseDetail()}

      {/* Forms */}
      <TemplateForm
        opened={templateFormOpened}
        onClose={() => {
          setTemplateFormOpened(false);
          setWorkflowState(prev => ({ ...prev, currentTemplate: null }));
        }}
        onSubmit={handleSubmitTemplate}
        initialData={formMode === 'edit' && workflowState.currentTemplate ? workflowState.currentTemplate : undefined}
        mode={formMode}
      />

      <PhaseForm
        opened={phaseFormOpened}
        onClose={() => {
          setPhaseFormOpened(false);
          setWorkflowState(prev => ({ ...prev, currentPhase: null }));
        }}
        onSubmit={handleSubmitPhase}
        initialData={formMode === 'edit' && workflowState.currentPhase ? workflowState.currentPhase : undefined}
        mode={formMode}
      />

      <StepForm
        opened={stepFormOpened}
        onClose={() => {
          setStepFormOpened(false);
          setWorkflowState(prev => ({ ...prev, currentStep: null }));
        }}
        onSubmit={handleSubmitStep}
        initialData={formMode === 'edit' && workflowState.currentStep ? workflowState.currentStep : undefined}
        mode={formMode}
        availableParentSteps={workflowState.currentPhase?.steps || []}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmationDialog
        opened={deleteConfirmation.opened}
        title={`Archive ${deleteConfirmation.type}`}
        message={`Are you sure you want to archive "${deleteConfirmation.name}"? This will hide it from active use but it can be restored later.`}
        confirmLabel="Archive"
        confirmColor="orange"
        onConfirm={handleConfirmArchive}
        onCancel={() => setDeleteConfirmation(prev => ({ ...prev, opened: false }))}
      />
    </Container>
  );
}
