import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

function validateMenuItem(body) {
  const errors = [];
  if (!body.name || typeof body.name !== "string") errors.push("name is required (string)");
  if (!body.description || typeof body.description !== "string") errors.push("description is required (string)");
  if (typeof body.price !== "number") errors.push("price is required (number)");
  if (!body.category || typeof body.category !== "string") errors.push("category is required (string)");
  if (!body.restaurantId || typeof body.restaurantId !== "string") errors.push("restaurantId is required (string)");
  if (typeof body.isAvailable !== "boolean") errors.push("isAvailable is required (boolean)");
  if (!body.imageUrl || typeof body.imageUrl !== "string") errors.push("imageUrl is required (string)");
  return errors;
}

// GET ALL
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const items = await db.collection("menuItems").find({}).toArray();
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch menu items." });
  }
});

// GET ONE
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const db = await connectDB();
    const item = await db.collection("menuItems").findOne({ _id: new ObjectId(id) });

    if (!item) return res.status(404).json({ error: "Menu item not found." });
    res.status(200).json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch menu item." });
  }
});

// POST (protected)
router.post("/", requireAuth, async (req, res) => {
  try {
    const errors = validateMenuItem(req.body);
    if (errors.length) return res.status(400).json({ errors });

    if (!ObjectId.isValid(req.body.restaurantId)) {
      return res.status(400).json({ error: "restaurantId must be a valid ObjectId string." });
    }

    const db = await connectDB();

    // Ensure restaurant exists
    const restaurant = await db.collection("restaurants").findOne({ _id: new ObjectId(req.body.restaurantId) });
    if (!restaurant) {
      return res.status(400).json({ error: "restaurantId does not match an existing restaurant." });
    }

    const doc = {
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      price: req.body.price,
      category: req.body.category.trim(),
      restaurantId: new ObjectId(req.body.restaurantId),
      isAvailable: req.body.isAvailable,
      imageUrl: req.body.imageUrl.trim(),
      createdAt: new Date(),
    };

    const result = await db.collection("menuItems").insertOne(doc);

    res.status(201).json({
      _id: result.insertedId,
      ...doc,
      restaurantId: req.body.restaurantId,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create menu item." });
  }
});

// PUT (protected)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const errors = validateMenuItem(req.body);
    if (errors.length) return res.status(400).json({ errors });

    if (!ObjectId.isValid(req.body.restaurantId)) {
      return res.status(400).json({ error: "restaurantId must be a valid ObjectId string." });
    }

    const db = await connectDB();

    const update = {
      $set: {
        name: req.body.name.trim(),
        description: req.body.description.trim(),
        price: req.body.price,
        category: req.body.category.trim(),
        restaurantId: new ObjectId(req.body.restaurantId),
        isAvailable: req.body.isAvailable,
        imageUrl: req.body.imageUrl.trim(),
        updatedAt: new Date(),
      },
    };

    const result = await db.collection("menuItems").updateOne({ _id: new ObjectId(id) }, update);
    if (result.matchedCount === 0) return res.status(404).json({ error: "Menu item not found." });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to update menu item." });
  }
});

// DELETE (protected)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const db = await connectDB();
    const result = await db.collection("menuItems").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return res.status(404).json({ error: "Menu item not found." });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete menu item." });
  }
});

export default router;
