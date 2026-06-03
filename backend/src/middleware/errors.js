export function notFound(req, res) {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;

  res.status(status).json({
    error: err.message || "Unexpected server error",
    details: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
}
