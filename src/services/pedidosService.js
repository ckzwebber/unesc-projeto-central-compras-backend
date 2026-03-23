const PedidosModel = require("../models/pedidosModel");
const PedidoProdutoModel = require("../models/pedidoProdutoModel");
const ProdutosModel = require("../models/produtosModel");
const LojasModel = require("../models/lojasModel");
const CampanhasModel = require("../models/campanhaModel");
const CondicaoComercialModel = require("../models/condicaoComercialModel");
const EnderecosModel = require("../models/enderecosModel");
const CampanhaPromocional = require("../entities/campanhaPromocional");
const AppError = require("../errors/appError");
const DefaultResponseDto = require("../dtos/defaultResponse.dto");
const { v4: uuidv4 } = require("uuid");
const { createPedidoSchema, updatePedidoSchema, uuidSchema, statusSchema, dateSchema } = require("../validations/pedidoValidation");
const instrumentService = require("../lib/instrumentService");

class PedidosService {
  constructor() {
    this.pedidosModel = new PedidosModel();
    this.pedidoProdutoModel = new PedidoProdutoModel();
    this.produtosModel = new ProdutosModel();
    this.lojasModel = new LojasModel();
    this.campanhasModel = new CampanhasModel();
    this.condicaoComercialModel = new CondicaoComercialModel();
    this.enderecosModel = new EnderecosModel();
    instrumentService(this, "pedido");
  }

  async getAll() {
    const pedidos = await this.pedidosModel.select();

    if (!pedidos || pedidos.length === 0) {
      return new DefaultResponseDto(true, "Nenhum pedido encontrado", []);
    }

    const pedidosComItens = await Promise.all(
      pedidos.map(async (pedido) => {
        const itens = await this.pedidoProdutoModel.selectByPedidoId(pedido.id);
        return {
          ...pedido,
          itens: itens,
        };
      }),
    );

    return new DefaultResponseDto(true, "Pedidos encontrados com sucesso", pedidosComItens);
  }

  async getById(id) {
    const { error } = uuidSchema.validate(id);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const pedido = await this.pedidosModel.selectById(id);
    if (!pedido) {
      throw new AppError("Pedido não encontrado", 404);
    }

    const itens = await this.pedidoProdutoModel.selectByPedidoId(id);

    const pedidoCompleto = {
      ...pedido,
      itens: itens,
    };

    return new DefaultResponseDto(true, "Pedido encontrado com sucesso", pedidoCompleto);
  }

  async getByUsuarioId(usuario_id) {
    const { error } = uuidSchema.validate(usuario_id);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const pedidos = await this.pedidosModel.selectByUsuarioId(usuario_id);

    if (!pedidos || pedidos.length === 0) {
      return new DefaultResponseDto(true, "Nenhum pedido encontrado para este usuário", []);
    }

    const pedidosComItens = await Promise.all(
      pedidos.map(async (pedido) => {
        const itens = await this.pedidoProdutoModel.selectByPedidoId(pedido.id);
        return {
          ...pedido,
          itens: itens,
        };
      }),
    );

    return new DefaultResponseDto(true, "Pedidos encontrados com sucesso", pedidosComItens);
  }

  async getByStatus(status) {
    const { error } = statusSchema.validate(status);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const pedidos = await this.pedidosModel.selectByStatus(status);

    if (!pedidos || pedidos.length === 0) {
      return new DefaultResponseDto(true, `Nenhum pedido encontrado com status '${status}'`, []);
    }

    const pedidosComItens = await Promise.all(
      pedidos.map(async (pedido) => {
        const itens = await this.pedidoProdutoModel.selectByPedidoId(pedido.id);
        return {
          ...pedido,
          itens: itens,
        };
      }),
    );

    return new DefaultResponseDto(true, "Pedidos encontrados com sucesso", pedidosComItens);
  }

  async getByDate(date) {
    const { error } = dateSchema.validate(date);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const pedidos = await this.pedidosModel.selectByDate(date);

    if (!pedidos || pedidos.length === 0) {
      return new DefaultResponseDto(true, `Nenhum pedido encontrado para a data ${date}`, []);
    }

    const pedidosComItens = await Promise.all(
      pedidos.map(async (pedido) => {
        const itens = await this.pedidoProdutoModel.selectByPedidoId(pedido.id);
        return {
          ...pedido,
          itens: itens,
        };
      }),
    );

    return new DefaultResponseDto(true, "Pedidos encontrados com sucesso", pedidosComItens);
  }

