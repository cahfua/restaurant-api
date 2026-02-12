import express from "express";
import passport from "passport";

const router = express.Router();

// Start OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/api-docs" }),
  (req, res) => {
    res.redirect("/api-docs");
  }
);

// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out" });
    });
  });
});

// Status (useful for video demo)
router.get("/status", (req, res) => {
  res.status(200).json({
    authenticated: req.isAuthenticated(),
    user: req.user ? { _id: req.user._id, email: req.user.email, name: req.user.name } : null,
  });
});

export default router;
