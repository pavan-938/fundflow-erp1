import type { CustomerInput, CustomerStatus, CustomerType } from '../../types';
import { isValidEmail } from '../../utils/customers';

export type CustomerFormValues = {
  customer_name: string;
  mobile_number: string;
  email: string;
  business_name: string;
  gst_number: string;
  customer_type: CustomerType | '';
  address: string;
  status: CustomerStatus;
  follow_up_date: string;
  notes: string;
};

export type CustomerFormErrors = Partial<Record<keyof CustomerFormValues, string>> & {
  form?: string;
};

export const emptyCustomerForm = (): CustomerFormValues => ({
  customer_name: '',
  mobile_number: '',
  email: '',
  business_name: '',
  gst_number: '',
  customer_type: '',
  address: '',
  status: 'LEAD',
  follow_up_date: '',
  notes: '',
});

export function validateCustomerForm(values: CustomerFormValues): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  if (!values.customer_name.trim()) errors.customer_name = 'Customer name is required';
  else if (values.customer_name.trim().length > 200) errors.customer_name = 'Maximum 200 characters';

  if (!values.mobile_number.trim()) errors.mobile_number = 'Mobile number is required';
  else if (values.mobile_number.trim().length > 20) errors.mobile_number = 'Maximum 20 characters';

  if (values.email.trim() && !isValidEmail(values.email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  if (!values.business_name.trim()) errors.business_name = 'Business name is required';
  else if (values.business_name.trim().length > 255) errors.business_name = 'Maximum 255 characters';

  if (!values.customer_type) errors.customer_type = 'Customer type is required';
  if (!values.address.trim()) errors.address = 'Address is required';

  if (!['LEAD', 'ACTIVE', 'INACTIVE'].includes(values.status)) {
    errors.status = 'Select a valid status';
  }

  if (values.gst_number.trim().length > 20) errors.gst_number = 'Maximum 20 characters';
  if (values.notes.length > 5000) errors.notes = 'Maximum 5000 characters';

  if (values.follow_up_date && !/^\d{4}-\d{2}-\d{2}$/.test(values.follow_up_date)) {
    errors.follow_up_date = 'Use YYYY-MM-DD format';
  }

  return errors;
}

export function toCustomerInput(values: CustomerFormValues): CustomerInput {
  return {
    customer_name: values.customer_name.trim(),
    mobile_number: values.mobile_number.trim(),
    email: values.email.trim() || null,
    business_name: values.business_name.trim(),
    gst_number: values.gst_number.trim() || null,
    customer_type: values.customer_type as CustomerType,
    address: values.address.trim(),
    status: values.status,
    follow_up_date: values.follow_up_date || null,
    notes: values.notes.trim() || null,
  };
}

export function mapApiFieldErrors(errors: unknown): CustomerFormErrors {
  if (!Array.isArray(errors)) return {};
  const mapped: CustomerFormErrors = {};
  for (const item of errors) {
    if (!item || typeof item !== 'object') continue;
    const field = 'field' in item && typeof item.field === 'string' ? item.field : undefined;
    const message = 'message' in item && typeof item.message === 'string' ? item.message : undefined;
    if (field && message && field in emptyCustomerForm()) {
      mapped[field as keyof CustomerFormValues] = message;
    }
  }
  return mapped;
}
