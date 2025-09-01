import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
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
  Modal,
  Textarea,
  Checkbox,
  Alert,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import {
  IconClock,
  IconAlertTriangle,
  IconCheck,
  IconDots,
  IconEdit,
  IconFile,
  IconMessage,
  IconCheckbox,
  IconUpload,   
  IconPlayerPlay,
  IconFlag,
} from '@tabler/icons-react';
import type { 
  ProjectTaskWithCrew, 
  TaskStatusType,
} from '../types/project';

interface TaskCardProps {
  task: ProjectTaskWithCrew;
  onStatusChange: (taskId: string, newStatus: TaskStatusType) => void;
  onTaskUpdate: (taskId: string, updates: any) => void;
}

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ProjectTaskWithCrew | null;
  onUpdate: (updates: any) => void;
}

function TaskDetailsModal({ isOpen, onClose, task, onUpdate }: TaskDetailsModalProps) {
  const [comments, setComments] = useState('');
  const [newComment, setNewComment] = useState('');
  const [checklist, setChecklist] = useState<Array<{ text: string; completed: boolean }>>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  useEffect(() => {
    if (task) {
      setComments(task.comments?.map(c => `${c.author}: ${c.text}`).join('\n') || '');
      setChecklist(task.checklist_items || []);
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
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={task.task_name}
      size="xl"
    >
      <Stack>
        {/* Task Header */}
        <Group justify="space-between">
          <Group>
            <Badge color={
              task.task_status === 'pending' ? 'gray' :
              task.task_status === 'ongoing' ? 'blue' :
              task.task_status === 'completed' ? 'green' : 'red'
            }>
              {task.task_status.toUpperCase()}
            </Badge>
            {task.is_critical && (
              <Badge color="red" variant="filled">
                <IconFlag size={12} /> CRITICAL
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed">
            {task.phase_name} → {task.step_name}
          </Text>
        </Group>

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
      </Stack>
    </Modal>
  );
}

function TaskCard({ task, onStatusChange, onTaskUpdate }: TaskCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status: TaskStatusType) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'ongoing': return 'blue';
      case 'completed': return 'green';
      case 'escalated': return 'red';
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

  return (
    <>
      <Card 
        shadow="sm" 
        padding="md" 
        radius="md" 
        withBorder
        style={{ 
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          border: task.is_critical ? '2px solid #fa5252' : undefined
        }}
        onClick={() => setShowDetails(true)}
      >
        <Stack gap="sm">
          {/* Header */}
          <Group justify="space-between">
            <Text fw={600} size="sm" lineClamp={2}>
              {task.task_name}
            </Text>
            <Menu>
              <Menu.Target>
                <ActionIcon 
                  variant="subtle" 
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item 
                  leftSection={<IconPlayerPlay size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.project_task_id, 'ongoing');
                  }}
                  disabled={task.task_status !== 'pending'}
                >
                  Start Task
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconCheck size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.project_task_id, 'completed');
                  }}
                  disabled={task.task_status !== 'ongoing'}
                >
                  Mark Complete
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconEdit size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(true);
                  }}
                >
                  Edit Details
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {/* Status and Priority */}
          <Group gap="xs">
            <Badge 
              color={getStatusColor(task.task_status)} 
              variant="light" 
              size="sm"
            >
              {task.task_status.toUpperCase()}
            </Badge>
            {task.is_critical && (
              <Badge color="red" size="xs">
                <IconFlag size={10} /> CRITICAL
              </Badge>
            )}
            {isOverdue() && (
              <Badge color="orange" size="xs">
                <IconAlertTriangle size={10} /> OVERDUE
              </Badge>
            )}
          </Group>

          {/* Assigned Crew Member */}
          {task.assigned_crew_member && (
            <Group gap="xs">
              <Avatar size="sm" color="blue">
                {task.assigned_crew_member.user_name.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Text size="xs" fw={500}>{task.assigned_crew_member.user_name}</Text>
                <Text size="xs" c="dimmed">
                  {task.assigned_crew_member.role_name}
                </Text>
              </div>
            </Group>
          )}

          {/* Progress and Timing */}
          {task.task_status === 'ongoing' && (
            <div>
              <Group justify="space-between" mb={5}>
                <Text size="xs" c="dimmed">Progress</Text>
                <Text size="xs" c="dimmed">
                  {task.expected_end_time && 
                    new Date(task.expected_end_time).toLocaleDateString()
                  }
                </Text>
              </Group>
              <Progress 
                value={getTimeProgress()} 
                size="sm" 
                color={isOverdue() ? 'red' : 'blue'}
              />
            </div>
          )}

          {/* Quick Stats */}
          <Group gap="lg">
            {task.checklist_items && task.checklist_items.length > 0 && (
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="green">
                  <IconCheckbox size={12} />
                </ThemeIcon>
                <Text size="xs" c="dimmed">
                  {task.checklist_items.filter(item => item.completed).length}/
                  {task.checklist_items.length}
                </Text>
              </Group>
            )}
            
            {task.comments && task.comments.length > 0 && (
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="blue">
                  <IconMessage size={12} />
                </ThemeIcon>
                <Text size="xs" c="dimmed">{task.comments.length}</Text>
              </Group>
            )}
            
            {task.file_attachments && task.file_attachments.length > 0 && (
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="orange">
                  <IconFile size={12} />
                </ThemeIcon>
                <Text size="xs" c="dimmed">{task.file_attachments.length}</Text>
              </Group>
            )}
          </Group>

          {/* Escalation Alert */}
          {task.task_status === 'escalated' && (
            <Alert color="red" size="sm">
              <Text size="xs">{task.escalation_reason}</Text>
            </Alert>
          )}
        </Stack>
      </Card>

      <TaskDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        task={task}
        onUpdate={(updates) => {
          onTaskUpdate(task.project_task_id, updates);
          setShowDetails(false);
        }}
      />
    </>
  );
}

