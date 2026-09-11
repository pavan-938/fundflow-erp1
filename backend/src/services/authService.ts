import { findUserByEmail, findUserById, toPublicUser } from '../repositories/userRepository';
import { AppError } from '../utils/AppError';
import { signAccessToken, type PublicUser } from '../utils/jwt';
import { verifyPassword } from '../utils/password';

export async function login(email: string, password: string): Promise<{ token: string; user: PublicUser }> {
  const user = await findUserByEmail(email);
  if (!user) {
    // Same message for unknown user and bad password to avoid account enumeration
    throw new AppError(401, 'Invalid email or password');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const publicUser = toPublicUser(user);
  const token = signAccessToken(publicUser);
  return { token, user: publicUser };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, 'Authentication required');
  }
  return toPublicUser(user);
}
