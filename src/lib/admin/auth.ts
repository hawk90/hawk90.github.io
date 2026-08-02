/**
 * Authentication state for the static admin panel.
 *
 * The site uses a Personal Access Token entered by the administrator. It is
 * retained in memory only for the current tab; OAuth belongs in a separate
 * server application and is intentionally not implemented here.
 */

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

let currentAuth: AuthState = { isAuthenticated: false, accessToken: null, user: null };

/** Fetch the authenticated user's GitHub profile for token validation. */
export async function fetchUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch user: ${response.status}`);
  return response.json();
}

/** Keep credentials only in the current browser tab. */
export function saveAuth(accessToken: string, user: GitHubUser): void {
  currentAuth = { isAuthenticated: true, accessToken, user };
}

export function clearAuth(): void {
  currentAuth = { isAuthenticated: false, accessToken: null, user: null };
}

export function getAuthState(): AuthState {
  return currentAuth;
}

export function isAllowedUser(user: GitHubUser, allowedUsers: string[]): boolean {
  return allowedUsers.map((candidate) => candidate.toLowerCase()).includes(user.login.toLowerCase());
}

export async function verifyToken(accessToken: string): Promise<boolean> {
  try {
    await fetchUser(accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function checkAuth(): Promise<AuthState> {
  const state = getAuthState();
  if (!state.isAuthenticated || !state.accessToken) return { isAuthenticated: false, accessToken: null, user: null };
  if (await verifyToken(state.accessToken)) return state;
  clearAuth();
  return { isAuthenticated: false, accessToken: null, user: null };
}

export function logout(): void {
  clearAuth();
}
