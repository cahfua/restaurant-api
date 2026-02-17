import express from "express";
import passport from "passport";

const router = express.Router();

// Start OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback", (req, res, next) => {
  console.log("OAUTH CALLBACK QUERY:", req.query);

  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.error("OAUTH ERROR:", err);
      const msg = err?.message || String(err);
      return res.redirect(`/auth/failure?stage=error&message=${encodeURIComponent(msg)}`);
    }

    if (!user) {
      console.error("OAUTH FAILED (no user). info:", info);
      return res.redirect(
        `/auth/failure?stage=nouser&query=${encodeURIComponent(JSON.stringify(req.query))}&info=${encodeURIComponent(JSON.stringify(info || {}))}`
      );
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error("LOGIN ERROR:", loginErr);
        const msg = loginErr?.message || String(loginErr);
        return res.redirect(`/auth/failure?stage=login&message=${encodeURIComponent(msg)}`);
      }

      // Success
      return res.redirect("/api-docs");
    });
  })(req, res, next);
});

// Failure page
router.get("/failure", (req, res) => {
  const stage = req.query.stage || "";
  const message = req.query.message || "";
  const query = req.query.query || "";
  const info = req.query.info || "";

  res.status(401).send(`
OAuth login failed

Stage: ${stage}

Message: ${message}

Query:
${query}

Info:
${info}

Most common causes:
- redirect_uri mismatch (Google Console redirect URIs don’t match exactly)
- invalid_client (wrong client id/secret)
- consent screen/testing (account not added as Test User)
  `);
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
    user: req.user
      ? { _id: req.user._id, email: req.user.email, name: req.user.name }
      : null,
  });
});

export default router;