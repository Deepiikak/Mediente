# Project Template Form

This project includes a comprehensive Mantine form for creating and editing project templates with Yup validation and a custom tree component for managing hierarchical project steps.

## Features

- **Mantine Form Integration**: Uses `@mantine/form` with `yupResolver` for validation
- **Custom Tree Component**: Hierarchical display of project steps with expand/collapse functionality
- **Yup Validation**: Comprehensive validation schema for all form fields
- **Nested Steps Support**: Create unlimited nested levels of project steps
- **Category Management**: Three predefined categories: Monitor, Coordinate, Execute
- **Create/Edit Mode**: Same form handles both creating new templates and editing existing ones

## Components

### 1. TemplateForm (`src/components/TemplateForm.tsx`)
The main form component that handles:
- Template basic information (name, index)
- Phase information (name, index)
- Project steps with nested structure
- Tree view of all steps
- Individual step editing forms

### 2. CustomTree (`src/components/CustomTree.tsx`)
A custom tree component that provides:
- Hierarchical display of project steps
- Expand/collapse functionality
- Custom icons and styling
- Click handlers for node interaction

### 3. Types (`src/types/adminTemplates.ts`)
TypeScript type definitions for:
- `categoryType`: "monitor" | "coordinate" | "execute"
- `projectStepType`: Individual step with optional nested steps
- `phaseType`: Phase containing multiple steps
- `templateType`: Complete template structure
- `templateFormType`: Form data type (excludes auto-generated fields)

### 4. Validation (`src/utils/templateValidation.ts`)
Yup validation schemas for:
- Individual step validation
- Phase validation
- Complete template validation
- Default form data

## Usage

### Basic Usage

```tsx
import { TemplateForm } from './components/TemplateForm';

function MyComponent() {
  const [formOpened, setFormOpened] = useState(false);
  
  const handleSubmit = (data: templateFormType) => {
    console.log('Template data:', data);
    // Handle form submission
  };

  return (
    <TemplateForm
      opened={formOpened}
      onClose={() => setFormOpened(false)}
      onSubmit={handleSubmit}
      mode="create"
    />
  );
}
```

### Edit Mode

```tsx
const handleEdit = (template: templateType) => {
  setEditingTemplate({
    index: template.index,
    name: template.name,
    phase: template.phase,
  });
  setFormMode('edit');
  setFormOpened(true);
};

<TemplateForm
  opened={formOpened}
  onClose={() => setFormOpened(false)}
  onSubmit={handleSubmit}
  initialData={editingTemplate}
  mode="edit"
/>
```

## Form Structure

The form creates templates with the following structure:

```
Template
├── Name
├── Index
└── Phase
    ├── Name
    ├── Index
    └── Steps[]
        ├── Step 1
        │   ├── Name
        │   ├── Category (monitor/coordinate/execute)
        │   ├── Index
        │   └── Sub-steps[]
        └── Step 2
            ├── Name
            ├── Category
            ├── Index
            └── Sub-steps[]
```

## Validation Rules

- **Template Name**: Required, minimum 1 character
- **Template Index**: Required, minimum 0
- **Phase Name**: Required, minimum 1 character
- **Phase Index**: Required, minimum 0
- **Steps**: At least one step required
- **Step Name**: Required, minimum 1 character
- **Step Category**: Must be one of: monitor, coordinate, execute
- **Step Index**: Required, minimum 0

## Dependencies

```json
{
  "@mantine/core": "^8.2.2",
  "@mantine/form": "^8.2.2",
  "@mantine/hooks": "^8.2.2",
  "@tabler/icons-react": "^3.34.1",
  "yup": "^1.x.x"
}
```

## Customization

### Adding New Categories

1. Update the `categoryType` in `src/types/adminTemplates.ts`
2. Add new options to `categoryOptions` in `TemplateForm.tsx`
3. Update the `getCategoryColor` function for proper styling

### Modifying Step Fields

1. Update the `projectStepType` interface
2. Add new form fields in the `renderStepForm` function
3. Update the validation schema accordingly

### Styling Changes

The form uses Mantine's design system. You can customize:
- Colors and themes through Mantine's theme provider
- Component variants and sizes
- Spacing and layout through Mantine's spacing system

## Demo

Check out `src/pages/admin/TemplateDemo.tsx` for a complete working example of the template form.

## Notes

- The form generates unique IDs for new steps and phases
- All validation is handled client-side with Yup
- The tree component supports unlimited nesting levels
- Form state is managed with Mantine's `useForm` hook
- The component is fully responsive and accessible