  async create(data, requestUserId) {
    const loja = await this.lojasModel.selectByUsuarioId(requestUserId);
    if (!loja[0]) {
      throw new AppError("Loja não encontrada para o usuário logado", 404);
    }

    const pedidoData = {
      ...data,
      loja_id: loja[0].id,
      usuario_id: requestUserId,
    };

    const { error, value } = createPedidoSchema.validate(pedidoData, { stripUnknown: true });
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const produtosData = [];
    let valorOriginal = 0;
    let quantidadeTotal = 0;

    for (const item of value.produtos) {
      const produto = await this.produtosModel.selectById(item.produto_id);

      if (!produto) {
        throw new AppError(`Produto com ID ${item.produto_id} não encontrado`, 404);
      }

      if (produto.fornecedor_id !== value.fornecedor_id) {
        throw new AppError(`Todos os produtos do pedido devem ser do mesmo fornecedor`, 400);
      }

      if (produto.quantidade_estoque < item.quantidade) {
        throw new AppError(`Estoque insuficiente para o produto "${produto.nome}". Disponível: ${produto.quantidade_estoque}, Solicitado: ${item.quantidade}`, 409);
      }

      const valorItem = item.quantidade * item.valor_unitario;
      valorOriginal += valorItem;
      quantidadeTotal += item.quantidade;

      produtosData.push({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        produto: produto,
      });
    }

    const campanhasAtivas = await this.campanhasModel.selectByStatus("ativo");
    const campanhasFornecedor = campanhasAtivas.filter((c) => c.fornecedor_id === value.fornecedor_id);

    let campanhaAplicada = null;
    let maiorDesconto = 0;

    for (const campanhaRaw of campanhasFornecedor) {
      const campanha = new CampanhaPromocional(
        campanhaRaw.id,
        campanhaRaw.nome,
        campanhaRaw.descricao,
        parseFloat(campanhaRaw.valor_min),
        parseInt(campanhaRaw.quantidade_min),
        parseFloat(campanhaRaw.desconto_porcentagem),
        campanhaRaw.status,
        campanhaRaw.fornecedor_id,
        campanhaRaw.criado_em,
        campanhaRaw.atualizado_em,
        campanhaRaw.deletado_em,
      );

      if (campanha.podeAplicar(valorOriginal, quantidadeTotal)) {
        const desconto = (valorOriginal * campanha.desconto_porcentagem) / 100;
        if (desconto > maiorDesconto) {
          maiorDesconto = desconto;
          campanhaAplicada = campanha;
        }
      }
    }

    let valorComDesconto = valorOriginal;
    let descontoAplicado = 0;

    if (campanhaAplicada) {
      valorComDesconto = campanhaAplicada.calcularValorComDesconto(valorOriginal);
      descontoAplicado = valorOriginal - valorComDesconto;
    }

    const enderecoLoja = await this.enderecosModel.selectById(loja[0].endereco_id);
    let condicaoComercial = null;
    let cashbackCalculado = 0;
    let prazoExtendido = value.prazo_dias;

    if (enderecoLoja) {
      condicaoComercial = await this.condicaoComercialModel.selectByUfAndFornecedor(enderecoLoja.estado, value.fornecedor_id);

      if (condicaoComercial) {
        if (condicaoComercial.cashback_porcentagem) {
          cashbackCalculado = (valorComDesconto * parseFloat(condicaoComercial.cashback_porcentagem)) / 100;
        }
        if (condicaoComercial.prazo_extendido_dias) {
          prazoExtendido = value.prazo_dias + parseInt(condicaoComercial.prazo_extendido_dias);
        }
      }
    }

    const pedidoId = uuidv4();
    const novoPedido = {
      id: pedidoId,
      valor_total: valorComDesconto,
      descricao: value.descricao || null,
      usuario_id: requestUserId,
      loja_id: loja[0].id,
      fornecedor_id: value.fornecedor_id,
      status: value.status || "pendente",
      forma_pagamento: value.forma_pagamento,
      prazo_dias: prazoExtendido,
      criado_em: new Date(),
    };

    const pedidoCriado = await this.pedidosModel.create(novoPedido);

    const itensCriados = [];
    const now = new Date();

    for (const itemData of produtosData) {
      const itemId = uuidv4();
      const novoItem = {
        id: itemId,
        pedido_id: pedidoId,
        produto_id: itemData.produto_id,
        quantidade: itemData.quantidade,
        valor_unitario: itemData.valor_unitario,
        criado_em: now,
        atualizado_em: now,
      };

      const itemCriado = await this.pedidoProdutoModel.create(novoItem);
      itensCriados.push({
        ...itemCriado,
        produto_nome: itemData.produto.nome,
      });

      await this.produtosModel.updateEstoque(itemData.produto_id, -itemData.quantidade);
    }

    const pedidoCompleto = {
      ...pedidoCriado,
      itens: itensCriados,
      valor_original: valorOriginal,
      desconto_aplicado: descontoAplicado,
      campanha_aplicada: campanhaAplicada
        ? {
            id: campanhaAplicada.id,
            nome: campanhaAplicada.nome,
            desconto_porcentagem: campanhaAplicada.desconto_porcentagem,
          }
        : null,
      cashback: cashbackCalculado,
      condicao_comercial: condicaoComercial
        ? {
            uf: condicaoComercial.uf,
            cashback_porcentagem: condicaoComercial.cashback_porcentagem,
            prazo_extendido_dias: condicaoComercial.prazo_extendido_dias,
          }
        : null,
    };

    return new DefaultResponseDto(true, "Pedido criado com sucesso", pedidoCompleto);
  }

