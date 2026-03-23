const jwt = require("jsonwebtoken");
const AppError = require("../errors/appError");
const dotenv = require("dotenv");

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

const parseCookieHeader = (cookieHeader = "") => {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) return acc;

    acc[rawKey] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {});
};

const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(" ");

    if (parts.length !== 2) {
      throw new AppError("Formato de token inválido", 401);
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      throw new AppError("Token mal formatado", 401);
    }

    if (!token) {
      throw new AppError("Token não fornecido", 401);
    }

    return token;
  }

  const cookies = parseCookieHeader(req.headers.cookie || "");
  const cookieToken = cookies.auth_token;

  if (!cookieToken) {
    throw new AppError("Token não fornecido", 401);
  }

  return cookieToken;
};

const buildUserContext = (decoded) => {
  if (!decoded?.sub || !decoded?.funcao) {
    throw new AppError("Token inválido", 401);
  }

  return {
    id: decoded.sub,
    nome: decoded.nome,
    sobrenome: decoded.sobrenome,
    email: decoded.email,
    funcao: decoded.funcao,
    email_verificado: decoded.email_verificado,
  };
};

const authenticate = (req, res, next) => {
  try {
    if (!jwtSecret) {
      throw new AppError("Configuração de autenticação inválida", 500);
    }

    const token = extractToken(req);
    const decoded = jwt.verify(token, jwtSecret);

    req.user = buildUserContext(decoded);

    req.userId = decoded.sub;
    req.userFuncao = decoded.funcao;

    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    if (error.name === "TokenExpiredError") {
      return next(new AppError("Token expirado", 401));
    }
    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Token inválido", 401));
    }

    return next(new AppError("Erro na autenticação", 401));
  }
};

const optionalAuthenticate = (req, res, next) => {
  try {
    if (!jwtSecret) {
      return next();
    }

    let token;

    try {
      token = extractToken(req);
    } catch (_error) {
      return next();
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (!err) {
        req.user = buildUserContext(decoded);
      }

      return next();
    });
  } catch (error) {
    return next();
  }
};

const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    throw new AppError("Usuário não autenticado", 401);
  }

  if (!req.user.email_verificado) {
    throw new AppError("Email não verificado. Verifique seu email antes de continuar.", 403);
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireEmailVerified,
};
