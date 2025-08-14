/**
 * Gwanli OAuth Worker - Handles Notion OAuth authentication flow
 */
import { Hono } from "hono";
import { successPage, errorPage, landingPage } from "./assets/templates";

const app = new Hono<{ Bindings: Env }>();

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  authCode: string,
  redirectUri: string,
  env: Env
): Promise<any> {
  const credentials = btoa(`${env.OAUTH_CLIENT_ID}:${env.OAUTH_CLIENT_SECRET}`);

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}



// Browser-only authentication flow
app.get("/", (c) => {
  const url = new URL(c.req.url);
  const redirectUri = `${url.origin}/callback`;
  const authParams = new URLSearchParams({
    client_id: c.env.OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    owner: "user",
  });
  
  const authUrl = `https://api.notion.com/v1/oauth/authorize?${authParams}`;
  return c.html(landingPage(authUrl));
});


// Browser OAuth callback handler
app.get("/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");

  if (error) {
    return c.html(errorPage(error), 400);
  }

  if (!code) {
    return c.html(errorPage("No authorization code received"), 400);
  }

  try {
    // Exchange code for token
    const url = new URL(c.req.url);
    const redirectUri = `${url.origin}/callback`;
    const tokenData = await exchangeCodeForToken(code, redirectUri, c.env);

    // Browser flow - always show token in page
    return c.html(successPage(tokenData.access_token));
  } catch (error) {
    console.error("Token exchange error:", error);
    return c.html(errorPage("Failed to exchange authorization code"), 500);
  }
});

export default app;
