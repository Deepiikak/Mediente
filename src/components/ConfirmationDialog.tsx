import {
  Modal,
  Text,
  Button,
  Group,
  Stack,
  Alert,
  LoadingOverlay,
  Badge,
  Divider
} from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconX } from '@tabler/icons-react';
import type { User } from '../types/userManagement';

interface ConfirmationDialogProps {
  opened: boolean;
  onClose: () => void;
  type: 'delete' | 'roleChange' | 'bulkAction';
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  user?: User;
  newRole?: string;
  bulkAction?: {
    action: string;
    count: number;
    value?: string;
  };
}

export default function ConfirmationDialog({
  opened,
  onClose,
  type,
  title,
  message,
  onConfirm,
  user,
  newRole,
  bulkAction
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      
      notifications.show({
        title: 'Success',
        message: getSuccessMessage(),
        color: 'green',
        icon: <IconCheck />
      });
      
      onClose();
    } catch (error) {
      console.error('Error in confirmation action:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'An error occurred. Please try again.',
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSuccessMessage = () => {
    switch (type) {
      case 'delete':
        return `User ${user?.name} has been deactivated successfully.`;
      case 'roleChange':
        return `User ${user?.name} role has been changed to ${newRole} successfully.`;
      case 'bulkAction':
        return `Bulk action completed successfully for ${bulkAction?.count} users.`;
      default:
        return 'Action completed successfully.';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'delete':
        return <IconAlertTriangle size={24} />;
      case 'roleChange':
        return <IconAlertTriangle size={24} />;
      case 'bulkAction':
        return <IconAlertTriangle size={24} />;
      default:
        return <IconAlertTriangle size={24} />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'delete':
        return 'red';
      case 'roleChange':
        return 'yellow';
      case 'bulkAction':
        return 'blue';
      default:
        return 'red';
    }
  };

  const renderUserDetails = () => {
    if (!user) return null;

    return (
      <Stack gap="xs" p="md" bg="gray.0" style={{ borderRadius: '8px' }}>
        <Text size="sm" fw={500}>User Details:</Text>
        <Group gap="md">
          <Text size="sm"><strong>Name:</strong> {user.name}</Text>
          <Text size="sm"><strong>Email:</strong> {user.email}</Text>
          <Text size="sm"><strong>Department:</strong> {user.department}</Text>
          <Badge color={getRoleColor(user.role)} variant="light">
            {user.role}
          </Badge>
        </Group>
      </Stack>
    );
  };

  const renderRoleChangeDetails = () => {
    if (type !== 'roleChange' || !user || !newRole) return null;

    return (
      <Stack gap="xs" p="md" bg="yellow.0" style={{ borderRadius: '8px' }}>
        <Text size="sm" fw={500} c="yellow.7">Role Change Details:</Text>
        <Group gap="md">
          <Text size="sm">
            <strong>Current Role:</strong> 
            <Badge color={getRoleColor(user.role)} variant="light" ml="xs">
              {user.role}
            </Badge>
          </Text>
          <Text size="sm">
            <strong>New Role:</strong> 
            <Badge color={getRoleColor(newRole)} variant="light" ml="xs">
              {newRole}
            </Badge>
          </Text>
        </Group>
        
        {newRole === 'Crew' && user.role !== 'Crew' && (
          <Alert color="yellow" title="Role Downgrade Warning">
            This user will lose access to management features and may be logged out immediately.
          </Alert>
        )}
      </Stack>
    );
  };

  const renderBulkActionDetails = () => {
    if (type !== 'bulkAction' || !bulkAction) return null;

    return (
      <Stack gap="xs" p="md" bg="blue.0" style={{ borderRadius: '8px' }}>
        <Text size="sm" fw={500} c="blue.7">Bulk Action Details:</Text>
        <Group gap="md">
          <Text size="sm"><strong>Action:</strong> {bulkAction.action}</Text>
          <Text size="sm"><strong>Users Affected:</strong> {bulkAction.count}</Text>
          {bulkAction.value && (
            <Text size="sm"><strong>Value:</strong> {bulkAction.value}</Text>
          )}
        </Group>
      </Stack>
    );
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
      title={title}
      size="md"
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <LoadingOverlay visible={isLoading} />
      
      <Stack gap="lg">
        {/* Warning Icon and Message */}
        <Group justify="center">
          <div style={{ color: getColor() }}>
            {getIcon()}
          </div>
        </Group>
        
        <Text size="sm" c="dimmed" ta="center">
          {message}
        </Text>

        <Divider />

        {/* User Details */}
        {renderUserDetails()}
        
        {/* Role Change Details */}
        {renderRoleChangeDetails()}
        
        {/* Bulk Action Details */}
        {renderBulkActionDetails()}

        {/* Confirmation Warning */}
        <Alert color={getColor()} title="Please Confirm">
          {type === 'delete' && 'This action will deactivate the user. They will lose access to the system.'}
          {type === 'roleChange' && 'This action will change the user\'s role immediately. Changes take effect within 5 seconds.'}
          {type === 'bulkAction' && `This action will affect ${bulkAction?.count} users. Please review the details carefully.`}
        </Alert>

        {/* Action Buttons */}
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            color={getColor()} 
            onClick={handleConfirm}
            loading={isLoading}
            leftSection={getIcon()}
          >
            {type === 'delete' && 'Deactivate User'}
            {type === 'roleChange' && 'Change Role'}
            {type === 'bulkAction' && 'Execute Bulk Action'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
