import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { connectDB } from "../db.js";
import { ObjectId } from "mongodb";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const db = await connectDB();
        const users = db.collection("users");

        const googleId = profile?.id;
        const email = profile?.emails?.[0]?.value || "";
        const name = profile?.displayName || "";

        if (!googleId) {
          return done(null, false);
        }

        // Upsert user
        const update = {
          $set: {
            email,
            name,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            googleId,
            createdAt: new Date(),
          },
        };

        // Try modern driver option first
        let result;
        try {
          result = await users.findOneAndUpdate(
            { googleId },
            update,
            { upsert: true, returnDocument: "after" }
          );
        } catch (e) {
          // Fallback for older MongoDB driver versions
          result = await users.findOneAndUpdate(
            { googleId },
            update,
            { upsert: true, returnOriginal: false }
          );
        }

        let user = result?.value || null;

        if (!user) {
          const upsertedId =
            result?.lastErrorObject?.upserted ||
            result?.upsertedId?._id ||
            result?.upsertedId ||
            null;

          if (upsertedId) {
            user = await users.findOne({ _id: new ObjectId(upsertedId) });
          } else {
            user = await users.findOne({ googleId });
          }
        }

        if (!user) {
          return done(null, false);
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// store user id in session
passport.serializeUser((user, done) => {
  done(null, user?._id?.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const db = await connectDB();
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});