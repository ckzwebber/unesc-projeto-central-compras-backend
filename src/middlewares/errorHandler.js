const DefaultResponseDto = require("../dtos/defaultResponse.dto");
const AppError = require("../errors/appError");

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof AppError) {
    const response = new DefaultResponseDto(false, err.message, null);
    return res.status(err.statusCode).json(response);
  }

  const response = new DefaultResponseDto(false, "Erro interno do servidor", null);
  res.status(500).json(response);
}

module.exports = errorHandler;
