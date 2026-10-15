/**
 * HTTP calls for the authentication endpoints.
 * Passwords are sent only to the API and are never persisted by this service.
 */
import { apiRequest } from './apiClient.js';

function requireUser(value) {
  if (!value || typeof value !== 'object' || !value.id || (!value.phone && !value.email) || !value.role) {
    throw new Error('Invalid authentication response from the server');
  }
  return value;
}

function requireSession(value) {
  if (!value || typeof value !== 'object' || typeof value.token !== 'string' || !value.token) {
    throw new Error('Invalid authentication response from the server');
  }
  requireUser(value.user);
  return value;
}

/**
 * Register a new account.
 * @param {{ phone: string, password: string, name?: string }} params
 * @returns {{ user: object, token: string }}
 */
export async function register({ phone, password, name }) {
  const result = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ phone, password, name }),
  });
  return requireSession(result);
}

/**
 * Log in with phone/email + password.
 * @param {{ phone?: string, email?: string, password: string }} params
 * @returns {{ user: object, token: string }}
 */
export async function login({ phone, email, password }) {
  const body = {};
  if (phone) body.phone = phone;
  if (email) body.email = email;
  body.password = password;

  const result = await apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return requireSession(result);
}

/**
 * Fetch the authenticated user's profile.
 * @param {string} token
 * @returns {{ id: string, phone: string, name: string|null, role: string, createdAt: string }}
 */
export async function getMe(token) {
  return requireUser(await apiRequest('/api/v1/auth/me', { token }));
}

/**
 * Check if a phone number is already registered in the system.
 * @param {string} phone
 * @returns {Promise<{ exists: boolean }>}
 */
export async function checkPhone(phone) {
  return await apiRequest(`/api/v1/auth/check-phone?phone=${encodeURIComponent(phone.trim())}`);
}
