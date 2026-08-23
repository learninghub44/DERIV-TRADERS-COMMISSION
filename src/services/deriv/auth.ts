/**
 * DERIV TECH - Deriv API Authentication Service
 *
 * This service implements OAuth 2.0 with PKCE for secure Deriv API integration.
 *
 * Official Deriv API documentation: https://developers.deriv.com/docs/
 *
 * Supported endpoints (verified against official docs):
 * - OAuth 2.0 Authorization: https://auth.deriv.com/oauth2/auth
 * - Token Exchange: https://auth.deriv.com/oauth2/token
 * - Markup Statistics (REST): GET /applications/v1/markup-statistics
 *
 * Available OAuth scopes (from official docs):
 * - trade: Access to trading operations
 * - account_manage: Write access for account creation and management
 * - application_read: Read-only access to registered applications
 * - payment: Access to payment agent deposit and withdrawal operations
 *
 * IMPORTANT: This service only uses officially documented Deriv API endpoints.
 * Markup configuration CANNOT be modified through the API - it must be managed
 * in the Deriv application dashboard directly.
 */

export interface DerivOAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
}

export interface DerivTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

/**
 * Markup statistics response from Deriv REST API.
 * Source: GET /applications/v1/markup-statistics
 * Requires: application_read scope + Deriv-App-ID header
 *
 * All monetary values are returned as strings from the API.
 * The DERIV TECH application converts them to NUMERIC for storage.
 */
export interface DerivMarkupStatistics {
  date_from: string;
  date_to: string;
  total_markup: string;
  contract_count: string;
  total_markup_per_app: {
    app_id: string;
    markup: string;
    contract_count: string;
  }[];
}

const DERIV_AUTH_URL = 'https://auth.deriv.com/oauth2/auth';
const DERIV_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
const DERIV_API_BASE = 'https://api.derivws.com';

/**
 * Generate a PKCE code verifier for OAuth 2.0.
 * Uses 32 bytes of cryptographic randomness per RFC 7636.
 */
export function generatePKCE(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a PKCE code challenge from a verifier.
 * Uses SHA-256 per RFC 7636.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Build the Deriv OAuth 2.0 authorization URL.
 * Uses Authorization Code flow with PKCE per official docs.
 */
export function buildDerivAuthUrl(config: DerivOAuthConfig, codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${DERIV_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token.
 * Must be called server-side only.
 *
 * Per Deriv docs, the token endpoint accepts:
 * - grant_type: authorization_code
 * - client_id: Your registered app ID
 * - code: The authorization code from the callback
 * - code_verifier: The original PKCE verifier
 * - redirect_uri: Must match the registered URI
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string
): Promise<DerivTokenResponse> {
  const response = await fetch(DERIV_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || `Token exchange failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch markup statistics from the Deriv REST API.
 *
 * Official endpoint: GET /applications/v1/markup-statistics
 * Requires: OAuth2 Bearer token + application_read scope + Deriv-App-ID header
 *
 * This returns aggregated markup data for the specified date range.
 * Values are returned as strings and must be parsed to numbers.
 *
 * IMPORTANT: This is READ-ONLY data from Deriv. Markup configuration
 * cannot be modified through this API. To change markup settings,
 * users must visit their Deriv application dashboard directly.
 */
export async function getMarkupStatistics(
  accessToken: string,
  appId: string,
  dateFrom: string,
  dateTo: string
): Promise<DerivMarkupStatistics> {
  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
  });

  const response = await fetch(
    `${DERIV_API_BASE}/applications/v1/markup-statistics?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Deriv-App-ID': appId,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch markup statistics: ${response.status}`);
  }

  return response.json();
}
