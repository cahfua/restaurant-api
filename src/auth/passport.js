import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { connectDB } from "../db.js";
import { ObjectId } from "mongodb";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  console.error("MISSING GOOGLE ENV VARS:", {
    GOOGLE_CLIENT_ID: !!GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: !!GOOGLE_CALLBACK_URL,
  });
}

// Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID || "MISSING",
      clientSecret: GOOGLE_CLIENT_SECRET || "MISSING",
      callbackURL: GOOGLE_CALLBACK_URL || "MISSING",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const db = await connectDB();

        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || "";
        const name = profile.displayName || "";

        const result = await db.collection("users").findOneAndUpdate(
          { googleId },
          {
            $set: { email, name, updatedAt: new Date() },
            $setOnInsert: { createdAt: new Date(), isActive: true },
          },
          { upsert: true, returnDocument: "after" }
        );

        return done(null, result.value);
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