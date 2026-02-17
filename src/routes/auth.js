import express from "express";
import passport from "passport";

const router = express.Router();

/**
 * DEBUG endpoint (safe):
 */
router.get("/debug/env", (req, res) => {
  res.json({
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasGoogleCallbackUrl: !!process.env.GOOGLE_CALLBACK_URL,
    callbackUrlValueLength: process.env.GOOGLE_CALLBACK_URL
      ? process.env.GOOGLE_CALLBACK_URL.length
      : 0,
    nodeEnv: process.env.NODE_ENV,
  });
});

// Start OAuth
router.get("/google", (req, res, next) => {
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, (err) => {
    if (err) {
      console.error("OAUTH START ERROR:", err);
      return res.redirect("/auth/failure?stage=start&message=" + encodeURIComponent(err.message || String(err)));
    }
    next();
  });
});

// Callback (custom so we can see errors)
router.get("/google/callback", (req, res, next) => {
  // Log what Google sent back
  console.log("OAUTH CALLBACK QUERY:", req.query);

  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.error("OAUTH CALLBACK ERROR:", err);
      return res.redirect(
        "/auth/failure?stage=callback&message=" +
          encodeURIComponent(err.message || String(err))
      );
    }

    if (!user) {
      console.error("OAUTH FAILED (no user). info:", info);
      const q = encodeURIComponent(JSON.stringify(req.query || {}));
      const i = encodeURIComponent(JSON.stringify(info || {}));
      return res.redirect(`/auth/failure?stage=nouser&query=${q}&info=${i}`);
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error("LOGIN ERROR:", loginErr);
        return res.redirect(
          "/auth/failure?stage=login&message=" +
            encodeURIComponent(loginErr.message || String(loginErr))
        );
      }
      return res.redirect("/api-docs");
    });
  })(req, res, next);
});

// Failure page
router.get("/failure", (req, res) => {
  res.status(401).send(`
    <h2>OAuth login failed</h2>
    <p><b>Stage:</b> ${req.query.stage || "unknown"}</p>
    <p><b>Message:</b> ${req.query.message || ""}</p>
    <p><b>Query:</b></p>
    <pre>${req.query.query ? decodeURIComponent(req.query.query) : JSON.stringify(req.query, null, 2)}</pre>
    <p><b>Info:</b></p>
    <pre>${req.query.info ? decodeURIComponent(req.query.info) : ""}</pre>
    <hr/>
    <p>Most common causes:</p>
    <ul>
      <li><b>redirect_uri_mismatch</b> (Google Console redirect URIs don’t match exactly)</li>
      <li><b>invalid_client</b> (wrong client id/secret)</li>
      <li><b>env vars not loaded</b> (Render not restarted)</li>
      <li><b>consent screen/testing</b> (account not added as Test User)</li>
    </ul>
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