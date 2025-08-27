import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Title,
  Button,
  Table,
  Group,
  ActionIcon,
  Text,
  Card,
  Stack,
  Breadcrumbs,
  Anchor,
  Badge,
  Loader,
  Center
} from '@mantine/core';
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconEye,
  IconHome
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import type { 
  ProjectTemplate, 
  TemplatePhase, 
  PhaseStep, 
  StepTask, 
  TemplateBreadcrumb 
} from '../../types/templates';
import type { TemplateRole } from '../../types/templates';
import { 
  projectTemplateService, 
  templatePhaseService, 
  phaseStepService, 
  stepTaskService 
} from '../../services/projectTemplateService';
import { templateRoleService } from '../../services/projectTemplateService';
import TemplateFormModal from '../../components/TemplateFormModal';
import PhaseFormModal from '../../components/PhaseFormModal';
import StepFormModal from '../../components/StepFormModal';
import TaskFormModal from '../../components/TaskFormModal';
import GenericConfirmationDialog from '../../components/GenericConfirmationDialog';

type ViewLevel = 'templates' | 'phases' | 'steps' | 'tasks';

export default function TemplatesPage() {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('templates');
  const [breadcrumbs, setBreadcrumbs] = useState<TemplateBreadcrumb[]>([]);
  
  // Data states
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [phases, setPhases] = useState<TemplatePhase[]>([]);
  const [steps, setSteps] = useState<PhaseStep[]>([]);
  const [tasks, setTasks] = useState<StepTask[]>([]);
  const [roles, setRoles] = useState<TemplateRole[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [templateModalOpened, { open: openTemplateModal, close: closeTemplateModal }] = useDisclosure(false);
  const [phaseModalOpened, { open: openPhaseModal, close: closePhaseModal }] = useDisclosure(false);
  const [stepModalOpened, { open: openStepModal, close: closeStepModal }] = useDisclosure(false);
  const [taskModalOpened, { open: openTaskModal, close: closeTaskModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  
  // Edit states
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | undefined>();
  const [editingPhase, setEditingPhase] = useState<TemplatePhase | undefined>();
  const [editingStep, setEditingStep] = useState<PhaseStep | undefined>();
  const [editingTask, setEditingTask] = useState<StepTask | undefined>();
  const [itemToDelete, setItemToDelete] = useState<{ type: ViewLevel; id: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load roles if not already loaded
      if (roles.length === 0) {
        try {
          const rolesData = await templateRoleService.getRolesForTemplates();
          setRoles(rolesData);
        } catch (error) {
          console.error('Error loading roles:', error);
        }
      }

      switch (viewLevel) {
        case 'templates': {
          const templatesData = await projectTemplateService.getAll();
          setTemplates(templatesData);
          break;
        }
        case 'phases': {
          const currentTemplate = breadcrumbs.find(b => b.type === 'template');
          if (currentTemplate) {
            const phasesData = await templatePhaseService.getByTemplateId(currentTemplate.id);
            setPhases(phasesData);
          }
          break;
        }
        case 'steps': {
          const currentPhase = breadcrumbs.find(b => b.type === 'phase');
          if (currentPhase) {
            const stepsData = await phaseStepService.getByPhaseId(currentPhase.id);
            setSteps(stepsData);
          }
          break;
        }
        case 'tasks': {
          const currentStep = breadcrumbs.find(b => b.type === 'step');
          if (currentStep) {
            const tasksData = await stepTaskService.getByStepId(currentStep.id);
            setTasks(tasksData);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load data',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  }, [viewLevel, breadcrumbs, roles.length]);

  // Load data based on current view level
  useEffect(() => {
    loadData();
  }, [loadData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigateTo = (level: ViewLevel, item?: any) => {
    const newBreadcrumbs = [...breadcrumbs];
    
    switch (level) {
      case 'templates':
        setBreadcrumbs([]);
        setViewLevel('templates');
        break;
      case 'phases':
        if (item) {
          newBreadcrumbs.push({ type: 'template', id: item.template_id, name: item.template_name });
          setBreadcrumbs(newBreadcrumbs);
          setViewLevel('phases');
        }
        break;
      case 'steps':
        if (item) {
          newBreadcrumbs.push({ type: 'phase', id: item.phase_id, name: item.phase_name });
          setBreadcrumbs(newBreadcrumbs);
          setViewLevel('steps');
        }
        break;
      case 'tasks':
        if (item) {
          newBreadcrumbs.push({ type: 'step', id: item.step_id, name: item.step_name });
          setBreadcrumbs(newBreadcrumbs);
          setViewLevel('tasks');
        }
        break;
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    
    if (index === -1) {
      setViewLevel('templates');
    } else {
      const lastCrumb = newBreadcrumbs[newBreadcrumbs.length - 1];
      switch (lastCrumb.type) {
        case 'template':
          setViewLevel('phases');
          break;
        case 'phase':
          setViewLevel('steps');
          break;
        case 'step':
          setViewLevel('tasks');
          break;
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (item: any) => {
    switch (viewLevel) {
      case 'templates':
        setEditingTemplate(item as ProjectTemplate);
        openTemplateModal();
        break;
      case 'phases':
        setEditingPhase(item as TemplatePhase);
        openPhaseModal();
        break;
      case 'steps':
        setEditingStep(item as PhaseStep);
        openStepModal();
        break;
      case 'tasks':
        setEditingTask(item as StepTask);
        openTaskModal();
        break;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDelete = (item: any) => {
    let type: ViewLevel, id: string, name: string;
    
    switch (viewLevel) {
      case 'templates':
        type = 'templates';
        id = item.template_id;
        name = item.template_name;
        break;
      case 'phases':
        type = 'phases';
        id = item.phase_id;
        name = item.phase_name;
        break;
      case 'steps':
        type = 'steps';
        id = item.step_id;
        name = item.step_name;
        break;
      case 'tasks':
        type = 'tasks';
        id = item.task_id;
        name = item.task_name;
        break;
      default:
        return;
    }
    
    setItemToDelete({ type, id, name });
    openDeleteModal();
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      switch (itemToDelete.type) {
        case 'templates':
          await projectTemplateService.delete(itemToDelete.id);
          break;
        case 'phases':
          await templatePhaseService.delete(itemToDelete.id);
          break;
        case 'steps':
          await phaseStepService.delete(itemToDelete.id);
          break;
        case 'tasks':
          await stepTaskService.delete(itemToDelete.id);
          break;
      }
      
      notifications.show({
        title: 'Success',
        message: `${itemToDelete.name} deleted successfully`,
        color: 'green'
      });
      
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete item',
        color: 'red'
      });
    }
    
    closeDeleteModal();
    setItemToDelete(null);
  };

  // Helper function to get role name by ID
  const getRoleName = (roleId?: string) => {
    if (!roleId) return 'Unassigned';
    const role = roles.find(r => r.role_id === roleId);
    return role ? `${role.role_name}` : 'Unknown Role';
  };

  const handleModalClose = () => {
    setEditingTemplate(undefined);
    setEditingPhase(undefined);
    setEditingStep(undefined);
    setEditingTask(undefined);
    closeTemplateModal();
    closePhaseModal();
    closeStepModal();
    closeTaskModal();
  };

  const getCurrentParentId = () => {
    switch (viewLevel) {
      case 'phases':
        return breadcrumbs.find(b => b.type === 'template')?.id || '';
      case 'steps':
        return breadcrumbs.find(b => b.type === 'phase')?.id || '';
      case 'tasks':
        return breadcrumbs.find(b => b.type === 'step')?.id || '';
      default:
        return '';
    }
  };

  const renderBreadcrumbs = () => (
    <Breadcrumbs>
      <Anchor onClick={() => navigateToBreadcrumb(-1)}>
        <Group gap="xs">
          <IconHome size={16} />
          <Text>Templates</Text>
        </Group>
      </Anchor>
      {breadcrumbs.map((crumb, index) => (
        <Anchor key={crumb.id} onClick={() => navigateToBreadcrumb(index)}>
          {crumb.name}
        </Anchor>
      ))}
    </Breadcrumbs>
  );

  const renderTemplates = () => (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Project Templates</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openTemplateModal}>
            Create Template
          </Button>
        </Group>
        
        {loading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : templates.length === 0 ? (
          <Center p="xl">
            <Text c="dimmed">No templates found</Text>
          </Center>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {templates.map((template) => (
                <Table.Tr key={template.template_id}>
                  <Table.Td>
                    <Text fw={500}>{template.template_name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {template.description || 'No description'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(template.created_at).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon 
                        variant="light" 
                        onClick={() => navigateTo('phases', template)}
                        title="View Phases"
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="light" 
                        color="blue"
                        onClick={() => handleEdit(template)}
                        title="Edit Template"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="light" 
                        color="red"
                        onClick={() => handleDelete(template)}
                        title="Delete Template"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  );

  const renderPhases = () => (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Phases</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openPhaseModal}>
            Create Phase
          </Button>
        </Group>
        
        {loading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : phases.length === 0 ? (
          <Center p="xl">
            <Text c="dimmed">No phases found</Text>
          </Center>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {phases.map((phase) => (
                <Table.Tr key={phase.phase_id}>
                  <Table.Td>
                    <Badge variant="light">{phase.phase_order}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{phase.phase_name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {phase.description || 'No description'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon 
                        variant="light" 
                        onClick={() => navigateTo('steps', phase)}
                        title="View Steps"
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="light" 
                        color="blue"
                        onClick={() => handleEdit(phase)}
                        title="Edit Phase"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="light" 
                        color="red"
                        onClick={() => handleDelete(phase)}
                        title="Delete Phase"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  );

  const renderSteps = () => (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Steps</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openStepModal}>
            Create Step
          </Button>
        </Group>
        
        {loading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : steps.length === 0 ? (
          <Center p="xl">
            <Text c="dimmed">No steps found</Text>
          </Center>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {steps.map((step) => (
                <Table.Tr key={step.step_id}>
                  <Table.Td>
                    <Badge variant="light">{step.step_order}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{step.step_name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {step.description || 'No description'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon 
                        variant="light" 
                        onClick={() => navigateTo('tasks', step)}
                        title="View Tasks"
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="light" 
                        color="blue"
                        onClick={() => handleEdit(step)}
                        title="Edit Step"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="light" 
                        color="red"
                        onClick={() => handleDelete(step)}
                        title="Delete Step"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  );

  const renderTasks = () => (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Tasks</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openTaskModal}>
            Create Task
          </Button>
        </Group>
        
        {loading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : tasks.length === 0 ? (
          <Center p="xl">
            <Text c="dimmed">No tasks found</Text>
          </Center>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Est. Hours</Table.Th>
                <Table.Th>Assigned Role</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tasks.map((task) => (
                <Table.Tr key={task.task_id}>
                  <Table.Td>
                    <Badge variant="light">{task.task_order}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{task.task_name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {task.description || 'No description'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge 
                      variant="light" 
                      color={task.assigned_role_id ? 'blue' : 'gray'}
                      size="sm"
                    >
                      {getRoleName(task.assigned_role_id)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon 
                        variant="light" 
                        color="blue"
                        onClick={() => handleEdit(task)}
                        title="Edit Task"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="light" 
                        color="red"
                        onClick={() => handleDelete(task)}
                        title="Delete Task"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  );

  return (
    <Container size="xl" p="md">
      <Stack>
        {breadcrumbs.length > 0 && renderBreadcrumbs()}
        
        {viewLevel === 'templates' && renderTemplates()}
        {viewLevel === 'phases' && renderPhases()}
        {viewLevel === 'steps' && renderSteps()}
        {viewLevel === 'tasks' && renderTasks()}

        {/* Modals */}
        <TemplateFormModal
          opened={templateModalOpened}
          onClose={handleModalClose}
          template={editingTemplate}
          onSuccess={loadData}
        />

        <PhaseFormModal
          opened={phaseModalOpened}
          onClose={handleModalClose}
          templateId={getCurrentParentId()}
          phase={editingPhase}
          onSuccess={loadData}
        />

        <StepFormModal
          opened={stepModalOpened}
          onClose={handleModalClose}
          phaseId={getCurrentParentId()}
          step={editingStep}
          onSuccess={loadData}
        />

        <TaskFormModal
          opened={taskModalOpened}
          onClose={handleModalClose}
          stepId={getCurrentParentId()}
          task={editingTask}
          onSuccess={loadData}
        />

        <GenericConfirmationDialog
          opened={deleteModalOpened}
          onCancel={closeDeleteModal}
          onConfirm={confirmDelete}
          title="Delete Item"
          message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmColor="red"
        />
      </Stack>
    </Container>
  );
}