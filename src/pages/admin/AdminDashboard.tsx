import { useState, useEffect } from 'react';
import {
  AppShell,
  Burger,
  Group,
  Text,
  NavLink,
  Button,
  Container,
  Title,
  Paper,
  SimpleGrid,
  Badge,
  Avatar,
  Menu,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
  IconDashboard, 
  IconUsers, 
  IconSettings, 
  IconLogout,
  IconUser,
  IconChevronDown
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import type { AdminUser } from '../../types/auth';
import UserInfoForm from './UserInfoForm';

export default function AdminDashboard() {
  const [opened, { toggle }] = useDisclosure();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'users'>('dashboard');
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
    } catch {
      console.error('Failed to load user');
      navigate('/admin/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      notifications.show({
        title: 'Logged Out',
        message: 'You have been successfully logged out.',
        color: 'blue',
      });
      navigate('/admin/login');
    } catch {
      notifications.show({
        title: 'Logout Error',
        message: 'Failed to logout. Please try again.',
        color: 'red',
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap="xs">
              
              <Text size="xl" fw={700} c="blue">MEDIENTE</Text>
              
            </Group>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="subtle" rightSection={<IconChevronDown size={16} />}>
                <Group gap="xs">
                  <Avatar size="sm" color="blue">
                    {user?.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text size="sm">{user?.name}</Text>
                </Group>
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Account</Menu.Label>
              <Menu.Item leftSection={<IconUser size={14} />}>
                Profile
              </Menu.Item>
              <Menu.Item leftSection={<IconSettings size={14} />}>
                Settings
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item 
                leftSection={<IconLogout size={14} />}
                color="red"
                onClick={handleLogout}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text size="sm" c="dimmed" mb="md">Navigation</Text>
        
        <NavLink
          href="#"
          label="Dashboard"
          leftSection={<IconDashboard size="1rem" />}
          active={currentView === 'dashboard'}
          onClick={() => setCurrentView('dashboard')}
        />
        
        <NavLink
          href="#"
          label="User Management"
          leftSection={<IconUsers size="1rem" />}
          active={currentView === 'users'}
          onClick={() => setCurrentView('users')}
        />
        
        <NavLink
          href="#"
          label="Settings"
          leftSection={<IconSettings size="1rem" />}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl">
          {currentView === 'dashboard' ? (
            <>
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
                    <IconUser size="1.4rem" color="gray" />
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
                  <Button leftSection={<Text size="sm">🎭</Text>} color="red">
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
            </>
          ) : (
            <UserInfoForm />
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}