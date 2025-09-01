import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  TextInput,
  Select,
  Textarea,
  Button,
  Alert,
  Tabs,
  Switch,
  Avatar,
  Badge,
  Paper,
  Divider,
  ActionIcon
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconUser,
  IconUserPlus,
  IconSearch,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconStar,
  IconStarFilled
} from '@tabler/icons-react';
import { projectCrewService } from '../services/projectCrewService';
import type { 
  ProjectRole, 
  ProjectCrewWithUser,
  AddCrewMemberRequest 
} from '../types/project';

interface ProjectCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  role: ProjectRole;
}

interface ExistingUser {
  id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export default function ProjectCrewModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  projectId, 
  role 
}: ProjectCrewModalProps) {
  const [activeTab, setActiveTab] = useState<string | null>('existing');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // For existing user
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<ExistingUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  // For new user
  const [newUserData, setNewUserData] = useState({
    user_name: '',
    user_email: '',
    user_first_name: '',
    user_last_name: '',
    user_phone: ''
  });
  
  // Common fields
  const [isLead, setIsLead] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvailableUsers();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchUsers();
    }
  }, [searchTerm]);

  const loadAvailableUsers = async () => {
    try {
      const users = await projectCrewService.getAvailableUsers(projectId);
      setAvailableUsers(users);
    } catch (err) {
      console.error('Error loading available users:', err);
    }
  };

  const searchUsers = async () => {
    try {
      const users = await projectCrewService.searchUsers(searchTerm);
      setAvailableUsers(users);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const validateExistingUserForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedUserId) {
      newErrors.selectedUserId = 'Please select a user';
    }

    if (notes && notes.length > 1000) {
      newErrors.notes = 'Notes must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateNewUserForm = () => {
    const newErrors: Record<string, string> = {};

    if (!newUserData.user_name.trim()) {
      newErrors.user_name = 'Name is required';
    } else if (newUserData.user_name.length > 100) {
      newErrors.user_name = 'Name must be less than 100 characters';
    }

    if (!newUserData.user_email.trim()) {
      newErrors.user_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserData.user_email)) {
      newErrors.user_email = 'Please enter a valid email address';
    }

    if (newUserData.user_phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(newUserData.user_phone)) {
      newErrors.user_phone = 'Please enter a valid phone number';
    }

    if (notes && notes.length > 1000) {
      newErrors.notes = 'Notes must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = activeTab === 'existing' 
      ? validateExistingUserForm() 
      : validateNewUserForm();
    
    if (!isValid) return;

    setLoading(true);
    try {
      const request: AddCrewMemberRequest = {
        project_id: projectId,
        role_id: role.role_id,
        is_lead: isLead,
        notes: notes || undefined
      };

      if (activeTab === 'existing') {
        request.user_id = selectedUserId;
      } else {
        request.user_email = newUserData.user_email;
        request.user_name = newUserData.user_name;
        request.user_first_name = newUserData.user_first_name || undefined;
        request.user_last_name = newUserData.user_last_name || undefined;
        request.user_phone = newUserData.user_phone || undefined;
      }

      await projectCrewService.addCrewMember(request);
      
      notifications.show({
        title: 'Success',
        message: `Crew member added to ${role.role_name} successfully`,
        color: 'green',
        icon: <IconCheck size={16} />
      });

      handleClose();
      onSuccess();
    } catch (err) {
      console.error('Error adding crew member:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to add crew member. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    setNewUserData({
      user_name: '',
      user_email: '',
      user_first_name: '',
      user_last_name: '',
      user_phone: ''
    });
    setIsLead(false);
    setNotes('');
    setErrors({});
    setActiveTab('existing');
    onClose();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title={`Add Crew Member to ${role.role_name}`}
      size="lg"
    >
      <Stack>
        <Paper p="sm" radius="md" withBorder>
          <Group>
            <Badge variant="light" color="blue">{role.department_name}</Badge>
            <Text size="sm" c="dimmed">•</Text>
            <Text size="sm" fw={500}>{role.role_name}</Text>
            <Text size="sm" c="dimmed">•</Text>
            <Text size="sm" c="dimmed">
              {role.filled_count} / {role.required_count} filled
            </Text>
          </Group>
        </Paper>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="existing" leftSection={<IconUser size={14} />}>
              Existing User
            </Tabs.Tab>
            <Tabs.Tab value="new" leftSection={<IconUserPlus size={14} />}>
              New User
            </Tabs.Tab>
          </Tabs.List>

          <form onSubmit={handleSubmit}>
            <Tabs.Panel value="existing" pt="md">
              <Stack>
                <TextInput
                  label="Search Users"
                  placeholder="Search by name or email..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.currentTarget.value)}
                />

                <Select
                  label="Select User"
                  placeholder="Choose a user to add to this role"
                  value={selectedUserId}
                  onChange={(value) => {
                    setSelectedUserId(value || '');
                    if (errors.selectedUserId) {
                      setErrors({ ...errors, selectedUserId: '' });
                    }
                  }}
                  data={availableUsers.map((user) => ({
                    value: user.id,
                    label: `${user.name} (${user.email})`
                  }))}
                  error={errors.selectedUserId}
                  searchable
                  required
                  withAsterisk
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="new" pt="md">
              <Stack>
                <Group grow>
                  <TextInput
                    label="First Name"
                    placeholder="Enter first name"
                    value={newUserData.user_first_name}
                    onChange={(e) => {
                      setNewUserData({ ...newUserData, user_first_name: e.target.value });
                      if (errors.user_first_name) {
                        setErrors({ ...errors, user_first_name: '' });
                      }
                    }}
                    error={errors.user_first_name}
                  />
                  
                  <TextInput
                    label="Last Name"
                    placeholder="Enter last name"
                    value={newUserData.user_last_name}
                    onChange={(e) => {
                      setNewUserData({ ...newUserData, user_last_name: e.target.value });
                      if (errors.user_last_name) {
                        setErrors({ ...errors, user_last_name: '' });
                      }
                    }}
                    error={errors.user_last_name}
                  />
                </Group>

                <TextInput
                  label="Full Name"
                  placeholder="Enter full name"
                  value={newUserData.user_name}
                  onChange={(e) => {
                    setNewUserData({ ...newUserData, user_name: e.target.value });
                    if (errors.user_name) {
                      setErrors({ ...errors, user_name: '' });
                    }
                  }}
                  error={errors.user_name}
                  required
                  withAsterisk
                />

                <TextInput
                  label="Email"
                  placeholder="Enter email address"
                  value={newUserData.user_email}
                  onChange={(e) => {
                    setNewUserData({ ...newUserData, user_email: e.target.value });
                    if (errors.user_email) {
                      setErrors({ ...errors, user_email: '' });
                    }
                  }}
                  error={errors.user_email}
                  required
                  withAsterisk
                />

                <TextInput
                  label="Phone"
                  placeholder="Enter phone number (optional)"
                  value={newUserData.user_phone}
                  onChange={(e) => {
                    setNewUserData({ ...newUserData, user_phone: e.target.value });
                    if (errors.user_phone) {
                      setErrors({ ...errors, user_phone: '' });
                    }
                  }}
                  error={errors.user_phone}
                />
              </Stack>
            </Tabs.Panel>

            <Divider my="md" />

            {/* Common fields */}
            <Stack>
              <Switch
                label="Team Lead"
                description="Mark this person as the lead for this role"
                checked={isLead}
                onChange={(e) => setIsLead(e.currentTarget.checked)}
                thumbIcon={isLead ? <IconStarFilled size={12} /> : <IconStar size={12} />}
              />

              <Textarea
                label="Notes"
                placeholder="Add any project-specific notes about this crew member..."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (errors.notes) {
                    setErrors({ ...errors, notes: '' });
                  }
                }}
                error={errors.notes}
                rows={3}
                maxLength={1000}
              />

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Add Crew Member
                </Button>
              </Group>
            </Stack>
          </form>
        </Tabs>
      </Stack>
    </Modal>
  );
}
