import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

function validateOrder(body) {
  const errors = [];

  if (!body.restaurantId || typeof body.restaurantId !== "string")
    errors.push("restaurantId is required (string)");

  if (!Array.isArray(body.items) || body.items.length === 0)
    errors.push("items is required (array) and must have at least 1 item");

  if (Array.isArray(body.items)) {
    body.items.forEach((item, idx) => {
      if (!item.menuItemId || typeof item.menuItemId !== "string")
        errors.push(`items[${idx}].menuItemId is required (string)`);
      if (typeof item.quantity !== "number")
        errors.push(`items[${idx}].quantity is required (number)`);
      if (typeof item.price !== "number")
        errors.push(`items[${idx}].price is required (number)`);
    });
  }

  if (!body.status || typeof body.status !== "string")
    errors.push("status is required (string)");

  if (body.notes && typeof body.notes !== "string")
    errors.push("notes must be a string (optional)");

  return errors;
}

// GET ALL (public)
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const orders = await db.collection("orders").find({}).toArray();
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

// GET ONE (public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const db = await connectDB();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });

    if (!order) return res.status(404).json({ error: "Order not found." });
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order." });
  }
});

// POST (protected)
router.post("/", requireAuth, async (req, res) => {
  try {
    const errors = validateOrder(req.body);
    if (errors.length) return res.status(400).json({ errors });

    if (!ObjectId.isValid(req.body.restaurantId)) {
      return res.status(400).json({ error: "restaurantId must be a valid ObjectId string." });
    }

    for (const item of req.body.items) {
      if (!ObjectId.isValid(item.menuItemId)) {
        return res.status(400).json({ error: "Each items[].menuItemId must be a valid ObjectId string." });
      }
    }

    const db = await connectDB();

    const restaurant = await db.collection("restaurants").findOne({ _id: new ObjectId(req.body.restaurantId) });
    if (!restaurant) {
      return res.status(400).json({ error: "restaurantId does not match an existing restaurant." });
    }

    const doc = {
      restaurantId: new ObjectId(req.body.restaurantId),
      items: req.body.items.map((it) => ({
        menuItemId: new ObjectId(it.menuItemId),
        quantity: it.quantity,
        price: it.price,
      })),
      status: req.body.status.trim(),
      notes: req.body.notes ? req.body.notes.trim() : "",
      createdAt: new Date(),
    };

    const result = await db.collection("orders").insertOne(doc);

    res.status(201).json({
      _id: result.insertedId,
      restaurantId: req.body.restaurantId,
      items: req.body.items,
      status: doc.status,
      notes: doc.notes,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create order." });
  }
});

// PUT (protected)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const errors = validateOrder(req.body);
    if (errors.length) return res.status(400).json({ errors });

    if (!ObjectId.isValid(req.body.restaurantId)) {
      return res.status(400).json({ error: "restaurantId must be a valid ObjectId string." });
    }

    for (const item of req.body.items) {
      if (!ObjectId.isValid(item.menuItemId)) {
        return res.status(400).json({ error: "Each items[].menuItemId must be a valid ObjectId string." });
      }
    }

    const db = await connectDB();

    const update = {
      $set: {
        restaurantId: new ObjectId(req.body.restaurantId),
        items: req.body.items.map((it) => ({
          menuItemId: new ObjectId(it.menuItemId),
          quantity: it.quantity,
          price: it.price,
        })),
        status: req.body.status.trim(),
        notes: req.body.notes ? req.body.notes.trim() : "",
        updatedAt: new Date(),
      },
    };

    const result = await db.collection("orders").updateOne({ _id: new ObjectId(id) }, update);
    if (result.matchedCount === 0) return res.status(404).json({ error: "Order not found." });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to update order." });
  }
});

// DELETE (protected)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const db = await connectDB();
    const result = await db.collection("orders").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return res.status(404).json({ error: "Order not found." });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete order." });
  }
});

export default router;
