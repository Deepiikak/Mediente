import { useState, useMemo } from 'react';
import {
  Table,
  TextInput,
  Select,
  Checkbox,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Pagination,
  Stack,
  Paper,
  Title,
  Flex,
  Menu,
  Modal,
  Textarea,
  FileInput
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
  IconSearch, 
  IconFilter, 
  IconEdit, 
  IconTrash, 
  IconEye, 
  IconDownload, 
  IconUpload,
  IconDotsVertical,
  IconUserPlus,
  IconUsers
} from '@tabler/icons-react';
import type { User, UserFilters, BulkActionData } from '../types/userManagement';
import userService from '../services/userService';
import UserFormModal from './UserFormModal';
import ConfirmationDialog from './ConfirmationDialog';

interface UserTableProps {
  users: User[];
  onRefresh: () => void;
  adminUserId: string;
}

export default function UserTable({ users, onRefresh, adminUserId }: UserTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filters, setFilters] = useState<UserFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>({});
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkActionData | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<string>('');

  // Filtered and paginated users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.department.toLowerCase().includes(searchLower)
      );
    }

    if (filters.role && filters.role !== '') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    if (filters.department && filters.department !== '') {
      filtered = filtered.filter(user => user.department === filters.department);
    }

    if (filters.status !== undefined && filters.status !== '') {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    return filtered;
  }, [users, filters]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Get unique departments for filter
  const departments = useMemo(() => {
    const uniqueDepts = [...new Set(users.map(user => user.department))];
    return uniqueDepts.map(dept => ({ value: dept, label: dept }));
  }, [users]);

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
      setSelectedUsers(paginatedUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle user actions
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = (user: User) => {
    setConfirmationData({
      type: 'delete',
      title: 'Deactivate User',
      message: `Are you sure you want to deactivate ${user.name}?`,
      user
    });
    setShowConfirmation(true);
  };

  const handleRoleChange = (user: User, newRole: string) => {
    setConfirmationData({
      type: 'roleChange',
      title: 'Change User Role',
      message: `Are you sure you want to change ${user.name}'s role from ${user.role} to ${newRole}?`,
      user,
      newRole
    });
    setShowConfirmation(true);
  };

  const handleBulkAction = (action: string, value?: string) => {
    if (selectedUsers.length === 0) {
      notifications.show({
        title: 'No Users Selected',
        message: 'Please select users to perform bulk actions.',
        color: 'yellow'
      });
      return;
    }

    setBulkAction({
      userIds: selectedUsers,
      action: action as any,
      value
    });
    setShowBulkActionModal(true);
  };

  // Execute bulk action
  const executeBulkAction = async () => {
    if (!bulkAction) return;

    try {
      await userService.bulkUpdateUsers(bulkAction, adminUserId);
      setSelectedUsers([]);
      onRefresh();
      setShowBulkActionModal(false);
      setBulkAction(null);
    } catch (error) {
      console.error('Error executing bulk action:', error);
      throw error;
    }
  };

  // Export users
  const handleExportUsers = async () => {
    try {
      const csvData = await userService.exportUsersToCSV(filters);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mediente-users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      notifications.show({
        title: 'Export Successful',
        message: 'Users exported to CSV successfully!',
        color: 'green'
      });
    } catch (error) {
      console.error('Error exporting users:', error);
      notifications.show({
        title: 'Export Failed',
        message: 'Failed to export users. Please try again.',
        color: 'red'
      });
    }
  };

  // Import users
  const handleImportUsers = async () => {
    if (!importData.trim()) {
      notifications.show({
        title: 'No Data',
        message: 'Please provide CSV data to import.',
        color: 'yellow'
      });
      return;
    }

    try {
      const result = await userService.importUsersFromCSV(importData, adminUserId);
      
      if (result.success > 0) {
        notifications.show({
          title: 'Import Successful',
          message: `Successfully imported ${result.success} users.`,
          color: 'green'
        });
        onRefresh();
        setShowImportModal(false);
        setImportData('');
      }
      
      if (result.errors.length > 0) {
        notifications.show({
          title: 'Import Completed with Errors',
          message: `${result.success} users imported, ${result.errors.length} errors. Check console for details.`,
          color: 'yellow'
        });
        console.log('Import errors:', result.errors);
      }
    } catch (error) {
      console.error('Error importing users:', error);
      notifications.show({
        title: 'Import Failed',
        message: 'Failed to import users. Please try again.',
        color: 'red'
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'purple';
      case 'HOD': return 'red';
      case 'Associate': return 'blue';
      case 'Crew': return 'green';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'green' : 'red';
  };

  return (
    <Stack gap="lg">
      {/* Header with Actions */}
      <Paper p="md" withBorder>
        <Flex justify="space-between" align="center" mb="md">
          <Title order={3}>👥 User Management</Title>
          <Group>
            <Button
              leftSection={<IconUserPlus size={16} />}
              onClick={() => setShowUserModal(true)}
              color="green"
            >
              Add User
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={handleExportUsers}
              variant="outline"
            >
              Export CSV
            </Button>
            <Button
              leftSection={<IconUpload size={16} />}
              onClick={() => setShowImportModal(true)}
              variant="outline"
            >
              Import CSV
            </Button>
          </Group>
        </Flex>

        {/* Search and Filters */}
        <Group gap="md" mb="md">
          <TextInput
            placeholder="Search users..."
            leftSection={<IconSearch size={16} />}
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="All Roles"
            data={[
              { value: '', label: 'All Roles' },
              { value: 'Admin', label: 'Admin' },
              { value: 'HOD', label: 'HOD' },
              { value: 'Associate', label: 'Associate' },
              { value: 'Crew', label: 'Crew' }
            ]}
            value={filters.role || ''}
            onChange={(value) => setFilters({ ...filters, role: value as any })}
            style={{ minWidth: '150px' }}
          />
          <Select
            placeholder="All Departments"
            data={[{ value: '', label: 'All Departments' }, ...departments]}
            value={filters.department || ''}
            onChange={(value) => setFilters({ ...filters, department: value || undefined })}
            style={{ minWidth: '180px' }}
          />
          <Select
            placeholder="All Status"
            data={[
              { value: '', label: 'All Status' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
            value={filters.status?.toString() || ''}
            onChange={(value) => setFilters({ ...filters, status: value === '' ? undefined : value === 'true' })}
            style={{ minWidth: '140px' }}
          />
        </Group>

        {/* Bulk Actions Toolbar */}
        {selectedUsers.length > 0 && (
          <Paper p="sm" bg="blue.0" withBorder>
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                {selectedUsers.length} user(s) selected
              </Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => handleBulkAction('activate')}
                >
                  Activate
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  Deactivate
                </Button>
                <Menu>
                  <Menu.Target>
                    <Button size="xs" variant="light" leftSection={<IconUsers size={14} />}>
                      Change Role
                    </Button>
                  </Menu.Target>
                                     <Menu.Dropdown>
                     <Menu.Item onClick={() => handleBulkAction('changeRole', 'Admin')}>
                       Set as Admin
                     </Menu.Item>
                     <Menu.Item onClick={() => handleBulkAction('changeRole', 'HOD')}>
                       Set as HOD
                     </Menu.Item>
                     <Menu.Item onClick={() => handleBulkAction('changeRole', 'Associate')}>
                       Set as Associate
                     </Menu.Item>
                     <Menu.Item onClick={() => handleBulkAction('changeRole', 'Crew')}>
                       Set as Crew
                     </Menu.Item>
                   </Menu.Dropdown>
                </Menu>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => setSelectedUsers([])}
                >
                  Clear Selection
                </Button>
              </Group>
            </Group>
          </Paper>
        )}
      </Paper>

      {/* Users Table */}
      <Paper withBorder>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: '50px' }}>
                <Checkbox
                  checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                  indeterminate={selectedUsers.length > 0 && selectedUsers.length < paginatedUsers.length}
                  onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                />
              </Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Department</Table.Th>
              <Table.Th>Reporting Manager</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Last Login</Table.Th>
              <Table.Th style={{ width: '100px' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedUsers.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onChange={(event) => handleSelectUser(user.id, event.currentTarget.checked)}
                  />
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>{user.name}</Text>
                </Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>
                  <Badge color={getRoleColor(user.role)} variant="light">
                    {user.role}
                  </Badge>
                </Table.Td>
                <Table.Td>{user.department}</Table.Td>
                <Table.Td>
                  {user.reporting_manager ? (
                    <Text size="sm" c="dimmed">{user.reporting_manager}</Text>
                  ) : (
                    <Text size="sm" c="dimmed" fs="italic">None</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(user.status)} variant="light">
                    {user.status ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {user.last_login ? (
                    <Text size="sm">{new Date(user.last_login).toLocaleDateString()}</Text>
                  ) : (
                    <Text size="sm" c="dimmed" fs="italic">Never</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="Edit User">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={() => handleEditUser(user)}
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Menu>
                      <Menu.Target>
                        <ActionIcon size="sm" variant="light">
                          <IconDotsVertical size={14} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          onClick={() => handleEditUser(user)}
                        >
                          Edit User
                        </Menu.Item>
                        <Menu.Divider />
                                                 <Menu.Label>Change Role</Menu.Label>
                         <Menu.Item onClick={() => handleRoleChange(user, 'Admin')}>
                           Set as Admin
                         </Menu.Item>
                         <Menu.Item onClick={() => handleRoleChange(user, 'HOD')}>
                           Set as HOD
                         </Menu.Item>
                         <Menu.Item onClick={() => handleRoleChange(user, 'Associate')}>
                           Set as Associate
                         </Menu.Item>
                         <Menu.Item onClick={() => handleRoleChange(user, 'Crew')}>
                           Set as Crew
                         </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={() => handleDeleteUser(user)}
                        >
                          Deactivate User
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="center" p="md">
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={setCurrentPage}
              size="sm"
            />
          </Group>
        )}
      </Paper>

      {/* Modals */}
      <UserFormModal
        opened={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSuccess={() => {
          onRefresh();
          setShowUserModal(false);
          setEditingUser(null);
        }}
        adminUserId={adminUserId}
      />

      <ConfirmationDialog
        opened={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        {...confirmationData}
        onConfirm={async () => {
          try {
            if (confirmationData.type === 'delete') {
              await userService.deleteUser(confirmationData.user.id, adminUserId);
            } else if (confirmationData.type === 'roleChange') {
              await userService.updateUser(
                confirmationData.user.id,
                { role: confirmationData.newRole as any },
                adminUserId
              );
            }
            onRefresh();
            setShowConfirmation(false);
          } catch (error) {
            console.error('Error in confirmation action:', error);
            throw error;
          }
        }}
      />

      <ConfirmationDialog
        opened={showBulkActionModal}
        onClose={() => setShowBulkActionModal(false)}
        type="bulkAction"
        title="Confirm Bulk Action"
        message={`Are you sure you want to perform this bulk action on ${bulkAction?.userIds.length} users?`}
        bulkAction={bulkAction ? {
          action: bulkAction.action,
          count: bulkAction.userIds.length,
          value: bulkAction.value
        } : undefined}
        onConfirm={executeBulkAction}
      />

      {/* Import Modal */}
      <Modal
        opened={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Users from CSV"
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Paste CSV data or upload a CSV file. The CSV should have columns: Name, Email, Role, Department, Reporting Manager, Status
          </Text>
          
          <Textarea
            placeholder="Paste CSV data here..."
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            rows={10}
            autosize
          />
          
          <FileInput
            label="Or upload CSV file"
            placeholder="Choose CSV file"
            accept=".csv"
            onChange={(file) => {
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  setImportData(e.target?.result as string);
                };
                reader.readAsText(file);
              }
            }}
          />
          
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportUsers} color="blue">
              Import Users
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
