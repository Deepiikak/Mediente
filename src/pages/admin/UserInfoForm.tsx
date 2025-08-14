import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  TextInput,
  Select,
  Textarea,
  Button,
  Group,
  Stack,
  Grid,
  Text,
  Badge,
  ActionIcon,
  Modal,
  Table,
  Pagination,
  Switch,
  LoadingOverlay,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
  IconUser, 
  IconMail, 
  IconPhone, 
  IconMapPin, 
  IconBriefcase,
  IconEdit,
  IconTrash,
  IconPlus,
  IconSearch,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import type { User, CreateUserData } from '../../types/user';

const initialUser: CreateUserData = {
  name: '',
  email: '',
  phone: '',
  role: '',
  department: '',
  position: '',
  address: '',
  bio: '',
  isActive: true,
  hireDate: '',
  salary: 0,
  skills: [],
  emergencyContact: {
    name: '',
    phone: '',
    relationship: '',
  },
};

const roles = [
  'admin',
  'producer',
  'director',
  'cinematographer',
  'sound_engineer',
  'editor',
  'production_assistant',
  'grip',
  'electrician',
  'makeup_artist',
  'costume_designer',
  'set_designer',
];

const departments = [
  'production',
  'camera',
  'sound',
  'editing',
  'art',
  'costume',
  'makeup',
  'lighting',
  'grip',
  'electrical',
  'transportation',
  'catering',
];

