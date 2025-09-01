import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Stack,
  Group,
  Text,
  Badge,
  Avatar,
  ActionIcon,
  Progress,
  ScrollArea,
  Paper,
  ThemeIcon,
  Menu,
  Textarea,
  Checkbox,
  Alert,
  Tabs,
  TextInput,
  Select,
  Button,
  Table,
  Loader,
  Center,
  Drawer,
  NumberInput,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import {
  IconClock,
  IconAlertTriangle,
  IconCheck,
  IconDots,
  IconEdit,
  IconFile,
  IconMessage,
  IconUpload,   
  IconPlayerPlay,
  IconFlag,
  IconSearch,
  IconFilter,
  IconEye,
  IconRefresh,
  IconX,
  IconRobot,
  IconUsers,
  IconBolt,
  IconBan,
  IconXboxX,
} from '@tabler/icons-react';
import type { 
  ProjectTaskWithCrew, 
  TaskStatusType,
  ProjectCrewWithUser,
  ProjectTaskFilters,
} from '../types/project';

// Enhanced filter interface for the list view
interface TaskListFilters extends ProjectTaskFilters {
  role_id?: string;
  department_id?: string;
  is_escalated?: boolean;
  due_in_hours?: number;
  sort_by?: 'expected_end' | 'priority' | 'task_order' | 'created_at';
  sort_direction?: 'asc' | 'desc';
}

interface TaskRowProps {
  task: ProjectTaskWithCrew;
  onStatusChange: (taskId: string, newStatus: TaskStatusType) => void;
  onViewDetails: (task: ProjectTaskWithCrew) => void;
  tabType?: 'ready' | 'upcoming';
}

