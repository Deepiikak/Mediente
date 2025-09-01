import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Table,
  ActionIcon,
  Group,
  Badge,
  Text,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconEye,
  IconGripVertical,
  IconPlus,
} from '@tabler/icons-react';
import type { TemplatePhase, PhaseStep, StepTask, TaskCategoryType } from '../types/templates';
import { stepTaskService } from '../services/projectTemplateService';
import { useState, useEffect } from 'react';
import supabase from '../supabase';

// Generic sortable item component
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Table.Tr ref={setNodeRef} style={style} {...attributes}>
      <Table.Td>
        <ActionIcon
          variant="subtle"
          color="gray"
          {...listeners}
          style={{ cursor: 'grab' }}
          title="Drag to reorder"
        >
          <IconGripVertical size={16} />
        </ActionIcon>
      </Table.Td>
      {children}
    </Table.Tr>
  );
}

// Draggable Phases List
interface DraggablePhasesListProps {
  phases: TemplatePhase[];
  onReorder: (phases: TemplatePhase[]) => void;
  onEdit: (phase: TemplatePhase) => void;
  onDelete: (phase: TemplatePhase) => void;
  onView: (phase: TemplatePhase) => void;
}

export function DraggablePhasesList({
  phases,
  onReorder,
  onEdit,
  onDelete,
  onView,
}: DraggablePhasesListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = phases.findIndex((phase) => phase.phase_id === active.id);
      const newIndex = phases.findIndex((phase) => phase.phase_id === over.id);

      const newPhases = arrayMove(phases, oldIndex, newIndex);
      // Update the phase_order for each phase
      const reorderedPhases = newPhases.map((phase, index) => ({
        ...phase,
        phase_order: index + 1,
      }));
      
      onReorder(reorderedPhases);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: '40px' }}></Table.Th>
            <Table.Th>Order</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <SortableContext
            items={phases.map(p => p.phase_id)}
            strategy={verticalListSortingStrategy}
          >
            {phases.map((phase) => (
              <SortableItem key={phase.phase_id} id={phase.phase_id}>
                <Table.Td>
                  <Badge variant="light">{phase.phase_order}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>{phase.phase_name}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {phase.description || 'No description'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon 
                      variant="light" 
                      onClick={() => onView(phase)}
                      title="View Steps"
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="light" 
                      color="blue"
                      onClick={() => onEdit(phase)}
                      title="Edit Phase"
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="light" 
                      color="red"
                      onClick={() => onDelete(phase)}
                      title="Delete Phase"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </SortableItem>
            ))}
          </SortableContext>
        </Table.Tbody>
      </Table>
    </DndContext>
  );
}

// Draggable Steps List
interface DraggableStepsListProps {
  steps: PhaseStep[];
  onReorder: (steps: PhaseStep[]) => void;
  onEdit: (step: PhaseStep) => void;
  onDelete: (step: PhaseStep) => void;
  onView: (step: PhaseStep) => void;
}

export function DraggableStepsList({
  steps,
  onReorder,
  onEdit,
  onDelete,
  onView,
}: DraggableStepsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((step) => step.step_id === active.id);
      const newIndex = steps.findIndex((step) => step.step_id === over.id);

      const newSteps = arrayMove(steps, oldIndex, newIndex);
      // Update the step_order for each step
      const reorderedSteps = newSteps.map((step, index) => ({
        ...step,
        step_order: index + 1,
      }));
      
      onReorder(reorderedSteps);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: '40px' }}></Table.Th>
            <Table.Th>Order</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <SortableContext
            items={steps.map(s => s.step_id)}
            strategy={verticalListSortingStrategy}
          >
            {steps.map((step) => (
              <SortableItem key={step.step_id} id={step.step_id}>
                <Table.Td>
                  <Badge variant="light">{step.step_order}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>{step.step_name}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {step.description || 'No description'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon 
                      variant="light" 
                      onClick={() => onView(step)}
                      title="View Tasks"
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="light" 
                      color="blue"
                      onClick={() => onEdit(step)}
                      title="Edit Step"
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="light" 
                      color="red"
                      onClick={() => onDelete(step)}
                      title="Delete Step"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </SortableItem>
            ))}
          </SortableContext>
        </Table.Tbody>
      </Table>
    </DndContext>
  );
}

// Draggable Tasks List
interface DraggableTasksListProps {
  tasks: StepTask[];
  onReorder: (tasks: StepTask[]) => void;
  onEdit: (task: StepTask) => void;
  onDelete: (task: StepTask) => void;
  onCreateChild: (parentTaskId: string) => void;
  getRoleName: (roleId?: string) => string;
  templateId: string; // Add templateId to fetch cross-step parent info
}

