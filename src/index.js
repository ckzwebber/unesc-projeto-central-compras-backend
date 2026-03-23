const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const swaggerUI = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");
const rateLimit = require("express-rate-limit");

const errorHandler = require("./middlewares/errorHandler.js");
const requestLogger = require("./middlewares/requestLogger.js");
const AppError = require("./errors/appError.js");
const logger = require("./lib/logger.js");
const database = require("../db/database.js");

const fornecedoresRoutes = require("./routes/fornecedoresRoutes.js");
const produtosRoutes = require("./routes/produtosRoutes.js");
const usuariosRoutes = require("./routes/usuariosRoutes.js");
const enderecosRoutes = require("./routes/enderecosRoutes.js");
const lojasRoutes = require("./routes/lojasRoutes.js");
const campanhaRoutes = require("./routes/campanhaRoutes.js");
const pedidosRoutes = require("./routes/pedidosRoutes.js");
const condicaoComercialRoutes = require("./routes/condicaoComercialRoutes.js");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3001";
const swaggerServerUrl = process.env.SWAGGER_SERVER_URL || `http://localhost:${port}`;
const trustProxyEnv = process.env.TRUST_PROXY;
const apiRateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const apiRateLimitMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120);
const rateLimitSkipGet = String(process.env.RATE_LIMIT_SKIP_GET || "true").toLowerCase() === "true";
const authRateLimitWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60_000);
const authRateLimitMaxRequests = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 20);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado. Defina a variável de ambiente antes de iniciar a API.");
}

if (trustProxyEnv === "true") {
  app.set("trust proxy", true);
} else if (trustProxyEnv === "false") {
  app.set("trust proxy", false);
} else if (typeof trustProxyEnv === "string" && trustProxyEnv.trim() !== "") {
  const trustProxyHops = Number(trustProxyEnv);
  if (!Number.isNaN(trustProxyHops)) {
    app.set("trust proxy", trustProxyHops);
  }
} else if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API - Central de Compras",
      version: "1.0.0",
      description: "API para gerenciar fornecedores, produtos e pedidos na Central de Compras.",
      license: {
        name: "Academic Project License",
      },
      contact: {
        name: "Central de Compras",
      },
    },
    servers: [
      {
        url: swaggerServerUrl,
        description: "Servidor da API",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpecs = swaggerJSDoc(swaggerOptions);
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerSpecs));

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(requestLogger);

const apiLimiter = rateLimit({
  windowMs: apiRateLimitWindowMs,
  max: apiRateLimitMaxRequests,
  skip: (req) => rateLimitSkipGet && req.method === "GET",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas requisicoes. Tente novamente em instantes.",
    data: null,
  },
});

const authLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: authRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas tentativas de login. Aguarde e tente novamente.",
    data: null,
  },
});

app.use(apiLimiter);
app.use("/usuarios/login", authLimiter);

app.get("/", (req, res) => {
  res.send("Projeto Central de Compras!");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ok",
    data: null,
  });
});

app.use("/fornecedores", fornecedoresRoutes);
app.use("/produtos", produtosRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/enderecos", enderecosRoutes);
app.use("/lojas", lojasRoutes);
app.use("/campanhas", campanhaRoutes);
app.use("/pedidos", pedidosRoutes);
app.use("/condicoes-comerciais", condicaoComercialRoutes);

app.use((req, res, next) => {
  next(new AppError(`Rota ${req.originalUrl} não encontrada`, 404));
});
app.use(errorHandler);

async function bootstrap() {
  try {
    await database.query({ text: "SELECT 1", values: [] });
    logger.info({ entity: "database", action: "connect" }, "Conexao com banco estabelecida com sucesso");

    app.listen(port, () => {
      logger.info({ port, nodeEnv: process.env.NODE_ENV || "development" }, "Servidor iniciado com sucesso");
      logger.info({ path: "/docs", port }, "Documentacao da API disponivel");
    });
  } catch (err) {
    logger.error({ err, entity: "application", action: "startup" }, "Falha critica na inicializacao da API");
    process.exit(1);
  }
}

bootstrap();