function TaskRow({ task, onStatusChange, onViewDetails, tabType = 'ready' }: TaskRowProps) {
  const getStatusColor = (status: TaskStatusType) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'ongoing': return 'blue';
      case 'completed': return 'green';
      case 'escalated': return 'red';
      case 'blocked': return 'orange';
      case 'cancelled': return 'dark';
      default: return 'gray';
    }
  };

  const getTimeProgress = () => {
    if (!task.actual_start_time || !task.expected_end_time) return 0;
    
    const start = new Date(task.actual_start_time).getTime();
    const end = new Date(task.expected_end_time).getTime();
    const now = new Date().getTime();
    
    const total = end - start;
    const elapsed = now - start;
    
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const isOverdue = () => {
    if (!task.expected_end_time || task.task_status === 'completed') return false;
    return new Date() > new Date(task.expected_end_time);
  };

  const getTimeRemaining = () => {
    if (!task.expected_end_time) return null;
    
    const now = new Date();
    const endTime = new Date(task.expected_end_time);
    const diff = endTime.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const getSLABadge = () => {
    if (!task.expected_end_time || task.task_status === 'completed') return null;
    
    const timeRemaining = getTimeRemaining();
    if (timeRemaining === 'Overdue') {
      return <Badge color="red" size="xs">OVERDUE</Badge>;
    }
    
    const now = new Date();
    const endTime = new Date(task.expected_end_time);
    const diff = endTime.getTime() - now.getTime();
    const hoursRemaining = diff / (1000 * 60 * 60);
    
    if (hoursRemaining <= 2) {
      return <Badge color="orange" size="xs">DUE SOON</Badge>;
    } else if (hoursRemaining <= 24) {
      return <Badge color="yellow" size="xs">DUE TODAY</Badge>;
    }
    
    return <Badge color="green" size="xs">ON TRACK</Badge>;
  };

  const getTaskPath = () => {
    return `${task.phase_order}.${task.step_order}.${task.task_order}`;
  };

  return (
    <tr>
      <td>
        <Group gap="xs">
          <ThemeIcon size="sm" variant="light" color={getStatusColor(task.task_status)}>
            {task.task_status === 'pending' && <IconClock size={12} />}
            {task.task_status === 'ongoing' && <IconPlayerPlay size={12} />}
            {task.task_status === 'completed' && <IconCheck size={12} />}
            {task.task_status === 'escalated' && <IconAlertTriangle size={12} />}
            {task.task_status === 'blocked' && <IconBan size={12} />}
            {task.task_status === 'cancelled' && <IconXboxX size={12} />}
          </ThemeIcon>
          <div>
            <Group gap="xs">
              <Text fw={600} size="sm">{task.task_name}</Text>
              {task.is_critical && (
                <Badge color="red" size="xs">
                  <IconFlag size={10} /> CRITICAL
                </Badge>
              )}
              {getSLABadge()}
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                {getTaskPath()} • {task.phase_name} → {task.step_name}
              </Text>
              {/* Workflow Status Indicator */}
              {task.task_status === 'pending' && (
                <Badge size="xs" color="blue" variant="dot">
                  Ready to Start
                </Badge>
              )}
              {task.task_status === 'ongoing' && (
                <Badge size="xs" color="green" variant="dot">
                  Ready to Complete
                </Badge>
              )}
              {task.task_status === 'blocked' && (
                <Badge size="xs" color="orange" variant="dot">
                  Needs Unblocking
                </Badge>
              )}
            </Group>
          </div>
        </Group>
      </td>
      
      <td>
        <Badge color={getStatusColor(task.task_status)} variant="light" size="sm">
          {task.task_status.toUpperCase()}
        </Badge>
      </td>
      
      <td>
        {task.assigned_crew_member ? (
          <Group gap="xs">
            <Avatar size="sm" color="blue">
              {task.assigned_crew_member.user_name.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text size="sm" fw={500}>{task.assigned_crew_member.user_name}</Text>
              <Text size="xs" c="dimmed">{task.assigned_crew_member.role_name}</Text>
            </div>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">Unassigned</Text>
        )}
      </td>
      
      <td>
        <div>
          <Text size="sm">{task.assigned_department_name || '-'}</Text>
          <Text size="xs" c="dimmed">{task.assigned_role_name || '-'}</Text>
        </div>
      </td>
      
      <td>
        <div>
          <Text size="sm">{task.estimated_hours || 8} hrs</Text>
          {task.actual_start_time && (
            <Text size="xs" c="dimmed">
              Started: {new Date(task.actual_start_time).toLocaleDateString()}
            </Text>
          )}
        </div>
      </td>
      
      <td>
        {tabType === 'upcoming' ? (
          // Show escalated date for upcoming tab
          <div>
            {task.escalated_at && (
              <Text size="sm" c="red">
                {new Date(task.escalated_at).toLocaleDateString()}
              </Text>
            )}
            {task.escalated_at && (
              <Text size="xs" c="dimmed">
                {new Date(task.escalated_at).toLocaleTimeString()}
              </Text>
            )}
          </div>
        ) : (
          // Show due date for ready tab
          <div>
            {task.expected_end_time && (
              <Text size="sm" c={isOverdue() ? 'red' : 'blue'}>
                {new Date(task.expected_end_time).toLocaleDateString()}
              </Text>
            )}
            {task.task_status === 'ongoing' && (
              <Text size="xs" c={isOverdue() ? 'red' : 'blue'}>
                {getTimeRemaining()}
              </Text>
            )}
          </div>
        )}
      </td>
      
      <td>
        {tabType === 'upcoming' ? (
          // Show escalation reason for upcoming tab
          <div>
            {task.escalation_reason ? (
              <Text size="sm" c="red" lineClamp={2}>
                {task.escalation_reason}
              </Text>
            ) : (
              <Text size="sm" c="dimmed">-</Text>
            )}
          </div>
        ) : (
          // Show progress for ready tab
          <div>
            {task.task_status === 'ongoing' && (
              <Progress 
                value={getTimeProgress()} 
                size="sm" 
                color={isOverdue() ? 'red' : 'blue'}
                style={{ width: '80px' }}
              />
            )}
          </div>
        )}
      </td>
      
      <td>
        <Group gap="xs">
          {/* Quick Action Buttons */}
          {task.task_status === 'pending' && (
            <ActionIcon 
              color="blue"
              variant="light"
              size="sm"
              onClick={() => onStatusChange(task.project_task_id, 'ongoing')}
              title="Start Task"
            >
              <IconPlayerPlay size={14} />
            </ActionIcon>
          )}
          
          {task.task_status === 'ongoing' && (
            <ActionIcon 
              color="green"
              variant="light"
              size="sm"
              onClick={() => onStatusChange(task.project_task_id, 'completed')}
              title="Mark Complete"
            >
              <IconCheck size={14} />
            </ActionIcon>
          )}
          
          {task.task_status === 'blocked' && (
            <ActionIcon 
              color="blue"
              variant="light"
              size="sm"
              onClick={() => onStatusChange(task.project_task_id, 'pending')}
              title="Unblock Task"
            >
              <IconPlayerPlay size={14} />
            </ActionIcon>
          )}
          
          <ActionIcon 
            variant="subtle" 
            size="sm"
            onClick={() => onViewDetails(task)}
          >
            <IconEye size={14} />
          </ActionIcon>
          
          <Menu>
            <Menu.Target>
              <ActionIcon variant="subtle" size="sm">
                <IconDots size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item 
                leftSection={<IconPlayerPlay size={14} />}
                onClick={() => onStatusChange(task.project_task_id, 'ongoing')}
                disabled={task.task_status !== 'pending' && task.task_status !== 'blocked'}
              >
                Start Task
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconCheck size={14} />}
                onClick={() => onStatusChange(task.project_task_id, 'completed')}
                disabled={task.task_status !== 'ongoing'}
              >
                Mark Complete
              </Menu.Item>
              {task.task_status === 'pending' && (
                <Menu.Item 
                  leftSection={<IconCheck size={14} />}
                  onClick={async () => {
                    // Quick complete: start then immediately complete
                    await onStatusChange(task.project_task_id, 'ongoing');
                    setTimeout(() => onStatusChange(task.project_task_id, 'completed'), 500);
                  }}
                  color="green"
                >
                  Start & Complete
                </Menu.Item>
              )}
              <Menu.Item 
                leftSection={<IconAlertTriangle size={14} />}
                onClick={() => onStatusChange(task.project_task_id, 'escalated')}
                disabled={task.task_status === 'completed' || task.task_status === 'cancelled'}
              >
                Escalate
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconBan size={14} />}
                onClick={() => onStatusChange(task.project_task_id, 'blocked')}
                disabled={task.task_status === 'completed' || task.task_status === 'cancelled'}
              >
                Block Task
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconXboxX size={14} />}
                onClick={() => onStatusChange(task.project_task_id, 'cancelled')}
                disabled={task.task_status === 'completed' || task.task_status === 'cancelled'}
                color="red"
              >
                Cancel Task
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconEdit size={14} />}
                onClick={() => onViewDetails(task)}
              >
                Edit Details
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </td>
    </tr>
  );
}

