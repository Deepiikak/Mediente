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
  Badge,
  ActionIcon,
  Box,
  Stack,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconGripVertical,
} from '@tabler/icons-react';
import type { projectStepType } from '../types/adminTemplates';

interface DraggableStepProps {
  step: projectStepType;
  level: number;
  onEdit: (step: projectStepType) => void;
  onArchive: (step: projectStepType) => void;
  onAddSubStep: (parentStep: projectStepType) => void;
  getCategoryColor: (category: string) => string;
}

function DraggableStep({
  step,
  level,
  onEdit,
  onArchive,
  onAddSubStep,
  getCategoryColor,
}: DraggableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: level * 20,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      sx={(theme) => ({
        padding: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
        backgroundColor: isDragging ? theme.colors.gray[1] : 'transparent',
        borderRadius: theme.radius.sm,
        border: isDragging ? `1px dashed ${theme.colors.blue[4]}` : '1px solid transparent',
        '&:hover': {
          backgroundColor: theme.colors.gray[0],
        },
      })}
    >
      <Group gap="xs" wrap="nowrap">
        {/* Drag Handle */}
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          {...listeners}
          style={{ cursor: 'grab' }}
        >
          <IconGripVertical size={12} />
        </ActionIcon>

        {/* Step Content */}
        <Group gap="xs" style={{ flex: 1 }}>
          <Text size="sm">• {step.name}</Text>
          <Badge size="xs" color={getCategoryColor(step.category)}>
            {step.category}
          </Badge>
        </Group>

        {/* Action Buttons */}
        <Group gap="xs">
          <ActionIcon 
            size="sm" 
            variant="subtle" 
            onClick={() => onEdit(step)}
          >
            <IconEdit size={12} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="red"
            onClick={() => onArchive(step)}
          >
            <IconTrash size={12} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="green"
            onClick={() => onAddSubStep(step)}
          >
            <IconPlus size={12} />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  );
}

interface DraggableStepTreeProps {
  steps: projectStepType[];
  onReorder: (stepReorders: { stepId: string; newIndex: number }[]) => Promise<void>;
  onEdit: (step: projectStepType) => void;
  onArchive: (step: projectStepType) => void;
  onAddSubStep: (parentStep?: projectStepType) => void;
  getCategoryColor: (category: string) => string;
}

export function DraggableStepTree({
  steps,
  onReorder,
  onEdit,
  onArchive,
  onAddSubStep,
  getCategoryColor,
}: DraggableStepTreeProps) {
  const [activeStep, setActiveStep] = React.useState<projectStepType | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Flatten steps for easier reordering (only top-level steps for now)
  const flattenSteps = (steps: projectStepType[], level = 0): Array<projectStepType & { level: number }> => {
    const result: Array<projectStepType & { level: number }> = [];
    
    steps.forEach(step => {
      result.push({ ...step, level });
      if (step.steps && step.steps.length > 0) {
        result.push(...flattenSteps(step.steps, level + 1));
      }
    });
    
    return result;
  };

  const flatSteps = flattenSteps(steps);
  
  // For now, only allow reordering at the same level (top-level steps)
  // TODO: Implement nested step reordering in future iterations
  const topLevelSteps = steps;
  const topLevelStepIds = topLevelSteps.map(step => step.id);

  const handleDragStart = (event: DragStartEvent) => {
    const activeStep = flatSteps.find(step => step.id === event.active.id);
    setActiveStep(activeStep || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStep(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeStep = topLevelSteps.find(step => step.id === active.id);
    const overStep = topLevelSteps.find(step => step.id === over.id);

    if (!activeStep || !overStep) {
      return;
    }

    const oldIndex = topLevelSteps.findIndex(step => step.id === active.id);
    const newIndex = topLevelSteps.findIndex(step => step.id === over.id);

    if (oldIndex === newIndex) {
      return;
    }

    // Create new order array
    const newSteps = [...topLevelSteps];
    const [movedStep] = newSteps.splice(oldIndex, 1);
    newSteps.splice(newIndex, 0, movedStep);

    // Create reorder payload
    const stepReorders = newSteps.map((step, index) => ({
      stepId: step.id,
      newIndex: index,
    }));

    try {
      await onReorder(stepReorders);
    } catch (error) {
      console.error('Error reordering steps:', error);
    }
  };

  const renderStepTree = (steps: projectStepType[], level = 0): React.ReactNode => {
    return steps.map((step) => (
      <React.Fragment key={step.id}>
        <DraggableStep
          step={step}
          level={level}
          onEdit={onEdit}
          onArchive={onArchive}
          onAddSubStep={onAddSubStep}
          getCategoryColor={getCategoryColor}
        />
        {step.steps && step.steps.length > 0 && (
          <Box ml={level * 20 + 20} opacity={0.7}>
            {renderStepTree(step.steps, level + 1)}
          </Box>
        )}
      </React.Fragment>
    ));
  };

  if (steps.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No steps defined
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
      <Stack gap="xs">
        {/* Only make top-level steps sortable for now */}
        <SortableContext 
          items={topLevelStepIds} 
          strategy={verticalListSortingStrategy}
        >
          {renderStepTree(steps)}
        </SortableContext>
      </Stack>

      <DragOverlay>
        {activeStep ? (
          <Box
            sx={(theme) => ({
              padding: theme.spacing.xs,
              backgroundColor: theme.colors.blue[0],
              borderRadius: theme.radius.sm,
              border: `1px solid ${theme.colors.blue[4]}`,
              boxShadow: theme.shadows.sm,
            })}
          >
            <Group gap="xs">
              <Text size="sm">• {activeStep.name}</Text>
              <Badge size="xs" color={getCategoryColor(activeStep.category)}>
                {activeStep.category}
              </Badge>
            </Group>
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
