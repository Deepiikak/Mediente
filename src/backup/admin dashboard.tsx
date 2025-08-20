import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  SimpleGrid,
  Badge,
  Button,
  Stack,
  LoadingOverlay,
  Alert,
  Modal,
  TextInput,
  Textarea,
  Avatar,
  Progress,
  ActionIcon,
  Menu,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconBuilding,
  IconUsers,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDots,
  IconEye,
  IconChartBar,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import userService from '../../services/userService';
import type { Department } from '../../types/userManagement';

interface DepartmentWithStats extends Department {
  userCount?: number;
  activeUsers?: number;
  inactiveUsers?: number;
}

export default function AdminDepartments() {
  const [departments, setDepartments] = useState<DepartmentWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentWithStats | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [departmentsData, statsData] = await Promise.all([
        userService.getDepartments(),
        userService.getUserStatistics(),
      ]);

      // Enhance departments with user statistics
      const enhancedDepartments = departmentsData.map(dept => {
        const userCount = statsData.departmentStats[dept.name] || 0;
        return {
          ...dept,
          userCount,
          activeUsers: userCount, // Assuming all counted users are active
          inactiveUsers: 0,
        };
      });

      setDepartments(enhancedDepartments);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading departments:', error);
      setError(error instanceof Error ? error.message : 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (department: DepartmentWithStats) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
    });
    open();
  };

  const handleAdd = () => {
    setEditingDepartment(null);
    setFormData({ name: '', description: '' });
    open();
  };

  const handleSubmit = async () => {
    try {
      // Note: In a real application, you would have API endpoints for department CRUD
      notifications.show({
        title: editingDepartment ? 'Department Updated' : 'Department Created',
        message: `Department "${formData.name}" has been ${editingDepartment ? 'updated' : 'created'} successfully.`,
        color: 'green',
      });
      
      close();
      loadData(); // Refresh data
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save department. Please try again.',
        color: 'red',
      });
    }
  };

  const getDepartmentIcon = (name: string) => {
    const iconMap: Record<string, string> = {
      Film: '🎬',
      Talent: '🎭',
      Location: '📍',
      Production: '🎥',
      Camera: '📷',
      Sound: '🎵',
      Art: '🎨',
      Costume: '👗',
      Makeup: '💄',
      'Post-Production': '✂️',
      Marketing: '📢',
      Finance: '💰',
      HR: '👥',
      IT: '💻',
    };
    return iconMap[name] || '🏢';
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 80) return 'red';
    if (percentage >= 60) return 'orange';
    if (percentage >= 40) return 'yellow';
    if (percentage >= 20) return 'blue';
    return 'gray';
  };

  if (isLoading) {
    return (
      <Container size="xl">
        <LoadingOverlay visible={true} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Error Loading Departments">
          {error}
        </Alert>
        <Button onClick={loadData} mt="md">
          Try Again
        </Button>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} mb="xs">
              🏢 Departments
            </Title>
            <Text c="dimmed">
              Manage departments and view team distribution across the organization.
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={handleAdd}>
            Add Department
          </Button>
        </Group>

        {/* Statistics Overview */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Departments
              </Text>
              <Text size="1.4rem">🏢</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              {departments.length}
            </Text>
            <Text c="blue" size="sm" mt="xs">
              Active departments
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Staff
              </Text>
              <Text size="1.4rem">👥</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              {statistics?.totalUsers || 0}
            </Text>
            <Text c="green" size="sm" mt="xs">
              Across all departments
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Largest Department
              </Text>
              <Text size="1.4rem">📊</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              {departments.reduce((max, dept) => 
                (dept.userCount || 0) > (max.userCount || 0) ? dept : max, 
                departments[0]
              )?.name || 'N/A'}
            </Text>
            <Text c="orange" size="sm" mt="xs">
              {departments.reduce((max, dept) => 
                Math.max(max, dept.userCount || 0), 0
              )} members
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Average Team Size
              </Text>
              <Text size="1.4rem">⚖️</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              {departments.length > 0 
                ? Math.round((statistics?.totalUsers || 0) / departments.length)
                : 0}
            </Text>
            <Text c="purple" size="sm" mt="xs">
              Members per department
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Departments Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {departments.map((department) => (
            <Paper key={department.id} withBorder p="lg" radius="md">
              <Group justify="space-between" mb="md">
                <Group>
                  <Avatar size="lg" radius="md" color="blue">
                    <Text size="xl">{getDepartmentIcon(department.name)}</Text>
                  </Avatar>
                  <div>
                    <Text fw={600} size="lg">{department.name}</Text>
                    <Text size="sm" c="dimmed">
                      {department.userCount || 0} members
                    </Text>
                  </div>
                </Group>
                
                <Menu shadow="md">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item 
                      leftSection={<IconEye size={14} />}
                      onClick={() => {/* Navigate to department details */}}
                    >
                      View Details
                    </Menu.Item>
                    <Menu.Item 
                      leftSection={<IconEdit size={14} />}
                      onClick={() => handleEdit(department)}
                    >
                      Edit Department
                    </Menu.Item>
                    <Menu.Item 
                      leftSection={<IconChartBar size={14} />}
                      onClick={() => {/* Show analytics */}}
                    >
                      View Analytics
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item 
                      leftSection={<IconTrash size={14} />}
                      color="red"
                    >
                      Delete Department
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              {department.description && (
                <Text size="sm" c="dimmed" mb="md">
                  {department.description}
                </Text>
              )}

              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Team Utilization</Text>
                  <Badge 
                    color={getUtilizationColor((department.userCount || 0) * 10)}
                    variant="light"
                  >
                    {department.userCount || 0} members
                  </Badge>
                </Group>
                
                <Progress 
                  value={Math.min((department.userCount || 0) * 10, 100)} 
                  color={getUtilizationColor((department.userCount || 0) * 10)}
                  size="sm"
                />

                <Group justify="space-between" mt="md">
                  <Button 
                    variant="light" 
                    size="xs" 
                    leftSection={<IconUsers size={14} />}
                    onClick={() => navigate(`/admin/users?department=${encodeURIComponent(department.name)}`)}
                  >
                    View Members
                  </Button>
                  <Button 
                    variant="outline" 
                    size="xs"
                    leftSection={<IconEdit size={14} />}
                    onClick={() => handleEdit(department)}
                  >
                    Manage
                  </Button>
                </Group>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>

        {/* Add/Edit Department Modal */}
        <Modal 
          opened={opened} 
          onClose={close} 
          title={editingDepartment ? 'Edit Department' : 'Add New Department'}
        >
          <Stack gap="md">
            <TextInput
              label="Department Name"
              placeholder="Enter department name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <Textarea
              label="Description"
              placeholder="Enter department description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingDepartment ? 'Update' : 'Create'} Department
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
