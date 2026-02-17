import express from "express";
import passport from "passport";

const router = express.Router();

// Start OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Callback (custom so we can see errors)
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.error("OAuth ERROR:", err);
      return res.status(500).send(`OAuth error: ${err.message || err}`);
    }
    if (!user) {
      console.error("OAuth FAILED:", info);
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
  res
    .status(401)
    .send("OAuth login failed. Check Google Console redirect URI + Render env vars (GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL).");
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
    user: req.user ? { _id: req.user._id, email: req.user.email, name: req.user.name } : null,
  });
});

export default router;
