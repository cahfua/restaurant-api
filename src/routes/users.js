import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";
import { ensureAuth } from "../middleware/auth.js";

const router = express.Router();

function validateUser(body) {
  const errors = [];
  if (!body.name || typeof body.name !== "string") errors.push("name is required (string)");
  if (!body.email || typeof body.email !== "string") errors.push("email is required (string)");
  if (typeof body.isActive !== "boolean") errors.push("isActive is required (boolean)");
  return errors;
}

// GET ALL (public)
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const users = await db.collection("users").find({}).toArray();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// GET ONE (public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const db = await connectDB();
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });

    if (!user) return res.status(404).json({ error: "User not found." });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user." });
  }
});

// POST (protected)
router.post("/", ensureAuth, async (req, res) => {
  try {
    const errors = validateUser(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const db = await connectDB();
    const doc = {
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      isActive: req.body.isActive,
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(doc);
    res.status(201).json({ _id: result.insertedId, ...doc });
  } catch (err) {
    res.status(500).json({ error: "Failed to create user." });
  }
});

// PUT (protected)
router.put("/:id", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const errors = validateUser(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const db = await connectDB();
    const update = {
      $set: {
        name: req.body.name.trim(),
        email: req.body.email.trim().toLowerCase(),
        isActive: req.body.isActive,
        updatedAt: new Date(),
      },
    };

    const result = await db.collection("users").updateOne({ _id: new ObjectId(id) }, update);
    if (result.matchedCount === 0) return res.status(404).json({ error: "User not found." });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to update user." });
  }
});

// DELETE (public or protected — your choice; keeping public for now)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const db = await connectDB();
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return res.status(404).json({ error: "User not found." });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user." });
  }
});

export default router;