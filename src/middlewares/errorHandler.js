const DefaultResponseDto = require("../dtos/defaultResponse.dto");
const AppError = require("../errors/appError");
const logger = require("../lib/logger");

function errorHandler(err, req, res, next) {
  const role = req.user?.funcao || req.userFuncao;
  const logContext = {
    err,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    role,
  };

  if (err instanceof AppError) {
    if (err.statusCode === 400) {
      logger.warn(
        {
          ...logContext,
          body_keys: Object.keys(req.body || {}),
        },
        "Falha de validacao de entrada",
      );
    } else if (err.statusCode === 401 || err.statusCode === 403) {
      logger.warn(logContext, "Falha de autenticacao/autorizacao");
    } else {
      logger.info(logContext, "Erro de aplicacao tratado");
    }

    const response = new DefaultResponseDto(false, err.message, null);
    return res.status(err.statusCode).json(response);
  }

  logger.error(logContext, "Erro interno nao tratado");

  const response = new DefaultResponseDto(false, "Erro interno do servidor", null);
  res.status(500).json(response);
}

module.exports = errorHandler;
