import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { ApiError } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/toast/useToast';
import './LoginPage.css';

export function LoginPage() {
  const { login, isAuthenticated, isBootstrapping } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isBootstrapping && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = 'Email is required';
    if (!password) nextErrors.password = 'Password is required';
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      pushToast({ tone: 'success', title: 'Signed in', message: 'Welcome to FundFlow ERP.' });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to sign in. Please check your connection and try again.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-showcase" aria-hidden="false">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div className="brand-mark">
              <Boxes size={18} />
            </div>
            <strong>FundFlow ERP</strong>
          </div>
          <h1>Mini ERP + CRM for wholesale operations</h1>
          <p>
            Authenticate securely and manage customers, inventory, and sales challans from one
            operations portal.
          </p>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          JWT-secured access · Role-based workflows · Live PostgreSQL data
        </p>
      </section>

      <section className="login-panel">
        <Card className="login-card">
          <CardBody>
            <h2>Sign in</h2>
            <p className="lede">Use your FundFlow employee credentials.</p>
            <form className="login-form" onSubmit={onSubmit} noValidate>
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={errors.email}
              />
              <div className="password-row">
                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={errors.password}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {formError ? <div className="form-error">{formError}</div> : null}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            <p className="login-meta">
              Demo credentials are documented in the project README. Passwords are never stored in
              the browser.
            </p>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
