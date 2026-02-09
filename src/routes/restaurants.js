import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";

const router = express.Router();

// simple validation for Week 05
function validateRestaurant(body) {
  const errors = [];
  if (!body.name || typeof body.name !== "string") errors.push("name is required (string)");
  if (!body.location || typeof body.location !== "string") errors.push("location is required (string)");
  if (!body.phone || typeof body.phone !== "string") errors.push("phone is required (string)");
  if (!body.hours || typeof body.hours !== "string") errors.push("hours is required (string)");
  return errors;
}

// GET ALL
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const restaurants = await db.collection("restaurants").find({}).toArray();
    res.status(200).json(restaurants);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch restaurants." });
  }
});

// GET ONE
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const db = await connectDB();
    const restaurant = await db.collection("restaurants").findOne({ _id: new ObjectId(id) });

    if (!restaurant) return res.status(404).json({ error: "Restaurant not found." });
    res.status(200).json(restaurant);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch restaurant." });
  }
});

// POST
router.post("/", async (req, res) => {
  try {
    const errors = validateRestaurant(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const db = await connectDB();
    const doc = {
      name: req.body.name.trim(),
      location: req.body.location.trim(),
      phone: req.body.phone.trim(),
      hours: req.body.hours.trim(),
      createdAt: new Date()
    };

    const result = await db.collection("restaurants").insertOne(doc);
    res.status(201).json({ _id: result.insertedId, ...doc });
  } catch (err) {
    res.status(500).json({ error: "Failed to create restaurant." });
  }
});

// PUT
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const errors = validateRestaurant(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const db = await connectDB();
    const update = {
      $set: {
        name: req.body.name.trim(),
        location: req.body.location.trim(),
        phone: req.body.phone.trim(),
        hours: req.body.hours.trim(),
        updatedAt: new Date()
      }
    };

    const result = await db.collection("restaurants").updateOne({ _id: new ObjectId(id) }, update);
    if (result.matchedCount === 0) return res.status(404).json({ error: "Restaurant not found." });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to update restaurant." });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const db = await connectDB();
    const result = await db.collection("restaurants").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return res.status(404).json({ error: "Restaurant not found." });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete restaurant." });
  }
});

export default router;
