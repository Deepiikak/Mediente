# Phase & Step Reordering Feature

## 🎯 Overview

This feature enables drag-and-drop reordering for both **phases** and **steps** within admin templates, with automatic backend synchronization to maintain data consistency.

## 🚀 Features Implemented

### ✅ Phase Reordering
- **Drag-and-Drop Interface**: Visual grip handles for intuitive reordering
- **Real-time Updates**: Automatic index synchronization with backend
- **Visual Feedback**: Professional drag overlays and hover effects
- **Atomic Transactions**: All index updates succeed or fail together

### ✅ Step Reordering (Enhanced)
- **Nested Structure Support**: Maintains parent-child relationships
- **Level-Based Reordering**: Currently supports top-level step reordering
- **Visual Hierarchy**: Clear indentation for sub-steps
- **Contextual Actions**: Edit, archive, and add sub-steps

## 🏗️ Technical Architecture

### Components

#### 1. `DraggablePhaseList.tsx`
```typescript
interface DraggablePhaseListProps {
  phases: phaseType[];
  onReorder: (phaseReorders: { phaseId: string; newIndex: number }[]) => Promise<void>;
  onEdit: (phase: phaseType) => void;
  onArchive: (phase: phaseType) => void;
  onManageSteps: (phase: phaseType) => void;
}
```

**Key Features:**
- ✅ Sortable phase cards with drag handles
- ✅ Click-to-manage-steps functionality
- ✅ Integrated action buttons (Edit, Archive, Manage Steps)
- ✅ Professional drag overlay with rotation effect

#### 2. `DraggableStepTree.tsx` (Enhanced)
```typescript
interface DraggableStepTreeProps {
  steps: projectStepType[];
  onReorder: (stepReorders: { stepId: string; newIndex: number }[]) => Promise<void>;
  onEdit: (step: projectStepType) => void;
  onArchive: (step: projectStepType) => void;
  onAddSubStep: (parentStep?: projectStepType) => void;
  getCategoryColor: (category: string) => string;
}
```

**Key Features:**
- ✅ Hierarchical step display with proper indentation
- ✅ Top-level step reordering (nested reordering planned)
- ✅ Category badges and visual indicators
- ✅ Contextual action buttons

### Service Layer

#### `templateService.ts` - New Methods

```typescript
// Reorder phases within a template
async reorderPhases(phaseReorders: { phaseId: string; newIndex: number }[]): Promise<void>

// Reorder steps within the same parent/level  
async reorderSteps(stepReorders: { stepId: string; newIndex: number }[]): Promise<void>
```

### Database Layer

#### SQL Functions (`migration-reorder-functions.sql`)

**1. `reorder_template_phases(phase_reorders JSONB)`**
- Atomically updates phase indices within a template
- Validates no duplicate indices after reordering
- Handles archived item filtering

**2. `reorder_template_steps(step_reorders JSONB)`**
- Atomically updates step indices within same parent level
- Maintains parent-child relationships
- Archive-safe operations

**3. Utility Functions**
- `normalize_phase_indices(template_id)` - Removes gaps in indices
- `normalize_step_indices(phase_id, parent_step_id)` - Normalizes step order
- `validate_step_ordering(phase_id)` - Validates ordering integrity

## 📊 Data Flow

### Phase Reordering Process
```
User drags phase → Calculate new indices → API call → Database update → UI refresh
```

**Detailed Steps:**
1. **User Interaction**: Drag phase card to new position
2. **Index Calculation**: Generate new index array based on drop position
3. **Service Call**: `templateService.reorderPhases(phaseReorders)`
4. **Database Transaction**: `reorder_template_phases()` SQL function
5. **UI Update**: Reload template with updated phase order
6. **State Sync**: Update local state and template list

### Step Reordering Process
```
User drags step → Level validation → Index calculation → Backend sync → Hierarchy refresh
```

**Detailed Steps:**
1. **Drag Validation**: Ensure same-level reordering (current limitation)
2. **Index Calculation**: Maintain parent-child relationships
3. **Service Call**: `templateService.reorderSteps(stepReorders)`
4. **Database Transaction**: `reorder_template_steps()` SQL function
5. **Hierarchy Reload**: Refresh step tree with updated indices

