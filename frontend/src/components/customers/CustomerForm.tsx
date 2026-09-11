import type { FormEvent } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { TextArea } from '../ui/TextArea';
import type { CustomerFormErrors, CustomerFormValues } from './customerFormUtils';

const TYPE_OPTIONS = [
  { value: '', label: 'Select customer type' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
];

const STATUS_OPTIONS = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

type CustomerFormProps = {
  values: CustomerFormValues;
  errors: CustomerFormErrors;
  submitting: boolean;
  submitLabel: string;
  onChange: (field: keyof CustomerFormValues, value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
};

export function CustomerForm({
  values,
  errors,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  return (
    <form className="customer-form" onSubmit={onSubmit} noValidate>
      {errors.form ? (
        <div className="form-banner" role="alert">
          {errors.form}
        </div>
      ) : null}

      <section className="form-section">
        <header>
          <h2>Customer Information</h2>
          <p>Primary contact details for CRM outreach.</p>
        </header>
        <div className="form-grid">
          <Input
            label="Customer Name *"
            name="customer_name"
            value={values.customer_name}
            onChange={(event) => onChange('customer_name', event.target.value)}
            error={errors.customer_name}
            autoComplete="name"
            maxLength={200}
            required
          />
          <Input
            label="Mobile Number *"
            name="mobile_number"
            value={values.mobile_number}
            onChange={(event) => onChange('mobile_number', event.target.value)}
            error={errors.mobile_number}
            autoComplete="tel"
            maxLength={20}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={values.email}
            onChange={(event) => onChange('email', event.target.value)}
            error={errors.email}
            autoComplete="email"
            maxLength={255}
          />
          <Select
            label="Status *"
            name="status"
            value={values.status}
            onChange={(event) => onChange('status', event.target.value)}
            error={errors.status}
            options={STATUS_OPTIONS}
          />
        </div>
      </section>

      <section className="form-section">
        <header>
          <h2>Business Information</h2>
          <p>Wholesale account and tax identifiers.</p>
        </header>
        <div className="form-grid">
          <Input
            label="Business Name *"
            name="business_name"
            value={values.business_name}
            onChange={(event) => onChange('business_name', event.target.value)}
            error={errors.business_name}
            maxLength={255}
            required
          />
          <Select
            label="Customer Type *"
            name="customer_type"
            value={values.customer_type}
            onChange={(event) => onChange('customer_type', event.target.value)}
            error={errors.customer_type}
            options={TYPE_OPTIONS}
            required
          />
          <Input
            label="GST Number"
            name="gst_number"
            value={values.gst_number}
            onChange={(event) => onChange('gst_number', event.target.value)}
            error={errors.gst_number}
            maxLength={20}
          />
          <div data-span="full">
            <TextArea
              label="Address *"
              name="address"
              value={values.address}
              onChange={(event) => onChange('address', event.target.value)}
              error={errors.address}
              rows={3}
              required
            />
          </div>
        </div>
      </section>

      <section className="form-section">
        <header>
          <h2>Follow-up / Notes</h2>
          <p>Optional CRM reminders and internal notes.</p>
        </header>
        <div className="form-grid">
          <Input
            label="Follow-up Date"
            name="follow_up_date"
            type="date"
            value={values.follow_up_date}
            onChange={(event) => onChange('follow_up_date', event.target.value)}
            error={errors.follow_up_date}
          />
          <div data-span="full">
            <TextArea
              label="Notes"
              name="notes"
              value={values.notes}
              onChange={(event) => onChange('notes', event.target.value)}
              error={errors.notes}
              maxLength={5000}
              rows={4}
            />
          </div>
        </div>
      </section>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
