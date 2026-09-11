import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { roleLabel } from '../utils/permissions';
import './ProfilePage.css';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Your authenticated FundFlow account details.</p>
        </div>
      </div>

      <Card>
        <CardBody className="profile-card">
          <div className="profile-identity">
            <div className="profile-avatar" aria-hidden="true">
              {initials}
            </div>
            <div>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <Badge tone="role">{roleLabel(user.role)}</Badge>
            </div>
          </div>

          <dl className="profile-details">
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{roleLabel(user.role)}</dd>
            </div>
          </dl>

          <div className="profile-actions">
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              Logout
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
