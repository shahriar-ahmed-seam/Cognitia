import { HttpError } from "../lib/httpError.js"

// Global error handler middleware
export default function errorHandler(err, req, res, next) {
  // Expected client errors: return the message, code and details without logging a stack
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.code && { code: err.code }),
      ...(err.details !== undefined && { details: err.details }),
    })
  }

  // Malformed JSON body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body isn't valid JSON" })
  }

  // Upload problems (multer): too large, too many files, unexpected field
  if (err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? req.originalUrl.startsWith("/api/community")
          ? "This file is too large. Videos can be up to 60 MB, documents 25 MB and images 8 MB."
          : req.originalUrl.startsWith("/api/profile")
            ? "Profile photos can be at most 2 MB"
            : "Images can be at most 6 MB"
        : "That upload wasn't accepted. Send one file as \"file\".";
    return res.status(400).json({ error: message, code: err.code })
  }

  console.error("Error:", err)

  // Prisma errors
  if (err.code === "P2002") {
    return res.status(409).json({
      error: "Duplicate entry",
      message: "A record with this information already exists",
    })
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      error: "Record not found",
      message: "The requested record does not exist",
    })
  }

  if (err.code === "P2003") {
    return res.status(400).json({
      error: "Foreign key constraint failed",
      message: "Referenced record does not exist",
    })
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token",
      message: "The provided token is invalid",
    })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token expired",
      message: "The provided token has expired",
    })
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      message: err.message,
    })
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500
  const message = err.message || "Internal server error"

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal server error" : message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}
