const database = require("../../db/database");
const logger = require("../lib/logger");

class PedidosModel {
  constructor() {
    this.tableName = "pedidos";
  }

  async select() {
    try {
      const query = {
        text: `
          SELECT 
            p.*,
            json_build_object(
              'id', l.id,
              'nome', l.nome,
              'cnpj', l.cnpj,
              'usuario_id', l.usuario_id,
              'endereco_id', l.endereco_id
            ) as loja,
            COALESCE(f.nome_fantasia, f.razao_social) as fornecedor_nome
          FROM ${this.tableName} p
          LEFT JOIN lojas l ON p.loja_id = l.id
          LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
          WHERE p.deletado_em IS NULL 
          ORDER BY p.criado_em DESC
        `,
        values: [],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "pedido" }, "Erro ao buscar pedidos:");
      throw error;
    }
  }

  async selectById(id) {
    try {
      const query = {
        text: `
          SELECT 
            p.*,
            json_build_object(
              'id', l.id,
              'nome', l.nome,
              'cnpj', l.cnpj,
              'usuario_id', l.usuario_id,
              'endereco_id', l.endereco_id
            ) as loja
          FROM ${this.tableName} p
          LEFT JOIN lojas l ON p.loja_id = l.id
          WHERE p.id = $1 AND p.deletado_em IS NULL
        `,
        values: [id],
      };
      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "pedido" }, "Erro ao buscar pedido por ID:");
      throw error;
    }
  }

  async selectByUsuarioId(usuario_id) {
    try {
      const query = {
        text: `
          SELECT 
            p.*,
            json_build_object(
              'id', l.id,
              'nome', l.nome,
              'cnpj', l.cnpj,
              'usuario_id', l.usuario_id,
              'endereco_id', l.endereco_id
            ) as loja
          FROM ${this.tableName} p
          LEFT JOIN lojas l ON p.loja_id = l.id
          WHERE p.usuario_id = $1 AND p.deletado_em IS NULL 
          ORDER BY p.criado_em DESC
        `,
        values: [usuario_id],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "pedido" }, "Erro ao buscar pedidos por usuário:");
      throw error;
    }
  }

  async selectByLojaId(loja_id) {
    try {
      const query = {
        text: `
          SELECT 
            p.*,
            json_build_object(
              'id', l.id,
              'nome', l.nome,
              'cnpj', l.cnpj,
              'usuario_id', l.usuario_id,
              'endereco_id', l.endereco_id
            ) as loja
          FROM ${this.tableName} p
          LEFT JOIN lojas l ON p.loja_id = l.id
          WHERE p.loja_id = $1 AND p.deletado_em IS NULL 
          ORDER BY p.criado_em DESC
        `,
        values: [loja_id],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "pedido" }, "Erro ao buscar pedidos por loja:");
      throw error;
    }
  }

  async selectByStatus(status) {
    try {
      const query = {
        text: `
          SELECT 
            p.*,
            json_build_object(
              'id', l.id,
              'nome', l.nome,
              'cnpj', l.cnpj,
              'usuario_id', l.usuario_id,
              'endereco_id', l.endereco_id
            ) as loja
          FROM ${this.tableName} p
          LEFT JOIN lojas l ON p.loja_id = l.id
          WHERE p.status = $1 AND p.deletado_em IS NULL 
          ORDER BY p.criado_em DESC
        `,
        values: [status],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "pedido" }, "Erro ao buscar pedidos por status:");
      throw error;
    }
  }

  async selectByDate(date) {
    try {
      const query = {
        text: `
          SELECT 
            p.*,
            json_build_object(
              'id', l.id,
              'nome', l.nome,
              'cnpj', l.cnpj,
              'usuario_id', l.usuario_id,
              'endereco_id', l.endereco_id
            ) as loja
          FROM ${this.tableName} p
          LEFT JOIN lojas l ON p.loja_id = l.id
          WHERE DATE(p.criado_em) = $1 AND p.deletado_em IS NULL 
          ORDER BY p.criado_em DESC
        `,
        values: [date],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "pedido" }, "Erro ao buscar pedidos por data:");
      throw error;
    }
  }

  async create(pedido) {
    try {
      const query = {
        text: `INSERT INTO ${this.tableName} (id, valor_total, descricao, usuario_id, loja_id, status, forma_pagamento, prazo_dias, criado_em, fornecedor_id) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
               RETURNING *`,
        values: [pedido.id, pedido.valor_total, pedido.descricao, pedido.usuario_id, pedido.loja_id, pedido.status, pedido.forma_pagamento, pedido.prazo_dias, pedido.criado_em, pedido.fornecedor_id],
      };
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, entity: "pedido" }, "Erro ao criar pedido:");
      throw error;
    }
  }

  async update(id, pedido) {
    try {
      const fields = Object.keys(pedido);
      const setClause = fields.map((field, index) => `"${field}" = $${index + 2}`).join(", ");
      const values = [id, ...Object.values(pedido)];

      const query = {
        text: `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1 AND deletado_em IS NULL RETURNING *`,
        values: values,
      };

      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "pedido" }, "Erro ao atualizar pedido:");
      throw error;
    }
  }

  async delete(id) {
    try {
      const query = {
        text: `UPDATE ${this.tableName} SET deletado_em = NOW() WHERE id = $1 AND deletado_em IS NULL`,
        values: [id],
      };
      const result = await database.query(query);
      return result.rowCount > 0;
    } catch (error) {
      logger.error({ err: error, entity: "pedido" }, "Erro ao deletar pedido:");
      throw error;
    }
  }

  async selectByFornecedor(fornecedorId) {
    try {
      const query = {
        text: `
          SELECT 
            p.*,
            json_build_object(
              'id', l.id,
              'nome', l.nome,
              'cnpj', l.cnpj
            ) as loja
          FROM ${this.tableName} p
          LEFT JOIN lojas l ON p.loja_id = l.id
          WHERE p.fornecedor_id = $1 AND p.deletado_em IS NULL 
          ORDER BY p.criado_em DESC
        `,
        values: [fornecedorId],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "pedido" }, "Erro ao buscar pedidos por fornecedor:");
      throw error;
    }
  }
}

module.exports = PedidosModel;
