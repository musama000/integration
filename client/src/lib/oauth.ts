import { apiRequest } from "./queryClient";
import { Token } from "@shared/schema";

export type OAuthProvider = "monday" | "asana";

interface OAuthConfig {
  authorizationUrl: string;
  scopes: string[];
}

export const OAUTH_CONFIGS: Record<OAuthProvider, OAuthConfig> = {
  monday: {
    authorizationUrl: "https://auth.monday.com/oauth2/authorize",
    scopes: ["me:read", "boards:read"],
  },
  asana: {
    authorizationUrl: "https://app.asana.com/-/oauth_authorize",
    scopes: ["default"],
  },
};

/**
 * Initiates the OAuth flow for a given provider
 */
export function initiateOAuthFlow(provider: OAuthProvider) {
  // Get domain from environment
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];

  if (!domain) {
    throw new Error("No domain configured");
  }

  const config = OAUTH_CONFIGS[provider];
  const params = new URLSearchParams({
    client_id: provider === "monday" 
      ? process.env.MONDAY_CLIENT_ID || ""
      : process.env.ASANA_CLIENT_ID || "",
    redirect_uri: `${domain}/api/oauth/${provider}/callback`,
    scope: config.scopes.join(" "),
    response_type: "code",
  });

  window.location.href = `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Retrieves tokens for the authenticated user
 */
export async function fetchUserTokens(): Promise<Token[]> {
  const res = await apiRequest("GET", "/api/tokens");
  return res.json();
}

/**
 * Delete a token by ID
 */
export async function deleteToken(tokenId: number): Promise<void> {
  await apiRequest("DELETE", `/api/tokens/${tokenId}`);
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(token: Token): boolean {
  if (!token.expiresAt) return false;
  return new Date(token.expiresAt) < new Date();
}

/**
 * Format token expiry time
 */
export function formatTokenExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "Never";
  return new Date(expiresAt).toLocaleString();
}

/**
 * Get a readable name for a provider
 */
export function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    monday: "Monday.com",
    asana: "Asana",
  };
  return names[provider] || provider;
}

/**
 * Mask a token string for display
 */
export function maskToken(token: string): string {
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}