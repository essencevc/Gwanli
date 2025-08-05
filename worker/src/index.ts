/**
 * Gwanli OAuth Worker - Handles Notion OAuth authentication flow
 */

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

/**
 * Generate HTML responses
 */
const generateHTML = {
  success: (token = "") => `
		<!DOCTYPE html>
		<html>
		<head>
			<title>Authentication Successful</title>
			<style>
				body { 
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					text-align: center; 
					padding: 50px; 
					background: #f8f9fa;
				}
				.container {
					max-width: 600px;
					margin: 0 auto;
					background: white;
					padding: 40px;
					border-radius: 12px;
					box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
				}
				.success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
				.message { color: #6c757d; line-height: 1.6; }
				.token-section {
					margin: 30px 0;
					padding: 20px;
					background: #f8f9fa;
					border-radius: 8px;
					border: 1px solid #e9ecef;
				}
				.token-label {
					font-weight: 600;
					margin-bottom: 10px;
					color: #495057;
				}
				.token-input {
					width: 100%;
					padding: 12px;
					border: 1px solid #ced4da;
					border-radius: 6px;
					font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
					font-size: 12px;
					background: white;
					word-break: break-all;
					box-sizing: border-box;
				}
				.copy-btn {
					margin-top: 10px;
					padding: 8px 16px;
					background: #007bff;
					color: white;
					border: none;
					border-radius: 4px;
					cursor: pointer;
					font-size: 14px;
				}
				.copy-btn:hover {
					background: #0056b3;
				}
				.copy-success {
					color: #28a745;
					font-size: 14px;
					margin-top: 5px;
					display: none;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="success">&#x2713; Authentication Successful!</div>
				<div class="message">
					<p>You have successfully authenticated with Notion.</p>
					${
            token
              ? `
					<div class="token-section">
						<div class="token-label">Your Access Token:</div>
						<input type="text" class="token-input" value="${token}" readonly id="tokenInput">
						<button class="copy-btn" onclick="copyToken()">Copy Token</button>
						<div class="copy-success" id="copySuccess">&#x2713; Copied to clipboard!</div>
					</div>
					`
              : ""
          }
					<p>You can now close this window and return to your terminal.</p>
					<p><strong>Next steps:</strong></p>
					<div style="text-align: left; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; font-family: monospace; font-size: 12px;">
						<strong>Option 1 - Set environment variable:</strong><br>
						<code>export NOTION_API_KEY="${token}"</code><br><br>
						<strong>Option 2 - Add to Claude Desktop MCP config:</strong><br>
						Add this token to your Claude Desktop configuration as NOTION_TOKEN
					</div>
				</div>
			</div>
			<script>
				function copyToken() {
					const input = document.getElementById('tokenInput');
					input.select();
					input.setSelectionRange(0, 99999);
					document.execCommand('copy');
					document.getElementById('copySuccess').style.display = 'block';
					setTimeout(() => {
						document.getElementById('copySuccess').style.display = 'none';
					}, 2000);
				}
			</script>
		</body>
		</html>
	`,

  error: (errorMsg: string) => `
		<!DOCTYPE html>
		<html>
		<head>
			<title>Authentication Failed</title>
			<style>
				body { 
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					text-align: center; 
					padding: 50px; 
					background: #f8f9fa;
				}
				.container {
					max-width: 500px;
					margin: 0 auto;
					background: white;
					padding: 40px;
					border-radius: 12px;
					box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
				}
				.error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
				.message { color: #6c757d; line-height: 1.6; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="error">&#x2717; Authentication Failed</div>
				<div class="message">
					<p>Error: ${errorMsg}</p>
					<p>Please try the authentication process again.</p>
				</div>
			</div>
		</body>
		</html>
	`,

  landing: (authUrl: string) => `
		<!DOCTYPE html>
		<html>
		<head>
			<title>Gwanli Authentication</title>
			<style>
				body { 
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					text-align: center; 
					padding: 50px; 
					background: #f8f9fa;
				}
				.container {
					max-width: 500px;
					margin: 0 auto;
					background: white;
					padding: 40px;
					border-radius: 12px;
					box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
				}
				.title { color: #2d3748; font-size: 24px; margin-bottom: 20px; }
				.message { color: #6c757d; line-height: 1.6; }
				.auth-btn {
					display: inline-block;
					background: #007bff;
					color: white;
					padding: 12px 24px;
					text-decoration: none;
					border-radius: 6px;
					margin: 20px 0;
					font-weight: 600;
				}
				.auth-btn:hover {
					background: #0056b3;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="title">&#x1f517; Gwanli Authentication</div>
				<div class="message">
					<p>Connect your Notion workspace to Gwanli.</p>
					<a href="${authUrl}" class="auth-btn">Authorize with Notion</a>
					<p><small>You'll be redirected to Notion to grant permissions.</small></p>
				</div>
			</div>
		</body>
		</html>
	`,
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    console.log(env.OAUTH_CLIENT_ID, env.OAUTH_CLIENT_SECRET);

    try {
      // Handle OAuth callback
      if (pathname === "/callback") {
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
          return new Response(generateHTML.error(error), {
            headers: { "Content-Type": "text/html" },
            status: 400,
          });
        }

        if (!code) {
          return new Response(
            generateHTML.error("No authorization code received"),
            {
              headers: { "Content-Type": "text/html" },
              status: 400,
            }
          );
        }

        try {
          // Exchange code for token
          const redirectUri = `${url.origin}/callback`;
          const tokenData = await exchangeCodeForToken(code, redirectUri, env);

          return new Response(generateHTML.success(tokenData.access_token), {
            headers: { "Content-Type": "text/html" },
          });
        } catch (error) {
          console.error("Token exchange error:", error);
          return new Response(
            generateHTML.error("Failed to exchange authorization code"),
            {
              headers: { "Content-Type": "text/html" },
              status: 500,
            }
          );
        }
      }

      // Handle redirect/landing page
      if (pathname === "/redirect" || pathname === "/") {
        const redirectUri = `${url.origin}/callback`;
        const authParams = new URLSearchParams({
          client_id: env.OAUTH_CLIENT_ID,
          redirect_uri: redirectUri,
          response_type: "code",
          owner: "user",
        });
        const authUrl = `https://api.notion.com/v1/oauth/authorize?${authParams}`;

        return new Response(generateHTML.landing(authUrl), {
          headers: { "Content-Type": "text/html" },
        });
      }

      // Default 404
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(generateHTML.error("Internal server error"), {
        headers: { "Content-Type": "text/html" },
        status: 500,
      });
    }
  },
} satisfies ExportedHandler<Env>;
