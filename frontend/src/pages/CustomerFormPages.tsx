import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import {
  CustomerForm,
} from '../components/customers/CustomerForm';
import {
  emptyCustomerForm,
  mapApiFieldErrors,
  toCustomerInput,
  validateCustomerForm,
  type CustomerFormErrors,
  type CustomerFormValues,
} from '../components/customers/customerFormUtils';
import { useToast } from '../components/toast/useToast';
import { Card, CardBody } from '../components/ui/Card';
import { ErrorState, SkeletonBlock } from '../components/ui/Feedback';
import { ApiError } from '../services/api';
import { createCustomer, getCustomer, updateCustomer } from '../services/customerApi';
import type { Customer } from '../types';
import { canWriteCustomers } from '../utils/permissions';
import './CustomersPage.css';

function customerToForm(customer: Customer): CustomerFormValues {
  return {
    customer_name: customer.customer_name,
    mobile_number: customer.mobile_number,
    email: customer.email ?? '',
    business_name: customer.business_name,
    gst_number: customer.gst_number ?? '',
    customer_type: customer.customer_type,
    address: customer.address,
    status: customer.status,
    follow_up_date: customer.follow_up_date ?? '',
    notes: customer.notes ?? '',
  };
}

export function CustomerCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [values, setValues] = useState<CustomerFormValues>(emptyCustomerForm);
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!user || !canWriteCustomers(user.role)) {
    return (
      <Card>
        <CardBody>
          <ErrorState
            title="Access restricted"
            description="Your role cannot create customers."
            onRetry={() => navigate('/customers')}
          />
        </CardBody>
      </Card>
    );
  }

  const onChange = (field: keyof CustomerFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateCustomerForm(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const response = await createCustomer(toCustomerInput(values));
      pushToast({ tone: 'success', title: 'Customer created', message: response.data.customer_name });
      navigate(`/customers/${response.data.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = mapApiFieldErrors(err.body.errors);
        setErrors({
          ...fieldErrors,
          form: Object.keys(fieldErrors).length ? undefined : err.message || 'Unable to create customer.',
        });
      } else {
        setErrors({ form: 'Unable to create customer. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Add Customer</h1>
          <p>Create a CRM account with business and follow-up details.</p>
        </div>
      </div>
      <Card>
        <CardBody>
          <CustomerForm
            values={values}
            errors={errors}
            submitting={submitting}
            submitLabel="Create Customer"
            onChange={onChange}
            onSubmit={(event) => void onSubmit(event)}
            onCancel={() => navigate('/customers')}
          />
        </CardBody>
      </Card>
    </div>
  );
}

export function CustomerEditPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [values, setValues] = useState<CustomerFormValues>(emptyCustomerForm);
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const response = await getCustomer(id);
      setValues(customerToForm(response.data));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setLoadError('This customer could not be found.');
      } else {
        setLoadError('Unable to load customer for editing.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user || !canWriteCustomers(user.role)) {
    return (
      <Card>
        <CardBody>
          <ErrorState
            title="Access restricted"
            description="Your role cannot edit customers."
            onRetry={() => navigate('/customers')}
          />
        </CardBody>
      </Card>
    );
  }

  const onChange = (field: keyof CustomerFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateCustomerForm(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const response = await updateCustomer(id, toCustomerInput(values));
      pushToast({ tone: 'success', title: 'Customer updated', message: response.data.customer_name });
      navigate(`/customers/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setNotFound(true);
          setErrors({ form: 'This customer could not be found.' });
        } else {
          const fieldErrors = mapApiFieldErrors(err.body.errors);
          setErrors({
            ...fieldErrors,
            form: Object.keys(fieldErrors).length ? undefined : err.message || 'Unable to update customer.',
          });
        }
      } else {
        setErrors({ form: 'Unable to update customer. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Edit Customer</h1>
          <p>Update CRM contact, business, and follow-up information.</p>
        </div>
      </div>

      <Card>
        <CardBody>
          {loading ? (
            <div className="customers-skeleton" aria-busy="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} height={40} />
              ))}
            </div>
          ) : null}

          {!loading && (loadError || notFound) ? (
            <ErrorState
              title={notFound ? 'Customer not found' : 'Unable to load customer'}
              description={loadError ?? undefined}
              onRetry={notFound ? () => navigate('/customers') : () => void load()}
            />
          ) : null}

          {!loading && !loadError && !notFound ? (
            <CustomerForm
              values={values}
              errors={errors}
              submitting={submitting}
              submitLabel="Save Changes"
              onChange={onChange}
              onSubmit={(event) => void onSubmit(event)}
              onCancel={() => navigate(`/customers/${id}`)}
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
