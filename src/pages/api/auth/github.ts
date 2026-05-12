import type { APIRoute } from 'astro';
import { ADMIN_CONFIG } from '../../../consts/config';

/**
 * GitHub OAuth login redirect
 * Redirects user to GitHub authorization page
 *
 * This endpoint only works with hybrid/server output mode.
 * For static sites, use PAT authentication instead.
 *
 * To enable: Set output: 'hybrid' in astro.config.mjs and install an adapter.
 */
export const GET: APIRoute = async ({ redirect, url }) => {
  if (!ADMIN_CONFIG.enabled) {
    return new Response('Admin panel is disabled', { status: 403 });
  }

  const clientId = ADMIN_CONFIG.clientId;
  if (!clientId) {
    return new Response('GitHub Client ID not configured', { status: 500 });
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Build callback URL
  const callbackUrl = new URL('/api/auth/callback', url.origin).toString();

  // Build GitHub OAuth URL
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  githubAuthUrl.searchParams.set('scope', 'repo read:user');
  githubAuthUrl.searchParams.set('state', state);

  // Create response with state cookie
  const response = redirect(githubAuthUrl.toString(), 302);

  // Set state cookie for CSRF verification (expires in 10 minutes)
  response.headers.set(
    'Set-Cookie',
    `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  );

  return response;
};

// Set to true for static builds (route won't exist)
// Set to false for hybrid builds with adapter (route works)
export const prerender = true;
