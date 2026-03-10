import type { Page } from "@playwright/test";

/**
 * Mock authenticated session for testing
 * This simulates a logged-in user without actually calling Supabase
 */
export async function seedAuthSession(page: Page, userId = "test-user-id") {
  await page.addInitScript((mockUserId) => {
    const storageKey = "sb-oyxhohsxpbbsedidujvt-auth-token";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const mockSession = {
      access_token: `mock_access_token_${Date.now()}`,
      refresh_token: "mock_refresh_token",
      expires_in: 3600,
      expires_at: expiresAt,
      token_type: "bearer",
      user: {
        id: mockUserId,
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {
          name: "Test User"
        }
      }
    };

    localStorage.setItem(storageKey, JSON.stringify({
      access_token: mockSession.access_token,
      refresh_token: mockSession.refresh_token,
      expires_in: mockSession.expires_in,
      expires_at: mockSession.expires_at,
      token_type: mockSession.token_type
    }));
    localStorage.setItem(`${storageKey}-user`, JSON.stringify({ user: mockSession.user }));
    localStorage.setItem("kemana.auth.userId", mockUserId);
  }, userId);

  await page.evaluate((mockUserId) => {
    const storageKey = "sb-oyxhohsxpbbsedidujvt-auth-token";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const mockSession = {
      access_token: `mock_access_token_${Date.now()}`,
      refresh_token: "mock_refresh_token",
      expires_in: 3600,
      expires_at: expiresAt,
      token_type: "bearer",
      user: {
        id: mockUserId,
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {
          name: "Test User"
        }
      }
    };

    localStorage.setItem(storageKey, JSON.stringify({
      access_token: mockSession.access_token,
      refresh_token: mockSession.refresh_token,
      expires_in: mockSession.expires_in,
      expires_at: mockSession.expires_at,
      token_type: mockSession.token_type
    }));
    localStorage.setItem(`${storageKey}-user`, JSON.stringify({ user: mockSession.user }));
    localStorage.setItem("kemana.auth.userId", mockUserId);
  }, userId).catch(() => {
    // Page might not be loaded yet.
  });
}

/**
 * Seed auth session only for the currently loaded document.
 * Unlike seedAuthSession(), this does not persist across reloads.
 */
export async function seedAuthSessionStorage(page: Page, userId = "test-user-id") {
  await page.evaluate((mockUserId) => {
    const storageKey = "sb-oyxhohsxpbbsedidujvt-auth-token";
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const mockSession = {
      access_token: `mock_access_token_${Date.now()}`,
      refresh_token: "mock_refresh_token",
      expires_in: 3600,
      expires_at: expiresAt,
      token_type: "bearer",
      user: {
        id: mockUserId,
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {
          name: "Test User"
        }
      }
    };

    localStorage.setItem(storageKey, JSON.stringify({
      access_token: mockSession.access_token,
      refresh_token: mockSession.refresh_token,
      expires_in: mockSession.expires_in,
      expires_at: mockSession.expires_at,
      token_type: mockSession.token_type
    }));
    localStorage.setItem(`${storageKey}-user`, JSON.stringify({ user: mockSession.user }));
    localStorage.setItem("kemana.auth.userId", mockUserId);
  }, userId);
}

/**
 * Clear authentication session
 */
export async function clearAuthSession(page: Page) {
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(key => {
      if (key.includes('sb-') && key.includes('-auth-token')) {
        localStorage.removeItem(key);
      }
      if (key.includes('sb-') && key.includes('-auth-token-user')) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem('kemana.auth.userId');
  });
}

/**
 * Mock Supabase API responses
 */
export async function mockSupabaseAuth(page: Page) {
  // Mock sign in endpoint
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          aud: 'authenticated',
          role: 'authenticated'
        }
      })
    });
  });

  // Mock sign out endpoint
  await page.route('**/auth/v1/logout**', async (route) => {
    await route.fulfill({
      status: 204
    });
  });

  // Mock user endpoint
  await page.route('**/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated'
      })
    });
  });
}

/**
 * Mock Google OAuth flow
 */
export async function mockGoogleOAuth(page: Page) {
  await page.route('**/auth/v1/authorize**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: '/auth/callback#access_token=mock_google_access_token' })
    });
  });

  // Mock token exchange
  await page.route('**/auth/v1/token?grant_type=pkce**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock_google_access_token',
        refresh_token: 'mock_google_refresh_token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'google-user-id',
          email: 'google@example.com',
          aud: 'authenticated',
          role: 'authenticated',
          user_metadata: {
            name: 'Google User',
            avatar_url: 'https://example.com/avatar.jpg'
          }
        }
      })
    });
  });
}

/**
 * Wait for auth state to be initialized
 */
export async function waitForAuthReady(page: Page) {
  await page.waitForFunction(() => {
    // Check if auth store is initialized
    return window.localStorage.getItem('kemana.auth.userId') !== null ||
           document.querySelector('[data-auth-ready="true"]') !== null;
  }, { timeout: 5000 });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const storageKey = "sb-oyxhohsxpbbsedidujvt-auth-token";
    return Boolean(localStorage.getItem(storageKey)) && Boolean(localStorage.getItem(`${storageKey}-user`));
  });
}
