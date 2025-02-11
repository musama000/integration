import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import passport from "passport";
import { Strategy as OAuth2Strategy } from "passport-oauth2";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Configure Asana OAuth2 strategy
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (!domain) {
    throw new Error("No domain configured");
  }

  const redirectUri = `https://${domain}/api/oauth/asana/callback`;

  passport.use('asana', new OAuth2Strategy({
    authorizationURL: 'https://app.asana.com/-/oauth_authorize',
    tokenURL: 'https://app.asana.com/-/oauth_token',
    clientID: process.env.ASANA_CLIENT_ID!,
    clientSecret: process.env.ASANA_CLIENT_SECRET!,
    callbackURL: redirectUri,
    state: true, // Enable state parameter for CSRF protection
  }, async (
    accessToken: string,
    refreshToken: string,
    _profile: any,
    done: (error: any, user?: any) => void
  ) => {
    try {
      if (!accessToken) {
        return done(new Error("No access token received from Asana"));
      }
      // Pass only the tokens
      return done(null, { accessToken, refreshToken });
    } catch (error) {
      return done(error);
    }
  }));

  app.get("/api/tokens", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tokens = await storage.getTokens(req.user.id);
    res.json(tokens);
  });

  app.post("/api/tokens", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const token = await storage.createToken({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(token);
  });

  app.delete("/api/tokens/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deactivateToken(parseInt(req.params.id), req.user.id);
    res.sendStatus(200);
  });

  // Asana OAuth endpoints
  app.get("/api/oauth/asana", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    passport.authenticate("asana", {
      session: false // Don't serialize the OAuth state
    })(req, res, next);
  });

  app.get("/api/oauth/asana/callback", 
    passport.authenticate("asana", { 
      session: false,
      failureRedirect: "/?oauth=error&provider=asana&reason=unauthorized"
    }), 
    async (req: any, res) => {
      try {
        // The OAuth tokens are passed directly in req.user by the strategy
        const { accessToken, refreshToken } = req.user;

        if (!accessToken) {
          throw new Error("No access token received from Asana");
        }

        await storage.createToken({
          userId: req.user.id,
          provider: "asana",
          accessToken: accessToken,
          refreshToken: refreshToken || null,
          expiresAt: null, // Asana tokens don't expire
          active: true,
        });

        res.redirect("/?oauth=success&provider=asana");
      } catch (error) {
        console.error("Asana OAuth error:", error);
        res.redirect("/?oauth=error&provider=asana&reason=token_storage");
      }
    }
  );

  // Monday.com OAuth endpoints
  app.get("/api/oauth/monday", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clientId = process.env.MONDAY_CLIENT_ID;
    const redirectUri = `${process.env.REPLIT_DOMAINS?.split(",")[0]}/api/oauth/monday/callback`;
    const scope = "me:read boards:read";
    res.redirect(
      `https://auth.monday.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`
    );
  });

  app.get("/api/oauth/monday/callback", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { code } = req.query;

    try {
      const tokenRes = await fetch("https://auth.monday.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.MONDAY_CLIENT_ID,
          client_secret: process.env.MONDAY_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.REPLIT_DOMAINS?.split(",")[0]}/api/oauth/monday/callback`,
        }),
      });

      const data = await tokenRes.json();

      await storage.createToken({
        userId: req.user.id,
        provider: "monday",
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        active: true,
      });

      res.redirect("/?oauth=success");
    } catch (error) {
      res.redirect("/?oauth=error");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}