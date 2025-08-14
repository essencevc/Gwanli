import { baseStyles } from './styles';

export const successPage = (token?: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Authentication Successful</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="success">✓ Authentication Successful!</div>
        <div class="message">
          <p>You have successfully authenticated with Notion.</p>
          
          ${token ? `
            <div class="token-section">
              <div class="token-label">Your Access Token:</div>
              <input 
                type="text" 
                class="token-input" 
                value="${token}" 
                readonly 
                id="tokenInput"
              />
              <button class="copy-btn" onclick="copyToken()">
                Copy Token
              </button>
              <div class="copy-success" id="copySuccess">
                ✓ Copied to clipboard!
              </div>
            </div>
          ` : ''}
          
          <p>You can now close this window and return to your terminal.</p>
          
          ${token ? `
            <div style="text-align: left; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; font-family: monospace; font-size: 12px;">
              <strong>Option 1 - Set environment variable:</strong><br />
              <code>export NOTION_API_KEY="${token}"</code><br /><br />
              <strong>Option 2 - Add to Claude Desktop MCP config:</strong><br />
              Add this token to your Claude Desktop configuration as NOTION_TOKEN
            </div>
          ` : ''}
        </div>
      </div>
      
      ${token ? `
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
      ` : ''}
    </body>
  </html>
`;

export const errorPage = (error: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Authentication Failed</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="error">✗ Authentication Failed</div>
        <div class="message">
          <p>Error: ${error}</p>
          <p>Please try the authentication process again.</p>
        </div>
      </div>
    </body>
  </html>
`;

export const landingPage = (authUrl: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Gwanli Authentication</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="title">🔗 Gwanli Authentication</div>
        <div class="message">
          <p>Connect your Notion workspace to Gwanli.</p>
          <a href="${authUrl}" class="auth-btn">
            Authorize with Notion
          </a>
          <p>
            <small>You'll be redirected to Notion to grant permissions.</small>
          </p>
        </div>
      </div>
    </body>
  </html>
`;
