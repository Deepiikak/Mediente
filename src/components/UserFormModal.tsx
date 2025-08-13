import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Switch,
  Button,
  Stack,
  Group,
  Title,
  Text,
  LoadingOverlay,
  Alert,
  Avatar,
  FileInput,
  Image,
  Badge
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconUpload, IconUser } from '@tabler/icons-react';
import type { User, CreateUserData, UpdateUserData, Department, ReportingManager } from '../types/userManagement';
import userService from '../services/userService';

interface UserFormModalProps {
  opened: boolean;
  onClose: () => void;
  user?: User | null;
  isViewMode?: boolean;
  onSuccess: () => void;
  adminUserId: string;
}

export default function UserFormModal({ 
  opened, 
  onClose, 
  user, 
  isViewMode = false,
  onSuccess, 
  adminUserId 
}: UserFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reportingManagers, setReportingManagers] = useState<ReportingManager[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const form = useForm<CreateUserData>({
    initialValues: {
      name: '',
      email: '',
      role: 'Crew',
      department: '',
      reporting_manager: undefined,
      status: true
    },
    validate: {
      name: (value) => {
        if (!value || value.trim().length < 2) return 'Name must be at least 2 characters';
        if (value.trim().length > 50) return 'Name must be less than 50 characters';
        return null;
      },
      email: (value) => {
        if (!value) return 'Email is required';
        if (!/^\S+@\S+$/.test(value)) return 'Invalid email format';
        return null;
      },
      department: (value) => {
        if (!value || value.trim().length < 2) return 'Department is required';
        return null;
      },
      role: (value) => {
        if (!value) return 'Role is required';
        return null;
      }
    }
  });

  useEffect(() => {
    if (opened) {
      loadFormData();
    }
  }, [opened, user]);

  const loadFormData = async () => {
    try {
      setIsLoading(true);
      
      // Load departments and reporting managers
      const [deptData, managerData] = await Promise.all([
        userService.getDepartments(),
        userService.getReportingManagers()
      ]);
      
      setDepartments(deptData);
      setReportingManagers(managerData);

      // Set form values if editing
      if (user) {
        form.setValues({
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          reporting_manager: user.reporting_manager || undefined,
          status: user.status
        });
      } else {
        form.reset();
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load form data. Please try again.',
        color: 'red',
        icon: <IconAlertCircle />
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: CreateUserData) => {
    try {
      setIsLoading(true);

      if (user) {
        // Update existing user
        const updateData: UpdateUserData = { ...values };
        const updatedUser = await userService.updateUser(user.id, updateData, adminUserId, photoFile);
        
        let message = 'User updated successfully!';
        if (photoFile && !updatedUser.photo_url) {
          message += ' (Photo upload failed, but user was updated)';
        }
        
        notifications.show({
          title: 'Success',
          message,
          color: 'green',
          icon: <IconCheck />
        });
      } else {
        // Create new user
        const newUser = await userService.createUser(values, adminUserId, photoFile);
        
        let message = 'User created successfully!';
        if (photoFile && !newUser.photo_url) {
          message += ' (Photo upload failed, but user was created)';
        }
        
        notifications.show({
          title: 'Success',
          message,
          color: 'green',
          icon: <IconCheck />
        });
      }

      onSuccess();
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error saving user:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save user. Please try again.',
        color: 'red',
        icon: <IconAlertCircle />
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Title order={3} c={isViewMode ? 'gray' : user ? 'blue' : 'green'}>
          {isViewMode ? 'Crew Details' : user ? 'Edit User' : 'Add New User'}
        </Title>
      }
      size={isViewMode ? "md" : "lg"}
      closeOnClickOutside={false}
      closeOnEscape={false}
      styles={{
        title: {
          color: isViewMode ? '#1a1a1a' : undefined,
          fontWeight: 600,
          textAlign: 'center',
          width: '100%'
        },
        header: {
          backgroundColor: isViewMode ? '#f8f9fa' : undefined,
          borderBottom: isViewMode ? '1px solid #e9ecef' : undefined
        },
        body: {
          backgroundColor: isViewMode ? '#ffffff' : undefined,
          padding: isViewMode ? '2rem' : undefined
        }
      }}
    >
      <LoadingOverlay visible={isLoading} />
      
      {isViewMode ? (
        // View Mode - Crew Details Design
        <div style={{ 
          backgroundColor: '#1a1a1a', 
          color: '#ffffff',
          borderRadius: '12px',
          padding: '2rem',
          minHeight: '400px'
        }}>
          {/* Header */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '2rem',
            borderBottom: '1px solid #333',
            paddingBottom: '1rem'
          }}>
            <Title order={2} c="#ffffff" mb="xs" style={{ fontWeight: 600 }}>
              Crew Details
            </Title>
          </div>

          {/* Profile Section */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem',
            marginBottom: '2rem',
            padding: '1.5rem',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px'
          }}>
            <div style={{ position: 'relative' }}>
              {user?.photo_url ? (
                <Avatar 
                  size={80} 
                  src={user.photo_url}
                  style={{ border: '3px solid #4a9eff' }}
                />
              ) : (
                <Avatar 
                  size={80} 
                  color="#4a9eff"
                  style={{ border: '3px solid #4a9eff' }}
                >
                  <IconUser size={40} />
                </Avatar>
              )}
              <div style={{
                position: 'absolute',
                bottom: '-5px',
                right: '-5px',
                width: '20px',
                height: '20px',
                backgroundColor: user?.status ? '#00d4aa' : '#ff6b6b',
                borderRadius: '50%',
                border: '2px solid #1a1a1a'
              }} />
            </div>
            
            <div style={{ flex: 1 }}>
              <Text size="xl" fw={600} c="#ffffff" mb="xs">
                {user?.name || 'Crew Member'}
              </Text>
              <Text size="sm" c="#b0b0b0" mb="xs">
                {user?.email || 'email@mediente.com'}
              </Text>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Badge 
                  color={
                    user?.role === 'Admin' ? 'purple' :
                    user?.role === 'HOD' ? 'red' : 
                    user?.role === 'Associate' ? 'blue' : 'green'
                  }
                  variant="filled"
                  size="sm"
                >
                  {user?.role || 'Crew'}
                </Badge>
                <Badge 
                  color={user?.status ? 'green' : 'red'}
                  variant="filled"
                  size="sm"
                >
                  {user?.status ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#2a2a2a', 
              borderRadius: '6px',
              border: '1px solid #333'
            }}>
              <Text size="sm" c="#b0b0b0" mb="xs">Department</Text>
              <Text size="md" fw={500} c="#ffffff">
                {user?.department || 'Not assigned'}
              </Text>
            </div>
            
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#2a2a2a', 
              borderRadius: '6px',
              border: '1px solid #333'
            }}>
              <Text size="sm" c="#b0b0b0" mb="xs">Reporting To</Text>
              <Text size="md" fw={500} c="#ffffff">
                {user?.reporting_manager || 'Direct Report'}
              </Text>
            </div>
          </div>

          {/* Additional Info */}
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#2a2a2a', 
            borderRadius: '6px',
            border: '1px solid #333',
            marginBottom: '2rem'
          }}>
            <Text size="sm" c="#b0b0b0" mb="xs">Member Since</Text>
            <Text size="md" fw={500} c="#ffffff">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Recently added'}
            </Text>
          </div>

          {/* Footer */}
          <div style={{ 
            textAlign: 'center', 
            borderTop: '1px solid #333',
            paddingTop: '1rem'
          }}>
            <Text size="xs" c="#666" mb="xs">Made with</Text>
            <Text size="sm" c="#4a9eff" fw={600}>MEDIENTE</Text>
          </div>

          {/* Close Button */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Button 
              variant="filled" 
              color="gray"
              onClick={onClose}
              style={{
                backgroundColor: '#4a4a4a',
                border: 'none',
                borderRadius: '6px',
                padding: '0.75rem 2rem'
              }}
            >
              Close
            </Button>
          </div>
        </div>
      ) : (
        // Edit/Create Mode - Original Form
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* Photo Upload */}
            <Group justify="center" mb="md">
              {photoPreview ? (
                <Avatar size={120} src={photoPreview} />
              ) : user?.photo_url ? (
                <Avatar size={120} src={user.photo_url} />
              ) : (
                <Avatar size={120} color="blue">
                  <IconUser size={60} />
                </Avatar>
              )}
            </Group>
            
            <FileInput
              label="Profile Photo"
              placeholder="Upload profile photo"
              accept="image/*"
              leftSection={<IconUpload size={16} />}
              value={photoFile}
              onChange={handlePhotoChange}
              clearable
            />

            {/* User Information */}
            <Group grow>
              <TextInput
                label="Full Name"
                placeholder="Enter full name"
                required
                {...form.getInputProps('name')}
              />
              <TextInput
                label="Email Address"
                placeholder="Enter email address"
                required
                {...form.getInputProps('email')}
              />
            </Group>

            <Group grow>
              <Select
                label="Role"
                placeholder="Select role"
                data={[
                  { value: 'Admin', label: 'Admin (System Administrator)' },
                  { value: 'HOD', label: 'HOD (Head of Department)' },
                  { value: 'Associate', label: 'Associate' },
                  { value: 'Crew', label: 'Crew' }
                ]}
                required
                {...form.getInputProps('role')}
              />
              <Select
                label="Department"
                placeholder="Select department"
                data={departments.map(dept => ({ value: dept.name, label: dept.name }))}
                searchable
                creatable
                getCreateLabel={(query) => `+ Create ${query}`}
                onCreate={(query) => {
                  const newDept = { id: Date.now().toString(), name: query };
                  setDepartments([...departments, newDept]);
                  return newDept.name;
                }}
                required
                {...form.getInputProps('department')}
              />
            </Group>

            <Select
              label="Reporting Manager"
              placeholder="Select reporting manager (optional)"
              data={reportingManagers
                .filter(manager => !user || manager.id !== user.id) // Can't report to self
                .map(manager => ({ 
                  value: manager.name, 
                  label: `${manager.name} (${manager.role}) - ${manager.department}` 
                }))}
              searchable
              clearable
              {...form.getInputProps('reporting_manager')}
            />

            <Switch
              label="Active Status"
              description="Enable or disable user access"
              checked={form.values.status}
              onChange={(event) => form.setFieldValue('status', event.currentTarget.checked)}
            />

            {/* Role-based warnings */}
            {form.values.role === 'Admin' && (
              <Alert icon={<IconAlertCircle />} color="purple" title="Admin Role">
                Admin users have full system access and can manage all departments and users.
              </Alert>
            )}

            {form.values.role === 'HOD' && (
              <Alert icon={<IconAlertCircle />} color="yellow" title="HOD Role">
                HOD users have full department access and can manage team members.
              </Alert>
            )}

            {form.values.role === 'Associate' && form.values.reporting_manager && (
              <Alert icon={<IconAlertCircle />} color="blue" title="Associate Role">
                Associates report to {form.values.reporting_manager} and have team management capabilities.
              </Alert>
            )}

            {/* Action buttons */}
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={isLoading}
                color={user ? 'blue' : 'green'}
              >
                {user ? 'Update User' : 'Create User'}
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
