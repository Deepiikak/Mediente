import { Container, Title, Text, Group, Paper, SimpleGrid, Badge, Button, Avatar } from '@mantine/core';
import AdminLayout from '../../components/AdminLayout';

export default function AdminCrew() {
  return (
    <AdminLayout>
      <Container size="xl">
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={1} mb="xs">
              🔧 Crew
            </Title>
            <Text c="dimmed">
              Manage your production crew members and their skills.
            </Text>
          </div>
          <Button color="blue">
            + Add Crew Member
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Crew
              </Text>
              <Text size="1.4rem">👥</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              89
            </Text>
            <Text c="blue" size="sm" mt="xs">
              All crew members
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
              Ready for work
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                On Assignment
              </Text>
              <Text size="1.4rem">🎬</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              56
            </Text>
            <Text c="orange" size="sm" mt="xs">
              Currently working
            </Text>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Specialists
              </Text>
              <Text size="1.4rem">⭐</Text>
            </Group>
            <Text fw={700} size="xl" mt="md">
              15
            </Text>
            <Text c="purple" size="sm" mt="xs">
              Expert level
            </Text>
          </Paper>
        </SimpleGrid>

        <Paper withBorder p="xl" radius="md">
          <Title order={2} mb="md">🔧 Crew Management</Title>
          <Text c="dimmed" mb="lg">
            Manage your production crew, assign roles, and track availability.
          </Text>
          
          <Group>
            <Button leftSection={<Text size="sm">👤</Text>} color="red">
              Add Crew Member
            </Button>
            <Button variant="outline" leftSection={<Text size="sm">🎭</Text>} color="orange">
              Assign Roles
            </Button>
            <Button variant="light" leftSection={<Text size="sm">📊</Text>} color="yellow">
              Crew Reports
            </Button>
            <Button variant="filled" leftSection={<Text size="sm">📅</Text>} color="purple">
              Schedule View
            </Button>
          </Group>
        </Paper>

        {/* Sample Crew Members */}
        <Paper withBorder p="xl" radius="md" mt="xl">
          <Title order={3} mb="md">Featured Crew Members</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} gap="md">
            <Paper withBorder p="md" radius="md">
              <Group mb="md">
                <Avatar size="lg" color="red">JD</Avatar>
                <div>
                  <Text fw={600}>John Director</Text>
                  <Text size="sm" c="dimmed">Film Director</Text>
                </div>
              </Group>
              <Badge color="green" variant="light" mb="xs">Available</Badge>
              <Text size="sm" c="dimmed">15+ years experience</Text>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Group mb="md">
                <Avatar size="lg" color="blue">SC</Avatar>
                <div>
                  <Text fw={600}>Sarah Cinematographer</Text>
                  <Text size="sm" c="dimmed">DP</Text>
                </div>
              </Group>
              <Badge color="orange" variant="light" mb="xs">On Project</Badge>
              <Text size="sm" c="dimmed">Project Alpha</Text>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Group mb="md">
                <Avatar size="lg" color="green">ML</Avatar>
                <div>
                  <Text fw={600}>Mike Lighting</Text>
                  <Text size="sm" c="dimmed">Gaffer</Text>
                </div>
              </Group>
              <Badge color="blue" variant="light" mb="xs">Specialist</Badge>
              <Text size="sm" c="dimmed">Lighting expert</Text>
            </Paper>
          </SimpleGrid>
        </Paper>
      </Container>
    </AdminLayout>
  );
}
