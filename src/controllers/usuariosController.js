const UsuariosService = require("../services/usuariosService");
const logger = require("../lib/logger");
const usuariosService = new UsuariosService();

const isProduction = process.env.NODE_ENV === "production";
const authCookieName = process.env.AUTH_COOKIE_NAME || "auth_token";
const authCookieMaxAgeMs = Number(process.env.AUTH_COOKIE_MAX_AGE_MS || 2 * 60 * 60 * 1000);
const authCookieSameSite = process.env.AUTH_COOKIE_SAMESITE || "lax";

const setAuthCookie = (res, token) => {
  res.cookie(authCookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: authCookieSameSite,
    path: "/",
    maxAge: authCookieMaxAgeMs,
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(authCookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: authCookieSameSite,
    path: "/",
  });
};

class UsuariosController {
  async login(req, res) {
    const { email, senha } = req.body;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "usuario",
        action: "login",
      },
      "Inicio de autenticacao de usuario",
    );
    const response = await usuariosService.login(email, senha);
    setAuthCookie(res, response.data.token);
    response.data = { user: response.data.user };
    res.status(200).json(response);
  }

  async getAll(req, res) {
    const response = await usuariosService.getAll(req.user.funcao);
    res.status(200).json(response);
  }

  async getById(req, res) {
    const { id } = req.params;
    const response = await usuariosService.getById(id, req.user.id, req.user.funcao);
    res.status(200).json(response);
  }

  async getByEmail(req, res) {
    const { email } = req.params;
    const response = await usuariosService.getByEmail(email, req.user.funcao);
    res.status(200).json(response);
  }

  async getMe(req, res) {
    const response = await usuariosService.getById(req.user.id, req.user.id, req.user.funcao);
    res.status(200).json(response);
  }

  async create(req, res) {
    const usuario = req.body;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "usuario",
        action: "create",
      },
      "Inicio da criacao de usuario",
    );
    const response = await usuariosService.create(usuario);
    res.status(201).json(response);
  }

  async update(req, res) {
    const { id } = req.params;
    const usuario = req.body;
    const requestUserId = req.user.id;
    const userFuncao = req.user.funcao;
    logger.info(
      {
        userId: requestUserId,
        role: userFuncao,
        entity: "usuario",
        entityId: id,
        action: "update",
      },
      "Inicio da atualizacao de usuario",
    );
    const response = await usuariosService.update(id, usuario, requestUserId, userFuncao);
    res.status(200).json(response);
  }

  async updatePassword(req, res) {
    const { id } = req.params;
    const passwordData = req.body;
    const requestUserId = req.user.id;
    logger.info(
      {
        userId: requestUserId,
        role: req.user.funcao,
        entity: "usuario",
        entityId: id,
        action: "update-password",
      },
      "Inicio da atualizacao de senha",
    );
    const response = await usuariosService.updatePassword(id, passwordData, requestUserId);
    res.status(200).json(response);
  }

  async delete(req, res) {
    const { id } = req.params;
    const requestUserId = req.user.id;
    const userFuncao = req.user.funcao;
    logger.info(
      {
        userId: requestUserId,
        role: userFuncao,
        entity: "usuario",
        entityId: id,
        action: "delete",
      },
      "Inicio da exclusao de usuario",
    );
    const response = await usuariosService.delete(id, requestUserId, userFuncao);
    res.status(200).json(response);
  }

  async logout(req, res) {
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "usuario",
        action: "logout",
      },
      "Logout solicitado",
    );
    clearAuthCookie(res);

    res.status(200).json({
      success: true,
      message: "Logout realizado com sucesso",
      data: null,
    });
  }
}

module.exports = new UsuariosController();
