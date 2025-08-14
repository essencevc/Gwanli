import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

export async function startAuthServer(): Promise<{ url: string; tokenPromise: Promise<string> }> {
  return new Promise((resolve, reject) => {
    let server: any = null;

    // Create promise that resolves when token received
    const tokenPromise = new Promise<string>((resolveToken, rejectToken) => {
      const app = new Hono();
      app.use("/*", cors());
      
      app.post("/callback", async (c) => {
        try {
          const { token } = await c.req.json();
          
          // Close server after a short delay to ensure response is sent
          setTimeout(() => {
            server?.close();
          }, 100);
          
          resolveToken(token); // Resolve with token!
          return c.json({ success: true });
        } catch (error) {
          setTimeout(() => {
            server?.close();
          }, 100);
          rejectToken(new Error("Invalid callback data"));
          return c.json({ error: "Invalid JSON" }, 400);
        }
      });
      
      app.notFound((c) => c.text("Not Found", 404));

      server = serve({
        fetch: app.fetch,
        port: 0,
        hostname: "127.0.0.1"
      }, (info: any) => {
        const url = `http://127.0.0.1:${info.port}`;
        
        // Set timeout to reject after 5 minutes
        setTimeout(() => {
          server?.close();
          rejectToken(new Error("Authentication timeout after 5 minutes"));
        }, 5 * 60 * 1000);

        resolve({ url, tokenPromise });
      });

      server.on?.("error", (error: Error) => {
        rejectToken(error);
      });
    });
  });
}
