const FornecedoresService = require("../services/fornecedoresService");
const logger = require("../lib/logger");

class FornecedoresController {
  constructor() {
    this.fornecedoresService = new FornecedoresService();
  }

  async getAll(req, res) {
    const result = await this.fornecedoresService.getAll();
    res.status(200).json(result);
  }

  async getById(req, res) {
    const { id } = req.params;
    const result = await this.fornecedoresService.getById(id);
    res.status(200).json(result);
  }

  async getByCnpj(req, res) {
    const { cnpj } = req.params;
    const result = await this.fornecedoresService.getByCnpj(cnpj);
    res.status(200).json(result);
  }

  async create(req, res) {
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "fornecedor",
        action: "create",
      },
      "Inicio da criacao de fornecedor",
    );
    const result = await this.fornecedoresService.create(req.body);
    res.status(201).json(result);
  }

  async update(req, res) {
    const { id } = req.params;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "fornecedor",
        entityId: id,
        action: "update",
      },
      "Inicio da atualizacao de fornecedor",
    );
    const result = await this.fornecedoresService.update(id, req.body, req.user.id, req.user.funcao);
    res.status(200).json(result);
  }

  async delete(req, res) {
    const { id } = req.params;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "fornecedor",
        entityId: id,
        action: "delete",
      },
      "Inicio da exclusao de fornecedor",
    );
    const result = await this.fornecedoresService.delete(id, req.user.id, req.user.funcao);
    res.status(200).json(result);
  }

  async getMyProfile(req, res) {
    const result = await this.fornecedoresService.getMyProfile(req.userId);
    res.status(200).json(result);
  }

  async updateMyProfile(req, res) {
    const result = await this.fornecedoresService.updateMyProfile(req.userId, req.body);
    res.status(200).json(result);
  }

  async getMyProducts(req, res) {
    const result = await this.fornecedoresService.getMyProducts(req.userId);
    res.status(200).json(result);
  }

  async createMyProduct(req, res) {
    const result = await this.fornecedoresService.createMyProduct(req.userId, req.body);
    res.status(201).json(result);
  }

  async updateMyProduct(req, res) {
    const { id } = req.params;
    const result = await this.fornecedoresService.updateMyProduct(req.userId, id, req.body);
    res.status(200).json(result);
  }

  async deleteMyProduct(req, res) {
    const { id } = req.params;
    const result = await this.fornecedoresService.deleteMyProduct(req.userId, id);
    res.status(200).json(result);
  }

  async getMyOrders(req, res) {
    const result = await this.fornecedoresService.getMyOrders(req.userId);
    res.status(200).json(result);
  }

  async getMyOrderById(req, res) {
    const { id } = req.params;
    const result = await this.fornecedoresService.getMyOrderById(req.userId, id);
    res.status(200).json(result);
  }

  async updateMyOrderStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const result = await this.fornecedoresService.updateMyOrderStatus(req.userId, id, status);
    res.status(200).json(result);
  }

  async getMyStatistics(req, res) {
    const result = await this.fornecedoresService.getMyStatistics(req.userId);
    res.status(200).json(result);
  }
}

module.exports = FornecedoresController;
