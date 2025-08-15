import React from 'react';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Group,
  Text,
  ActionIcon,
  Box,
  Stack,
  Card,
  Title,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconHierarchy,
  IconGripVertical,
} from '@tabler/icons-react';
import type { phaseType } from '../types/adminTemplates';

interface DraggablePhaseProps {
  phase: phaseType;
  onEdit: (phase: phaseType) => void;
  onArchive: (phase: phaseType) => void;
  onManageSteps: (phase: phaseType) => void;
}

function DraggablePhase({
  phase,
  onEdit,
  onArchive,
  onManageSteps,
}: DraggablePhaseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      withBorder
      p="md"
      sx={(theme) => ({
        backgroundColor: isDragging ? theme.colors.blue[0] : undefined,
        border: isDragging ? `1px dashed ${theme.colors.blue[4]}` : undefined,
        boxShadow: isDragging ? theme.shadows.sm : undefined,
      })}
    >
      <Group justify="space-between" mb="md">
        <Group gap="xs" style={{ flex: 1 }}>
          {/* Drag Handle */}
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            {...listeners}
            style={{ cursor: 'grab' }}
            title="Drag to reorder"
          >
            <IconGripVertical size={12} />
          </ActionIcon>

          {/* Phase Content - Clickable to manage steps */}
          <Box 
            onClick={() => onManageSteps(phase)} 
            style={{ flex: 1, cursor: 'pointer' }}
          >
            <Title order={4} mb="xs">{phase.name}</Title>
            <Text size="sm" c="dimmed" mb="xs">
              Steps: {phase.steps.length} | Index: {phase.index}
            </Text>
            {phase.description && (
              <Text size="sm" c="dimmed">{phase.description}</Text>
            )}
          </Box>
        </Group>

        {/* Action Buttons */}
        <Group gap="xs">
          <ActionIcon 
            variant="subtle" 
            onClick={() => onEdit(phase)}
            title="Edit phase"
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => onArchive(phase)}
            title="Archive phase"
          >
            <IconTrash size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            onClick={() => onManageSteps(phase)}
            title="Manage Steps"
          >
            <IconHierarchy size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
}

interface DraggablePhaseListProps {
  phases: phaseType[];
  onReorder: (phaseReorders: { phaseId: string; newIndex: number }[]) => Promise<void>;
  onEdit: (phase: phaseType) => void;
  onArchive: (phase: phaseType) => void;
  onManageSteps: (phase: phaseType) => void;
}

export function DraggablePhaseList({
  phases,
  onReorder,
  onEdit,
  onArchive,
  onManageSteps,
}: DraggablePhaseListProps) {
  const [activePhase, setActivePhase] = React.useState<phaseType | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const phaseIds = phases.map(phase => phase.id);

  const handleDragStart = (event: DragStartEvent) => {
    const activePhase = phases.find(phase => phase.id === event.active.id);
    setActivePhase(activePhase || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePhase(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activePhase = phases.find(phase => phase.id === active.id);
    const overPhase = phases.find(phase => phase.id === over.id);

    if (!activePhase || !overPhase) {
      return;
    }

    const oldIndex = phases.findIndex(phase => phase.id === active.id);
    const newIndex = phases.findIndex(phase => phase.id === over.id);

    if (oldIndex === newIndex) {
      return;
    }

    // Create new order array
    const newPhases = [...phases];
    const [movedPhase] = newPhases.splice(oldIndex, 1);
    newPhases.splice(newIndex, 0, movedPhase);

    // Create reorder payload
    const phaseReorders = newPhases.map((phase, index) => ({
      phaseId: phase.id,
      newIndex: index,
    }));

    try {
      await onReorder(phaseReorders);
    } catch (error) {
      console.error('Error reordering phases:', error);
    }
  };

  if (phases.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No phases created yet. Add a phase to start building your template.
      </Text>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Stack gap="md">
        <SortableContext 
          items={phaseIds} 
          strategy={verticalListSortingStrategy}
        >
          {phases.map((phase) => (
            <DraggablePhase
              key={phase.id}
              phase={phase}
              onEdit={onEdit}
              onArchive={onArchive}
              onManageSteps={onManageSteps}
            />
          ))}
        </SortableContext>
      </Stack>

      <DragOverlay>
        {activePhase ? (
          <Card
            withBorder
            p="md"
            sx={(theme) => ({
              backgroundColor: theme.colors.blue[0],
              border: `1px solid ${theme.colors.blue[4]}`,
              boxShadow: theme.shadows.lg,
              transform: 'rotate(3deg)',
            })}
          >
            <Group justify="space-between" mb="md">
              <Box style={{ flex: 1 }}>
                <Title order={4} mb="xs">{activePhase.name}</Title>
                <Text size="sm" c="dimmed">
                  Steps: {activePhase.steps.length} | Index: {activePhase.index}
                </Text>
              </Box>
            </Group>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