interface TaskEditData {
  task_name: string;
  task_description: string;
  estimated_hours: number;
  is_critical: boolean;
  [key: string]: unknown;
}

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: ProjectTaskWithCrew | null;
  onUpdate: (updates: Record<string, unknown>) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatusType) => void;
}

function TaskDetailDrawer({ isOpen, onClose, task, onUpdate, onStatusChange }: TaskDetailDrawerProps) {
  const [newComment, setNewComment] = useState('');
  const [checklist, setChecklist] = useState<Array<{ text: string; completed: boolean }>>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<TaskEditData>({
    task_name: '',
    task_description: '',
    estimated_hours: 8,
    is_critical: false
  });

  useEffect(() => {
    if (task) {
      setChecklist(task.checklist_items || []);
      setEditData({
        task_name: task.task_name,
        task_description: task.task_description || '',
        estimated_hours: task.estimated_hours || 8,
        is_critical: task.is_critical,
      });
    }
  }, [task]);

  if (!task) return null;

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment = {
      text: newComment,
      author: 'Current User', // TODO: Get from auth
      created_at: new Date().toISOString()
    };
    
    onUpdate({
      comments: [...(task.comments || []), comment]
    });
    
    setNewComment('');
  };

  const handleChecklistUpdate = (index: number, completed: boolean) => {
    const updatedChecklist = [...checklist];
    updatedChecklist[index].completed = completed;
    setChecklist(updatedChecklist);
    
    onUpdate({
      checklist_items: updatedChecklist
    });
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    
    const updatedChecklist = [...checklist, { text: newChecklistItem, completed: false }];
    setChecklist(updatedChecklist);
    setNewChecklistItem('');
    
    onUpdate({
      checklist_items: updatedChecklist
    });
  };

  const handleSaveEdit = () => {
    onUpdate(editData as unknown as Record<string, unknown>);
    setEditMode(false);
    notifications.show({
      title: 'Task Updated',
      message: 'Task details have been updated successfully',
      color: 'green'
    });
  };

  const getTimeRemaining = () => {
    if (!task.expected_end_time) return null;
    
    const now = new Date();
    const endTime = new Date(task.expected_end_time);
    const diff = endTime.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <Drawer
      opened={isOpen}
      onClose={onClose}
      title={editMode ? 'Edit Task' : task.task_name}
      size="xl"
      position="right"
    >
      <Stack>
        {/* Task Header */}
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <Badge color={
                task.task_status === 'pending' ? 'gray' :
                task.task_status === 'ongoing' ? 'blue' :
                task.task_status === 'completed' ? 'green' : 
                task.task_status === 'escalated' ? 'red' :
                task.task_status === 'blocked' ? 'orange' :
                task.task_status === 'cancelled' ? 'dark' : 'gray'
              }>
                {task.task_status.toUpperCase()}
              </Badge>
              {task.is_critical && (
                <Badge color="red" variant="filled">
                  <IconFlag size={12} /> CRITICAL
                </Badge>
              )}
            </Group>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setEditMode(!editMode)}
              leftSection={<IconEdit size={14} />}
            >
              {editMode ? 'Cancel' : 'Edit'}
            </Button>
          </Group>

          <Text size="sm" c="dimmed">
            Path: {task.phase_order}.{task.step_order}.{task.task_order} • 
            {task.phase_name} → {task.step_name}
          </Text>
        </Paper>

        {editMode ? (
          <Paper p="md" withBorder>
            <Stack>
              <TextInput
                label="Task Name"
                value={editData.task_name}
                onChange={(e) => setEditData({ ...editData, task_name: e.target.value })}
              />
              <Textarea
                label="Description"
                value={editData.task_description}
                onChange={(e) => setEditData({ ...editData, task_description: e.target.value })}
                rows={4}
              />
              <NumberInput
                label="Estimated Hours"
                value={editData.estimated_hours}
                onChange={(value) => setEditData({ ...editData, estimated_hours: Number(value) || 8 })}
                min={1}
                max={100}
              />
              <Checkbox
                label="Critical Task"
                checked={editData.is_critical}
                onChange={(e) => setEditData({ ...editData, is_critical: e.currentTarget.checked })}
              />
              <Group>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </Group>
            </Stack>
          </Paper>
        ) : (
          <>
            {/* Assigned Crew */}
            {task.assigned_crew_member && (
              <Paper p="md" withBorder>
                <Group>
                  <Avatar size="md" color="blue">
                    {task.assigned_crew_member.user_name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text fw={500}>{task.assigned_crew_member.user_name}</Text>
                    <Text size="sm" c="dimmed">
                      {task.assigned_crew_member.role_name} • {task.assigned_crew_member.department_name}
                    </Text>
                  </div>
                </Group>
              </Paper>
            )}

            {/* Timing Information */}
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Timeline</Text>
                  <Text size="sm" c="dimmed">
                    Est. {task.estimated_hours || 8} hours
                  </Text>
                </Group>
                
                {task.expected_end_time && (
                  <Group justify="space-between">
                    <Text size="sm">Time Remaining:</Text>
                    <Text size="sm" c={getTimeRemaining() === 'Overdue' ? 'red' : 'blue'}>
                      {getTimeRemaining()}
                    </Text>
                  </Group>
                )}
                
                {task.actual_start_time && (
                  <Text size="xs" c="dimmed">
                    Started: {new Date(task.actual_start_time).toLocaleString()}
                  </Text>
                )}
              </Stack>
            </Paper>

            {/* Description */}
            {task.task_description && (
              <Paper p="md" withBorder>
                <Text size="sm" fw={500} mb="xs">Description</Text>
                <Text size="sm">{task.task_description}</Text>
              </Paper>
            )}
          </>
        )}

        {/* Action Buttons */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            {/* Primary Actions */}
            <Group>
              {task.task_status === 'pending' && (
                <>
                  <Button
                    onClick={() => onStatusChange(task.project_task_id, 'ongoing')}
                    leftSection={<IconPlayerPlay size={16} />}
                    color="blue"
                  >
                    Start Task
                  </Button>
                  <Button
                    onClick={async () => {
                      // Quick complete: start then immediately complete
                      await onStatusChange(task.project_task_id, 'ongoing');
                      setTimeout(() => onStatusChange(task.project_task_id, 'completed'), 500);
                    }}
                    leftSection={<IconCheck size={16} />}
                    color="green"
                    variant="outline"
                  >
                    Start & Complete
                  </Button>
                </>
              )}
              
              {task.task_status === 'ongoing' && (
                <Button
                  color="green"
                  onClick={() => onStatusChange(task.project_task_id, 'completed')}
                  leftSection={<IconCheck size={16} />}
                  size="md"
                >
                  Mark Complete
                </Button>
              )}
              
              {task.task_status === 'blocked' && (
                <Button
                  onClick={() => onStatusChange(task.project_task_id, 'pending')}
                  leftSection={<IconPlayerPlay size={16} />}
                  color="blue"
                >
                  Unblock & Resume
                </Button>
              )}
              
              {task.task_status === 'escalated' && (
                <Button
                  onClick={() => onStatusChange(task.project_task_id, 'ongoing')}
                  leftSection={<IconPlayerPlay size={16} />}
                  color="blue"
                >
                  Resume Task
                </Button>
              )}
            </Group>
            
            {/* Secondary Actions */}
            <Group>
              <Button
                color="orange"
                variant="outline"
                onClick={() => onStatusChange(task.project_task_id, 'escalated')}
                disabled={task.task_status === 'completed' || task.task_status === 'cancelled'}
                leftSection={<IconAlertTriangle size={16} />}
                size="sm"
              >
                Escalate
              </Button>
              <Button
                color="yellow"
                variant="outline"
                onClick={() => onStatusChange(task.project_task_id, 'blocked')}
                disabled={task.task_status === 'completed' || task.task_status === 'cancelled' || task.task_status === 'blocked'}
                leftSection={<IconBan size={16} />}
                size="sm"
              >
                Block
              </Button>
              <Button
                color="red"
                variant="outline"
                onClick={() => onStatusChange(task.project_task_id, 'cancelled')}
                disabled={task.task_status === 'completed' || task.task_status === 'cancelled'}
                leftSection={<IconXboxX size={16} />}
                size="sm"
              >
                Cancel
              </Button>
            </Group>
            
            {/* Status Help Text */}
            <Text size="xs" c="dimmed">
              {task.task_status === 'pending' && 'Task is ready to start. Click "Start Task" first, then "Mark Complete".'}
              {task.task_status === 'ongoing' && 'Task is in progress. You can mark it complete when finished.'}
              {task.task_status === 'blocked' && 'Task is blocked. Click "Unblock & Resume" to continue.'}
              {task.task_status === 'escalated' && 'Task is escalated and needs attention. Click "Resume Task" to continue.'}
              {task.task_status === 'completed' && 'Task is completed.'}
              {task.task_status === 'cancelled' && 'Task has been cancelled.'}
            </Text>
          </Stack>
        </Paper>

        {/* Checklist */}
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={500}>Checklist</Text>
            <Text size="xs" c="dimmed">
              {checklist.filter(item => item.completed).length} / {checklist.length}
            </Text>
          </Group>
          
          <Stack gap="xs">
            {checklist.map((item, index) => (
              <Group key={index} gap="xs">
                <Checkbox
                  checked={item.completed}
                  onChange={(e) => handleChecklistUpdate(index, e.currentTarget.checked)}
                />
                <Text 
                  size="sm" 
                  style={{ 
                    textDecoration: item.completed ? 'line-through' : 'none',
                    opacity: item.completed ? 0.6 : 1
                  }}
                >
                  {item.text}
                </Text>
              </Group>
            ))}
            
            <Group gap="xs">
              <Textarea
                placeholder="Add checklist item..."
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                size="sm"
                autosize
                minRows={1}
                style={{ flex: 1 }}
              />
              <ActionIcon 
                onClick={handleAddChecklistItem}
                disabled={!newChecklistItem.trim()}
              >
                <IconCheck size={16} />
              </ActionIcon>
            </Group>
          </Stack>
        </Paper>

        {/* Comments */}
        <Paper p="md" withBorder>
          <Text size="sm" fw={500} mb="md">Comments</Text>
          
          <Stack gap="sm">
            {task.comments?.map((comment, index) => (
              <Paper key={index} p="sm" bg="gray.0">
                <Text size="xs" c="dimmed" mb="xs">
                  {comment.author} • {new Date(comment.created_at).toLocaleString()}
                </Text>
                <Text size="sm">{comment.text}</Text>
              </Paper>
            ))}
            
            <Group gap="xs">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                size="sm"
                autosize
                minRows={2}
                style={{ flex: 1 }}
              />
              <ActionIcon 
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                <IconMessage size={16} />
              </ActionIcon>
            </Group>
          </Stack>
        </Paper>

        {/* File Attachments */}
        <Paper p="md" withBorder>
          <Text size="sm" fw={500} mb="md">Attachments</Text>
          
          <Stack gap="sm">
            {task.file_attachments?.map((file, index) => (
              <Group key={index} justify="space-between">
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light">
                    <IconFile size={14} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm">{file.name}</Text>
                    <Text size="xs" c="dimmed">{(file.size / 1024).toFixed(1)} KB</Text>
                  </div>
                </Group>
              </Group>
            ))}
            
            <Dropzone
              onDrop={(files) => {
                // TODO: Implement file upload
                console.log('Files to upload:', files);
              }}
              maxSize={10 * 1024 * 1024} // 10MB
            >
              <Group justify="center" gap="xl" style={{ minHeight: 60 }}>
                <IconUpload size={50} stroke={1.5} />
                <div>
                  <Text size="xl" inline>
                    Drag files here or click to select
                  </Text>
                  <Text size="sm" c="dimmed" inline mt={7}>
                    Attach scripts, images, videos, or documents
                  </Text>
                </div>
              </Group>
            </Dropzone>
          </Stack>
        </Paper>

        {/* Escalation Alert */}
        {task.task_status === 'escalated' && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            <Text size="sm" fw={500}>Task Escalated</Text>
            <Text size="xs">{task.escalation_reason}</Text>
            {task.escalated_at && (
              <Text size="xs" c="dimmed" mt="xs">
                Escalated: {new Date(task.escalated_at).toLocaleString()}
              </Text>
            )}
          </Alert>
        )}
      </Stack>
    </Drawer>
  );
}

