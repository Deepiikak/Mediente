import { Gantt, ViewMode } from 'gantt-task-react';
import type { Task } from 'gantt-task-react';
import { Box, Title, Text, Group, Badge } from '@mantine/core';
import type { templateType } from '../types/adminTemplates';
import 'gantt-task-react/dist/index.css';

interface GanttChartViewProps {
  template: templateType;
  getCategoryColor: (category: string) => string;
}

export function GanttChartView({ template, getCategoryColor }: GanttChartViewProps) {
  // Convert template data to Gantt tasks
  const convertToGanttTasks = (): Task[] => {
    const tasks: Task[] = [];
    
    // Calculate start date - use current date as baseline
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    template.phases.forEach((phase, phaseIndex) => {
      // Calculate phase duration based on number of steps (each step = 1 day minimum)
      const stepCount = Math.max(phase.steps.length, 1);
      const phaseDuration = stepCount;
      
      const phaseStartDate = new Date(baseDate);
      phaseStartDate.setDate(baseDate.getDate() + (phaseIndex * 7)); // 1 week spacing between phases
      
      const phaseEndDate = new Date(phaseStartDate);
      phaseEndDate.setDate(phaseStartDate.getDate() + phaseDuration);
      
      // Add phase as main task
      const phaseTask: Task = {
        start: phaseStartDate,
        end: phaseEndDate,
        name: phase.name,
        id: `phase-${phase.id}`,
        type: 'project',
        progress: 0,
        isDisabled: true,
        styles: {
          backgroundColor: '#e3f2fd',
          backgroundSelectedColor: '#bbdefb',
          progressColor: '#2196f3',
          progressSelectedColor: '#1976d2'
        }
      };
      
      tasks.push(phaseTask);
      
      // Add steps as sub-tasks
      phase.steps.forEach((step, stepIndex) => {
        const stepStartDate = new Date(phaseStartDate);
        stepStartDate.setDate(phaseStartDate.getDate() + stepIndex);
        
        const stepEndDate = new Date(stepStartDate);
        stepEndDate.setDate(stepStartDate.getDate() + 1);
        
        const categoryColor = getCategoryColorHex(getCategoryColor(step.category));
        
        const stepTask: Task = {
          start: stepStartDate,
          end: stepEndDate,
          name: step.name,
          id: `step-${step.id}`,
          type: 'task',
          progress: 0,
          project: `phase-${phase.id}`,
          isDisabled: true,
          styles: {
            backgroundColor: categoryColor.background,
            backgroundSelectedColor: categoryColor.selected,
            progressColor: categoryColor.progress,
            progressSelectedColor: categoryColor.progressSelected
          }
        };
        
        tasks.push(stepTask);
        
        // Add sub-steps if they exist
        if (step.steps && step.steps.length > 0) {
          step.steps.forEach((subStep, subStepIndex) => {
            const subStepStartDate = new Date(stepStartDate);
            subStepStartDate.setHours(subStepIndex * 4); // 4-hour sub-tasks within the same day
            
            const subStepEndDate = new Date(subStepStartDate);
            subStepEndDate.setHours(subStepStartDate.getHours() + 4);
            
            const subStepCategoryColor = getCategoryColorHex(getCategoryColor(subStep.category));
            
            const subStepTask: Task = {
              start: subStepStartDate,
              end: subStepEndDate,
              name: subStep.name,
              id: `substep-${subStep.id}`,
              type: 'task',
              progress: 0,
              project: `step-${step.id}`,
              isDisabled: true,
              styles: {
                backgroundColor: subStepCategoryColor.background,
                backgroundSelectedColor: subStepCategoryColor.selected,
                progressColor: subStepCategoryColor.progress,
                progressSelectedColor: subStepCategoryColor.progressSelected
              }
            };
            
            tasks.push(subStepTask);
          });
        }
      });
    });
    
    return tasks;
  };
  
  // Convert Mantine color names to hex colors for Gantt chart
  const getCategoryColorHex = (colorName: string) => {
    const colorMap: Record<string, { background: string; selected: string; progress: string; progressSelected: string }> = {
      blue: { background: '#e3f2fd', selected: '#bbdefb', progress: '#2196f3', progressSelected: '#1976d2' },
      green: { background: '#e8f5e8', selected: '#c8e6c9', progress: '#4caf50', progressSelected: '#388e3c' },
      red: { background: '#ffebee', selected: '#ffcdd2', progress: '#f44336', progressSelected: '#d32f2f' },
      orange: { background: '#fff3e0', selected: '#ffe0b2', progress: '#ff9800', progressSelected: '#f57c00' },
      purple: { background: '#f3e5f5', selected: '#e1bee7', progress: '#9c27b0', progressSelected: '#7b1fa2' },
      yellow: { background: '#fffde7', selected: '#fff9c4', progress: '#ffeb3b', progressSelected: '#f9a825' },
      gray: { background: '#f5f5f5', selected: '#e0e0e0', progress: '#9e9e9e', progressSelected: '#616161' }
    };
    
    return colorMap[colorName] || colorMap.gray;
  };

  const tasks = convertToGanttTasks();

  if (template.phases.length === 0) {
    return (
      <Box p="xl" ta="center">
        <Text c="dimmed" size="lg" mb="md">
          No phases to display in timeline view.
        </Text>
        <Text c="dimmed" size="sm">
          Add phases and steps to see them in the Gantt chart.
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={4} mb="xs">Project Timeline</Title>
          <Text size="sm" c="dimmed">
            Visual timeline showing phases and steps progression
          </Text>
        </div>
        <Group gap="xs">
          <Badge size="sm" color="blue">Phases: {template.phases.length}</Badge>
          <Badge size="sm" color="green">
            Steps: {template.phases.reduce((total, phase) => total + phase.steps.length, 0)}
          </Badge>
        </Group>
      </Group>
      
      <Box 
        style={{ 
          height: '400px', 
          overflow: 'auto',
          border: '1px solid #e0e0e0',
          borderRadius: '8px'
        }}
      >
        <Gantt
          tasks={tasks}
          viewMode={ViewMode.Day}
          listCellWidth="200px"
          columnWidth={60}
          rowHeight={40}
          barCornerRadius={3}
          handleWidth={8}
          fontSize="12px"
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          arrowColor="#666"
          arrowIndent={20}
          todayColor="rgba(252, 248, 227, 0.5)"
          TooltipContent={({ task }) => (
            <Box p="xs" style={{ maxWidth: '200px' }}>
              <Text size="sm" fw={500}>{task.name}</Text>
              <Text size="xs" c="dimmed">
                {task.start.toLocaleDateString()} - {task.end.toLocaleDateString()}
              </Text>
              {task.type === 'project' && (
                <Badge size="xs" color="blue" mt="xs">Phase</Badge>
              )}
              {task.type === 'task' && (
                <Badge size="xs" color="green" mt="xs">
                  {task.project?.startsWith('step-') ? 'Sub-Step' : 'Step'}
                </Badge>
              )}
            </Box>
          )}
        />
      </Box>
      
      <Box mt="md">
        <Text size="xs" c="dimmed">
          📅 Timeline is auto-generated based on phase and step structure. 
          Each phase starts 1 week apart, each step is 1 day, sub-steps are 4-hour blocks.
        </Text>
      </Box>
    </Box>
  );
}
