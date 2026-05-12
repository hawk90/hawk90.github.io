/**
 * GitHub OAuth Device Flow Authentication
 *
 * Uses the Device Authorization Grant for static sites.
 * No server-side callback required.
 *
 * Flow:
 * 1. Request device code from GitHub
 * 2. User enters code at github.com/login/device
 * 3. Poll for access token
 * 4. Store token in localStorage
 */

// ─── Types ──────────────────────────────────────────────────

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface TokenErrorResponse {
  error: 'authorization_pending' | 'slow_down' | 'expired_token' | 'access_denied';
  error_description: string;
}

export type PollResult =
  | { status: 'success'; token: TokenResponse }
  | { status: 'pending' }
  | { status: 'slow_down' };

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: GitHubUser | null;
}

// ─── Storage Keys ───────────────────────────────────────────

const STORAGE_KEYS = {
  accessToken: 'admin_access_token',
  user: 'admin_user',
  lastCommentCheck: 'admin_last_comment_check',
} as const;

// ─── Device Flow ────────────────────────────────────────────

/**
 * Start the Device Authorization flow.
 * Returns device code info for displaying to user.
 */
export async function startDeviceAuth(clientId: string): Promise<DeviceCodeResponse> {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: 'repo read:user',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to start device auth: ${response.status}`);
  }

  return response.json();
}

/**
 * Poll for access token after user enters device code.
 * Returns token on success, null if still pending.
 * Throws on error (expired, denied).
 */
export async function pollForToken(
  clientId: string,
  deviceCode: string
): Promise<PollResult> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status}`);
  }

  const data = await response.json();

  // Check for error responses
  if ('error' in data) {
    const errorData = data as TokenErrorResponse;

    switch (errorData.error) {
      case 'authorization_pending':
        return { status: 'pending' };
      case 'slow_down':
        return { status: 'slow_down' };
      case 'expired_token':
        throw new Error('Device code expired. Please start over.');
      case 'access_denied':
        throw new Error('Authorization was denied.');
      default:
        throw new Error(`Auth error: ${errorData.error_description}`);
    }
  }

  return { status: 'success', token: data as TokenResponse };
}

/**
 * Fetch the authenticated user's profile.
 */
export async function fetchUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  return response.json();
}

// ─── Token Management ───────────────────────────────────────

/**
 * Save authentication state to localStorage.
 */
export function saveAuth(accessToken: string, user: GitHubUser): void {
  try {
    localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  } catch {
    console.error('Failed to save auth state');
  }
}

/**
 * Clear authentication state from localStorage.
 */
export function clearAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.user);
  } catch {
    console.error('Failed to clear auth state');
  }
}

/**
 * Get current authentication state.
 */
export function getAuthState(): AuthState {
  try {
    const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    const userJson = localStorage.getItem(STORAGE_KEYS.user);

    if (!accessToken || !userJson) {
      return { isAuthenticated: false, accessToken: null, user: null };
    }

    const user = JSON.parse(userJson) as GitHubUser;
    return { isAuthenticated: true, accessToken, user };
  } catch {
    return { isAuthenticated: false, accessToken: null, user: null };
  }
}

/**
 * Check if the current user is in the allowed users list.
 */
export function isAllowedUser(user: GitHubUser, allowedUsers: string[]): boolean {
  return allowedUsers.map((u) => u.toLowerCase()).includes(user.login.toLowerCase());
}

/**
 * Verify token is still valid by making an API call.
 */
export async function verifyToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Full authentication check - verifies token and returns state.
 */
export async function checkAuth(): Promise<AuthState> {
  const state = getAuthState();

  if (!state.isAuthenticated || !state.accessToken) {
    return { isAuthenticated: false, accessToken: null, user: null };
  }

  // Verify token is still valid
  const isValid = await verifyToken(state.accessToken);

  if (!isValid) {
    clearAuth();
    return { isAuthenticated: false, accessToken: null, user: null };
  }

  return state;
}

/**
 * Logout - clear auth state.
 */
export function logout(): void {
  clearAuth();
}

// ─── Polling Helper ─────────────────────────────────────────

export interface PollOptions {
  clientId: string;
  deviceCode: string;
  interval: number;
  expiresIn: number;
  onSuccess: (token: string, user: GitHubUser) => void;
  onError: (error: Error) => void;
  onExpired: () => void;
}

/**
 * Start polling for token with automatic cleanup.
 * Returns a cleanup function.
 */
export function startPolling(options: PollOptions): () => void {
  const { clientId, deviceCode, interval, expiresIn, onSuccess, onError, onExpired } = options;

  let currentInterval = interval * 1000; // Convert to ms
  const expiresAt = Date.now() + expiresIn * 1000;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const poll = async () => {
    if (stopped || Date.now() >= expiresAt) {
      if (!stopped) {
        onExpired();
      }
      return;
    }

    try {
      const result = await pollForToken(clientId, deviceCode);

      if (result.status === 'success') {
        // Got token - fetch user and complete
        const user = await fetchUser(result.token.access_token);
        onSuccess(result.token.access_token, user);
      } else if (result.status === 'slow_down') {
        currentInterval += 5000;
        timeoutId = setTimeout(poll, currentInterval);
      } else {
        // Still pending - poll again
        timeoutId = setTimeout(poll, currentInterval);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Start polling
  timeoutId = setTimeout(poll, currentInterval);

  // Return cleanup function
  return () => {
    stopped = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}
