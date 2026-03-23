const CondicaoComercialService = require("../services/condicaoComercialService");
const FornecedoresModel = require("../models/fornecedoresModel");
const AppError = require("../errors/appError");

class CondicaoComercialController {
  constructor() {
    this.condicaoComercialService = new CondicaoComercialService();
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
    const fornecedor_id = await this.getFornecedorIdByUsuarioId(req.user.id);
    const response = await this.condicaoComercialService.getByFornecedor(fornecedor_id);
    res.status(200).json(response);
  }

  async getById(req, res) {
    const { id } = req.params;
    const fornecedor_id = await this.getFornecedorIdByUsuarioId(req.user.id);
    const response = await this.condicaoComercialService.getById(id, fornecedor_id);
    res.status(200).json(response);
  }

  async create(req, res) {
    const fornecedor_id = await this.getFornecedorIdByUsuarioId(req.user.id);
    const response = await this.condicaoComercialService.create(req.body, fornecedor_id);
    res.status(201).json(response);
  }

  async update(req, res) {
    const { id } = req.params;
    const fornecedor_id = await this.getFornecedorIdByUsuarioId(req.user.id);
    const response = await this.condicaoComercialService.update(id, req.body, fornecedor_id);
    res.status(200).json(response);
  }

  async delete(req, res) {
    const { id } = req.params;
    const fornecedor_id = await this.getFornecedorIdByUsuarioId(req.user.id);
    const response = await this.condicaoComercialService.delete(id, fornecedor_id);
    res.status(200).json(response);
  }
}

module.exports = new CondicaoComercialController();
