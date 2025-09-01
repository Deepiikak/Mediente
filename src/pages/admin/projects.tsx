import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TextInput,
  Select,
  Textarea,
  Modal,
  Alert,
  Loader,
  Center,
  SimpleGrid,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { 
  IconPlus, 
  IconSearch, 
  IconEye,
  IconCalendar,
  IconUsers,
  IconChecklist,
  IconProgress,
  IconCircleCheck,
  IconClock,
  IconX,
  IconAlertCircle
} from '@tabler/icons-react';
import type { 
  ProjectWithStats,
  CreateProjectRequest,
  ProjectFilters,
  PaginationParams 
} from '../../types/project';
import type { ProjectTemplate } from '../../types/templates';
import { projectService } from '../../services/projectService';
import { projectTemplateService } from '../../services/projectTemplateService';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: CreateProjectRequest) => void;
  templates: ProjectTemplate[];
}

function CreateProjectModal({ isOpen, onClose, onSave, templates }: CreateProjectModalProps) {
  const [formData, setFormData] = useState<CreateProjectRequest>({
    project_name: '',
    project_description: '',
    template_id: '',
    project_start_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Project name validation
    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required';
    } else if (formData.project_name.trim().length < 3) {
      newErrors.project_name = 'Project name must be at least 3 characters';
    } else if (formData.project_name.trim().length > 200) {
      newErrors.project_name = 'Project name must be less than 200 characters';
    }

    // Template validation
    if (!formData.template_id) {
      newErrors.template_id = 'Template selection is required';
    }

    // Description validation (optional but with length limit)
    if (formData.project_description && formData.project_description.length > 1000) {
      newErrors.project_description = 'Description must be less than 1000 characters';
    }

    // Start date validation (optional but must be valid date if provided)
    if (formData.project_start_date) {
      const startDate = new Date(formData.project_start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      if (isNaN(startDate.getTime())) {
        newErrors.project_start_date = 'Invalid date format';
      } else if (startDate < today) {
        newErrors.project_start_date = 'Start date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      // Reset form on success
      setFormData({
        project_name: '',
        project_description: '',
        template_id: '',
        project_start_date: ''
      });
      setErrors({});
    } catch (error) {
      // Handle API errors
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title="Create New Project"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Project Name"
            placeholder="Enter project name"
            value={formData.project_name}
            onChange={(e) => {
              setFormData({ ...formData, project_name: e.target.value });
              // Clear error when user starts typing
              if (errors.project_name) {
                setErrors({ ...errors, project_name: '' });
              }
            }}
            error={errors.project_name}
            required
            withAsterisk
          />
          
          <Select
            label="Template"
            placeholder="Select a template"
            value={formData.template_id}
            onChange={(value) => {
              setFormData({ ...formData, template_id: value || '' });
              // Clear error when user selects
              if (errors.template_id) {
                setErrors({ ...errors, template_id: '' });
              }
            }}
            data={templates.map((template) => ({
              value: template.template_id,
              label: template.template_name
            }))}
            error={errors.template_id}
            required
            withAsterisk
            searchable
            nothingFoundMessage="No templates available"
          />
          
          <Textarea
            label="Description"
            placeholder="Enter project description (optional)"
            value={formData.project_description || ''}
            onChange={(e) => {
              setFormData({ ...formData, project_description: e.target.value });
              // Clear error when user starts typing
              if (errors.project_description) {
                setErrors({ ...errors, project_description: '' });
              }
            }}
            error={errors.project_description}
            rows={3}
            maxLength={1000}
          />
          
          <DateInput
            label="Start Date"
            placeholder="Select start date (optional)"
            value={formData.project_start_date ? new Date(formData.project_start_date) : null}
            onChange={(value: unknown) => {
              let dateString = '';
              if (value) {
                if (value instanceof Date) {
                  dateString = value.toISOString().split('T')[0];
                } else if (typeof value === 'string') {
                  dateString = value;
                }
              }
              setFormData({ 
                ...formData, 
                project_start_date: dateString
              });
              // Clear error when user selects date
              if (errors.project_start_date) {
                setErrors({ ...errors, project_start_date: '' });
              }
            }}
            error={errors.project_start_date}
            clearable
            minDate={new Date()}
          />
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Project
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function ProjectCard({ project }: { project: ProjectWithStats }) {
  const navigate = useNavigate();
  
  const statusColors: Record<string, string> = {
    planning: 'yellow',
    active: 'green',
    on_hold: 'orange',
    completed: 'blue',
    cancelled: 'red'
  };

  const progressPercentage = project.total_tasks > 0 
    ? Math.round((project.completed_tasks / project.total_tasks) * 100)
    : 0;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
      <Stack h="100%">
        <Group justify="space-between" mb="xs">
          <Text fw={600} size="lg" lineClamp={1}>
            {project.project_name}
          </Text>
          <Badge color={statusColors[project.project_status]} variant="light" radius="sm">
            {project.project_status.replace('_', ' ').toUpperCase()}
          </Badge>
        </Group>
        
        {project.project_description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {project.project_description}
          </Text>
        )}
        
        <Stack style={{ flex: 1 }}>
          {/* Progress */}
          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm" fw={500}>Progress</Text>
              <Text size="sm" c="dimmed">{progressPercentage}%</Text>
            </Group>
            <Progress value={progressPercentage} size="md" radius="xl" />
          </div>
          
          {/* Task Statistics */}
          <SimpleGrid cols={2} spacing="xs">
            <Paper p="xs" radius="sm" withBorder>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="gray">
                  <IconChecklist size={14} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">Total Tasks</Text>
                  <Text fw={600} size="sm">{project.total_tasks}</Text>
                </div>
              </Group>
            </Paper>
            
            <Paper p="xs" radius="sm" withBorder>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="green">
                  <IconCircleCheck size={14} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">Completed</Text>
                  <Text fw={600} size="sm" c="green">{project.completed_tasks}</Text>
                </div>
              </Group>
            </Paper>
            
            <Paper p="xs" radius="sm" withBorder>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="blue">
                  <IconProgress size={14} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">In Progress</Text>
                  <Text fw={600} size="sm" c="blue">{project.in_progress_tasks}</Text>
                </div>
              </Group>
            </Paper>
            
            <Paper p="xs" radius="sm" withBorder>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="gray">
                  <IconClock size={14} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">Pending</Text>
                  <Text fw={600} size="sm">{project.pending_tasks}</Text>
                </div>
              </Group>
            </Paper>
            
            {project.escalated_tasks > 0 && (
              <Paper p="xs" radius="sm" withBorder>
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="red">
                    <IconAlertCircle size={14} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">Escalated</Text>
                    <Text fw={600} size="sm" c="red">{project.escalated_tasks}</Text>
                  </div>
                </Group>
              </Paper>
            )}
          </SimpleGrid>
          
          {/* Role Assignment */}
          <Paper p="xs" radius="sm" withBorder>
            <Group justify="space-between">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="indigo">
                  <IconUsers size={14} />
                </ThemeIcon>
                <Text size="sm" fw={500}>Roles Assigned</Text>
              </Group>
              <Text size="sm" fw={600}>
                {project.assigned_roles} / {project.assigned_roles + project.unassigned_roles}
              </Text>
            </Group>
          </Paper>
          
          {/* Dates */}
          <Group gap="xs">
            <ThemeIcon size="sm" variant="light" color="gray">
              <IconCalendar size={14} />
            </ThemeIcon>
            <Text size="xs" c="dimmed">
              {project.project_start_date && 
                `Start: ${new Date(project.project_start_date).toLocaleDateString()} • `
              }
              Created: {new Date(project.created_at).toLocaleDateString()}
            </Text>
          </Group>
        </Stack>
        
        <Button 
          fullWidth 
          mt="auto"
          onClick={() => navigate(`/admin/projects/${project.project_id}`)}
          leftSection={<IconEye size={16} />}
        >
          View Details
        </Button>
      </Stack>
    </Card>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [pagination] = useState<PaginationParams>({ page: 1, pageSize: 12 });
  const [searchError, setSearchError] = useState('');

  const validateSearchInput = (value: string) => {
    // Prevent overly long search terms
    if (value.length > 100) {
      setSearchError('Search term must be less than 100 characters');
      return false;
    }
    
    // Prevent potentially dangerous characters (basic XSS prevention)
    const dangerousChars = /<script|javascript:|on\w+=/i;
    if (dangerousChars.test(value)) {
      setSearchError('Invalid characters in search term');
      return false;
    }
    
    setSearchError('');
    return true;
  };

  const handleSearchChange = (value: string) => {
    if (validateSearchInput(value)) {
      setFilters({ ...filters, search: value });
    } else {
      // Don't update filters if validation fails, but show the input value
      setFilters({ ...filters, search: value });
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load projects with stats
      const projectsResponse = await projectService.getPaginated(pagination, filters);
      
      // Get detailed stats for each project
      const projectsWithStats = await Promise.all(
        projectsResponse.data.map(async (project) => {
          try {
            const stats = await projectService.getByIdWithStats(project.project_id);
            return stats || {
              ...project,
              total_tasks: 0,
              completed_tasks: 0,
              in_progress_tasks: 0,
              pending_tasks: 0,
              escalated_tasks: 0,
              assigned_roles: 0,
              unassigned_roles: 0
            };
          } catch (err) {
            console.error('Error loading stats for project:', project.project_id, err);
            return {
              ...project,
              total_tasks: 0,
              completed_tasks: 0,
              in_progress_tasks: 0,
              pending_tasks: 0,
              escalated_tasks: 0,
              assigned_roles: 0,
              unassigned_roles: 0
            };
          }
        })
      );
      
      setProjects(projectsWithStats);
      
      // Load templates for create modal
      if (templates.length === 0) {
        const templatesData = await projectTemplateService.getAll();
        setTemplates(templatesData);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pagination, filters, templates.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async (request: CreateProjectRequest) => {
    try {
      await projectService.createFromTemplate(request);
      setShowCreateModal(false);
      notifications.show({
        title: 'Success',
        message: 'Project created successfully',
        color: 'green',
        icon: <IconCircleCheck size={16} />
      });
      loadData(); // Reload projects
    } catch (err) {
      console.error('Error creating project:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to create project. Please try again.',
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

  return (
    <Stack>
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Projects</Title>
          <Text c="dimmed" mt={5}>Manage your film production projects</Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Project
        </Button>
      </Group>

      {/* Filters */}
      <Paper p="md" radius="md" withBorder>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <TextInput
              placeholder="Search projects..."
              leftSection={<IconSearch size={16} />}
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.currentTarget.value)}
              error={searchError}
              maxLength={100}
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              placeholder="All Statuses"
              value={filters.project_status || ''}
              onChange={(value) => setFilters({ ...filters, project_status: value as ProjectFilters['project_status'] })}
              data={[
                { value: '', label: 'All Statuses' },
                { value: 'planning', label: 'Planning' },
                { value: 'active', label: 'Active' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
              clearable
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              placeholder="All Templates"
              value={filters.template_id || ''}
              onChange={(value) => setFilters({ ...filters, template_id: value || '' })}
              data={[
                { value: '', label: 'All Templates' },
                ...templates.map((template) => ({
                  value: template.template_id,
                  label: template.template_name
                }))
              ]}
              clearable
            />
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Button
              variant="subtle"
              onClick={() => setFilters({})}
              fullWidth
              leftSection={<IconX size={16} />}
            >
              Clear Filters
            </Button>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Error Message */}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Paper p="xl" radius="md" withBorder>
          <Center>
            <Stack align="center">
              <ThemeIcon size={60} radius="xl" variant="light" color="gray">
                <IconChecklist size={30} />
              </ThemeIcon>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={500} c="dimmed">No projects found</Text>
                <Text size="sm" c="dimmed" mt={5}>Create your first project to get started</Text>
              </div>
              <Button 
                leftSection={<IconPlus size={16} />}
                onClick={() => setShowCreateModal(true)}
              >
                Create Project
              </Button>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <Grid gutter="lg">
          {projects.map((project) => (
            <Grid.Col key={project.project_id} span={{ base: 12, sm: 6, lg: 4 }}>
              <ProjectCard project={project} />
            </Grid.Col>
          ))}
        </Grid>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateProject}
        templates={templates}
      />
    </Stack>
  );
}