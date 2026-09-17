/**
 * Express 4 does not forward a rejected promise from an async route
 * handler to the error-handling middleware — it just hangs or crashes
 * the request. Wrapping every handler in this closes that gap: any
 * thrown error (a bad ObjectId, a dropped DB connection, a Groq call
 * that throws outside the try/catch already in llmService, etc.) is
 * caught and passed to next(), which server.js's error handler turns
 * into a clean JSON response instead of a hung connection.
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export default asyncHandler;
