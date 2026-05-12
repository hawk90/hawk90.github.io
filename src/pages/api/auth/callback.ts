import type { APIRoute } from 'astro';
import { ADMIN_CONFIG } from '../../../consts/config';

/**
 * GitHub OAuth callback handler
 * Exchanges authorization code for access token
 *
 * Requires GITHUB_CLIENT_SECRET environment variable
 */
export const GET: APIRoute = async ({ request, redirect, cookies }) => {
  if (!ADMIN_CONFIG.enabled) {
    return new Response('Admin panel is disabled', { status: 403 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    const errorDesc = url.searchParams.get('error_description') || error;
    return redirect(`/admin/login?error=${encodeURIComponent(errorDesc)}`, 302);
  }

  if (!code || !state) {
    return redirect('/admin/login?error=Missing+authorization+code', 302);
  }

  // Verify state cookie (CSRF protection)
  const savedState = cookies.get('oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return redirect('/admin/login?error=Invalid+state+parameter', 302);
  }

  // Clear state cookie
  cookies.delete('oauth_state', { path: '/' });

  // Get client secret from environment
  const clientSecret = import.meta.env.GITHUB_CLIENT_SECRET;
  if (!clientSecret) {
    console.error('GITHUB_CLIENT_SECRET environment variable not set');
    return redirect('/admin/login?error=Server+configuration+error', 302);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: ADMIN_CONFIG.clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error('No access token received');
    }

    // Fetch user info to verify allowed users
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Astro-Blog-Admin',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const user = await userResponse.json();

    // Check if user is allowed
    if (!ADMIN_CONFIG.allowedUsers.includes(user.login)) {
      return redirect(
        `/admin/login?error=${encodeURIComponent(`User @${user.login} is not authorized`)}`,
        302
      );
    }

    // Redirect to login page with token (will be stored client-side)
    // Using fragment (#) to avoid token in server logs
    const loginUrl = new URL('/admin/login', url.origin);
    return redirect(
      `${loginUrl.toString()}#token=${accessToken}&user=${encodeURIComponent(JSON.stringify({
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
      }))}`,
      302
    );
  } catch (err) {
    console.error('OAuth callback error:', err);
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return redirect(`/admin/login?error=${encodeURIComponent(message)}`, 302);
  }
};

// Set to true for static builds (route won't exist)
// Set to false for hybrid builds with adapter (route works)
export const prerender = true;
