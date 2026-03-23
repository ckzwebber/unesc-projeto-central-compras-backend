const database = require("../../db/database");
const logger = require("../lib/logger");

class PedidoProdutoModel {
  constructor() {
    this.tableName = "pedidoproduto";
  }

  async selectByPedidoId(pedido_id) {
    try {
      const query = {
        text: `
          SELECT pp.*, p.nome as produto_nome, p.categoria as produto_categoria
          FROM ${this.tableName} pp
          INNER JOIN produtos p ON pp.produto_id = p.id
          WHERE pp.pedido_id = $1 AND pp.deletado_em IS NULL
          ORDER BY pp.criado_em ASC
        `,
        values: [pedido_id],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "pedidoProduto" }, "Erro ao buscar itens do pedido:");
      throw error;
    }
  }

  async selectById(id) {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} WHERE id = $1 AND deletado_em IS NULL`,
        values: [id],
      };
      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "pedidoProduto" }, "Erro ao buscar item por ID:");
      throw error;
    }
  }

  async create(item) {
    try {
      const query = {
        text: `
          INSERT INTO ${this.tableName} 
          (id, pedido_id, produto_id, quantidade, valor_unitario, criado_em, atualizado_em) 
          VALUES ($1, $2, $3, $4, $5, $6, $7) 
          RETURNING *
        `,
        values: [item.id, item.pedido_id, item.produto_id, item.quantidade, item.valor_unitario, item.criado_em, item.atualizado_em],
      };
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, entity: "pedidoProduto" }, "Erro ao criar item do pedido:");
      throw error;
    }
  }

  async createMany(items) {
    try {
      if (!items || items.length === 0) {
        return [];
      }

      const values = [];
      const placeholders = items
        .map((item, index) => {
          const offset = index * 7;
          values.push(item.id, item.pedido_id, item.produto_id, item.quantidade, item.valor_unitario, item.criado_em, item.atualizado_em);
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
        })
        .join(", ");

      const query = {
        text: `
          INSERT INTO ${this.tableName} 
          (id, pedido_id, produto_id, quantidade, valor_unitario, criado_em, atualizado_em) 
          VALUES ${placeholders}
          RETURNING *
        `,
        values: values,
      };

      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "pedidoProduto" }, "Erro ao criar itens do pedido em lote:");
      throw error;
    }
  }

  async update(id, data) {
    try {
      const fields = Object.keys(data);
      const setClause = fields.map((field, index) => `"${field}" = $${index + 2}`).join(", ");
      const values = [id, ...Object.values(data)];

      const query = {
        text: `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1 AND deletado_em IS NULL RETURNING *`,
        values: values,
      };

      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "pedidoProduto" }, "Erro ao atualizar item do pedido:");
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
      logger.error({ err: error, entity: "pedidoProduto" }, "Erro ao deletar item do pedido:");
      throw error;
    }
  }

  async deleteByPedidoId(pedido_id) {
    try {
      const query = {
        text: `UPDATE ${this.tableName} SET deletado_em = NOW() WHERE pedido_id = $1 AND deletado_em IS NULL`,
        values: [pedido_id],
      };
      const result = await database.query(query);
      return result.rowCount > 0;
    } catch (error) {
      logger.error({ err: error, entity: "pedidoProduto" }, "Erro ao deletar itens do pedido:");
      throw error;
    }
  }
}

module.exports = PedidoProdutoModel;
