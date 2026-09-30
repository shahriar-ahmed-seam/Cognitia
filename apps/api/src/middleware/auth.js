import jwt from "jsonwebtoken";
import { prisma } from "../lib/database.js";

// Generate JWT token
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "default_secret",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

// Verify JWT token
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "default_secret");
}

/**
 * Authentication middleware.
 * Verifies JWT token from Authorization header and attaches the user to req.user.
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Invalid token payload." });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        // Not the avatar bytes, which would load on every request (see avatarUpdatedAt)
        avatarUpdatedAt: true,
        username: true,
        reputation: true,
        bio: true,
        institution: true,
        location: true,
        website: true,
        grade: true,
        graduationYear: true,
        major: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ error: "Authentication failed." });
  }
}

// Optional authentication middleware (attaches user if valid token present, doesn't block if not)
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded?.id) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              avatarUpdatedAt: true,
              username: true,
              reputation: true,
              bio: true,
              institution: true,
              location: true,
              website: true,
            },
          });
          if (user) req.user = user;
        }
      } catch (tokenErr) {
        // Optional auth: ignore token errors
      }
    }
    next();
  } catch (error) {
    next();
  }
}

// Role-based authorization middleware
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires ${roles.join(" or ")} role` });
    }
    next();
  };
}

// Admin only middleware
export const requireAdmin = requireRole("ADMIN");

// Teacher or admin middleware
export const requireTeacherOrAdmin = requireRole("TEACHER", "ADMIN");

