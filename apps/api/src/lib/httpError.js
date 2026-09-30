// An error with an HTTP status that the global error handler returns as-is.
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message Safe, user-facing message
   * @param {{ code?: string, details?: unknown }} [extra] Machine-readable code and details
   */
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, extra) => new HttpError(400, message, extra);
export const forbidden = (message = "You don't have access to this", extra) => new HttpError(403, message, extra);
export const notFound = (message = "Not found", extra) => new HttpError(404, message, extra);
export const conflict = (message, extra) => new HttpError(409, message, extra);
