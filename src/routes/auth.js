import express from "express";
import passport from "passport";

const router = express.Router();

/**
 * Start OAuth
 */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * Callback
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  (req, res) => {
    // Successful login -> back to Swagger UI
    res.redirect("/api-docs");
  }
);

/**
 * If OAuth fails, show a clear message
 */
router.get("/failure", (req, res) => {
  res
    .status(401)
    .send(
      "OAuth login failed. Check Google Console redirect URI + Render env vars (GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL)."
    );
});

/**
 * Logout
 */
router.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out" });
    });
  });
});

/**
 * Status
 */
router.get("/status", (req, res) => {
  const isAuthed = req.isAuthenticated ? req.isAuthenticated() : false;

  res.status(200).json({
    authenticated: isAuthed,
    user: req.user
      ? { _id: req.user._id, email: req.user.email, name: req.user.name }
      : null,
  });
});

export default router;