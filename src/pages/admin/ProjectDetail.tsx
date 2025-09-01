import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Title,
  Text,
  Button,
  Grid,
  Card,
  Group,
  Stack,
  Badge,
  Progress,
  Table,

  Alert,
  Loader,
  Center,
  ActionIcon,
  SimpleGrid,
  Paper,
  ThemeIcon,
  Tabs,
  ScrollArea,
  Avatar,
  Anchor,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconUsers,
  IconChecklist,
  IconProgress,
  IconCircleCheck,
  IconClock,
  IconAlertCircle,
  IconPlayerPlay,
  IconCheck,
  IconUserPlus,
  IconUserMinus,
  IconBriefcase,
} from '@tabler/icons-react';
import { 
  projectService, 
  projectTaskService 
} from '../../services/projectService';
import { projectCrewService } from '../../services/projectCrewService';
import ProjectCrewModal from '../../components/ProjectCrewModal';
import TaskListView from '../../components/TaskListView';
import type { 
  ProjectWithStats, 
  ProjectRole,
  ProjectRoleWithCrew,
  ProjectTaskWithUser,
  ProjectTaskWithCrew,
  ProjectCrewWithUser,
  TaskStatusType
} from '../../types/project';




function TaskRow({ task, onStart, onComplete }: { 
  task: ProjectTaskWithUser; 
  onStart: () => void;
  onComplete: () => void;
}) {
  const statusColors: Record<TaskStatusType, string> = {
    pending: 'gray',
    ongoing: 'blue',
    completed: 'green',
    escalated: 'red'
  };

  const canStart = task.task_status === 'pending' && task.assigned_user_name;
  const canComplete = task.task_status === 'ongoing';

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={500}>{task.phase_name}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{task.step_name}</Text>
      </Table.Td>
      <Table.Td>
        <div>
          <Text size="sm" fw={500}>{task.task_name}</Text>
          {task.task_description && (
            <Text size="xs" c="dimmed" lineClamp={1}>{task.task_description}</Text>
          )}
        </div>
      </Table.Td>
      <Table.Td>
        {task.assigned_role_name && (
          <div>
            <Text size="sm">{task.assigned_role_name}</Text>
            <Text size="xs" c="dimmed">{task.assigned_department_name}</Text>
          </div>
        )}
      </Table.Td>
      <Table.Td>
        {task.assigned_user_name ? (
          <Group gap="xs">
            <Avatar size="sm" radius="xl" color="blue">
              {task.assigned_user_name.charAt(0).toUpperCase()}
            </Avatar>
            <Text size="sm">{task.assigned_user_name}</Text>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">-</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Badge 
          color={statusColors[task.task_status]} 
          variant="light" 
          size="sm"
        >
          {task.task_status.replace('_', ' ')}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{task.estimated_hours ? `${task.estimated_hours}h` : '-'}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end">
          {canStart && (
            <ActionIcon 
              color="blue" 
              variant="subtle"
              onClick={onStart}
              title="Start Task"
            >
              <IconPlayerPlay size={16} />
            </ActionIcon>
          )}
          {canComplete && (
            <ActionIcon 
              color="green" 
              variant="subtle"
              onClick={onComplete}
              title="Complete Task"
            >
              <IconCheck size={16} />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectWithStats | null>(null);
  const [rolesWithCrew, setRolesWithCrew] = useState<ProjectRoleWithCrew[]>([]);
  const [tasks, setTasks] = useState<ProjectTaskWithUser[]>([]);
  const [tasksWithCrew, setTasksWithCrew] = useState<ProjectTaskWithCrew[]>([]);
  const [crew, setCrew] = useState<ProjectCrewWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ProjectRole | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Load project with stats
      const projectData = await projectService.getByIdWithStats(projectId);
      if (!projectData) {
        setError('Project not found');
        return;
      }
      setProject(projectData);

      // Load roles with crew details
      const rolesWithCrewData = await projectCrewService.getRolesWithCrew(projectId);
      setRolesWithCrew(rolesWithCrewData);

      // Load all crew members for filters and assignments
      // Convert to ProjectCrewWithUser by extracting from rolesWithCrewData
      const allCrew: ProjectCrewWithUser[] = rolesWithCrewData.flatMap(role => role.crew_members);
      setCrew(allCrew);

      // Load tasks with details (enhanced for automation)
      const tasksData = await projectTaskService.getByProjectIdWithDetails(projectId);
      setTasks(tasksData);

      // Convert to tasks with crew for the new list view
      const tasksWithCrewData: ProjectTaskWithCrew[] = tasksData.map(task => {
        // Find the crew member from roles data if available
        let assignedCrewMember: ProjectCrewWithUser | undefined;
        
        if (task.assigned_user_name) {
          // Look for the crew member in the roles data
          for (const role of rolesWithCrewData) {
            const crewMember = role.crew_members.find(crew => 
              crew.user_name === task.assigned_user_name
            );
            if (crewMember) {
              assignedCrewMember = crewMember;
              break;
            }
          }
          
          // If not found, create a basic crew member object
          if (!assignedCrewMember) {
            assignedCrewMember = {
              project_crew_id: task.assigned_project_crew_id || '',
              project_id: task.project_id,
              user_id: '', // Will be populated by service
              role_id: '',
              role_name: task.assigned_role_name || '',
              department_id: '',
              department_name: task.assigned_department_name || '',
              is_lead: false,
              is_active: true,
              joined_date: null,
              left_date: null,
              notes: null,
              created_by: '',
              updated_by: null,
              created_at: '',
              updated_at: '',
              user_name: task.assigned_user_name,
              user_email: task.assigned_user_email || '',
              user_first_name: undefined,
              user_last_name: undefined,
              user_phone: undefined,
              task_count: 0,
              completed_task_count: 0
            };
          }
        }
        
        return {
          ...task,
          assigned_crew_member: assignedCrewMember
        };
      });
      setTasksWithCrew(tasksWithCrewData);
      
      // Run full project automation with runtime engine
      try {
        await projectTaskService.runFullProjectAutomation(projectId);
      } catch (automationError) {
        console.warn('Full automation check failed:', automationError);
        // Don't show error to user as this is background automation
      }
    } catch (err) {
      console.error('Error loading project data:', err);
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const handleAddCrewMember = (role: ProjectRole) => {
    setSelectedRole(role);
    setShowCrewModal(true);
  };

  const handleRemoveCrewMember = async (crewMember: ProjectCrewWithUser) => {
    // Confirmation dialog for crew member removal
    if (!confirm(`Are you sure you want to remove ${crewMember.user_name} from the ${crewMember.role_name} role? This will also unassign them from all related tasks.`)) {
      return;
    }

    try {
      await projectCrewService.removeCrewMember(crewMember.project_crew_id);
      
      notifications.show({
        title: 'Success',
        message: `${crewMember.user_name} removed from ${crewMember.role_name} successfully`,
        color: 'green',
        icon: <IconCircleCheck size={16} />
      });
      
      loadProjectData();
    } catch (err) {
      console.error('Error removing crew member:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to remove crew member. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />
      });
    }
  };

  const handleStartTask = async (task: ProjectTaskWithUser) => {
    // Validation before starting task
    if (task.task_status !== 'pending') {
      notifications.show({
        title: 'Cannot Start Task',
        message: 'Task must be in "pending" status to start',
        color: 'yellow',
        icon: <IconAlertCircle size={16} />
      });
      return;
    }

    if (!task.assigned_user_name) {
      notifications.show({
        title: 'Cannot Start Task',
        message: 'Task must be assigned to a user before starting',
        color: 'yellow',
        icon: <IconAlertCircle size={16} />
      });
      return;
    }

    try {
      await projectTaskService.startTask({
        project_task_id: task.project_task_id
      });
      
      notifications.show({
        title: 'Success',
        message: `Task "${task.task_name}" started successfully`,
        color: 'green',
        icon: <IconCircleCheck size={16} />
      });
      
      loadProjectData();
    } catch (err) {
      console.error('Error starting task:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to start task. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />
      });
    }
  };

  const handleCompleteTask = async (task: ProjectTaskWithUser) => {
    // Validation before completing task
    if (task.task_status !== 'ongoing') {
      notifications.show({
        title: 'Cannot Complete Task',
        message: 'Task must be in "ongoing" status to complete',
        color: 'yellow',
        icon: <IconAlertCircle size={16} />
      });
      return;
    }

    // Confirmation dialog for task completion
    if (!confirm(`Are you sure you want to complete the task "${task.task_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await projectTaskService.completeTask({
        project_task_id: task.project_task_id
      });
      
      notifications.show({
        title: 'Success',
        message: `Task "${task.task_name}" completed successfully`,
        color: 'green',
        icon: <IconCircleCheck size={16} />
      });
      
      loadProjectData();
    } catch (err) {
      console.error('Error completing task:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to complete task. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />
      });
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatusType) => {
    try {
      // Use the new runtime engine for status updates
      const startedCount = await projectTaskService.updateTaskStatusWithEngine(taskId, newStatus);
      
      let message = `Task status updated to ${newStatus}`;
      if (startedCount > 0) {
        message += ` (${startedCount} dependent tasks automatically started)`;
      }
      
      notifications.show({
        title: 'Success',
        message,
        color: 'green',
        icon: <IconCircleCheck size={16} />
      });
      
      loadProjectData();
    } catch (err) {
      console.error('Error updating task status:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to update task status',
        color: 'red',
        icon: <IconAlertCircle size={16} />
      });
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Record<string, unknown>) => {
    try {
      await projectTaskService.update(taskId, updates);
      
      notifications.show({
        title: 'Success',
        message: 'Task updated successfully',
        color: 'green',
        icon: <IconCircleCheck size={16} />
      });
      
      loadProjectData();
    } catch (err) {
      console.error('Error updating task:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to update task',
        color: 'red',
        icon: <IconAlertCircle size={16} />
      });
    }
  };

  const handleRunAutoAssignment = async () => {
    if (!projectId) return;
    
    try {
      const result = await projectTaskService.runFullProjectAutomation(projectId);
      
      notifications.show({
        title: 'Auto-Assignment Complete',
        message: `Started ${result.startedCount} tasks, escalated ${result.escalatedCount} overdue tasks`,
        color: 'green',
        icon: <IconCircleCheck size={16} />
      });
      
      loadProjectData();
    } catch (err) {
      console.error('Error running auto-assignment:', err);
      notifications.show({
        title: 'Auto-Assignment Failed',
        message: 'Failed to run auto-assignment. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />
      });
    }
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!project) {
    return (
      <Center h={400}>
        <Stack align="center">
          <ThemeIcon size={60} radius="xl" variant="light" color="red">
            <IconAlertCircle size={30} />
          </ThemeIcon>
          <Text size="lg" fw={500} c="dimmed">Project not found</Text>
          <Button onClick={() => navigate('/admin/projects')}>
            Back to Projects
          </Button>
        </Stack>
      </Center>
    );
  }

  const progressPercentage = project.total_tasks > 0 
    ? Math.round((project.completed_tasks / project.total_tasks) * 100)
    : 0;

  const statusColors: Record<string, string> = {
    planning: 'yellow',
    active: 'green',
    on_hold: 'orange',
    completed: 'blue',
    cancelled: 'red'
  };

  return (
    <Stack>
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Anchor 
            component="button"
            onClick={() => navigate('/admin/projects')}
            size="sm"
            c="dimmed"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <IconArrowLeft size={16} />
            Back to Projects
          </Anchor>
          <Title order={2} mt="xs">{project.project_name}</Title>
          {project.project_description && (
            <Text c="dimmed" mt={5}>{project.project_description}</Text>
          )}
        </div>
        <Badge 
          color={statusColors[project.project_status]} 
          variant="filled" 
          size="lg"
        >
          {project.project_status.toUpperCase()}
        </Badge>
      </Group>

      {/* Error Alert */}
      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Error" 
          color="red" 
          withCloseButton 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconBriefcase size={14} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="roles" leftSection={<IconUsers size={14} />}>
            Roles & Crew ({rolesWithCrew.length})
          </Tabs.Tab>
          <Tabs.Tab value="tasks" leftSection={<IconChecklist size={14} />}>
            Task Management ({tasks.length})
          </Tabs.Tab>
          <Tabs.Tab value="legacy-tasks" leftSection={<IconProgress size={14} />}>
            Legacy Tasks List
          </Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Panel value="overview" pt="xl">
          <Grid gutter="lg">
            {/* Progress Card */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                <Title order={4} mb="md">Progress</Title>
                
                <Stack>
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Text fw={500}>Overall Progress</Text>
                      <Text fw={600} size="lg">{progressPercentage}%</Text>
                    </Group>
                    <Progress value={progressPercentage} size="xl" radius="xl" />
                  </div>
                  
                  <SimpleGrid cols={2} spacing="md">
                    <Paper p="md" radius="md" withBorder>
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="gray">
                          <IconChecklist size={20} />
                        </ThemeIcon>
                        <div>
                          <Text size="xs" c="dimmed">Total Tasks</Text>
                          <Text size="xl" fw={700}>{project.total_tasks}</Text>
                        </div>
                      </Group>
                    </Paper>
                    
                    <Paper p="md" radius="md" withBorder>
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="green">
                          <IconCircleCheck size={20} />
                        </ThemeIcon>
                        <div>
                          <Text size="xs" c="dimmed">Completed</Text>
                          <Text size="xl" fw={700} c="green">{project.completed_tasks}</Text>
                        </div>
                      </Group>
                    </Paper>
                    
                    <Paper p="md" radius="md" withBorder>
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="blue">
                          <IconProgress size={20} />
                        </ThemeIcon>
                        <div>
                          <Text size="xs" c="dimmed">In Progress</Text>
                          <Text size="xl" fw={700} c="blue">{project.in_progress_tasks}</Text>
                        </div>
                      </Group>
                    </Paper>
                    
                    <Paper p="md" radius="md" withBorder>
                      <Group>
                        <ThemeIcon size="lg" variant="light" color="yellow">
                          <IconClock size={20} />
                        </ThemeIcon>
                        <div>
                          <Text size="xs" c="dimmed">Pending/Ready</Text>
                          <Text size="xl" fw={700} c="yellow">{project.pending_tasks}</Text>
                        </div>
                      </Group>
                    </Paper>
                  </SimpleGrid>
                </Stack>
              </Card>
            </Grid.Col>

            {/* Crew Assignment Card */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                <Title order={4} mb="md">Crew Assignment</Title>
                
                <Stack>
                  <Paper p="xl" radius="md" withBorder>
                    <Center>
                      <Stack align="center">
                        <ThemeIcon size={60} variant="light" color="indigo">
                          <IconUsers size={30} />
                        </ThemeIcon>
                        <div style={{ textAlign: 'center' }}>
                          <Text size="xl" fw={700}>
                            {project.assigned_roles} / {project.assigned_roles + project.unassigned_roles}
                          </Text>
                          <Text c="dimmed">Roles Assigned</Text>
                        </div>
                      </Stack>
                    </Center>
                  </Paper>
                  
                  {rolesWithCrew.some(role => role.filled_count < role.required_count) && (
                    <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                      {rolesWithCrew.filter(role => role.filled_count < role.required_count).length} roles need crew assignment
                    </Alert>
                  )}
                  
                  <Button 
                    fullWidth 
                    size="md"
                    onClick={() => setActiveTab('roles')}
                    leftSection={<IconUserPlus size={18} />}
                  >
                    Manage Crew Assignments
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>

            {/* Project Info */}
            <Grid.Col span={12}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Project Information</Title>
                <SimpleGrid cols={3} spacing="md">
                  {project.project_start_date && (
                    <div>
                      <Text size="sm" c="dimmed">Start Date</Text>
                      <Text fw={500}>
                        {new Date(project.project_start_date).toLocaleDateString()}
                      </Text>
                    </div>
                  )}
                  {project.project_end_date && (
                    <div>
                      <Text size="sm" c="dimmed">End Date</Text>
                      <Text fw={500}>
                        {new Date(project.project_end_date).toLocaleDateString()}
                      </Text>
                    </div>
                  )}
                  <div>
                    <Text size="sm" c="dimmed">Created</Text>
                    <Text fw={500}>
                      {new Date(project.created_at).toLocaleDateString()}
                    </Text>
                  </div>
                </SimpleGrid>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* Roles Tab */}
        <Tabs.Panel value="roles" pt="xl">
          <Stack>
            {rolesWithCrew.map((role) => (
              <Card key={role.project_role_id} shadow="sm" padding="lg" radius="md" withBorder>
                <Stack>
                  {/* Role Header */}
                  <Group justify="space-between">
                    <div>
                      <Group>
                        <Badge variant="light" color="blue">{role.department_name}</Badge>
                        <Text fw={600} size="lg">{role.role_name}</Text>
                        <Badge 
                          variant={role.filled_count >= role.required_count ? 'filled' : 'outline'}
                          color={role.filled_count >= role.required_count ? 'green' : 'yellow'}
                        >
                          {role.filled_count} / {role.required_count}
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {role.completed_task_count} / {role.task_count} tasks completed
                      </Text>
                    </div>
                    <Button
                      leftSection={<IconUserPlus size={16} />}
                      onClick={() => handleAddCrewMember(role)}
                      disabled={role.filled_count >= role.required_count}
                    >
                      Add Crew
                    </Button>
                  </Group>

                  {/* Crew Members */}
                  {role.crew_members.length > 0 ? (
                    <SimpleGrid cols={1} spacing="sm">
                      {role.crew_members.map((crew) => (
                        <Paper key={crew.project_crew_id} p="md" radius="md" withBorder>
                          <Group justify="space-between">
                            <Group>
                              <Avatar size="md" radius="xl" color="blue">
                                {crew.user_name.charAt(0).toUpperCase()}
                              </Avatar>
                              <div>
                                <Group gap="xs">
                                  <Text fw={500}>{crew.user_name}</Text>
                                  {crew.is_lead && (
                                    <Badge size="xs" color="yellow" variant="filled">
                                      Lead
                                    </Badge>
                                  )}
                                </Group>
                                <Text size="sm" c="dimmed">{crew.user_email}</Text>
                                {crew.notes && (
                                  <Text size="xs" c="dimmed" lineClamp={1}>{crew.notes}</Text>
                                )}
                              </div>
                            </Group>
                            <Group gap="xs">
                              <Text size="sm" c="dimmed">
                                {crew.completed_task_count} / {crew.task_count} tasks
                              </Text>
                              <ActionIcon 
                                color="red" 
                                variant="subtle"
                                onClick={() => handleRemoveCrewMember(crew)}
                                title="Remove from Project"
                              >
                                <IconUserMinus size={16} />
                              </ActionIcon>
                            </Group>
                          </Group>
                        </Paper>
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      No crew members assigned to this role yet
                    </Text>
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
        </Tabs.Panel>

        {/* Task Management Tab - New List View */}
        <Tabs.Panel value="tasks" pt="xl">
          <TaskListView
            projectId={projectId!}
            tasks={tasksWithCrew}
            crew={crew}
            loading={loading}
            onStatusChange={handleTaskStatusChange}
            onTaskUpdate={handleTaskUpdate}
            onRefresh={loadProjectData}
            onRunAutoAssignment={handleRunAutoAssignment}
          />
        </Tabs.Panel>

        {/* Legacy Tasks Tab */}
        <Tabs.Panel value="legacy-tasks" pt="xl">
          <Card shadow="sm" padding={0} radius="md" withBorder>
            <ScrollArea>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Phase</Table.Th>
                    <Table.Th>Step</Table.Th>
                    <Table.Th>Task</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Assigned To</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Est. Hours</Table.Th>
                    <Table.Th style={{ width: 100, textAlign: 'right' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.project_task_id}
                      task={task}
                      onStart={() => handleStartTask(task)}
                      onComplete={() => handleCompleteTask(task)}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Project Crew Modal */}
      {selectedRole && (
        <ProjectCrewModal
          isOpen={showCrewModal}
          onClose={() => {
            setShowCrewModal(false);
            setSelectedRole(null);
          }}
          onSuccess={loadProjectData}
          projectId={projectId!}
          role={selectedRole}
        />
      )}
    </Stack>
  );
}