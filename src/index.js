const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const swaggerUI = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");
const rateLimit = require("express-rate-limit");

const errorHandler = require("./middlewares/errorHandler.js");
const AppError = require("./errors/appError.js");

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
const apiRateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const apiRateLimitMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120);
const rateLimitSkipGet = String(process.env.RATE_LIMIT_SKIP_GET || "true").toLowerCase() === "true";
const authRateLimitWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60_000);
const authRateLimitMaxRequests = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 20);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado. Defina a variável de ambiente antes de iniciar a API.");
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

app.listen(port, () => {
  console.log(`Projeto Central de Compras está rodando em: http://localhost:${port}`);
  console.log(`Documentação da API disponível em: http://localhost:${port}/docs`);
});
