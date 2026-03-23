const ProdutosService = require("../services/produtosService");
const logger = require("../lib/logger");
const produtosService = new ProdutosService();

class ProdutosController {
  async getAll(req, res) {
    const response = await produtosService.getAll();
    res.status(200).json(response);
  }

  async getById(req, res) {
    const { id } = req.params;
    const response = await produtosService.getById(id);
    res.status(200).json(response);
  }

  async getByName(req, res) {
    const { nome } = req.params;
    const response = await produtosService.getByName(nome);
    res.status(200).json(response);
  }

  async create(req, res) {
    const produto = req.body;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "produto",
        action: "create",
      },
      "Inicio da criacao de produto",
    );
    const response = await produtosService.create(produto, req.user);
    res.status(201).json(response);
  }

  async update(req, res) {
    const { id } = req.params;
    const produto = req.body;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "produto",
        entityId: id,
        action: "update",
      },
      "Inicio da atualizacao de produto",
    );
    const response = await produtosService.update(id, produto, req.user);
    res.status(200).json(response);
  }

  async delete(req, res) {
    const { id } = req.params;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "produto",
        entityId: id,
        action: "delete",
      },
      "Inicio da exclusao de produto",
    );
    const response = await produtosService.delete(id, req.user);
    res.status(200).json(response);
  }
}

module.exports = new ProdutosController();
