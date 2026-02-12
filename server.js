import express from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { connectDB } from "./src/db.js";
import restaurantsRoutes from "./src/routes/restaurants.js";
import menuItemsRoutes from "./src/routes/menuItems.js";
import ordersRoutes from "./src/routes/orders.js";
import usersRoutes from "./src/routes/users.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

/* ======================================================
   GOOGLE OAUTH — DISABLED DURING TESTS
====================================================== */
if (process.env.NODE_ENV !== "test") {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "dev",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dev",
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:3000/auth/google/callback",
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails || [],
        });
      }
    )
  );
}

/* ======================================================
   AUTH ROUTES
====================================================== */
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  (req, res) => {
    res.redirect("/api-docs");
  }
);

app.get("/auth/failure", (req, res) => {
  res.status(401).send("OAuth failed");
});

app.get("/auth/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json(req.user);
  }
  res.json(null);
});

app.get("/auth/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/api-docs");
  });
});

/* ======================================================
   SWAGGER
====================================================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerPath = path.join(__dirname, "swagger.json");
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf-8"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/* ======================================================
   ROUTES
====================================================== */
app.use("/restaurants", restaurantsRoutes);
app.use("/menuItems", menuItemsRoutes);
app.use("/orders", ordersRoutes);
app.use("/users", usersRoutes);

app.get("/", (req, res) => {
  res.send("API running");
});

connectDB();

/* ======================================================
   START SERVER
====================================================== */
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log("Server running on", PORT));
}

export default app;