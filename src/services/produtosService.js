const ProdutosModel = require("../models/produtosModel");
const FornecedoresModel = require("../models/fornecedoresModel");
const DefaultResponseDto = require("../dtos/defaultResponse.dto");
const AppError = require("../errors/appError");
const { createProdutoSchema, updateProdutoSchema, uuidSchema, nomeSchema } = require("../validations/produtoValidation");
const instrumentService = require("../lib/instrumentService");

const { v4: uuidv4 } = require("uuid");

class ProdutosService {
  constructor() {
    this.produtosModel = new ProdutosModel();
    this.fornecedoresModel = new FornecedoresModel();
    instrumentService(this, "produto");
  }

  async getFornecedorIdByUsuarioId(usuarioId) {
    const fornecedores = await this.fornecedoresModel.selectByUsuarioId(usuarioId);

    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }

    return fornecedores[0].id;
  }

  async resolveFornecedorIdForMutation(user, fornecedorIdFromPayload) {
    if (!user) {
      throw new AppError("Usuário não autenticado", 401);
    }

    const userRole = user.funcao;

    if (userRole === "admin") {
      if (!fornecedorIdFromPayload) {
        throw new AppError("fornecedor_id é obrigatório para usuários admin", 400);
      }

      return fornecedorIdFromPayload;
    }

    if (userRole !== "fornecedor") {
      throw new AppError("Apenas administradores e fornecedores podem modificar produtos", 403);
    }

    const fornecedorId = await this.getFornecedorIdByUsuarioId(user.id);

    if (fornecedorIdFromPayload && fornecedorIdFromPayload !== fornecedorId) {
      throw new AppError("Você não tem permissão para usar este fornecedor_id", 403);
    }

    return fornecedorId;
  }

  async getAll() {
    const produtos = await this.produtosModel.select();
    if (!produtos || produtos.length === 0) {
      return new DefaultResponseDto(true, "Nenhum produto encontrado", []);
    }

    return new DefaultResponseDto(true, "Produtos encontrados com sucesso", produtos);
  }

  async getById(id) {
    const { error } = uuidSchema.validate(id);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const produto = await this.produtosModel.selectById(id);
    if (!produto) {
      throw new AppError("Produto não encontrado", 404);
    }

    return new DefaultResponseDto(true, "Produto encontrado com sucesso", produto);
  }

  async getByName(nome) {
    const { error } = nomeSchema.validate(nome);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const produto = await this.produtosModel.selectByName(nome);

    if (!produto) {
      throw new AppError("Produto não encontrado", 404);
    }

    return new DefaultResponseDto(true, "Produto encontrado com sucesso", produto);
  }

  async create(produtoData, user) {
    const { error, value } = createProdutoSchema.validate(produtoData, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message).join("; ");
      throw new AppError(errorMessages, 400);
    }

    const existingProduto = await this.produtosModel.selectByName(value.nome);

    if (existingProduto) {
      throw new AppError("Já existe um produto com este nome", 409);
    }

    const fornecedorId = await this.resolveFornecedorIdForMutation(user, value.fornecedor_id);

    const newProduto = {
      id: uuidv4(),
      ...value,
      fornecedor_id: fornecedorId,
      criado_em: new Date(),
      atualizado_em: new Date(),
    };

    const createdProduto = await this.produtosModel.create(newProduto);

    return new DefaultResponseDto(true, "Produto criado com sucesso", createdProduto);
  }

  async update(id, updateData, user) {
    const idValidation = uuidSchema.validate(id);
    if (idValidation.error) {
      throw new AppError(idValidation.error.details[0].message, 400);
    }

    const produtoAtual = await this.produtosModel.selectById(id);
    if (!produtoAtual) {
      throw new AppError("Produto não encontrado", 404);
    }

    const userRole = user?.funcao;
    if (!userRole) {
      throw new AppError("Usuário não autenticado", 401);
    }

    if (userRole !== "admin") {
      if (userRole !== "fornecedor") {
        throw new AppError("Apenas administradores e fornecedores podem modificar produtos", 403);
      }

      const fornecedorId = await this.getFornecedorIdByUsuarioId(user.id);
      if (produtoAtual.fornecedor_id !== fornecedorId) {
        throw new AppError("Você não tem permissão para atualizar este produto", 403);
      }
    }

    const { error, value } = updateProdutoSchema.validate(updateData, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message).join("; ");
      throw new AppError(errorMessages, 400);
    }

    if (value.nome) {
      const existingProduto = await this.produtosModel.selectByName(value.nome);
      if (existingProduto && existingProduto.id !== id) {
        throw new AppError("Já existe um produto com este nome", 409);
      }
    }

    const produtoToUpdate = {
      ...value,
      atualizado_em: new Date(),
    };

    if (userRole !== "admin") {
      delete produtoToUpdate.fornecedor_id;
    }

    const updatedProduto = await this.produtosModel.update(id, produtoToUpdate);

    if (!updatedProduto) {
      throw new AppError("Produto não encontrado", 404);
    }

    return new DefaultResponseDto(true, "Produto atualizado com sucesso", updatedProduto);
  }

  async delete(id, user) {
    const { error } = uuidSchema.validate(id);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const produtoAtual = await this.produtosModel.selectById(id);
    if (!produtoAtual) {
      throw new AppError("Produto não encontrado", 404);
    }

    const userRole = user?.funcao;
    if (!userRole) {
      throw new AppError("Usuário não autenticado", 401);
    }

    if (userRole !== "admin") {
      if (userRole !== "fornecedor") {
        throw new AppError("Apenas administradores e fornecedores podem remover produtos", 403);
      }

      const fornecedorId = await this.getFornecedorIdByUsuarioId(user.id);
      if (produtoAtual.fornecedor_id !== fornecedorId) {
        throw new AppError("Você não tem permissão para deletar este produto", 403);
      }
    }

    const produtoIsDeleted = await this.produtosModel.delete(id);

    if (!produtoIsDeleted) {
      throw new AppError("Produto não encontrado", 404);
    }

    return new DefaultResponseDto(true, "Produto deletado com sucesso", null);
  }

  async getByFornecedor(fornecedorId) {
    const { error } = uuidSchema.validate(fornecedorId);
    if (error) {
      throw new AppError("ID do fornecedor inválido", 400);
    }

    const produtos = await this.produtosModel.selectByFornecedor(fornecedorId);
    return new DefaultResponseDto(true, "Produtos recuperados com sucesso", produtos);
  }
}

module.exports = ProdutosService;
