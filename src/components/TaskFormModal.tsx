import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Title,
  NumberInput,
  Select
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { StepTask, CreateStepTaskRequest, UpdateStepTaskRequest, TemplateRole } from '../types/templates';
import { stepTaskService, templateRoleService } from '../services/projectTemplateService';

interface TaskFormModalProps {
  opened: boolean;
  onClose: () => void;
  stepId: string;
  task?: StepTask;
  onSuccess: () => void;
}

export default function TaskFormModal({ 
  opened, 
  onClose, 
  stepId,
  task, 
  onSuccess 
}: TaskFormModalProps) {
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    task_order: 1,
    estimated_hours: undefined as number | undefined,
    assigned_role_id: undefined as string | undefined
  });
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<TemplateRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleSearch, setRoleSearch] = useState('');

  const isEditing = !!task;

  // Load roles with search debouncing
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoadingRoles(true);
        const rolesData = await templateRoleService.getRolesForTemplates(roleSearch || undefined, 50);
        setRoles(rolesData);
      } catch (error) {
        console.error('Error loading roles:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to load roles',
          color: 'red'
        });
      } finally {
        setLoadingRoles(false);
      }
    };

    const debounceTimer = setTimeout(loadRoles, 300);
    return () => clearTimeout(debounceTimer);
  }, [roleSearch]);

  useEffect(() => {
    if (task) {
      setFormData({
        task_name: task.task_name,
        description: task.description || '',
        task_order: task.task_order,
        estimated_hours: task.estimated_hours || undefined,
        assigned_role_id: task.assigned_role_id || undefined
      });
    } else {
      setFormData({
        task_name: '',
        description: '',
        task_order: 1,
        estimated_hours: undefined,
        assigned_role_id: undefined
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.task_name.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Task name is required',
        color: 'red'
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && task) {
        const updateData: UpdateStepTaskRequest = {
          task_name: formData.task_name.trim(),
          description: formData.description.trim() || undefined,
          task_order: formData.task_order,
          estimated_hours: formData.estimated_hours || undefined,
          assigned_role_id: formData.assigned_role_id || undefined
        };
        
        await stepTaskService.update(task.task_id, updateData);
        notifications.show({
          title: 'Success',
          message: 'Task updated successfully',
          color: 'green'
        });
      } else {
        const createData: CreateStepTaskRequest = {
          step_id: stepId,
          task_name: formData.task_name.trim(),
          description: formData.description.trim() || undefined,
          task_order: formData.task_order,
          estimated_hours: formData.estimated_hours || undefined,
          assigned_role_id: formData.assigned_role_id || undefined
        };
        
        await stepTaskService.create(createData);
        notifications.show({
          title: 'Success',
          message: 'Task created successfully',
          color: 'green'
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save task',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  // Create role options for Select component
  const roleOptions = roles.map(role => ({
    value: role.role_id,
    label: `${role.role_name} (${role.department_name || 'No Department'})`
  }));

  return (
    <Modal 
      opened={opened} 
      onClose={onClose}
      title={
        <Title order={3}>
          {isEditing ? 'Edit Task' : 'Create New Task'}
        </Title>
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Task Name"
            placeholder="Enter task name"
            value={formData.task_name}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              task_name: e.target.value 
            }))}
            required
            maxLength={200}
          />

          <Textarea
            label="Description"
            placeholder="Enter task description (optional)"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              description: e.target.value 
            }))}
            minRows={3}
            maxRows={6}
            maxLength={1000}
          />

          <NumberInput
            label="Task Order"
            placeholder="Enter task order"
            value={formData.task_order}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              task_order: value || 1
            }))}
            min={1}
            required
          />

          <NumberInput
            label="Estimated Hours"
            placeholder="Enter estimated hours (optional)"
            value={formData.estimated_hours}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              estimated_hours: value || undefined
            }))}
            min={0}
            decimalScale={1}
          />

          <Select
            label="Assigned Role"
            placeholder="Search and select a role (optional)"
            value={formData.assigned_role_id || null}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              assigned_role_id: value || undefined
            }))}
            data={roleOptions}
            searchable
            clearable
            disabled={loadingRoles}
            onSearchChange={setRoleSearch}
            searchValue={roleSearch}
            description="Assign this task to a specific role/department"
            limit={50}
          />

          <Group justify="flex-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
