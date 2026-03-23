const { v4: uuidv4 } = require("uuid");
const FornecedoresModel = require("../models/fornecedoresModel");
const ProdutosService = require("./produtosService");
const PedidosService = require("./pedidosService");
const Fornecedor = require("../entities/fornecedor");
const AppError = require("../errors/appError");
const DefaultResponseDto = require("../dtos/defaultResponse.dto");
const { createFornecedorSchema, updateFornecedorSchema, uuidSchema, cnpjSchema } = require("../validations/fornecedorValidation");

class FornecedoresService {
  constructor() {
    this.fornecedoresModel = new FornecedoresModel();
    this.produtosService = new ProdutosService();
    this.pedidosService = new PedidosService();
  }

  async getAll() {
    const fornecedores = await this.fornecedoresModel.select();
    const data = fornecedores.map((fornecedorData) => {
      const fornecedor = new Fornecedor(
        fornecedorData.id,
        fornecedorData.cnpj,
        fornecedorData.razao_social,
        fornecedorData.nome_fantasia,
        fornecedorData.descricao,
        fornecedorData.usuario_id,
        fornecedorData.criado_em,
        fornecedorData.atualizado_em,
        fornecedorData.deletado_em
      );
      return fornecedor.toPublic();
    });
    return new DefaultResponseDto(true, "Fornecedores recuperados com sucesso", data);
  }

  async getById(id) {
    const { error: uuidError } = uuidSchema.validate(id);
    if (uuidError) {
      throw new AppError("ID do fornecedor inválido", 400);
    }

    const fornecedorData = await this.fornecedoresModel.selectById(id);
    if (!fornecedorData) {
      throw new AppError("Fornecedor não encontrado", 404);
    }

    const fornecedor = new Fornecedor(
      fornecedorData.id,
      fornecedorData.cnpj,
      fornecedorData.razao_social,
      fornecedorData.nome_fantasia,
      fornecedorData.descricao,
      fornecedorData.usuario_id,
      fornecedorData.criado_em,
      fornecedorData.atualizado_em,
      fornecedorData.deletado_em
    );

    return new DefaultResponseDto(true, "Fornecedor recuperado com sucesso", fornecedor.toPublic());
  }

  async getByUsuarioId(usuario_id) {
    const { error: uuidError } = uuidSchema.validate(usuario_id);
    if (uuidError) {
      throw new AppError("ID do usuário inválido", 400);
    }

    const fornecedores = await this.fornecedoresModel.selectByUsuarioId(usuario_id);
    return fornecedores.map((fornecedorData) => {
      const fornecedor = new Fornecedor(
        fornecedorData.id,
        fornecedorData.cnpj,
        fornecedorData.razao_social,
        fornecedorData.nome_fantasia,
        fornecedorData.descricao,
        fornecedorData.usuario_id,
        fornecedorData.criado_em,
        fornecedorData.atualizado_em,
        fornecedorData.deletado_em
      );
      return fornecedor.toPublic();
    });
  }

  async getByCnpj(cnpj) {
    const { error: cnpjError } = cnpjSchema.validate(cnpj);
    if (cnpjError) {
      throw new AppError("CNPJ inválido. Deve conter exatamente 14 dígitos", 400);
    }

    const fornecedorData = await this.fornecedoresModel.selectByCnpj(cnpj);
    if (!fornecedorData) {
      throw new AppError("Fornecedor não encontrado", 404);
    }

    const fornecedor = new Fornecedor(
      fornecedorData.id,
      fornecedorData.cnpj,
      fornecedorData.razao_social,
      fornecedorData.nome_fantasia,
      fornecedorData.descricao,
      fornecedorData.usuario_id,
      fornecedorData.criado_em,
      fornecedorData.atualizado_em,
      fornecedorData.deletado_em
    );

    return new DefaultResponseDto(true, "Fornecedor recuperado com sucesso", fornecedor.toPublic());
  }

  async create(data) {
    const { error, value } = createFornecedorSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      throw new AppError(`Erro de validação: ${errors.join(", ")}`, 400);
    }

