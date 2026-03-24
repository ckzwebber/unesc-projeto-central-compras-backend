const pino = require("pino");
const { addLog } = require("./logBuffer.js");

const isDevelopment = process.env.NODE_ENV === "development";

const streams = [
  // Stream 1: buffer em memória para o viewer /_logs
  {
    stream: {
      write(line) {
        try {
          addLog(JSON.parse(line));
        } catch {
          // ignora linhas malformadas
        }
      },
    },
  },
];

if (isDevelopment) {
  streams.push({
    stream: require("pino-pretty")({
      colorize: true,
      translateTime: "SYS:standard",
      singleLine: true,
      ignore: "pid,hostname",
    }),
  });
} else {
  streams.push({ stream: process.stdout });
}

const logger = pino(
  {
    level: isDevelopment ? "debug" : "info",
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", "headers.authorization", "headers.cookie", "token", "senha", "password", "jwt", "cookie"],
      censor: "[REDACTED]",
    },
  },
  pino.multistream(streams),
);

module.exports = logger;
