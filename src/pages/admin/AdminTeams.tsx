import { Container, Title, Text, Group, Paper, SimpleGrid, Badge, Button, Avatar } from '@mantine/core';

export default function AdminTeams() {
  return (
      <Container size="xl">
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={1} mb="xs">
              👥 Teams
            </Title>
            <Text c="dimmed">
              Manage your production teams and crew assignments.
            </Text>
          </div>
          <Button color="blue">
            + New Team
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="xl">
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Active Teams
              </Text>
              <Text size="1.4rem">👥</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              8
            </Text>
            <Text c="teal" size="sm" mt="xs">
              Currently working
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Team Members
              </Text>
              <Text size="1.4rem">👤</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              89
            </Text>
            <Text c="blue" size="sm" mt="xs">
              Total crew members
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Available
              </Text>
              <Text size="1.4rem">✅</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              23
            </Text>
            <Text c="green" size="sm" mt="xs">
              Ready for assignment
            </Text>
          </Paper>
        </SimpleGrid>

        <Paper withBorder p="xl" radius="md">
          <Title order={2} mb="md">👥 Team Management</Title>
          <Text c="dimmed" mb="lg">
            Organize your production teams and manage crew assignments efficiently.
          </Text>
          
          <Group>
            <Button leftSection={<Text size="sm">👥</Text>} color="red">
              Create Team
            </Button>
            <Button variant="outline" leftSection={<Text size="sm">👤</Text>} color="orange">
              Assign Members
            </Button>
            <Button variant="light" leftSection={<Text size="sm">📊</Text>} color="yellow">
              Team Reports
            </Button>
            <Button variant="filled" leftSection={<Text size="sm">🎭</Text>} color="purple">
              Team Schedule
            </Button>
          </Group>
        </Paper>

        {/* Sample Teams */}
        <Paper withBorder p="xl" radius="md" mt="xl">
          <Title order={3} mb="md">Current Teams</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            <Paper withBorder p="md" radius="md">
              <Group mb="md">
                <Avatar size="lg" color="red">C</Avatar>
                <div>
                  <Text fw={600}>Camera Team</Text>
                  <Text size="sm" c="dimmed">12 members</Text>
                </div>
              </Group>
              <Badge color="green" variant="light" mb="xs">Active</Badge>
              <Text size="sm" c="dimmed">Currently on Project Alpha</Text>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Group mb="md">
                <Avatar size="lg" color="blue">L</Avatar>
                <div>
                  <Text fw={600}>Lighting Team</Text>
                  <Text size="sm" c="dimmed">8 members</Text>
                </div>
              </Group>
              <Badge color="blue" variant="light" mb="xs">Available</Badge>
              <Text size="sm" c="dimmed">Ready for next assignment</Text>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Group mb="md">
                <Avatar size="lg" color="green">S</Avatar>
                <div>
                  <Text fw={600}>Sound Team</Text>
                  <Text size="sm" c="dimmed">6 members</Text>
                </div>
              </Group>
              <Badge color="orange" variant="light" mb="xs">Preparing</Badge>
              <Text size="sm" c="dimmed">Setting up for Project Beta</Text>
            </Paper>
          </SimpleGrid>
        </Paper>
      </Container>
  );
}
