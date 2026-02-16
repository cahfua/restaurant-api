import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { connectDB } from "../db.js";
import { ObjectId } from "mongodb";

const hasGoogleCreds =
  !!process.env.GOOGLE_CLIENT_ID &&
  !!process.env.GOOGLE_CLIENT_SECRET &&
  !!process.env.GOOGLE_CALLBACK_URL;

if (process.env.NODE_ENV !== "test" && hasGoogleCreds) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const db = await connectDB();

          const googleId = profile.id;
          const email = profile.emails?.[0]?.value || "";
          const name = profile.displayName || "";

          // Upsert user (create if missing)
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
}

// store minimal info in session
passport.serializeUser((user, done) => {
  done(null, user?._id?.toString?.() || null);
});

passport.deserializeUser(async (id, done) => {
  try {
    if (!id) return done(null, null);
    const db = await connectDB();
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});