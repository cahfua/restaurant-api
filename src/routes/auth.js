import express from "express";
import passport from "passport";

const router = express.Router();

// Start OAuth
router.get("/google", (req, res, next) => {
  // ensure session exists before redirect
  req.session.returnTo = "/api-docs";
  next();
}, passport.authenticate("google", { scope: ["profile", "email"] }));

// Callback (custom handler)
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.error("OAuth ERROR:", err);
      return res.status(500).send(`OAuth error: ${err.message || err}`);
    }

    // info often includes Google error messages
    if (!user) {
      console.error("OAuth FAILED info:", info);
      return res.redirect("/auth/failure");
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error("Login ERROR:", loginErr);
        return res.status(500).send(`Login error: ${loginErr.message || loginErr}`);
      }
      return res.redirect("/api-docs");
    });
  })(req, res, next);
});

// Failure page
router.get("/failure", (req, res) => {
  res.status(401).send(
    "OAuth login failed. Most common causes: (1) Redirect URI mismatch, (2) wrong env var names/values on Render, (3) cookie/session not sticking. Check Render logs for OAuth ERROR/FAILED details."
  );
});

// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out" });
    });
  });
});

// Status
router.get("/status", (req, res) => {
  res.status(200).json({
    authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    sessionID: req.sessionID || null,
    user: req.user
      ? { _id: req.user._id, email: req.user.email, name: req.user.name }
      : null,
  });
});

export default router;
