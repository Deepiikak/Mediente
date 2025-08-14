import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  SimpleGrid,
  Badge,
  LoadingOverlay,
  Alert,
  Stack,
  Button,
  Checkbox,
  Table,
  ActionIcon,
  Tooltip,
  Pagination,
  TextInput,
  Select,
  Flex,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconRefresh, IconUsers, IconUserCheck, IconUserX, IconUserOff, IconSearch, IconEdit, IconTrash, IconArchive } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import userService from '../../services/userService';
import authService from '../../services/authService';
import type { User } from '../../types/userManagement';
import type { AdminUser as AuthAdminUser } from '../../types/auth';
import UserFormModal from '../../components/UserFormModal';
import ConfirmationDialog from '../../components/ConfirmationDialog';

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AuthAdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load admin user and users in parallel
      const [currentAdminUser, usersData] = await Promise.all([
        authService.getCurrentUser(),
        userService.getUsers()
      ]);

      if (!currentAdminUser) {
        navigate('/admin/login');
        return;
      }

      setAdminUser(currentAdminUser);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      
      if (error instanceof Error && error.message.includes('Admin access only')) {
        navigate('/admin/login');
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  // Handle user selection
  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle user actions
  const handleViewUser = (user: User) => {
    setEditingUser(user);
    setIsViewMode(true);
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsViewMode(false);
    setShowUserModal(true);
  };

  const handleArchiveUser = (user: User) => {
    setConfirmationData({
      type: 'delete',
      title: 'Archive User',
      message: `Are you sure you want to archive ${user.name}?`,
      user
    });
    setShowConfirmation(true);
  };

  const handleArchiveSelected = () => {
    if (selectedUsers.length === 0) {
      notifications.show({
        title: 'No Users Selected',
        message: 'Please select users to archive.',
        color: 'yellow'
      });
      return;
    }

    setConfirmationData({
      type: 'bulkAction',
      title: 'Archive Selected Users',
      message: `Are you sure you want to archive ${selectedUsers.length} selected users?`,
      bulkAction: {
        action: 'Archive Users',
        count: selectedUsers.length
      }
    });
    setShowConfirmation(true);
  };

  // Execute confirmation action
  const executeConfirmationAction = async () => {
    try {
      if (confirmationData.type === 'delete') {
        await userService.deleteUser(confirmationData.user.id, adminUser!.id);
        notifications.show({
          title: 'Success',
          message: `User ${confirmationData.user.name} has been archived.`,
          color: 'green'
        });
      } else if (confirmationData.type === 'bulkAction') {
        await userService.bulkUpdateUsers({
          userIds: selectedUsers,
          action: 'deactivate'
        }, adminUser!.id);
        setSelectedUsers([]);
        notifications.show({
          title: 'Success',
          message: `${confirmationData.bulkAction.count} users have been archived.`,
          color: 'green'
        });
      }
      onRefresh();
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error in confirmation action:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to complete the action. Please try again.',
        color: 'red'
      });
    }
  };

  const onRefresh = () => {
    loadData();
  };

  // Calculate statistics
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(user => user.status).length,
    inactiveUsers: users.filter(user => !user.status).length,
    hodCount: users.filter(user => user.role === 'HOD').length,
    associateCount: users.filter(user => user.role === 'Associate').length,
    crewCount: users.filter(user => user.role === 'Crew').length
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'HOD': return 'red';
      case 'Associate': return 'blue';
      case 'Crew': return 'green';
      default: return 'gray';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Container size="xl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingOverlay visible={true} />
        </Container>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <Container size="xl" py="xl">
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error Loading Data"
            color="red"
            mb="lg"
          >
            {error}
          </Alert>
          <Button onClick={handleRefresh} leftSection={<IconRefresh size={16} />}>
            Try Again
          </Button>
        </Container>
      </AdminLayout>
    );
  }

  if (!adminUser) {
    return (
      <AdminLayout>
        <Container size="xl" py="xl">
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Access Denied"
            color="red"
          >
            You don't have permission to access this page. Please log in as an admin.
          </Alert>
        </Container>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Container size="xl">
        <Stack gap="xl">
          {/* Header */}
          <Group justify="space-between" align="center">
            <div>
              <Title order={1} mb="xs">
                Management Team
              </Title>
            </div>
            <Group>
              <Button variant="outline" color="blue">
                Archived Users
              </Button>
              <Button 
                color="blue" 
                onClick={() => setShowUserModal(true)}
              >
                + Add User
              </Button>
            </Group>
          </Group>

          {/* Search and Filters */}
          <Group gap="md">
            <TextInput
              placeholder="Search by name or email..."
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <Select
              placeholder="All Roles"
              data={[
                { value: 'all', label: 'All Roles' },
                { value: 'Admin', label: 'Admin' },
                { value: 'HOD', label: 'HOD' },
                { value: 'Associate', label: 'Associate' },
                { value: 'Crew', label: 'Crew' }
              ]}
              value={filters.role || 'all'}
              onChange={(value) => setFilters({ ...filters, role: value })}
              style={{ minWidth: '150px' }}
            />
            <Select
              placeholder="All Departments"
              data={[
                { value: 'all', label: 'All Departments' },
                { value: 'Film', label: 'Film' },
                { value: 'Talent', label: 'Talent' },
                { value: 'Location', label: 'Location' }
              ]}
              value={filters.department || 'all'}
              onChange={(value) => setFilters({ ...filters, department: value })}
              style={{ minWidth: '180px' }}
            />
          </Group>

          {/* Table Controls */}
          {selectedUsers.length > 0 && (
            <Group justify="space-between">
              <Checkbox
                label={`${selectedUsers.length} items selected`}
                checked={selectedUsers.length > 0}
                onChange={() => setSelectedUsers([])}
              />
              <Button
                variant="outline"
                color="red"
                leftSection={<IconArchive size={16} />}
                onClick={handleArchiveSelected}
              >
                Archive Selected
              </Button>
            </Group>
          )}

          {/* Users Table */}
          <Paper withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '50px' }}>
                    <Checkbox
                      checked={selectedUsers.length === users.length && users.length > 0}
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                      onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                    />
                  </Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th style={{ width: '150px' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={(event) => handleSelectUser(user.id, event.currentTarget.checked)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Box>
                        <Text fw={500}>{user.name}</Text>
                        <Text size="sm" c="dimmed">{user.email}</Text>
                      </Box>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={user.status ? 'green' : 'red'} 
                        variant="light"
                        leftSection={
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: user.status ? '#40c057' : '#fa5252' 
                          }} />
                        }
                      >
                        {user.status ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={
                          user.role === 'Admin' ? 'purple' :
                          user.role === 'HOD' ? 'red' : 
                          user.role === 'Associate' ? 'blue' : 'green'
                        } 
                        variant="light"
                      >
                        {user.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{user.department}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          color="green"
                          onClick={() => handleViewUser(user)}
                        >
                          View
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          color="blue"
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          color="blue"
                          onClick={() => handleArchiveUser(user)}
                        >
                          Archive
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {/* Pagination */}
            <Group justify="center" p="md">
              <Text size="sm" c="dimmed">
                Showing 1-{Math.min(10, users.length)} of {users.length}
              </Text>
              <Pagination
                total={Math.ceil(users.length / 10)}
                value={currentPage}
                onChange={setCurrentPage}
                size="sm"
              />
            </Group>
          </Paper>

          {/* Modals */}
          <UserFormModal
            opened={showUserModal}
            onClose={() => {
              setShowUserModal(false);
              setEditingUser(null);
              setIsViewMode(false);
            }}
            user={editingUser}
            isViewMode={isViewMode}
            onSuccess={() => {
              onRefresh();
              setShowUserModal(false);
              setEditingUser(null);
              setIsViewMode(false);
            }}
            adminUserId={adminUser?.id || ''}
          />

          <ConfirmationDialog
            opened={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            {...confirmationData}
            onConfirm={executeConfirmationAction}
          />
        </Stack>
      </Container>
    </AdminLayout>
  );
}