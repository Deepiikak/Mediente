import { Container, Title, Text, Group, Paper, SimpleGrid, Badge, Button } from '@mantine/core';
import AdminLayout from '../../components/AdminLayout';

export default function AdminProjects() {
  return (
    <AdminLayout>
      <Container size="xl">
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={1} mb="xs">
              🎬 Projects
            </Title>
            <Text c="dimmed">
              Manage your film production projects and track their progress.
            </Text>
          </div>
          <Button color="blue">
            + New Project
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="xl">
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
              Currently in production
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Pre-Production
              </Text>
              <Text size="1.4rem">📋</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              5
            </Text>
            <Text c="blue" size="sm" mt="xs">
              Planning phase
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Completed
              </Text>
              <Text size="1.4rem">✅</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              28
            </Text>
            <Text c="green" size="sm" mt="xs">
              Finished this year
            </Text>
          </Paper>
        </SimpleGrid>

        <Paper withBorder p="xl" radius="md">
          <Title order={2} mb="md">🎬 Project Management</Title>
          <Text c="dimmed" mb="lg">
            Create and manage your film production projects with comprehensive tools.
          </Text>
          
          <Group>
            <Button leftSection={<Text size="sm">🎭</Text>} color="red">
              Create Project
            </Button>
            <Button variant="outline" leftSection={<Text size="sm">📊</Text>} color="orange">
              Project Reports
            </Button>
            <Button variant="light" leftSection={<Text size="sm">📅</Text>} color="yellow">
              Timeline View
            </Button>
            <Button variant="filled" leftSection={<Text size="sm">🎞️</Text>} color="purple">
              Project Archive
            </Button>
          </Group>
        </Paper>
      </Container>
    </AdminLayout>
  );
}