export function DraggableTasksList({
  tasks,
  onReorder,
  onEdit,
  onDelete,
  onCreateChild,
  getRoleName,
  templateId,
}: DraggableTasksListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((task) => task.task_id === active.id);
      const newIndex = tasks.findIndex((task) => task.task_id === over.id);

      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      // Update the task_order for each task
      const reorderedTasks = newTasks.map((task, index) => ({
        ...task,
        task_order: index + 1,
      }));
      
      onReorder(reorderedTasks);
    }
  };

  // State to store cross-template parent task info
  const [crossTemplateParents, setCrossTemplateParents] = useState<Map<string, { task_name: string; step_name: string; phase_name: string }>>(new Map());
  const [loadingParentInfo, setLoadingParentInfo] = useState(false);

  // Load cross-template parent task information
  useEffect(() => {
    const loadCrossTemplateParents = async () => {
      const parentIds = tasks
        .map(task => task.parent_task_id)
        .filter((id): id is string => !!id && !tasks.some(t => t.task_id === id)); // Only IDs not in current tasks

      if (parentIds.length === 0) {
        setCrossTemplateParents(new Map());
        return;
      }

      setLoadingParentInfo(true);
      try {
        // Get all tasks from the template by querying directly
        const { data, error } = await supabase
          .from('step_tasks')
          .select(`
            *,
            phase_steps!inner(
              step_name,
              step_order,
              phase_id,
              template_phases!inner(
                phase_name,
                phase_order,
                template_id
              )
            )
          `)
          .eq('phase_steps.template_phases.template_id', templateId)
          .eq('is_archived', false)
          .in('task_id', parentIds);

        if (error) {
          console.error('Error loading cross-template parent info:', error);
          return;
        }

        const parentMap = new Map();
        
        if (data) {
          data.forEach(task => {
            parentMap.set(task.task_id, {
              task_name: task.task_name,
              step_name: task.phase_steps.step_name,
              phase_name: task.phase_steps.template_phases.phase_name
            });
          });
        }
        
        setCrossTemplateParents(parentMap);
      } catch (error) {
        console.error('Error loading cross-template parent info:', error);
      } finally {
        setLoadingParentInfo(false);
      }
    };

    loadCrossTemplateParents();
  }, [tasks, templateId]);

  // Get parent task name for display
  const getParentTaskName = (parentTaskId?: string) => {
    if (!parentTaskId) return null;
    
    // Check if parent is in current step tasks
    const parentTask = tasks.find(t => t.task_id === parentTaskId);
    if (parentTask) {
      return parentTask.task_name;
    }
    
    // Check if parent is from cross-template
    const crossTemplateParent = crossTemplateParents.get(parentTaskId);
    if (crossTemplateParent) {
      return `${crossTemplateParent.task_name} (${crossTemplateParent.phase_name} → ${crossTemplateParent.step_name})`;
    }
    
    // Show loading state only if we're actually loading
    if (loadingParentInfo) {
      return 'Loading...';
    }
    
    return 'Unknown Parent';
  };

  // Get category display info
  const getCategoryInfo = (category?: TaskCategoryType) => {
    if (!category) return { label: '-', color: 'gray' };
    
    switch (category) {
      case 'monitor':
        return { label: 'Monitor', color: 'blue' };
      case 'coordinate':
        return { label: 'Coordinate', color: 'orange' };
      case 'execute':
        return { label: 'Execute', color: 'green' };
      default:
        return { label: '-', color: 'gray' };
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
             <Table striped highlightOnHover>
         <Table.Thead>
           <Table.Tr>
             <Table.Th style={{ width: '40px' }}></Table.Th>
             <Table.Th style={{ width: '60px' }}>Order</Table.Th>
             <Table.Th style={{ width: '200px' }}>Task Name</Table.Th>
             <Table.Th style={{ width: '120px' }}>Category</Table.Th>
             <Table.Th style={{ width: '100px' }}>Checklist</Table.Th>
             <Table.Th style={{ width: '80px' }}>Hours</Table.Th>
             <Table.Th style={{ width: '120px' }}>Assigned To</Table.Th>
             <Table.Th>Description</Table.Th>
             <Table.Th style={{ width: '100px' }}>Actions</Table.Th>
           </Table.Tr>
         </Table.Thead>
        <Table.Tbody>
          <SortableContext
            items={tasks.map(t => t.task_id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
                             <SortableItem key={task.task_id} id={task.task_id}>
                 <Table.Td>
                   <Badge variant="light" size="sm">{task.task_order}</Badge>
                 </Table.Td>
                 <Table.Td>
                   <Text fw={500} size="sm">{task.task_name}</Text>
                   {task.parent_task_id && (
                     <Text size="xs" c="dimmed" mt={2}>
                       Parent: {getParentTaskName(task.parent_task_id)}
                     </Text>
                   )}
                 </Table.Td>
                 <Table.Td>
                   <Badge 
                     variant="light" 
                     color={getCategoryInfo(task.category).color}
                     size="sm"
                   >
                     {getCategoryInfo(task.category).label}
                   </Badge>
                 </Table.Td>
                 <Table.Td>
                   {task.checklist_items && task.checklist_items.length > 0 ? (
                     <Badge 
                       variant="outline" 
                       color="blue" 
                       size="sm"
                     >
                       {task.checklist_items.length} items
                     </Badge>
                   ) : (
                     <Text size="sm" c="dimmed">-</Text>
                   )}
                 </Table.Td>
                 <Table.Td>
                   <Text size="sm">
                     {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
                   </Text>
                 </Table.Td>
                 <Table.Td>
                   <Badge 
                     variant="light" 
                     color={task.assigned_role_id ? 'blue' : 'gray'}
                     size="sm"
                   >
                     {getRoleName(task.assigned_role_id)}
                   </Badge>
                 </Table.Td>
                 <Table.Td>
                   <Text size="sm" c="dimmed" lineClamp={2}>
                     {task.description || 'No description'}
                   </Text>
                 </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon 
                      variant="light" 
                      color="green"
                      onClick={() => onCreateChild(task.task_id)}
                      title="Create Child Task"
                      size="sm"
                    >
                      <IconPlus size={14} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="light" 
                      color="blue"
                      onClick={() => onEdit(task)}
                      title="Edit Task"
                      size="sm"
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="light" 
                      color="red"
                      onClick={() => onDelete(task)}
                      title="Delete Task"
                      size="sm"
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </SortableItem>
            ))}
          </SortableContext>
        </Table.Tbody>
      </Table>
    </DndContext>
  );
}
