const PedidosService = require("../services/pedidosService");
const logger = require("../lib/logger");

class PedidosController {
  constructor() {
    this.pedidosService = new PedidosService();
  }

  async getAll(req, res) {
    const response = await this.pedidosService.getAll();
    res.status(200).json(response);
  }

  async getById(req, res) {
    const { id } = req.params;
    const response = await this.pedidosService.getById(id);
    res.status(200).json(response);
  }

  async getByStatus(req, res) {
    const { status } = req.params;
    const response = await this.pedidosService.getByStatus(status);
    res.status(200).json(response);
  }

  async getMeusPedidos(req, res) {
    const response = await this.pedidosService.getByUsuarioId(req.user.id);
    res.status(200).json(response);
  }

  async getByDate(req, res) {
    const { date } = req.query;
    const response = await this.pedidosService.getByDate(date);
    res.status(200).json(response);
  }

  async create(req, res) {
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "pedido",
        action: "create",
      },
      "Inicio da criacao de pedido",
    );
    const response = await this.pedidosService.create(req.body, req.user.id);
    res.status(201).json(response);
  }

  async update(req, res) {
    const { id } = req.params;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "pedido",
        entityId: id,
        action: "update",
      },
      "Inicio da atualizacao de pedido",
    );
    const response = await this.pedidosService.update(id, req.body, req.user.id);
    res.status(200).json(response);
  }

  async updateStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const fornecedorId = req.user.fornecedorId;

    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "pedido",
        entityId: id,
        action: "update-status",
      },
      "Inicio da atualizacao de status de pedido",
    );

    const response = await this.pedidosService.updateStatus(id, status, fornecedorId);
    res.status(200).json(response);
  }

  async delete(req, res) {
    const { id } = req.params;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "pedido",
        entityId: id,
        action: "delete",
      },
      "Inicio da exclusao de pedido",
    );
    const response = await this.pedidosService.delete(id, req.user.id);
    res.status(200).json(response);
  }
}

module.exports = new PedidosController();