  async update(id, data, requestUserId) {
    const { error: uuidError } = uuidSchema.validate(id);
    if (uuidError) {
      throw new AppError(uuidError.details[0].message, 400);
    }

    const pedidoExists = await this.pedidosModel.selectById(id);
    if (!pedidoExists) {
      throw new AppError("Pedido não encontrado", 404);
    }

    if (requestUserId && pedidoExists.usuario_id !== requestUserId) {
      throw new AppError("Você não tem permissão para atualizar este pedido", 403);
    }

    if (pedidoExists.status !== "pendente") {
      throw new AppError(`Pedido com status '${pedidoExists.status}' não pode ser editado`, 409);
    }

    const { error, value } = updatePedidoSchema.validate(data, { stripUnknown: true });
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const updateData = { ...value };

    if (value.status && value.status !== pedidoExists.status) {
      if (value.status === "enviado") {
        updateData.enviado_em = new Date();
      } else if (value.status === "entregue") {
        updateData.entregue_em = new Date();
      }
    }

    const pedidoAtualizado = await this.pedidosModel.update(id, updateData);

    return new DefaultResponseDto(true, "Pedido atualizado com sucesso", pedidoAtualizado);
  }

  async updateStatus(id, status, fornecedorId) {
    const { error: idError } = uuidSchema.validate(id);
    if (idError) {
      throw new AppError(idError.details[0].message, 400);
    }

    const { error: statusError } = statusSchema.validate(status);
    if (statusError) {
      throw new AppError(statusError.details[0].message, 400);
    }

    const pedido = await this.pedidosModel.selectById(id);
    if (!pedido) {
      throw new AppError("Pedido não encontrado", 404);
    }

    if (pedido.fornecedor_id !== fornecedorId) {
      throw new AppError("Você não tem permissão para atualizar este pedido", 403);
    }

    if (pedido.status === "entregue" || pedido.status === "cancelado") {
      throw new AppError(`Pedido já está ${pedido.status} e não pode ser atualizado`, 409);
    }

    const validTransitions = {
      pendente: ["processando", "cancelado"],
      processando: ["enviado", "cancelado"],
      enviado: ["entregue"],
    };

    const allowedStatuses = validTransitions[pedido.status] || [];
    if (!allowedStatuses.includes(status)) {
      throw new AppError(`Transição de '${pedido.status}' para '${status}' não é permitida`, 400);
    }

    const updateData = { status };

    if (status === "enviado") {
      updateData.enviado_em = new Date();
    } else if (status === "entregue") {
      updateData.entregue_em = new Date();
    }

    const pedidoAtualizado = await this.pedidosModel.update(id, updateData);

    return new DefaultResponseDto(true, "Status do pedido atualizado com sucesso", pedidoAtualizado);
  }

  async delete(id, requestUserId) {
    const { error } = uuidSchema.validate(id);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const pedidoExists = await this.pedidosModel.selectById(id);
    if (!pedidoExists) {
      throw new AppError("Pedido não encontrado", 404);
    }

    if (requestUserId && pedidoExists.usuario_id !== requestUserId) {
      throw new AppError("Você não tem permissão para deletar este pedido", 403);
    }

    if (!["pendente", "cancelado"].includes(pedidoExists.status)) {
      throw new AppError(`Pedido com status '${pedidoExists.status}' não pode ser deletado`, 409);
    }

    await this.pedidoProdutoModel.deleteByPedidoId(id);

    await this.pedidosModel.delete(id);

    return new DefaultResponseDto(true, "Pedido deletado com sucesso", null);
  }

  async getByFornecedor(fornecedorId) {
    const { error } = uuidSchema.validate(fornecedorId);
    if (error) {
      throw new AppError("ID do fornecedor inválido", 400);
    }

    const pedidos = await this.pedidosModel.selectByFornecedor(fornecedorId);

    if (!pedidos || pedidos.length === 0) {
      return new DefaultResponseDto(true, "Nenhum pedido encontrado para este fornecedor", []);
    }

    const pedidosComItens = await Promise.all(
      pedidos.map(async (pedido) => {
        const itens = await this.pedidoProdutoModel.selectByPedidoId(pedido.id);
        return {
          ...pedido,
          itens: itens,
        };
      }),
    );

    return new DefaultResponseDto(true, "Pedidos recuperados com sucesso", pedidosComItens);
  }
}

module.exports = PedidosService;
