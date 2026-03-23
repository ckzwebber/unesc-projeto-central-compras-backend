const EnderecosService = require("../services/enderecosService");
const logger = require("../lib/logger");
const enderecosService = new EnderecosService();

class EnderecosController {
  async getAll(req, res) {
    const response = await enderecosService.getAll();
    res.status(200).json(response);
  }

  async getById(req, res) {
    const { id } = req.params;
    const response = await enderecosService.getById(id);
    res.status(200).json(response);
  }

  async getByCep(req, res) {
    const { cep } = req.params;
    const response = await enderecosService.getByCep(cep);
    res.status(200).json(response);
  }

  async getByCidadeEstado(req, res) {
    const { cidade, estado } = req.params;
    const response = await enderecosService.getByCidadeEstado(cidade, estado);
    res.status(200).json(response);
  }

  async create(req, res) {
    const endereco = req.body;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "endereco",
        action: "create",
      },
      "Inicio da criacao de endereco",
    );
    const response = await enderecosService.create(endereco);
    res.status(201).json(response);
  }

  async update(req, res) {
    const { id } = req.params;
    const endereco = req.body;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "endereco",
        entityId: id,
        action: "update",
      },
      "Inicio da atualizacao de endereco",
    );
    const response = await enderecosService.update(id, endereco);
    res.status(200).json(response);
  }

  async delete(req, res) {
    const { id } = req.params;
    logger.info(
      {
        userId: req.user?.id,
        role: req.user?.funcao,
        entity: "endereco",
        entityId: id,
        action: "delete",
      },
      "Inicio da exclusao de endereco",
    );
    const response = await enderecosService.delete(id);
    res.status(200).json(response);
  }
}

module.exports = new EnderecosController();
