import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Button,
  Group,
  Stack,
  FileInput,
  Avatar,
  Center,
  Text,
  Grid,
  Switch,
  LoadingOverlay,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconUser,
  IconMail,
  IconBriefcase,
  IconBuilding,
  IconUserCheck,
  IconUpload,
} from '@tabler/icons-react';
import userService from '../services/userService';
import type { User, CreateUserData, UpdateUserData, ReportingManager } from '../types/userManagement';

interface UserFormModalProps {
  opened: boolean;
  onClose: () => void;
  user: User | null;
  isViewMode?: boolean;
  onSuccess: () => void;
  adminUserId: string;
}

const departments = [
  'Film',
  'Talent',
  'Location',
  'Production',
  'Camera',
  'Sound',
  'Art',
  'Costume',
  'Makeup',
  'Post-Production',
  'Marketing',
  'Finance',
  'HR',
  'IT',
];

export default function UserFormModal({
  opened,
  onClose,
  user,
  isViewMode = false,
  onSuccess,
  adminUserId,
}: UserFormModalProps) {
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    role: 'Crew',
    department: '',
    reporting_manager: '',
    status: true,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [reportingManagers, setReportingManagers] = useState<ReportingManager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (opened) {
      loadReportingManagers();
      if (user) {
        setFormData({
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          reporting_manager: user.reporting_manager || '',
          status: user.status,
          photo_url: user.photo_url,
        });
        setPhotoPreview(user.photo_url || null);
      } else {
        resetForm();
      }
    }
  }, [opened, user]);

  const loadReportingManagers = async () => {
    try {
      const managers = await userService.getReportingManagers();
      setReportingManagers(managers);
    } catch (error) {
      console.error('Error loading reporting managers:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'Crew',
      department: '',
      reporting_manager: '',
      status: true,
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoChange = (file: File | null) => {
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoFile(null);
      setPhotoPreview(user?.photo_url || null);
    }
  };

  const handleSubmit = async () => {
    if (isViewMode) return;

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      if (user) {
        // Update existing user
        const updateData: UpdateUserData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          reporting_manager: formData.reporting_manager || undefined,
          status: formData.status,
        };
        
        await userService.updateUser(user.id, updateData, adminUserId, photoFile || undefined);
        
        notifications.show({
          title: 'Success',
          message: 'User updated successfully',
          color: 'green',
        });
      } else {
        // Create new user
        await userService.createUser(formData, adminUserId, photoFile || undefined);
        
        notifications.show({
          title: 'Success',
          message: 'User created successfully',
          color: 'green',
        });
      }
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save user',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredManagers = () => {
    if (!formData.department) return reportingManagers;
    
    // Filter managers by same department or show all HODs
    return reportingManagers.filter(
      manager => manager.department === formData.department || manager.role === 'HOD'
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        isViewMode
          ? 'View User Details'
          : user
          ? 'Edit User'
          : 'Add New User'
      }
      size="lg"
    >
      <LoadingOverlay visible={isLoading} />
      
      <Stack gap="md">
        {/* Photo Upload */}
        <Center>
          <Stack align="center" gap="xs">
            <Avatar
              size={120}
              radius="50%"
              src={photoPreview}
              alt={formData.name}
            >
              <IconUser size={48} />
            </Avatar>
            {!isViewMode && (
              <FileInput
                placeholder="Upload photo"
                accept="image/*"
                onChange={handlePhotoChange}
                leftSection={<IconUpload size={16} />}
                clearable
                size="sm"
              />
            )}
          </Stack>
        </Center>

        {/* Form Fields */}
        <Grid>
          <Grid.Col span={6}>
            <TextInput
              label="Full Name"
              placeholder="Enter full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              disabled={isViewMode}
              required
              leftSection={<IconUser size={16} />}
            />
          </Grid.Col>
          
          <Grid.Col span={6}>
            <TextInput
              label="Email"
              placeholder="Enter email address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              disabled={isViewMode}
              required
              leftSection={<IconMail size={16} />}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <Select
              label="Role"
              placeholder="Select role"
              data={[
                { value: 'HOD', label: 'Head of Department (HOD)' },
                { value: 'Associate', label: 'Associate' },
                { value: 'Crew', label: 'Crew Member' },
              ]}
              value={formData.role}
              onChange={(value) => setFormData({ ...formData, role: value as any })}
              error={errors.role}
              disabled={isViewMode}
              required
              leftSection={<IconBriefcase size={16} />}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <Select
              label="Department"
              placeholder="Select department"
              data={departments}
              value={formData.department}
              onChange={(value) => setFormData({ ...formData, department: value || '' })}
              error={errors.department}
              disabled={isViewMode}
              required
              searchable
              leftSection={<IconBuilding size={16} />}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Select
              label="Reporting Manager"
              placeholder="Select reporting manager (optional)"
              data={getFilteredManagers().map(manager => ({
                value: manager.id,
                label: `${manager.name} (${manager.role} - ${manager.department})`,
              }))}
              value={formData.reporting_manager}
              onChange={(value) => setFormData({ ...formData, reporting_manager: value || '' })}
              disabled={isViewMode || formData.role === 'HOD'}
              searchable
              clearable
              leftSection={<IconUserCheck size={16} />}
            />
            {formData.role === 'HOD' && (
              <Text size="xs" c="dimmed" mt={4}>
                HODs don't require a reporting manager
              </Text>
            )}
          </Grid.Col>

          <Grid.Col span={12}>
            <Switch
              label="Active Status"
              description="Inactive users cannot access the system"
              checked={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.currentTarget.checked })}
              disabled={isViewMode}
            />
          </Grid.Col>
        </Grid>

        {/* Action Buttons */}
        {!isViewMode && (
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isLoading}>
              {user ? 'Update User' : 'Create User'}
            </Button>
          </Group>
        )}
        
        {isViewMode && (
          <Group justify="flex-end" mt="md">
            <Button onClick={onClose}>
              Close
            </Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
