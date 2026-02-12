// src/routes/orders.js
import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";

const router = express.Router();

/**
 * Order schema (>= 7 fields for Week 07 requirement too):
 * - customerName (string)
 * - customerPhone (string)
 * - restaurantId (string ObjectId)
 * - items (array) [{ menuItemId (string ObjectId optional), name (string), qty (number), price (number) }]
 * - status (string) e.g. "pending" | "preparing" | "ready" | "completed" | "cancelled"
 * - notes (string optional)
 * - subtotal (number) (computed)
 * - tax (number) (computed)
 * - total (number) (computed)
 * - createdAt / updatedAt (dates)
 */

function validateOrder(body) {
  const errors = [];

  if (!body.customerName || typeof body.customerName !== "string") {
    errors.push("customerName is required (string)");
  }

  if (!body.customerPhone || typeof body.customerPhone !== "string") {
    errors.push("customerPhone is required (string)");
  }

  if (!body.restaurantId || typeof body.restaurantId !== "string") {
    errors.push("restaurantId is required (string)");
  } else if (!ObjectId.isValid(body.restaurantId)) {
    errors.push("restaurantId must be a valid ObjectId string");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push("items is required (array) and must contain at least 1 item");
  } else {
    body.items.forEach((it, idx) => {
      if (!it || typeof it !== "object") {
        errors.push(`items[${idx}] must be an object`);
        return;
      }

      // menuItemId is OPTIONAL (some teams don’t want to look up menu items yet)
      if (it.menuItemId && !ObjectId.isValid(it.menuItemId)) {
        errors.push(`items[${idx}].menuItemId must be a valid ObjectId string if provided`);
      }

      if (!it.name || typeof it.name !== "string") {
        errors.push(`items[${idx}].name is required (string)`);
      }

      if (typeof it.qty !== "number" || it.qty <= 0) {
        errors.push(`items[${idx}].qty is required (number > 0)`);
      }

      if (typeof it.price !== "number" || it.price < 0) {
        errors.push(`items[${idx}].price is required (number >= 0)`);
      }
    });
  }

  if (!body.status || typeof body.status !== "string") {
    errors.push("status is required (string)");
  }

  if (body.notes !== undefined && typeof body.notes !== "string") {
    errors.push("notes must be a string if provided");
  }

  return errors;
}

function computeTotals(items) {
  const subtotal = Number(
    items.reduce((sum, it) => sum + it.qty * it.price, 0).toFixed(2)
  );
  const tax = Number((subtotal * 0.07).toFixed(2)); // simple demo tax rate
  const total = Number((subtotal + tax).toFixed(2));
  return { subtotal, tax, total };
}

// GET ALL
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const orders = await db.collection("orders").find({}).toArray();
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

// GET ONE
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

// POST
router.post("/", async (req, res) => {
  try {
    const errors = validateOrder(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const db = await connectDB();

    // Ensure restaurant exists (nice for demo + prevents orphan orders)
    const restaurant = await db
      .collection("restaurants")
      .findOne({ _id: new ObjectId(req.body.restaurantId) });

    if (!restaurant) {
      return res.status(400).json({ error: "restaurantId does not match an existing restaurant." });
    }

    const cleanItems = req.body.items.map((it) => ({
      menuItemId: it.menuItemId && ObjectId.isValid(it.menuItemId) ? new ObjectId(it.menuItemId) : undefined,
      name: it.name.trim(),
      qty: it.qty,
      price: it.price,
    }));

    // remove undefined menuItemId so Mongo docs look clean
    const itemsForDb = cleanItems.map((it) => {
      const copy = { ...it };
      if (copy.menuItemId === undefined) delete copy.menuItemId;
      return copy;
    });

    const { subtotal, tax, total } = computeTotals(req.body.items);

    const doc = {
      customerName: req.body.customerName.trim(),
      customerPhone: req.body.customerPhone.trim(),
      restaurantId: new ObjectId(req.body.restaurantId),
      items: itemsForDb,
      status: req.body.status.trim(),
      notes: req.body.notes ? req.body.notes.trim() : "",
      subtotal,
      tax,
      total,
      createdAt: new Date(),
    };

    const result = await db.collection("orders").insertOne(doc);

    res.status(201).json({
      _id: result.insertedId,
      ...doc,
      restaurantId: req.body.restaurantId, // return as string for readability
      items: req.body.items, // return original for readability
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create order." });
  }
});

// PUT (simple full-update)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id." });

    const errors = validateOrder(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const db = await connectDB();

    // Ensure restaurant exists
    const restaurant = await db
      .collection("restaurants")
      .findOne({ _id: new ObjectId(req.body.restaurantId) });

    if (!restaurant) {
      return res.status(400).json({ error: "restaurantId does not match an existing restaurant." });
    }

    const itemsForDb = req.body.items.map((it) => {
      const itemDoc = {
        name: it.name.trim(),
        qty: it.qty,
        price: it.price,
      };
      if (it.menuItemId && ObjectId.isValid(it.menuItemId)) {
        itemDoc.menuItemId = new ObjectId(it.menuItemId);
      }
      return itemDoc;
    });

    const { subtotal, tax, total } = computeTotals(req.body.items);

    const update = {
      $set: {
        customerName: req.body.customerName.trim(),
        customerPhone: req.body.customerPhone.trim(),
        restaurantId: new ObjectId(req.body.restaurantId),
        items: itemsForDb,
        status: req.body.status.trim(),
        notes: req.body.notes ? req.body.notes.trim() : "",
        subtotal,
        tax,
        total,
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

// DELETE
router.delete("/:id", async (req, res) => {
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
