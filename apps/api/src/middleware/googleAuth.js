import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../lib/database.js";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { ensureUsername } from "../modules/profiles/username.js";

// Ensure environment variables are loaded
const clientID = process.env.GOOGLE_CLIENT_ID || "test-client-id";
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "test-client-secret";

passport.use(
    new GoogleStrategy(
        {
            clientID,
            clientSecret,
            callbackURL: "/api/auth/google/callback",
            scope: ["profile", "email"],
            // prompt doesn't always work here directly; we'll override authorizationParams below
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Find user by email
                let user = await prisma.user.findUnique({
                    where: { email: profile.emails[0].value },
                });

                // If user not found, create new user
                if (!user) {
                    // Google accounts sign in through Google. The password column needs a value, so store
                    // the hash of a random secret nobody knows (a fixed one would let anyone log in as them).
                    const hashedDummyPassword = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);

                    user = await prisma.user.create({
                        data: {
                            name: profile.displayName || "",       // match registration
                            email: profile.emails[0].value,
                            password: hashedDummyPassword,
                            role: "STUDENT",                       // default role
                            bio: "",                              // empty string to match registration
                            institution: "",                      // empty string to match registration
                            avatar: null,
                            otp: null,                           // no OTP for Google signup
                            otpExpires: null,
                            verified: true,                      // already verified on Google signup
                        },
                    });
                    await ensureUsername(user);
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// Override authorizationParams to force Google account selection every time
GoogleStrategy.prototype.authorizationParams = function () {
    return { prompt: "select_account" };
};

// Serialize & Deserialize user
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

export default passport;
