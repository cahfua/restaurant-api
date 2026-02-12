import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

let client;
let db;

export async function connectDB() {
  if (db) return db;

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment variables.");
  }

  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  db = client.db("restaurantDB");
  console.log("Connected to MongoDB");

  return db;
}