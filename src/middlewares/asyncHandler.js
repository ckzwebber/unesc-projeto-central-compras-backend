const logger = require("../lib/logger");

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    logger.error(
      {
        err,
        entity: "controller",
        action: fn.name || "anonymous",
      },
      "Erro capturado em controller",
    );
    next(err);
  });
};

module.exports = asyncHandler;