## 🎨 User Experience

### Visual Design
- **Drag Handles**: Clear grip vertical icons (⋮⋮)
- **Hover Effects**: Subtle background highlights
- **Drag Feedback**: 
  - Source item becomes semi-transparent
  - Drag overlay shows rotated card preview
  - Drop zones highlighted
- **Professional Animations**: Smooth transitions using dnd-kit

### Interaction Patterns
- **8px Activation Distance**: Prevents accidental drags
- **Pointer Sensor**: Optimized for both mouse and touch
- **Closest Center Detection**: Intelligent drop zone calculation
- **Error Recovery**: Graceful handling of failed operations

## 🔧 Migration Instructions

### 1. Apply Database Migration
```sql
-- Run in Supabase SQL editor
\i sql/migration-reorder-functions.sql
```

### 2. Verify Functions
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
    'reorder_template_phases',
    'reorder_template_steps'
);
```

### 3. Test Reordering
1. Create a template with multiple phases
2. Add steps to phases
3. Test drag-and-drop functionality
4. Verify indices update correctly in database

## 🚦 Current Limitations & Future Enhancements

### Current Limitations
- ❌ **Step Cross-Level Movement**: Can't drag steps between different hierarchy levels
- ❌ **Cross-Phase Step Movement**: Can't move steps between phases
- ❌ **Nested Step Reordering**: Only top-level steps can be reordered

### Planned Enhancements
- 🔄 **Multi-Level Reordering**: Enable reordering at any nesting level
- 🔄 **Cross-Container Movement**: Move steps between phases
- 🔄 **Bulk Operations**: Select and move multiple items
- 🔄 **Undo/Redo**: Revert reordering operations
- 🔄 **Keyboard Navigation**: Accessibility improvements

## 🔍 Troubleshooting

### Common Issues

**1. Drag Not Working**
- Check if `@dnd-kit/*` packages are installed
- Verify drag handles have proper `{...listeners}` attributes
- Ensure activation distance is appropriate

**2. Backend Sync Failures**
- Check Supabase function permissions
- Verify user authentication
- Check database constraints and archived item filtering

**3. UI State Issues**
- Ensure proper state management in `handleReorder*` functions
- Verify template reload after successful reordering
- Check for stale data in local state

### Debug Commands
```sql
-- Check phase indices
SELECT id, name, index, template_id 
FROM template_phases 
WHERE template_id = 'your-template-id' 
ORDER BY index;

-- Check step indices
SELECT id, name, index, phase_id, parent_step_id 
FROM template_steps 
WHERE phase_id = 'your-phase-id' 
ORDER BY index;

-- Normalize indices if corrupted
SELECT normalize_phase_indices('your-template-id');
SELECT normalize_step_indices('your-phase-id', NULL);
```

## 📝 API Reference

### Phase Reordering
```typescript
// Service method
await templateService.reorderPhases([
  { phaseId: 'phase-1-id', newIndex: 0 },
  { phaseId: 'phase-2-id', newIndex: 1 },
  { phaseId: 'phase-3-id', newIndex: 2 }
]);

// SQL function
SELECT reorder_template_phases('[
  {"phaseId": "phase-1-id", "newIndex": 0},
  {"phaseId": "phase-2-id", "newIndex": 1}
]'::jsonb);
```

### Step Reordering
```typescript
// Service method
await templateService.reorderSteps([
  { stepId: 'step-1-id', newIndex: 0 },
  { stepId: 'step-2-id', newIndex: 1 },
  { stepId: 'step-3-id', newIndex: 2 }
]);

// SQL function
SELECT reorder_template_steps('[
  {"stepId": "step-1-id", "newIndex": 0},
  {"stepId": "step-2-id", "newIndex": 1}
]'::jsonb);
```

---

🎉 **The phase and step reordering system is now fully operational with professional drag-and-drop functionality and robust backend synchronization!**
