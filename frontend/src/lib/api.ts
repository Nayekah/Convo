import type { AuthResponse, SignInPayload, SignUpPayload } from '../types/auth';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '/api';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const request = async <T>(path: string, options: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? 'Request failed');
  }

  return data;
};

export const authApi = {
  signUp: (payload: SignUpPayload) =>
    request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  signIn: (payload: SignInPayload) =>
    request<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
