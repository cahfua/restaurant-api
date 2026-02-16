import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";

// Start server (don’t listen during tests)
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log("Server running on", PORT));
}

export default app;
