const { v4: uuidv4 } = require("uuid");
const LojasModel = require("../models/lojasModel");
const Loja = require("../entities/loja");
const AppError = require("../errors/appError");
const DefaultResponseDto = require("../dtos/defaultResponse.dto");
const { createLojaSchema, updateLojaSchema, uuidSchema, cnpjSchema } = require("../validations/lojaValidation");

class LojasService {
  constructor() {
    this.lojasModel = new LojasModel();
  }

  async getAll() {
    const lojas = await this.lojasModel.select();
    const data = lojas.map((lojaData) => {
      const loja = new Loja(lojaData.id, lojaData.nome, lojaData.cnpj, lojaData.usuario_id, lojaData.endereco_id, lojaData.criado_em, lojaData.atualizado_em, lojaData.deletado_em);
      return loja.toPublic();
    });
    return new DefaultResponseDto(true, "Lojas recuperadas com sucesso", data);
  }

  async getById(id) {
    const { error: uuidError } = uuidSchema.validate(id);
    if (uuidError) {
      throw new AppError("ID da loja inválido", 400);
    }

    const lojaData = await this.lojasModel.selectById(id);
    if (!lojaData) {
      throw new AppError("Loja não encontrada", 404);
    }

    const loja = new Loja(lojaData.id, lojaData.nome, lojaData.cnpj, lojaData.usuario_id, lojaData.endereco_id, lojaData.criado_em, lojaData.atualizado_em, lojaData.deletado_em);
    return new DefaultResponseDto(true, "Loja recuperada com sucesso", loja.toPublic());
  }

  async getByUsuarioId(usuario_id) {
    const { error: uuidError } = uuidSchema.validate(usuario_id);
    if (uuidError) {
      throw new AppError("ID do usuário inválido", 400);
    }

    const lojas = await this.lojasModel.selectByUsuarioId(usuario_id);
    const data = lojas.map((lojaData) => {
      const loja = new Loja(lojaData.id, lojaData.nome, lojaData.cnpj, lojaData.usuario_id, lojaData.endereco_id, lojaData.criado_em, lojaData.atualizado_em, lojaData.deletado_em);
      return loja.toPublic();
    });
    return new DefaultResponseDto(true, "Lojas do usuário recuperadas com sucesso", data);
  }

  async create(data) {
    const { error, value } = createLojaSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      throw new AppError(`Erro de validação: ${errors.join(", ")}`, 400);
    }

    const { default: UsuariosModel } = await import("../models/usuariosModel.js");
    const usuariosModel = new UsuariosModel();
    const usuarioExists = await usuariosModel.selectById(value.usuario_id);

    if (!usuarioExists) {
      throw new AppError("Usuário não encontrado. Use um usuário válido.", 404);
    }

    if (value.endereco_id) {
      const { default: EnderecosModel } = await import("../models/enderecosModel.js");
      const enderecosModel = new EnderecosModel();
      const enderecoExists = await enderecosModel.selectById(value.endereco_id);

      if (!enderecoExists) {
        throw new AppError("Endereço não encontrado. Crie ou use um endereço válido.", 404);
      }
    }

    const cnpjExists = await this.lojasModel.selectByCnpj(value.cnpj);
    if (cnpjExists) {
      throw new AppError("Já existe uma loja cadastrada com este CNPJ", 409);
    }

    const loja = new Loja(uuidv4(), value.nome, value.cnpj, value.usuario_id, value.endereco_id || null, new Date(), new Date(), null);

    const lojaData = await this.lojasModel.create(loja);
    const lojaCreated = new Loja(lojaData.id, lojaData.nome, lojaData.cnpj, lojaData.usuario_id, lojaData.endereco_id, lojaData.criado_em, lojaData.atualizado_em, lojaData.deletado_em);

    return new DefaultResponseDto(true, "Loja criada com sucesso", lojaCreated.toPublic());
  }

  async update(id, data, requestUserId, userFuncao) {
    const { error: uuidError } = uuidSchema.validate(id);
    if (uuidError) {
      throw new AppError("ID da loja inválido", 400);
    }

    const lojaExists = await this.lojasModel.selectById(id);
    if (!lojaExists) {
      throw new AppError("Loja não encontrada", 404);
    }

    if (userFuncao !== "admin" && requestUserId && lojaExists.usuario_id !== requestUserId) {
      throw new AppError("Você não tem permissão para atualizar esta loja", 403);
    }

    const { error, value } = updateLojaSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      throw new AppError(`Erro de validação: ${errors.join(", ")}`, 400);
    }

    if (Object.keys(value).length === 0) {
      throw new AppError("Nenhum campo para atualizar foi fornecido", 400);
    }

    if (value.usuario_id) {
      const { default: UsuariosModel } = await import("../models/usuariosModel.js");
      const usuariosModel = new UsuariosModel();
      const usuarioExists = await usuariosModel.selectById(value.usuario_id);

      if (!usuarioExists) {
        throw new AppError("Usuário não encontrado. Use um usuário válido.", 404);
      }
    }

    if (value.endereco_id) {
      const { default: EnderecosModel } = await import("../models/enderecosModel.js");
      const enderecosModel = new EnderecosModel();
      const enderecoExists = await enderecosModel.selectById(value.endereco_id);

      if (!enderecoExists) {
        throw new AppError("Endereço não encontrado. Use um endereço válido.", 404);
      }
    }

    if (value.cnpj && value.cnpj !== lojaExists.cnpj) {
      const cnpjExists = await this.lojasModel.selectByCnpj(value.cnpj);
      if (cnpjExists && cnpjExists.id !== id) {
        throw new AppError("Já existe uma loja cadastrada com este CNPJ", 409);
      }
    }

    value.atualizado_em = new Date();

    const lojaData = await this.lojasModel.update(id, value);
    if (!lojaData) {
      throw new AppError("Erro ao atualizar loja", 500);
    }

    const lojaUpdated = new Loja(lojaData.id, lojaData.nome, lojaData.cnpj, lojaData.usuario_id, lojaData.endereco_id, lojaData.criado_em, lojaData.atualizado_em, lojaData.deletado_em);

    return new DefaultResponseDto(true, "Loja atualizada com sucesso", lojaUpdated.toPublic());
  }

  async delete(id, requestUserId, userFuncao) {
    const { error: uuidError } = uuidSchema.validate(id);
    if (uuidError) {
      throw new AppError("ID da loja inválido", 400);
    }

    const lojaExists = await this.lojasModel.selectById(id);
    if (!lojaExists) {
      throw new AppError("Loja não encontrada", 404);
    }

    if (userFuncao !== "admin" && requestUserId && lojaExists.usuario_id !== requestUserId) {
      throw new AppError("Você não tem permissão para deletar esta loja", 403);
    }

    const deleted = await this.lojasModel.delete(id);
    if (!deleted) {
      throw new AppError("Erro ao deletar loja", 500);
    }
    return new DefaultResponseDto(true, "Loja deletada com sucesso", null);
  }

  async exists(id) {
    const { error } = uuidSchema.validate(id);
    if (error) return false;

    const loja = await this.lojasModel.selectById(id);
    return !!loja;
  }
}

module.exports = LojasService;