interface TaskKanbanBoardProps {
  projectId: string;
  tasks: ProjectTaskWithCrew[];
  onStatusChange: (taskId: string, newStatus: TaskStatusType) => void;
  onTaskUpdate: (taskId: string, updates: any) => void;
}

export default function TaskKanbanBoard({ 
  projectId, 
  tasks, 
  onStatusChange, 
  onTaskUpdate 
}: TaskKanbanBoardProps) {
  const columns: { status: TaskStatusType; title: string; color: string }[] = [
    { status: 'pending', title: 'Pending', color: 'gray' },
    { status: 'ongoing', title: 'Ongoing', color: 'blue' },
    { status: 'completed', title: 'Completed', color: 'green' },
    { status: 'escalated', title: 'Escalated', color: 'red' }
  ];

  const getTasksForStatus = (status: TaskStatusType) => {
    return tasks.filter(task => task.task_status === status);
  };

  return (
    <Box>
      <Grid gutter="md">
        {columns.map((column) => {
          const columnTasks = getTasksForStatus(column.status);
          
          return (
            <Grid.Col key={column.status} span={3}>
              <Paper p="md" withBorder h="100%">
                <Stack h="100%">
                  {/* Column Header */}
                  <Group justify="space-between">
                    <Group gap="xs">
                      <ThemeIcon 
                        size="sm" 
                        variant="light" 
                        color={column.color}
                      >
                        {column.status === 'pending' && <IconClock size={14} />}
                        {column.status === 'ongoing' && <IconPlayerPlay size={14} />}
                        {column.status === 'completed' && <IconCheck size={14} />}
                        {column.status === 'escalated' && <IconAlertTriangle size={14} />}
                      </ThemeIcon>
                      <Text fw={600} size="sm">{column.title}</Text>
                    </Group>
                    <Badge 
                      color={column.color} 
                      variant="light" 
                      size="sm"
                    >
                      {columnTasks.length}
                    </Badge>
                  </Group>

                  {/* Tasks */}
                  <ScrollArea style={{ flex: 1 }}>
                    <Stack gap="sm">
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.project_task_id}
                          task={task}
                          onStatusChange={onStatusChange}
                          onTaskUpdate={onTaskUpdate}
                        />
                      ))}
                      
                      {columnTasks.length === 0 && (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                          No tasks in {column.title.toLowerCase()}
                        </Text>
                      )}
                    </Stack>
                  </ScrollArea>
                </Stack>
              </Paper>
            </Grid.Col>
          );
        })}
      </Grid>
    </Box>
  );
}
