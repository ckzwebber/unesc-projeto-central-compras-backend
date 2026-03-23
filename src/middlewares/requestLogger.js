const pinoHttp = require("pino-http");
const logger = require("../lib/logger");

const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === "/health" || req.url.startsWith("/health?"),
  },
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} concluida com status ${res.statusCode}`;
  },
  customErrorMessage(req, res) {
    return `${req.method} ${req.url} falhou com status ${res.statusCode}`;
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        path: req.url,
        ip: req.ip,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});

module.exports = requestLogger;