export default function UserInfoForm() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CreateUserData>(initialUser);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [viewMode, setViewMode] = useState<'form' | 'list'>('list');

  const itemsPerPage = 10;

  // Mock data - replace with actual API calls
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const mockUsers: User[] = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john.smith@mediente.com',
          phone: '+1-555-0123',
          role: 'producer',
          department: 'production',
          position: 'Senior Producer',
          address: '123 Film Street, Hollywood, CA 90210',
          bio: 'Experienced producer with 15+ years in the industry.',
          isActive: true,
          hireDate: '2020-03-15',
          salary: 85000,
          skills: ['Project Management', 'Budget Planning', 'Team Leadership'],
          emergencyContact: {
            name: 'Jane Smith',
            phone: '+1-555-0124',
            relationship: 'Spouse',
          },
          createdAt: '2020-03-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@mediente.com',
          phone: '+1-555-0125',
          role: 'cinematographer',
          department: 'camera',
          position: 'Director of Photography',
          address: '456 Camera Ave, Los Angeles, CA 90211',
          bio: 'Award-winning cinematographer specializing in dramatic lighting.',
          isActive: true,
          hireDate: '2019-08-22',
          salary: 95000,
          skills: ['Lighting', 'Camera Operation', 'Color Grading'],
          emergencyContact: {
            name: 'Mike Johnson',
            phone: '+1-555-0126',
            relationship: 'Partner',
          },
          createdAt: '2019-08-22T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        },
      ];
      setUsers(mockUsers);
      setIsLoading(false);
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isEditing && editingUser) {
        // Update existing user
        const updatedUser = { ...editingUser, ...currentUser, updatedAt: new Date().toISOString() };
        setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
        notifications.show({
          title: 'Success',
          message: 'User updated successfully',
          color: 'green',
        });
      } else {
        // Create new user
        const newUser: User = {
          ...currentUser,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUsers([...users, newUser]);
        notifications.show({
          title: 'Success',
          message: 'User created successfully',
          color: 'green',
        });
      }

      resetForm();
      setViewMode('list');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save user',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setCurrentUser({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      position: user.position,
      address: user.address,
      bio: user.bio,
      isActive: user.isActive,
      hireDate: user.hireDate,
      salary: user.salary,
      skills: user.skills,
      emergencyContact: user.emergencyContact,
    });
    setIsEditing(true);
    setViewMode('form');
  };

  const handleDelete = (userId: string) => {
    open();
    setEditingUser(users.find(u => u.id === userId) || null);
  };

  const confirmDelete = () => {
    if (editingUser) {
      setUsers(users.filter(u => u.id !== editingUser.id));
      notifications.show({
        title: 'Success',
        message: 'User deleted successfully',
        color: 'green',
      });
      close();
      setEditingUser(null);
    }
  };

  const resetForm = () => {
    setCurrentUser(initialUser);
    setEditingUser(null);
    setIsEditing(false);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  if (viewMode === 'form') {
    return (
      <Paper withBorder p="xl" radius="md">
        <Group justify="space-between" mb="xl">
          <Title order={2}>
            {isEditing ? 'Edit User' : 'Create New User'}
          </Title>
          <Button variant="outline" onClick={() => setViewMode('list')}>
            Back to List
          </Button>
        </Group>

        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            {/* Basic Information */}
            <Paper withBorder p="md" radius="md">
              <Title order={3} mb="md">Basic Information</Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Full Name"
                    placeholder="Enter full name"
                    value={currentUser.name}
                    onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                    required
                    leftSection={<IconUser size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Email"
                    type="email"
                    placeholder="Enter email address"
                    value={currentUser.email}
                    onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                    required
                    leftSection={<IconMail size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Phone"
                    placeholder="Enter phone number"
                    value={currentUser.phone}
                    onChange={(e) => setCurrentUser({ ...currentUser, phone: e.target.value })}
                    required
                    leftSection={<IconPhone size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Position"
                    placeholder="Enter job position"
                    value={currentUser.position}
                    onChange={(e) => setCurrentUser({ ...currentUser, position: e.target.value })}
                    required
                  />
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Role & Department */}
            <Paper withBorder p="md" radius="md">
              <Title order={3} mb="md">Role & Department</Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label="Role"
                    placeholder="Select role"
                    data={roles.map(role => ({ value: role, label: role.replace('_', ' ').toUpperCase() }))}
                    value={currentUser.role}
                    onChange={(value) => setCurrentUser({ ...currentUser, role: value || '' })}
                    required
                    leftSection={<IconBriefcase size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Select
                    label="Department"
                    placeholder="Select department"
                    data={departments.map(dept => ({ value: dept, label: dept.replace('_', ' ').toUpperCase() }))}
                    value={currentUser.department}
                    onChange={(value) => setCurrentUser({ ...currentUser, department: value || '' })}
                    required
                  />
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Employment Details */}
            <Paper withBorder p="md" radius="md">
              <Title order={3} mb="md">Employment Details</Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Hire Date"
                    type="date"
                    value={currentUser.hireDate}
                    onChange={(e) => setCurrentUser({ ...currentUser, hireDate: e.target.value })}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Salary"
                    type="number"
                    placeholder="Enter annual salary"
                    value={currentUser.salary}
                    onChange={(e) => setCurrentUser({ ...currentUser, salary: Number(e.target.value) })}
                    required
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <Switch
                    label="Active Employee"
                    checked={currentUser.isActive}
                    onChange={(e) => setCurrentUser({ ...currentUser, isActive: e.currentTarget.checked })}
                  />
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Address & Bio */}
            <Paper withBorder p="md" radius="md">
              <Title order={3} mb="md">Address & Bio</Title>
              <Grid>
                <Grid.Col span={12}>
                  <TextInput
                    label="Address"
                    placeholder="Enter full address"
                    value={currentUser.address}
                    onChange={(e) => setCurrentUser({ ...currentUser, address: e.target.value })}
                    leftSection={<IconMapPin size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <Textarea
                    label="Bio"
                    placeholder="Enter employee bio"
                    value={currentUser.bio}
                    onChange={(e) => setCurrentUser({ ...currentUser, bio: e.target.value })}
                    rows={3}
                  />
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Emergency Contact */}
            <Paper withBorder p="md" radius="md">
              <Title order={3} mb="md">Emergency Contact</Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    label="Contact Name"
                    placeholder="Emergency contact name"
                    value={currentUser.emergencyContact.name}
                    onChange={(e) => setCurrentUser({
                      ...currentUser,
                      emergencyContact: { ...currentUser.emergencyContact, name: e.target.value }
                    })}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    label="Contact Phone"
                    placeholder="Emergency contact phone"
                    value={currentUser.emergencyContact.phone}
                    onChange={(e) => setCurrentUser({
                      ...currentUser,
                      emergencyContact: { ...currentUser.emergencyContact, phone: e.target.value }
                    })}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    label="Relationship"
                    placeholder="Relationship to employee"
                    value={currentUser.emergencyContact.relationship}
                    onChange={(e) => setCurrentUser({
                      ...currentUser,
                      emergencyContact: { ...currentUser.emergencyContact, relationship: e.target.value }
                    })}
                  />
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Action Buttons */}
            <Group justify="flex-end">
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
              <Button type="submit" loading={isLoading}>
                {isEditing ? 'Update User' : 'Create User'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="xl" radius="md">
      <Group justify="space-between" mb="xl">
        <Title order={2}>User Management</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setViewMode('form')}>
          Add New User
        </Button>
      </Group>

      {/* Search and Filters */}
      <Group mb="lg">
        <TextInput
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
        />
      </Group>

      {/* Users Table */}
      <Paper withBorder radius="md" pos="relative">
        <LoadingOverlay visible={isLoading} />
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Department</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Hire Date</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedUsers.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>
                  <Group gap="sm">
                    <Text fw={500}>{user.name}</Text>
                    <Text size="sm" c="dimmed">{user.email}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="blue">
                    {user.role.replace('_', ' ').toUpperCase()}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{user.department.replace('_', ' ').toUpperCase()}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge 
                    variant="light" 
                    color={user.isActive ? 'green' : 'red'}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{new Date(user.hireDate).toLocaleDateString()}</Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => handleEdit(user)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleDelete(user.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {filteredUsers.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">
            No users found
          </Text>
        )}
      </Paper>

      {/* Pagination */}
      {totalPages > 1 && (
        <Group justify="center" mt="lg">
          <Pagination
            total={totalPages}
            value={currentPage}
            onChange={setCurrentPage}
          />
        </Group>
      )}

      {/* Delete Confirmation Modal */}
      <Modal opened={opened} onClose={close} title="Confirm Delete">
        <Stack>
          <Text>
            Are you sure you want to delete <strong>{editingUser?.name}</strong>? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmDelete}>
              Delete User
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
