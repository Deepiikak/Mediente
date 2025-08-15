# Admin Templates Setup Guide

This guide will help you set up and use the Admin Templates system for managing film production workflows.

## Overview

The Admin Templates system allows administrators to create, manage, and share reusable form templates for various production processes like call sheets, shot lists, budget templates, and more.

## Database Setup

### 1. Run the Database Schema

Execute the SQL commands in `database-templates-schema.sql` to create all necessary tables:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database -f database-templates-schema.sql
```

### 2. Verify Tables Created

The following tables should be created:
- `admin_templates` - Main templates table
- `template_categories` - Template categories (Production, Pre-Production, etc.)
- `template_types` - Template types (Call Sheet, Shot List, etc.)
- `template_versions` - Version control for templates
- `template_usage` - Usage tracking
- `template_sharing` - Template sharing permissions

### 3. Default Data

The schema automatically creates:
- 6 template categories (Production, Pre-Production, Post-Production, Administrative, Technical, Creative)
- 5 template types (Call Sheet, Shot List, Budget Template, Equipment Checklist, Location Scout)

## Features

### Template Management
- **Create Templates**: Build custom forms with various field types
- **Edit Templates**: Modify existing templates
- **Duplicate Templates**: Create copies of existing templates
- **Archive Templates**: Soft delete templates
- **Version Control**: Automatic versioning when templates are updated

### Field Types Supported
- Text input
- Number input
- Date picker
- Select dropdown
- Text area
- Checkbox
- Radio buttons
- File upload

### Template Categories
- **Production**: Film production workflow templates
- **Pre-Production**: Planning and preparation templates
- **Post-Production**: Editing and finishing templates
- **Administrative**: Business and management templates
- **Technical**: Equipment and technical templates
- **Creative**: Artistic and design templates

## Usage

### 1. Access Templates
Navigate to the Templates section in the admin sidebar (📋 icon).

### 2. Create New Template
1. Click "+ New Template" button
2. Fill in basic information (name, description, category, type)
3. Add form fields in the Schema tab
4. Preview your form in the Preview tab
5. Save the template

### 3. Manage Existing Templates
- **View**: Click the eye icon to preview template
- **Edit**: Click the edit icon to modify template
- **Duplicate**: Click the copy icon to create a copy
- **Export**: Download template (coming soon)
- **Archive**: Remove template from active use

### 4. Template Sharing
- Set templates as public for all users
- Share specific templates with selected users
- Control permissions for shared templates

## API Endpoints

The template service provides these main functions:

```typescript
// Get all templates
templateService.getTemplates()

// Get template by ID
templateService.getTemplateById(id)

// Create new template
templateService.createTemplate(templateData, adminUserId)

// Update template
templateService.updateTemplate(id, updates, adminUserId)

// Delete template (archive)
templateService.deleteTemplate(id, adminUserId)

// Search templates
templateService.searchTemplates(query)

// Get templates by category
templateService.getTemplatesByCategory(category)

// Duplicate template
templateService.duplicateTemplate(id, adminUserId)
```

## Customization

### Adding New Categories
Insert new categories into the `template_categories` table:

```sql
INSERT INTO template_categories (name, description, icon, color, sort_order) 
VALUES ('Custom Category', 'Description', '🎯', 'indigo', 7);
```

### Adding New Template Types
Insert new template types into the `template_types` table:

```sql
INSERT INTO template_types (name, description, category_id, schema) 
VALUES ('Custom Type', 'Description', 
  (SELECT id FROM template_categories WHERE name = 'Production'),
  '{"fields": ["custom_field"]}');
```

### Custom Field Types
To add new field types, modify the `AdminTemplateFormModal.tsx` component and add the new type to the field type selector.

## Best Practices

### Template Design
1. **Keep it Simple**: Don't overload templates with too many fields
2. **Use Clear Labels**: Make field labels descriptive and user-friendly
3. **Logical Ordering**: Arrange fields in a logical workflow sequence
4. **Required Fields**: Only mark essential fields as required
5. **Default Values**: Provide sensible defaults where appropriate

### Organization
1. **Consistent Naming**: Use consistent naming conventions for templates
2. **Proper Categorization**: Place templates in appropriate categories
3. **Tagging**: Use tags to make templates easily searchable
4. **Versioning**: Keep track of template changes and improvements

### Performance
1. **Limit Field Count**: Avoid extremely complex templates with hundreds of fields
2. **Efficient Queries**: Use the provided service methods for database operations
3. **Caching**: Consider implementing caching for frequently accessed templates

## Troubleshooting

### Common Issues

1. **Template Not Saving**
   - Check that all required fields are filled
   - Verify database connection
   - Check console for error messages

2. **Fields Not Displaying**
   - Ensure schema is properly formatted
   - Check field type compatibility
   - Verify field names are unique

3. **Database Errors**
   - Verify all tables are created
   - Check database permissions
   - Ensure proper foreign key relationships

### Debug Mode
Enable debug logging in the template service to see detailed error information.

## Future Enhancements

Planned features for upcoming releases:
- Template import/export functionality
- Advanced field validation rules
- Template approval workflows
- Bulk template operations
- Template analytics and usage reports
- Mobile-responsive template forms
- Template collaboration features

## Support

For technical support or questions about the Admin Templates system:
1. Check the console for error messages
2. Review the database schema
3. Verify all dependencies are installed
4. Check the component props and state management

## Dependencies

Make sure these packages are installed:
- `@mantine/core` - UI components
- `@mantine/hooks` - React hooks
- `@mantine/notifications` - Notification system
- `@tabler/icons-react` - Icons
- `react-router-dom` - Routing
- `supabase` - Database client

