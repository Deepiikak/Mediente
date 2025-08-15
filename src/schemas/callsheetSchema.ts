import * as yup from 'yup';

export const callSheetSchema = yup.object({
  movie_name: yup
    .string()
    .required('Movie name is required')
    .min(2, 'Movie name must be at least 2 characters'),
  
  date: yup
    .string()
    .required('Date is required'),
  
  call_to: yup
    .string()
    .required('Call to field is required')
    .min(2, 'Call to must be at least 2 characters'),
  
  time: yup
    .string()
    .required('Time is required'),
  
  description: yup
    .string()
    .optional(),
  
  time_table: yup
    .array()
    .of(
      yup.object({
        item: yup
          .string()
          .required('Item is required')
          .min(1, 'Item cannot be empty'),
        date: yup
          .string()
          .required('Date is required'),
      })
    )
    .min(1, 'At least one time table item is required'),
  
  location: yup
    .array()
    .of(
      yup.object({
        location_title: yup
          .string()
          .required('Location title is required')
          .min(2, 'Location title must be at least 2 characters'),
        link: yup
          .string()
          .url('Must be a valid URL')
          .optional(),
        address: yup
          .string()
          .required('Address is required')
          .min(5, 'Address must be at least 5 characters'),
        contact_number: yup
          .string()
          .required('Contact number is required')
          .matches(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format'),
      })
    )
    .min(1, 'At least one location is required'),
  
  schedule: yup
    .array()
    .of(
      yup.object({
        time: yup
          .string()
          .required('Time is required'),
        scene: yup
          .string()
          .required('Scene is required')
          .min(1, 'Scene cannot be empty'),
        description: yup
          .string()
          .required('Description is required')
          .min(3, 'Description must be at least 3 characters'),
      })
    )
    .min(1, 'At least one schedule item is required'),
});

export type CallSheetSchemaType = yup.InferType<typeof callSheetSchema>;

