const CondicaoComercialModel = require("../models/condicaoComercialModel");
const DefaultResponseDto = require("../dtos/defaultResponse.dto");
const AppError = require("../errors/appError");
const { v4: uuidv4 } = require("uuid");
const { createCondicaoComercialSchema, updateCondicaoComercialSchema } = require("../validations/condicaoComercialValidation");

class CondicaoComercialService {
  constructor() {
    this.condicaoComercialModel = new CondicaoComercialModel();
  }

  async getByFornecedor(fornecedor_id) {
    const condicoes = await this.condicaoComercialModel.selectByFornecedor(fornecedor_id);
    if (!condicoes || condicoes.length === 0) {
      return new DefaultResponseDto(true, "Nenhuma condição comercial encontrada", []);
    }

    return new DefaultResponseDto(true, "Condições comerciais encontradas com sucesso", condicoes);
  }

  async getById(id, fornecedor_id) {
    const condicao = await this.condicaoComercialModel.selectById(id);
    if (!condicao) {
      throw new AppError("Condição comercial não encontrada", 404);
    }

    if (condicao.fornecedor_id !== fornecedor_id) {
      throw new AppError("Você não tem permissão para acessar esta condição comercial", 403);
    }

    return new DefaultResponseDto(true, "Condição comercial encontrada com sucesso", condicao);
  }

  async create(data, fornecedor_id) {
    const { error, value } = createCondicaoComercialSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const condicaoExists = await this.condicaoComercialModel.selectByUfAndFornecedor(value.uf, fornecedor_id);
    if (condicaoExists) {
      throw new AppError("Já existe uma condição comercial para este estado", 409);
    }

    const newCondicao = {
      id: uuidv4(),
      ...value,
      fornecedor_id,
      criado_em: new Date(),
      atualizado_em: new Date(),
    };

    const condicaoCriada = await this.condicaoComercialModel.create(newCondicao);

    return new DefaultResponseDto(true, "Condição comercial criada com sucesso", condicaoCriada);
  }

  async update(id, data, fornecedor_id) {
    const { error, value } = updateCondicaoComercialSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const condicaoExistente = await this.condicaoComercialModel.selectById(id);
    if (!condicaoExistente) {
      throw new AppError("Condição comercial não encontrada", 404);
    }

    if (condicaoExistente.fornecedor_id !== fornecedor_id) {
      throw new AppError("Você não tem permissão para atualizar esta condição comercial", 403);
    }

    const condicaoAtualizada = await this.condicaoComercialModel.update(id, value);
    if (!condicaoAtualizada) {
      throw new AppError("Erro ao atualizar condição comercial", 500);
    }

    return new DefaultResponseDto(true, "Condição comercial atualizada com sucesso", condicaoAtualizada);
  }

  async delete(id, fornecedor_id) {
    const condicaoExistente = await this.condicaoComercialModel.selectById(id);
    if (!condicaoExistente) {
      throw new AppError("Condição comercial não encontrada", 404);
    }

    if (condicaoExistente.fornecedor_id !== fornecedor_id) {
      throw new AppError("Você não tem permissão para deletar esta condição comercial", 403);
    }

    const condicaoDeletada = await this.condicaoComercialModel.softDelete(id);
    if (!condicaoDeletada) {
      throw new AppError("Erro ao deletar condição comercial", 500);
    }

    return new DefaultResponseDto(true, "Condição comercial deletada com sucesso", null);
  }
}

module.exports = CondicaoComercialService;
