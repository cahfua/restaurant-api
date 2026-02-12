import express from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import session from "express-session";
import passport from "passport";

import "./auth/passport.js"; // initializes Google strategy + serialize/deserialize

import restaurantsRoutes from "./routes/restaurants.js";
import menuItemsRoutes from "./routes/menuItems.js";
import ordersRoutes from "./routes/orders.js";
import usersRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

// Render runs behind a proxy
app.set("trust proxy", 1);

app.use(express.json());

// Sessions (required for Passport OAuth)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // secure cookies only in production (Render)
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Load swagger.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerPath = path.join(__dirname, "../swagger.json");
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf-8"));

// Swagger docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Auth routes
app.use("/auth", authRoutes);

// API routes
app.use("/restaurants", restaurantsRoutes);
app.use("/menuItems", menuItemsRoutes);
app.use("/orders", ordersRoutes);
app.use("/users", usersRoutes);

// Root
app.get("/", (req, res) => res.send("API running"));

export default app;
