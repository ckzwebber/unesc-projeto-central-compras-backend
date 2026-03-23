const CampanhasService = require("../services/campanhaService");
const FornecedoresModel = require("../models/fornecedoresModel");
const AppError = require("../errors/appError");
const logger = require("../lib/logger");

class CampanhasController {
  constructor() {
    this.campanhasService = new CampanhasService();
    this.fornecedoresModel = new FornecedoresModel();
  }

  async getFornecedorIdByUsuarioId(usuario_id) {
    const fornecedor = await this.fornecedoresModel.selectByUsuarioId(usuario_id);
    if (!fornecedor[0]) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    return fornecedor[0].id;
  }

  async getAll(req, res) {
    const response = await this.campanhasService.getAll();
    res.status(200).json(response);
  }

  async getById(req, res) {
    const { id } = req.params;
    const fornecedor_id = req.user ? await this.getFornecedorIdByUsuarioId(req.user.id) : null;
    const response = await this.campanhasService.getById(id, fornecedor_id);
    res.status(200).json(response);
  }

  async getByStatus(req, res) {
    const { status } = req.params;
    const response = await this.campanhasService.getByStatus(status);
    res.status(200).json(response);
  }

  async create(req, res) {
    const fornecedor_id = await this.getFornecedorIdByUsuarioId(req.user.id);
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "campanha",
        action: "create",
      },
      "Inicio da criacao de campanha",
    );
    const response = await this.campanhasService.create(req.body, fornecedor_id);
    res.status(201).json(response);
  }

  async update(req, res) {
    const { id } = req.params;
    const fornecedor_id = await this.getFornecedorIdByUsuarioId(req.user.id);
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "campanha",
        entityId: id,
        action: "update",
      },
      "Inicio da atualizacao de campanha",
    );
    const response = await this.campanhasService.update(id, req.body, fornecedor_id);
    res.status(200).json(response);
  }

  async delete(req, res) {
    const { id } = req.params;
    const fornecedor_id = await this.getFornecedorIdByUsuarioId(req.user.id);
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "campanha",
        entityId: id,
        action: "delete",
      },
      "Inicio da exclusao de campanha",
    );
    const response = await this.campanhasService.delete(id, fornecedor_id);
    res.status(200).json(response);
  }
}

module.exports = new CampanhasController();
