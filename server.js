// server.js
import express from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./src/db.js";
import restaurantsRoutes from "./src/routes/restaurants.js";
import menuItemsRoutes from "./src/routes/menuItems.js";
import ordersRoutes from "./src/routes/orders.js";

dotenv.config();

const app = express();
app.use(express.json());

// Load swagger.json using fs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerPath = path.join(__dirname, "swagger.json");
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, "utf-8"));

// Swagger docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// routes
app.use("/restaurants", restaurantsRoutes);
app.use("/menuItems", menuItemsRoutes);
app.use("/orders", ordersRoutes);

// test route
app.get("/", (req, res) => {
  res.send("API running");
});

// connect database
connectDB();

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));