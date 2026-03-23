const database = require("../../db/database");
const logger = require("../lib/logger");

class CondicaoComercialModel {
  constructor() {
    this.tableName = "condicoescomerciais";
  }

  async selectByFornecedor(fornecedor_id) {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} WHERE fornecedor_id = $1 AND deletado_em IS NULL ORDER BY uf ASC`,
        values: [fornecedor_id],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "condicaoComercial" }, "Erro ao buscar condições comerciais:");
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
      logger.error({ err: error, entity: "condicaoComercial" }, "Erro ao buscar condição comercial por ID:");
      throw error;
    }
  }

  async selectByUfAndFornecedor(uf, fornecedor_id) {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} WHERE uf = $1 AND fornecedor_id = $2 AND deletado_em IS NULL`,
        values: [uf, fornecedor_id],
      };
      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "condicaoComercial" }, "Erro ao buscar condição comercial por UF:");
      throw error;
    }
  }

  async create(condicao) {
    try {
      const query = {
        text: `INSERT INTO ${this.tableName} (id, uf, cashback_porcentagem, prazo_extendido_dias, variacao_unitario, fornecedor_id, criado_em, atualizado_em) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
               RETURNING *`,
        values: [condicao.id, condicao.uf, condicao.cashback_porcentagem, condicao.prazo_extendido_dias, condicao.variacao_unitario, condicao.fornecedor_id, condicao.criado_em, condicao.atualizado_em],
      };
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, entity: "condicaoComercial" }, "Erro ao criar condição comercial:");
      throw error;
    }
  }

  async update(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updates.cashback_porcentagem !== undefined) {
        fields.push(`cashback_porcentagem = $${paramCount++}`);
        values.push(updates.cashback_porcentagem);
      }
      if (updates.prazo_extendido_dias !== undefined) {
        fields.push(`prazo_extendido_dias = $${paramCount++}`);
        values.push(updates.prazo_extendido_dias);
      }
      if (updates.variacao_unitario !== undefined) {
        fields.push(`variacao_unitario = $${paramCount++}`);
        values.push(updates.variacao_unitario);
      }

      fields.push(`atualizado_em = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = {
        text: `UPDATE ${this.tableName} 
               SET ${fields.join(", ")} 
               WHERE id = $${paramCount} AND deletado_em IS NULL 
               RETURNING *`,
        values,
      };

      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, entity: "condicaoComercial" }, "Erro ao atualizar condição comercial:");
      throw error;
    }
  }

  async softDelete(id) {
    try {
      const query = {
        text: `UPDATE ${this.tableName} 
               SET deletado_em = CURRENT_TIMESTAMP 
               WHERE id = $1 AND deletado_em IS NULL 
               RETURNING *`,
        values: [id],
      };
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, entity: "condicaoComercial" }, "Erro ao deletar condição comercial:");
      throw error;
    }
  }
}

module.exports = CondicaoComercialModel;