interface TaskListViewProps {
  projectId: string;
  tasks: ProjectTaskWithCrew[];
  crew: ProjectCrewWithUser[];
  loading?: boolean;
  onStatusChange: (taskId: string, newStatus: TaskStatusType) => void;
  onTaskUpdate: (taskId: string, updates: Record<string, unknown>) => void;
  onRefresh: () => void;
  onRunAutoAssignment?: () => Promise<void>;
}

export default function TaskListView({ 
  tasks, 
  crew,
  loading = false,
  onStatusChange, 
  onTaskUpdate,
  onRefresh,
  onRunAutoAssignment
}: TaskListViewProps) {
  const [activeTab, setActiveTab] = useState<string>('ready');
  const [filters, setFilters] = useState<TaskListFilters>({});
  const [selectedTask, setSelectedTask] = useState<ProjectTaskWithCrew | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [autoAssignmentLoading, setAutoAssignmentLoading] = useState(false);

  // Filter tasks based on the active tab
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Tab-based filtering
    if (activeTab === 'ready') {
      // Ready tab: tasks that can be worked on right now
      // - pending tasks (ready to start)
      // - ongoing tasks (currently being worked on)  
      // - blocked tasks (can be unblocked)
      filtered = tasks.filter(task => 
        task.task_status === 'pending' || 
        task.task_status === 'ongoing' || 
        task.task_status === 'blocked'
      );
    } else if (activeTab === 'upcoming') {
      // Upcoming tab: tasks that need special attention
      // - escalated tasks (overdue, need immediate attention)
      // - cancelled tasks (for reference/review)
      filtered = tasks.filter(task => 
        task.task_status === 'escalated' ||
        task.task_status === 'cancelled'
      );
    }

    // Apply additional filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(task =>
        task.task_name.toLowerCase().includes(search) ||
        task.task_description?.toLowerCase().includes(search) ||
        task.phase_name.toLowerCase().includes(search) ||
        task.step_name.toLowerCase().includes(search)
      );
    }

    if (filters.assigned_crew_id) {
      filtered = filtered.filter(task => 
        task.assigned_project_crew_id === filters.assigned_crew_id
      );
    }

    if (filters.role_id) {
      filtered = filtered.filter(task => 
        task.assigned_crew_member?.role_id === filters.role_id
      );
    }

    if (filters.department_id) {
      filtered = filtered.filter(task => 
        task.assigned_crew_member?.department_id === filters.department_id
      );
    }

    if (filters.task_status) {
      filtered = filtered.filter(task => task.task_status === filters.task_status);
    }

    if (filters.is_escalated) {
      filtered = filtered.filter(task => task.task_status === 'escalated');
    }

    if (filters.due_in_hours) {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() + filters.due_in_hours);
      filtered = filtered.filter(task => 
        task.expected_end_time && 
        new Date(task.expected_end_time) <= cutoffTime
      );
    }

    // Sorting
    const sortBy = filters.sort_by || 'task_order';
    const sortDir = filters.sort_direction || 'asc';

    filtered.sort((a, b) => {
      let aVal: string | number, bVal: string | number;

      switch (sortBy) {
        case 'expected_end':
          aVal = a.expected_end_time ? new Date(a.expected_end_time).getTime() : Infinity;
          bVal = b.expected_end_time ? new Date(b.expected_end_time).getTime() : Infinity;
          break;
        case 'priority':
          aVal = a.is_critical ? 0 : 1;
          bVal = b.is_critical ? 0 : 1;
          break;
        case 'task_order':
          aVal = `${a.phase_order}.${a.step_order}.${a.task_order}`;
          bVal = `${b.phase_order}.${b.step_order}.${b.task_order}`;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (sortDir === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [tasks, activeTab, filters]);

  const handleViewDetails = (task: ProjectTaskWithCrew) => {
    setSelectedTask(task);
    setShowDetailDrawer(true);
  };

  const handleTaskUpdate = (updates: Record<string, unknown>) => {
    if (selectedTask) {
      onTaskUpdate(selectedTask.project_task_id, updates);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleAutoAssignment = async () => {
    if (!onRunAutoAssignment) return;
    
    setAutoAssignmentLoading(true);
    try {
      await onRunAutoAssignment();
      notifications.show({
        title: 'Auto-Assignment Complete',
        message: 'Tasks have been automatically assigned to available crew members',
        color: 'green',
        icon: <IconRobot size={16} />
      });
    } catch (error) {
      console.error('Error running auto-assignment:', error);
      notifications.show({
        title: 'Auto-Assignment Failed',
        message: 'Failed to automatically assign tasks. Please try again.',
        color: 'red',
        icon: <IconRobot size={16} />
      });
    } finally {
      setAutoAssignmentLoading(false);
    }
  };

  // Get unique values for filter options
  const assignees = crew.map(c => ({ value: c.project_crew_id, label: c.user_name }));

  const getTabStats = (tabName: string) => {
    if (tabName === 'ready') {
      return tasks.filter(t => 
        t.task_status === 'pending' || 
        t.task_status === 'ongoing' || 
        t.task_status === 'blocked'
      ).length;
    } else if (tabName === 'upcoming') {
      return tasks.filter(t => 
        t.task_status === 'escalated' ||
        t.task_status === 'cancelled'
      ).length;
    }
    return 0;
  };

  // Get auto-assignment statistics
  const getAutoAssignmentStats = () => {
    const readyTasks = tasks.filter(t => t.task_status === 'pending' || t.task_status === 'blocked');
    const unassignedTasks = readyTasks.filter(t => !t.assigned_crew_member);
    const availableCrew = crew.filter(c => c.is_active);
    
    return {
      readyTasks: readyTasks.length,
      unassignedTasks: unassignedTasks.length,
      availableCrew: availableCrew.length,
      canAutoAssign: unassignedTasks.length > 0 && availableCrew.length > 0
    };
  };

  const autoStats = getAutoAssignmentStats();

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Box>
      <Stack>
        {/* Header with Actions */}
        <Group justify="space-between">
          <Group>
            <Text size="lg" fw={600}>Project Tasks</Text>
            <Badge variant="light" color="blue">
              {tasks.length} Total
            </Badge>
            {autoStats.unassignedTasks > 0 && (
              <Badge variant="light" color="orange">
                {autoStats.unassignedTasks} Unassigned
              </Badge>
            )}
            <Badge variant="light" color="green">
              <IconUsers size={12} /> {autoStats.availableCrew} Crew
            </Badge>
          </Group>
          <Group>
            {onRunAutoAssignment && autoStats.canAutoAssign && (
              <Button
                leftSection={<IconRobot size={16} />}
                onClick={handleAutoAssignment}
                loading={autoAssignmentLoading}
                color="blue"
                variant="filled"
              >
                Auto-Assign Tasks
              </Button>
            )}
            <Button
              variant="subtle"
              leftSection={<IconFilter size={16} />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <ActionIcon onClick={onRefresh}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Auto-Assignment Status */}
        {autoStats.unassignedTasks > 0 && autoStats.availableCrew === 0 && (
          <Alert color="orange" icon={<IconUsers size={16} />}>
            <Text size="sm">
              {autoStats.unassignedTasks} tasks are ready but no crew members are assigned to handle them.
              Assign crew members to roles to enable automatic task assignment.
            </Text>
          </Alert>
        )}

        {autoStats.unassignedTasks === 0 && autoStats.readyTasks > 0 && (
          <Alert color="green" icon={<IconBolt size={16} />}>
            <Text size="sm">
              All ready tasks are assigned! Auto-assignment is working correctly.
            </Text>
          </Alert>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <Paper p="md" withBorder>
            <Stack>
              <Group>
                <TextInput
                  placeholder="Search tasks..."
                  leftSection={<IconSearch size={16} />}
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  style={{ flex: 1 }}
                />
                <Select
                  placeholder="Assignee"
                  value={filters.assigned_crew_id || ''}
                  onChange={(value) => setFilters({ ...filters, assigned_crew_id: value || undefined })}
                  data={[{ value: '', label: 'All Assignees' }, ...assignees]}
                  clearable
                  style={{ minWidth: 200 }}
                />
              </Group>
              
              <Group>
                <Select
                  placeholder="Status"
                  value={filters.task_status || ''}
                  onChange={(value) => setFilters({ ...filters, task_status: value as TaskStatusType || undefined })}
                  data={[
                    { value: '', label: 'All Statuses' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'ongoing', label: 'Ongoing' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'escalated', label: 'Escalated' },
                    { value: 'blocked', label: 'Blocked' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                  clearable
                />
                
                <Select
                  placeholder="Sort by"
                  value={filters.sort_by || 'task_order'}
                  onChange={(value) => setFilters({ ...filters, sort_by: value as TaskListFilters['sort_by'] })}
                  data={[
                    { value: 'task_order', label: 'Task Order' },
                    { value: 'expected_end', label: 'Due Date' },
                    { value: 'priority', label: 'Priority' },
                    { value: 'created_at', label: 'Created Date' }
                  ]}
                />
                
                <Select
                  placeholder="Direction"
                  value={filters.sort_direction || 'asc'}
                  onChange={(value) => setFilters({ ...filters, sort_direction: value as 'asc' | 'desc' })}
                  data={[
                    { value: 'asc', label: 'Ascending' },
                    { value: 'desc', label: 'Descending' }
                  ]}
                />
                
                <Button variant="subtle" onClick={clearFilters} leftSection={<IconX size={16} />}>
                  Clear
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'ready')}>
          <Tabs.List>
            <Tabs.Tab value="ready">
              <Group gap="xs">
                <Text>Ready</Text>
                <Badge size="sm" variant="light">
                  {getTabStats('ready')}
                </Badge>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab value="upcoming">
              <Group gap="xs">
                <Text>Escalated</Text>
                <Badge size="sm" variant="light" color="red">
                  {getTabStats('upcoming')}
                </Badge>
              </Group>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="ready" pt="md">
            <Stack gap="md">
              {/* Workflow Help */}
              <Alert color="blue" variant="light" icon={<IconCheck size={16} />}>
                <Group justify="space-between">
                  <Text size="sm">
                    <strong>Task Workflow:</strong> Tasks must be started before they can be completed. 
                    Use <strong>Start Task</strong> (pending → ongoing) then <strong>Mark Complete</strong> (ongoing → completed).
                  </Text>
                  <Badge variant="light" color="green">
                    Quick: Start & Complete
                  </Badge>
                </Group>
              </Alert>
              
              <Paper withBorder>
                <ScrollArea>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Task</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Assignee</Table.Th>
                      <Table.Th>Department/Role</Table.Th>
                      <Table.Th>Duration</Table.Th>
                      <Table.Th>Due Date</Table.Th>
                      <Table.Th>Progress</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredTasks.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={8}>
                          <Center py="xl">
                            <Text c="dimmed">No ready tasks found</Text>
                          </Center>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      filteredTasks.map((task) => (
                        <TaskRow
                          key={task.project_task_id}
                          task={task}
                          onStatusChange={onStatusChange}
                          onViewDetails={handleViewDetails}
                          tabType={activeTab as 'ready' | 'upcoming'}
                        />
                      ))
                    )}
                  </Table.Tbody>
                </Table>
                </ScrollArea>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="upcoming" pt="md">
            <Paper withBorder>
              <ScrollArea>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Task</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Assignee</Table.Th>
                      <Table.Th>Department/Role</Table.Th>
                      <Table.Th>Duration</Table.Th>
                      <Table.Th>Escalated Date</Table.Th>
                      <Table.Th>Escalation Reason</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredTasks.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={8}>
                          <Center py="xl">
                            <Text c="dimmed">No escalated tasks found</Text>
                          </Center>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      filteredTasks.map((task) => (
                        <TaskRow
                          key={task.project_task_id}
                          task={task}
                          onStatusChange={onStatusChange}
                          onViewDetails={handleViewDetails}
                          tabType={activeTab as 'ready' | 'upcoming'}
                        />
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        isOpen={showDetailDrawer}
        onClose={() => setShowDetailDrawer(false)}
        task={selectedTask}
        onUpdate={handleTaskUpdate}
        onStatusChange={onStatusChange}
      />
    </Box>
  );
}
