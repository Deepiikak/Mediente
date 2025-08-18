import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  Badge,
  LoadingOverlay,
  Alert,
  Stack,
  Button,
  Checkbox,
  Table,
  Pagination,
  TextInput,
  Select,
  Box,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconRefresh,
  IconSearch,
  IconArchive,
} from "@tabler/icons-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import userService, { type PaginatedResponse } from "../../services/userService";
import authService from "../../services/authService";
import type { User, UserFilters } from "../../types/userManagement";
import type { AdminUser as AuthAdminUser } from "../../types/auth";
import UserFormModal from "../../components/UserFormModal";
import ConfirmationDialog from "../../components/ConfirmationDialog";

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AuthAdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchInput, 500);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    department: 'all',
    status: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20); // Configurable page size
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    type?: string;
    title?: string;
    message?: string;
    user?: User;
    bulkAction?: { action: string; count: number };
  }>({});
  const [departments, setDepartments] = useState<string[]>([]);
  const [statistics, setStatistics] = useState<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    recentUsers: number;
    departmentStats: Record<string, number>;
    roleStats: Record<string, number>;
  } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      
      const response: PaginatedResponse<User> = await userService.getUsers(
        currentPage,
        pageSize,
        filters
      );

      setUsers(response.data);
      setTotalPages(response.totalPages);
      setTotalCount(response.count);
      
      // Clear selected users when data changes
      setSelectedUsers([]);
    } catch (error) {
      console.error("Error loading users:", error);
      setError(error instanceof Error ? error.message : "Failed to load users");
    }
  }, [currentPage, pageSize, filters]);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load admin user, departments, and statistics in parallel
      const [currentAdminUser, departmentsData, statsData] = await Promise.all([
        authService.getCurrentUser(),
        userService.getDepartments(),
        userService.getUserStatistics(),
      ]);

      if (!currentAdminUser) {
        navigate("/admin/login");
        return;
      }

      setAdminUser(currentAdminUser);
      setDepartments(departmentsData.map(d => d.name));
      setStatistics(statsData);
      
      // Check for URL parameters and set initial filters
      const urlDepartment = searchParams.get('department');
      const urlRole = searchParams.get('role');
      const urlStatus = searchParams.get('status');
      
      if (urlDepartment || urlRole || urlStatus) {
        setFilters(prev => ({
          ...prev,
          department: urlDepartment || prev.department,
          role: (urlRole as UserFilters['role']) || prev.role,
          status: (urlStatus as UserFilters['status']) || prev.status,
        }));
      }
      
      // Load initial users
      await loadUsers();
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError(error instanceof Error ? error.message : "Failed to load data");

      if (
        error instanceof Error &&
        error.message.includes("Admin access only")
      ) {
        navigate("/admin/login");
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, loadUsers, searchParams]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }));
    setCurrentPage(1);
  }, [debouncedSearch]);

  const handleRefresh = () => {
    loadUsers();
  };

  const handleFilterChange = (newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle user selection
  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((user) => user.id));
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
      type: "delete",
      title: "Archive User",
      message: `Are you sure you want to archive ${user.name}?`,
      user,
    });
    setShowConfirmation(true);
  };

  const handleArchiveSelected = () => {
    if (selectedUsers.length === 0) {
      notifications.show({
        title: "No Users Selected",
        message: "Please select users to archive.",
        color: "yellow",
      });
      return;
    }

    setConfirmationData({
      type: "bulkAction",
      title: "Archive Selected Users",
      message: `Are you sure you want to archive ${selectedUsers.length} selected users?`,
      bulkAction: {
        action: "Archive Users",
        count: selectedUsers.length,
      },
    });
    setShowConfirmation(true);
  };

  // Execute confirmation action
  const executeConfirmationAction = async () => {
    try {
      if (confirmationData.type === "delete" && confirmationData.user) {
        await userService.deleteUser(confirmationData.user.id, adminUser!.id);
        notifications.show({
          title: "Success",
          message: `User ${confirmationData.user.name} has been archived.`,
          color: "green",
        });
      } else if (confirmationData.type === "bulkAction" && confirmationData.bulkAction) {
        await userService.bulkUpdateUsers(
          {
            userIds: selectedUsers,
            action: "deactivate",
          },
          adminUser!.id
        );
        setSelectedUsers([]);
        notifications.show({
          title: "Success",
          message: `${confirmationData.bulkAction.count} users have been archived.`,
          color: "green",
        });
      }
      await loadUsers();
      setShowConfirmation(false);
    } catch (error) {
      console.error("Error in confirmation action:", error);
      notifications.show({
        title: "Error",
        message: "Failed to complete the action. Please try again.",
        color: "red",
      });
    }
  };

  const onRefresh = () => {
    loadUsers();
  };



  if (isLoading) {
    return (
      <Container
        size="xl"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoadingOverlay visible={true} />
      </Container>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!adminUser) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Access Denied"
          color="red"
        >
          You don't have permission to access this page. Please log in as an
          admin.
        </Alert>
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
              User Management
            </Title>
            <Text c="dimmed">
              {totalCount > 0 && `${totalCount} total users`}
              {statistics && ` • ${statistics.activeUsers} active • ${statistics.inactiveUsers} inactive`}
            </Text>
          </div>
          <Group>
            <Button variant="outline" color="blue">
              Export CSV
            </Button>
            <Button variant="outline" color="blue">
              Archived Users ({statistics?.inactiveUsers || 0})
            </Button>
            <Button color="blue" onClick={() => setShowUserModal(true)}>
              + Add User
            </Button>
          </Group>
        </Group>

        {/* Statistics Cards */}
        {statistics && (
          <Group grow mb="xl">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Total Users
                </Text>
                <Text size="1.4rem">👥</Text>
              </Group>
              <Text fw={700} size="xl" mt="md">
                {statistics.totalUsers}
              </Text>
              <Text c="blue" size="sm" mt="xs">
                All registered users
              </Text>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Active Users
                </Text>
                <Text size="1.4rem">✅</Text>
              </Group>
              <Text fw={700} size="xl" mt="md">
                {statistics.activeUsers}
              </Text>
              <Text c="green" size="sm" mt="xs">
                Currently active
              </Text>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Recent Users
                </Text>
                <Text size="1.4rem">🆕</Text>
              </Group>
              <Text fw={700} size="xl" mt="md">
                {statistics.recentUsers}
              </Text>
              <Text c="orange" size="sm" mt="xs">
                Last 30 days
              </Text>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Departments
                </Text>
                <Text size="1.4rem">🏢</Text>
              </Group>
              <Text fw={700} size="xl" mt="md">
                {Object.keys(statistics.departmentStats).length}
              </Text>
              <Text c="purple" size="sm" mt="xs">
                Active departments
              </Text>
            </Paper>
          </Group>
        )}

        {/* Search and Filters */}
        <Group gap="md">
          <TextInput
            placeholder="Search by name or email..."
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            placeholder="All Roles"
            data={[
              { value: "all", label: "All Roles" },
              { value: "HOD", label: "HOD" },
              { value: "Associate", label: "Associate" },
              { value: "Crew", label: "Crew" },
            ]}
            value={filters.role || "all"}
            onChange={(value) => handleFilterChange({ role: value as UserFilters['role'] })}
            style={{ minWidth: "150px" }}
          />
          <Select
            placeholder="All Departments"
            data={[
              { value: "all", label: "All Departments" },
              ...departments.map(dept => ({ value: dept, label: dept }))
            ]}
            value={filters.department || "all"}
            onChange={(value) => handleFilterChange({ department: value || "all" })}
            style={{ minWidth: "180px" }}
            searchable
          />
          <Select
            placeholder="All Status"
            data={[
              { value: "all", label: "All Status" },
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
            value={filters.status?.toString() || "all"}
            onChange={(value) => {
              const status = value === "all" ? "all" : value === "true";
              handleFilterChange({ status: status as UserFilters['status'] });
            }}
            style={{ minWidth: "120px" }}
          />
          <Button 
            variant="outline" 
            leftSection={<IconRefresh size={16} />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
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
          <LoadingOverlay visible={isLoading && users.length === 0} />
          
          {users.length === 0 && !isLoading ? (
            <Stack align="center" py="xl">
              <Text size="lg" c="dimmed">No users found</Text>
              <Text size="sm" c="dimmed">Try adjusting your search filters or add new users</Text>
              <Button onClick={() => setShowUserModal(true)}>
                Add First User
              </Button>
            </Stack>
          ) : (
            <>
            <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: "50px" }}>
                  <Checkbox
                    checked={
                      selectedUsers.length === users.length && users.length > 0
                    }
                    indeterminate={
                      selectedUsers.length > 0 &&
                      selectedUsers.length < users.length
                    }
                    onChange={(event) =>
                      handleSelectAll(event.currentTarget.checked)
                    }
                  />
                </Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th style={{ width: "150px" }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onChange={(event) =>
                        handleSelectUser(user.id, event.currentTarget.checked)
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Box>
                      <Text fw={500}>{user.name}</Text>
                      <Text size="sm" c="dimmed">
                        {user.email}
                      </Text>
                    </Box>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={user.status ? "green" : "red"}
                      variant="light"
                      leftSection={
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: user.status
                              ? "#40c057"
                              : "#fa5252",
                          }}
                        />
                      }
                    >
                      {user.status ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        user.role === "Admin"
                          ? "purple"
                          : user.role === "HOD"
                          ? "red"
                          : user.role === "Associate"
                          ? "blue"
                          : "green"
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
            <Group justify="space-between" p="md">
              <Text size="sm" c="dimmed">
                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
              </Text>
              {totalPages > 1 && (
                <Pagination
                  total={totalPages}
                  value={currentPage}
                  onChange={handlePageChange}
                  size="sm"
                  withEdges
                />
              )}
            </Group>
            </>
          )}
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
          adminUserId={adminUser?.id || ""}
        />

        <ConfirmationDialog
          opened={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          type={confirmationData.type as 'delete' | 'roleChange' | 'bulkAction' || 'delete'}
          title={confirmationData.title || 'Confirm Action'}
          message={confirmationData.message || 'Are you sure?'}
          onConfirm={executeConfirmationAction}
          user={confirmationData.user}
          bulkAction={confirmationData.bulkAction}
        />
      </Stack>
    </Container>
  );
}
