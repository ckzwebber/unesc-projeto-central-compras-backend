const CampanhasModel = require("../models/campanhaModel");
const DefaultResponseDto = require("../dtos/defaultResponse.dto");
const AppError = require("../errors/appError");
const { v4: uuidv4 } = require("uuid");
const { createCampanhaSchema, updateCampanhaSchema, uuidSchema, statusSchema } = require("../validations/campanhaValidation");

class CampanhasService {
  constructor() {
    this.campanhasModel = new CampanhasModel();
  }

  async getAll() {
    const campanhas = await this.campanhasModel.select();
    if (!campanhas || campanhas.length === 0) {
      return new DefaultResponseDto(true, "Nenhuma campanha encontrada", []);
    }

    return new DefaultResponseDto(true, "Campanhas encontradas com sucesso", campanhas);
  }

  async getByFornecedor(fornecedor_id) {
    const campanhas = await this.campanhasModel.selectByFornecedor(fornecedor_id);
    if (!campanhas || campanhas.length === 0) {
      return new DefaultResponseDto(true, "Nenhuma campanha encontrada", []);
    }

    return new DefaultResponseDto(true, "Campanhas encontradas com sucesso", campanhas);
  }

  async getById(id, fornecedor_id = null) {
    const { error } = uuidSchema.validate(id);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const campanha = await this.campanhasModel.selectById(id);
    if (!campanha) {
      throw new AppError("Campanha não encontrada", 404);
    }

    if (fornecedor_id && campanha.fornecedor_id !== fornecedor_id) {
      throw new AppError("Você não tem permissão para acessar esta campanha", 403);
    }

    return new DefaultResponseDto(true, "Campanha encontrada com sucesso", campanha);
  }

  async getByStatus(status) {
    const { error } = statusSchema.validate(status);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const campanhas = await this.campanhasModel.selectByStatus(status);
    if (!campanhas || campanhas.length === 0) {
      return new DefaultResponseDto(true, `Nenhuma campanha encontrada com status '${status}'`, []);
    }

    return new DefaultResponseDto(true, "Campanhas encontradas com sucesso", campanhas);
  }

  async create(data, fornecedor_id) {
    const { error, value } = createCampanhaSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const campanhaExists = await this.campanhasModel.selectByNome(value.nome);
    if (campanhaExists) {
      throw new AppError("Já existe uma campanha com este nome", 409);
    }

    const newCampanha = {
      id: uuidv4(),
      ...value,
      status: value.status || "ativo",
      fornecedor_id,
      criado_em: new Date(),
      atualizado_em: new Date(),
    };

    const createdCampanha = await this.campanhasModel.create(newCampanha);

    return new DefaultResponseDto(true, "Campanha criada com sucesso", createdCampanha);
  }

  async update(id, data, fornecedor_id) {
    const { error: uuidError } = uuidSchema.validate(id);
    if (uuidError) {
      throw new AppError(uuidError.details[0].message, 400);
    }

    const campanhaExists = await this.campanhasModel.selectById(id);
    if (!campanhaExists) {
      throw new AppError("Campanha não encontrada", 404);
    }

    if (campanhaExists.fornecedor_id !== fornecedor_id) {
      throw new AppError("Você não tem permissão para atualizar esta campanha", 403);
    }

    const { error, value } = updateCampanhaSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    if (value.nome && value.nome !== campanhaExists.nome) {
      const nomeExists = await this.campanhasModel.selectByNome(value.nome);
      if (nomeExists) {
        throw new AppError("Já existe uma campanha com este nome", 409);
      }
    }

    const updateData = {
      ...value,
      atualizado_em: new Date(),
    };

    const updatedCampanha = await this.campanhasModel.update(id, updateData);

    return new DefaultResponseDto(true, "Campanha atualizada com sucesso", updatedCampanha);
  }

  async delete(id, fornecedor_id) {
    const { error } = uuidSchema.validate(id);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const campanhaExists = await this.campanhasModel.selectById(id);
    if (!campanhaExists) {
      throw new AppError("Campanha não encontrada", 404);
    }

    if (campanhaExists.fornecedor_id !== fornecedor_id) {
      throw new AppError("Você não tem permissão para deletar esta campanha", 403);
    }

    await this.campanhasModel.delete(id);

    return new DefaultResponseDto(true, "Campanha deletada com sucesso", null);
  }
}

module.exports = CampanhasService;
