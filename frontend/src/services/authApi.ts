import { apiRequest } from './api';
import type { LoginResponse, MeResponse } from '../types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

export async function fetchMe(token?: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', {
    token,
  });
}
