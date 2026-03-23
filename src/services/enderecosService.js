const EnderecosModel = require("../models/enderecosModel");
const DefaultResponseDto = require("../dtos/defaultResponse.dto");
const AppError = require("../errors/appError");
const { createEnderecoSchema, updateEnderecoSchema, uuidSchema, cepSchema } = require("../validations/enderecoValidation");
const instrumentService = require("../lib/instrumentService");

const { v4: uuidv4 } = require("uuid");

class EnderecosService {
  constructor() {
    this.enderecosModel = new EnderecosModel();
    instrumentService(this, "endereco");
  }

  async getAll() {
    const enderecos = await this.enderecosModel.select();
    if (!enderecos || enderecos.length === 0) {
      return new DefaultResponseDto(true, "Nenhum endereço encontrado", []);
    }

    return new DefaultResponseDto(true, "Endereços encontrados com sucesso", enderecos);
  }

  async getById(id) {
    const { error } = uuidSchema.validate(id);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const endereco = await this.enderecosModel.selectById(id);
    if (!endereco) {
      throw new AppError("Endereço não encontrado", 404);
    }

    return new DefaultResponseDto(true, "Endereço encontrado com sucesso", endereco);
  }

  async getByCep(cep) {
    const { error } = cepSchema.validate(cep);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    cep = cep.replace("-", "");

    const enderecos = await this.enderecosModel.selectByCep(cep);

    if (!enderecos || enderecos.length === 0) {
      return new DefaultResponseDto(true, "Nenhum endereço encontrado com este CEP", []);
    }

    return new DefaultResponseDto(true, "Endereços encontrados com sucesso", enderecos);
  }

  async getByCidadeEstado(cidade, estado) {
    if (!cidade || !estado) {
      throw new AppError("Cidade e estado são obrigatórios", 400);
    }

    if (estado.length !== 2) {
      throw new AppError("Estado deve ser uma sigla de 2 caracteres", 400);
    }

    const enderecos = await this.enderecosModel.selectByCidadeEstado(cidade, estado);

    if (!enderecos || enderecos.length === 0) {
      return new DefaultResponseDto(true, `Nenhum endereço encontrado em ${cidade}/${estado}`, []);
    }

    return new DefaultResponseDto(true, "Endereços encontrados com sucesso", enderecos);
  }

  async create(enderecoData) {
    const { error, value } = createEnderecoSchema.validate(enderecoData, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message).join("; ");
      throw new AppError(errorMessages, 400);
    }

    if (value.estado) {
      value.estado = value.estado.toUpperCase();
    }

    value.cep = value.cep.replace("-", "");

    const novoEndereco = {
      id: uuidv4(),
      ...value,
      criado_em: new Date(),
      atualizado_em: new Date(),
    };

    const endereçoCriado = await this.enderecosModel.create(novoEndereco);

    return new DefaultResponseDto(true, "Endereço criado com sucesso", endereçoCriado);
  }

  async update(id, updateData) {
    const idValidation = uuidSchema.validate(id);
    if (idValidation.error) {
      throw new AppError(idValidation.error.details[0].message, 400);
    }

    const { error, value } = updateEnderecoSchema.validate(updateData, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message).join("; ");
      throw new AppError(errorMessages, 400);
    }

    if (value.estado) {
      value.estado = value.estado.toUpperCase();
    }

    const enderecoToUpdate = {
      ...value,
      atualizado_em: new Date(),
    };

    const enderecoAtualizado = await this.enderecosModel.update(id, enderecoToUpdate);

    if (!enderecoAtualizado) {
      throw new AppError("Endereço não encontrado", 404);
    }

    return new DefaultResponseDto(true, "Endereço atualizado com sucesso", enderecoAtualizado);
  }

  async delete(id) {
    const { error } = uuidSchema.validate(id);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const enderecoIsDeleted = await this.enderecosModel.delete(id);

    if (!enderecoIsDeleted) {
      throw new AppError("Endereço não encontrado", 404);
    }

    return new DefaultResponseDto(true, "Endereço deletado com sucesso", null);
  }

  async exists(id) {
    const { error } = uuidSchema.validate(id);
    if (error) {
      return false;
    }

    return await this.enderecosModel.exists(id);
  }
}

module.exports = EnderecosService;