    if (value.usuario_id) {
      const { default: UsuariosModel } = await import("../models/usuariosModel.js");
      const usuariosModel = new UsuariosModel();
      const usuarioExists = await usuariosModel.selectById(value.usuario_id);

      if (!usuarioExists) {
        throw new AppError("Usuário não encontrado. Use um usuário válido.", 404);
      }
    }

    const cnpjExists = await this.fornecedoresModel.selectByCnpj(value.cnpj);
    if (cnpjExists) {
      throw new AppError("Já existe um fornecedor cadastrado com este CNPJ", 409);
    }

    const fornecedor = new Fornecedor(uuidv4(), value.cnpj, value.razao_social || null, value.nome_fantasia || null, value.descricao || null, value.usuario_id || null, new Date(), new Date(), null);

    const fornecedorData = await this.fornecedoresModel.create(fornecedor);
    const fornecedorCreated = new Fornecedor(
      fornecedorData.id,
      fornecedorData.cnpj,
      fornecedorData.razao_social,
      fornecedorData.nome_fantasia,
      fornecedorData.descricao,
      fornecedorData.usuario_id,
      fornecedorData.criado_em,
      fornecedorData.atualizado_em,
      fornecedorData.deletado_em
    );

    return fornecedorCreated.toPublic();
  }

  async update(id, data, requestUserId, userFuncao) {
    const { error: uuidError } = uuidSchema.validate(id);
    if (uuidError) {
      throw new AppError("ID do fornecedor inválido", 400);
    }

    const fornecedorExists = await this.fornecedoresModel.selectById(id);
    if (!fornecedorExists) {
      throw new AppError("Fornecedor não encontrado", 404);
    }

    if (userFuncao !== "admin" && requestUserId && fornecedorExists.usuario_id !== requestUserId) {
      throw new AppError("Você não tem permissão para atualizar este fornecedor", 403);
    }

    const { error, value } = updateFornecedorSchema.validate(data, {
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

    if (value.cnpj && value.cnpj !== fornecedorExists.cnpj) {
      const cnpjExists = await this.fornecedoresModel.selectByCnpj(value.cnpj);
      if (cnpjExists && cnpjExists.id !== id) {
        throw new AppError("Já existe um fornecedor cadastrado com este CNPJ", 409);
      }
    }

    value.atualizado_em = new Date();

    const fornecedorData = await this.fornecedoresModel.update(id, value);
    if (!fornecedorData) {
      throw new AppError("Erro ao atualizar fornecedor", 500);
    }

    const fornecedorUpdated = new Fornecedor(
      fornecedorData.id,
      fornecedorData.cnpj,
      fornecedorData.razao_social,
      fornecedorData.nome_fantasia,
      fornecedorData.descricao,
      fornecedorData.usuario_id,
      fornecedorData.criado_em,
      fornecedorData.atualizado_em,
      fornecedorData.deletado_em
    );

    return new DefaultResponseDto(true, "Fornecedor atualizado com sucesso", fornecedorUpdated.toPublic());
  }

  async delete(id, requestUserId, userFuncao) {
    const { error: uuidError } = uuidSchema.validate(id);
    if (uuidError) {
      throw new AppError("ID do fornecedor inválido", 400);
    }

    const fornecedorExists = await this.fornecedoresModel.selectById(id);
    if (!fornecedorExists) {
      throw new AppError("Fornecedor não encontrado", 404);
    }

    if (userFuncao !== "admin" && requestUserId && fornecedorExists.usuario_id !== requestUserId) {
      throw new AppError("Você não tem permissão para deletar este fornecedor", 403);
    }

    const deleted = await this.fornecedoresModel.delete(id);
    if (!deleted) {
      throw new AppError("Erro ao deletar fornecedor", 500);
    }
    return new DefaultResponseDto(true, "Fornecedor deletado com sucesso", null);
  }

  async exists(id) {
    const { error } = uuidSchema.validate(id);
    if (error) return false;

    const fornecedor = await this.fornecedoresModel.selectById(id);
    return !!fornecedor;
  }

  async getMyProfile(requestUserId) {
    const fornecedores = await this.getByUsuarioId(requestUserId);
    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    return new DefaultResponseDto(true, "Perfil recuperado com sucesso", fornecedores[0]);
  }

  async updateMyProfile(requestUserId, data) {
    const fornecedores = await this.getByUsuarioId(requestUserId);
    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    const fornecedorId = fornecedores[0].id;
    const fornecedor = await this.update(fornecedorId, data, requestUserId);
    return new DefaultResponseDto(true, "Perfil atualizado com sucesso", fornecedor);
  }

  async getMyProducts(requestUserId) {
    const fornecedores = await this.getByUsuarioId(requestUserId);
    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    const fornecedorId = fornecedores[0].id;
    return await this.produtosService.getByFornecedor(fornecedorId);
  }

  async createMyProduct(requestUserId, data) {
    const fornecedores = await this.getByUsuarioId(requestUserId);
    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    const fornecedorId = fornecedores[0].id;
    const produtoData = { ...data, fornecedor_id: fornecedorId };
    return await this.produtosService.create(produtoData);
  }

  async updateMyProduct(requestUserId, id, data) {
    const fornecedores = await this.getByUsuarioId(requestUserId);
    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    const fornecedorId = fornecedores[0].id;

    const produto = await this.produtosService.getById(id);
    if (produto.data.fornecedor_id !== fornecedorId) {
      throw new AppError("Você não tem permissão para editar este produto", 403);
    }

    return await this.produtosService.update(id, data);
  }

  async deleteMyProduct(requestUserId, id) {
    const fornecedores = await this.getByUsuarioId(requestUserId);
    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    const fornecedorId = fornecedores[0].id;

    const produto = await this.produtosService.getById(id);
    if (produto.data.fornecedor_id !== fornecedorId) {
      throw new AppError("Você não tem permissão para deletar este produto", 403);
    }

    return await this.produtosService.delete(id);
  }

  async getMyOrders(requestUserId) {
    const fornecedores = await this.getByUsuarioId(requestUserId);
    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    const fornecedorId = fornecedores[0].id;
    return await this.pedidosService.getByFornecedor(fornecedorId);
  }

  async getMyOrderById(requestUserId, id) {
    const fornecedores = await this.getByUsuarioId(requestUserId);
    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    const fornecedorId = fornecedores[0].id;

    const pedido = await this.pedidosService.getById(id);
    if (pedido.data.fornecedor_id !== fornecedorId) {
      throw new AppError("Você não tem permissão para visualizar este pedido", 403);
    }

    return pedido;
  }

  async updateMyOrderStatus(requestUserId, id, status) {
    const fornecedores = await this.getByUsuarioId(requestUserId);
    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    const fornecedorId = fornecedores[0].id;

    return await this.pedidosService.updateStatus(id, status, fornecedorId);
  }

  async getMyStatistics(requestUserId) {
    const fornecedores = await this.getByUsuarioId(requestUserId);
    if (!fornecedores || fornecedores.length === 0) {
      throw new AppError("Fornecedor não encontrado para este usuário", 404);
    }
    const fornecedorId = fornecedores[0].id;

    const produtosResult = await this.produtosService.getByFornecedor(fornecedorId);
    const totalProducts = produtosResult.data.length;

    const pedidosResult = await this.pedidosService.getByFornecedor(fornecedorId);
    const pedidos = pedidosResult.data;
    const totalOrders = pedidos.length;
    const pendingOrders = pedidos.filter((p) => p.status === "pendente").length;

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = pedidos
      .filter((p) => {
        const createdAt = new Date(p.criado_em);
        return createdAt >= firstDayOfMonth && ["entregue", "enviado"].includes(p.status);
      })
      .reduce((sum, p) => sum + parseFloat(p.valor_total), 0);

    const statistics = {
      totalProducts,
      totalOrders,
      pendingOrders,
      monthlyRevenue,
    };

    return new DefaultResponseDto(true, "Estatísticas recuperadas com sucesso", statistics);
  }
}

module.exports = FornecedoresService;
