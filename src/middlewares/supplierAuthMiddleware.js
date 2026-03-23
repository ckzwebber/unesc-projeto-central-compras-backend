const AppError = require("../errors/appError");

const supplierAuth = (req, res, next) => {
  if (!req.userId) {
    throw new AppError("Usuário não autenticado", 401);
  }

  if (!req.userFuncao) {
    throw new AppError("Função do usuário não identificada", 401);
  }

  if (req.userFuncao !== "fornecedor") {
    throw new AppError("Acesso negado. Apenas fornecedores podem acessar este recurso", 403);
  }

  next();
};

module.exports = { supplierAuth };
