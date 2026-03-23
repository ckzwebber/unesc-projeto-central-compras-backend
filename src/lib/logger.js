const pino = require("pino");

const isDevelopment = process.env.NODE_ENV === "development";

const logger = pino({
  level: isDevelopment ? "debug" : "info",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "headers.authorization", "headers.cookie", "token", "senha", "password", "jwt", "cookie"],
    censor: "[REDACTED]",
  },
  ...(isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            singleLine: true,
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

module.exports = logger;
