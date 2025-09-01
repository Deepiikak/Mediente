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
import type { StepTask, CreateStepTaskRequest, UpdateStepTaskRequest, TemplateRole, TaskCategoryType, ChecklistItem } from '../types/templates';
import { stepTaskService, templateRoleService } from '../services/projectTemplateService';
import ChecklistManager from './ChecklistManager';

interface TaskFormModalProps {
  opened: boolean;
  onClose: () => void;
  stepId: string;
  templateId: string; // Add templateId for cross-template search
  task?: StepTask;
  parentTaskId?: string; // For creating child tasks
  onSuccess: () => void;
}

export default function TaskFormModal({ 
  opened, 
  onClose, 
  stepId,
  templateId,
  task,
  parentTaskId,
  onSuccess 
}: TaskFormModalProps) {
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    estimated_hours: undefined as number | undefined,
    assigned_role_id: undefined as string | undefined,
    parent_task_id: undefined as string | undefined,
    category: undefined as TaskCategoryType | undefined,
    checklist_items: [] as ChecklistItem[]
  });
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<TemplateRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleSearch, setRoleSearch] = useState('');
  const [availableParentTasks, setAvailableParentTasks] = useState<(StepTask & { step_name?: string; phase_name?: string })[]>([]);
  const [loadingParentTasks, setLoadingParentTasks] = useState(true);

  const isEditing = !!task;

  // Load available parent tasks
  useEffect(() => {
    const loadParentTasks = async () => {
      try {
        setLoadingParentTasks(true);
        
        // Get tasks from current step
        const currentStepTasks = await stepTaskService.getAvailableParentTasks(
          stepId, 
          task?.task_id // Exclude current task when editing
        );
        
        // Get tasks from previous steps and phases
        const crossTemplateTasks = await stepTaskService.getAvailableParentTasksFromTemplate(
          templateId,
          stepId,
          task?.task_id // Exclude current task when editing
        );
        
        // Combine both lists
        const allParentTasks = [
          // Current step tasks (no additional info needed)
          ...currentStepTasks.map(task => ({ ...task, step_name: undefined, phase_name: undefined })),
          // Cross-template tasks (with step and phase info)
          ...crossTemplateTasks
        ];
        
        setAvailableParentTasks(allParentTasks);
      } catch (error) {
        console.error('Error loading parent tasks:', error);
      } finally {
        setLoadingParentTasks(false);
      }
    };

    if (opened) {
      loadParentTasks();
    }
  }, [opened, stepId, templateId, task?.task_id]);

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
        estimated_hours: task.estimated_hours || undefined,
        assigned_role_id: task.assigned_role_id || undefined,
        parent_task_id: task.parent_task_id || undefined,
        category: task.category || undefined,
        checklist_items: task.checklist_items || []
      });
    } else {
      setFormData({
        task_name: '',
        description: '',
        estimated_hours: undefined,
        assigned_role_id: undefined,
        parent_task_id: parentTaskId || undefined,
        category: undefined,
        checklist_items: []
      });
    }
  }, [task, parentTaskId]);

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
          estimated_hours: formData.estimated_hours || undefined,
          assigned_role_id: formData.assigned_role_id || undefined,
          parent_task_id: formData.parent_task_id || undefined,
          category: formData.category || undefined,
          checklist_items: formData.checklist_items
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
          estimated_hours: formData.estimated_hours || undefined,
          assigned_role_id: formData.assigned_role_id || undefined,
          parent_task_id: formData.parent_task_id || undefined,
          category: formData.category || undefined,
          checklist_items: formData.checklist_items
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

  // Create parent task options for Select component
  const parentTaskOptions = availableParentTasks.map(parentTask => {
    let label = parentTask.task_name;
    
    // Add step and phase info for cross-template tasks
    if (parentTask.step_name && parentTask.phase_name) {
      label = `${parentTask.task_name} (${parentTask.phase_name} → ${parentTask.step_name})`;
    }
    
    return {
      value: parentTask.task_id,
      label
    };
  });

  // Task category options
  const categoryOptions = [
    { value: 'monitor', label: 'Monitor - Oversight and tracking tasks' },
    { value: 'coordinate', label: 'Coordinate - Management and communication tasks' },
    { value: 'execute', label: 'Execute - Action and implementation tasks' }
  ];

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
            label="Parent Task"
            placeholder="Select a parent task (optional)"
            value={formData.parent_task_id || null}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              parent_task_id: value || undefined
            }))}
            data={parentTaskOptions}
            searchable
            clearable
            disabled={loadingParentTasks}
            description="Make this task a child of another task"
          />

          <Select
            label="Category"
            placeholder="Select task category (optional)"
            value={formData.category || null}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              category: value as TaskCategoryType || undefined
            }))}
            data={categoryOptions}
            clearable
            description="Categorize the type of task"
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

          <ChecklistManager
            items={formData.checklist_items}
            onChange={(items) => setFormData(prev => ({ 
              ...prev, 
              checklist_items: items 
            }))}
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
