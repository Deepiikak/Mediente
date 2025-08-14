import { useState, useEffect } from 'react';
import {
  Group,
  Text,
  Container,
  Title,
  Paper,
  SimpleGrid,
  Badge,
  Button,
  Center,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import authService from '../../services/authService';
import type { AdminUser } from '../../types/auth';

export default function AdminDashboard() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        navigate('/admin/login');
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      navigate('/admin/login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
    <Center h="100vh" w="100vw">
    <Loader size="xl" color="blue" />
  </Center>);
  }

  return (
    <AdminLayout>
      <Container size="xl">
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={1} mb="xs">
              🎬 Production Dashboard
            </Title>
            <Text c="dimmed">
              Welcome back, {user?.name}! Here's what's happening with your studio.
            </Text>
          </div>
          <Badge color="green" variant="light" size="lg">
            {user?.role?.replace('_', ' ').toUpperCase()}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Active Projects
              </Text>
              <Text size="1.4rem">🎬</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              12
            </Text>
            <Text c="teal" size="sm" mt="xs">
              +3 new this month
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Production Crew
              </Text>
              <Text size="1.4rem">👥</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              89
            </Text>
            <Text c="blue" size="sm" mt="xs">
              Active crew members
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Equipment Status
              </Text>
              <Text size="1.4rem">🎥</Text>
            </Group>
            <Text fw={700} size="xl" mt="md" c="green">
              All Ready
            </Text>
            <Text c="green" size="sm" mt="xs">
              Equipment operational
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Last Login
              </Text>
              <Text size="1.4rem">👤</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              {user?.last_login_at ? 
                new Date(user.last_login_at).toLocaleDateString() : 
                'First time'
              }
            </Text>
            <Text c="dimmed" size="sm" mt="xs">
              {user?.last_login_at ? 
                new Date(user.last_login_at).toLocaleTimeString() : 
                'Welcome!'
              }
            </Text>
          </Paper>
        </SimpleGrid>

        <Paper withBorder p="xl" radius="md">
          <Title order={2} mb="md">🎬 Production Hub</Title>
          <Text c="dimmed" mb="lg">
            Manage your film production studio with these essential tools.
          </Text>
          
          <Group>
            <Button leftSection={<Text size="sm">🎭</Text>} color="red" component="a" href="/admin/users">
              Manage Cast & Crew
            </Button>
            <Button variant="outline" leftSection={<Text size="sm">🎥</Text>} color="orange">
              Equipment Manager
            </Button>
            <Button variant="light" leftSection={<Text size="sm">📊</Text>} color="yellow">
              Production Reports
            </Button>
            <Button variant="filled" leftSection={<Text size="sm">🎞️</Text>} color="purple">
              Project Timeline
            </Button>
          </Group>
        </Paper>
      </Container>
    </AdminLayout>
  );
}