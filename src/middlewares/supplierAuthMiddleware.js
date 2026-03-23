const AppError = require("../errors/appError");
const logger = require("../lib/logger");

const supplierAuth = (req, res, next) => {
  if (!req.userId) {
    logger.warn(
      {
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        role: req.user?.funcao || req.userFuncao,
      },
      "Acesso negado: usuario nao autenticado",
    );
    throw new AppError("Usuário não autenticado", 401);
  }

  if (!req.userFuncao) {
    logger.warn(
      {
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        role: req.user?.funcao || req.userFuncao,
      },
      "Acesso negado: funcao nao identificada",
    );
    throw new AppError("Função do usuário não identificada", 401);
  }

  if (req.userFuncao !== "fornecedor") {
    logger.warn(
      {
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        role: req.userFuncao,
      },
      "Acesso negado: rota exclusiva de fornecedor",
    );
    throw new AppError("Acesso negado. Apenas fornecedores podem acessar este recurso", 403);
  }

  next();
};

module.exports = { supplierAuth };
