import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { connectDB } from "../db.js";
import { ObjectId } from "mongodb";

// Strategy
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

        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || "";
        const name = profile.displayName || "";

        const result = await db.collection("users").findOneAndUpdate(
          { googleId },
          {
            $set: { email, name, updatedAt: new Date() },
            $setOnInsert: { createdAt: new Date() },
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
