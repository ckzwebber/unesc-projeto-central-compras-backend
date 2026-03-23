const database = require("../../db/database");
const logger = require("../lib/logger");

class CampanhasModel {
  constructor() {
    this.tableName = "campanhaspromocionais";
  }

  async select() {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} WHERE deletado_em IS NULL ORDER BY criado_em DESC`,
        values: [],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "campanha" }, "Erro ao buscar campanhas:");
      throw error;
    }
  }

  async selectByFornecedor(fornecedor_id) {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} WHERE fornecedor_id = $1 AND deletado_em IS NULL ORDER BY criado_em DESC`,
        values: [fornecedor_id],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "campanha" }, "Erro ao buscar campanhas do fornecedor:");
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
      logger.error({ err: error, entity: "campanha" }, "Erro ao buscar campanha por ID:");
      throw error;
    }
  }

  async selectByNome(nome) {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} WHERE nome = $1 AND deletado_em IS NULL`,
        values: [nome],
      };
      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "campanha" }, "Erro ao buscar campanha por nome:");
      throw error;
    }
  }

  async selectByStatus(status) {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} WHERE status = $1 AND deletado_em IS NULL ORDER BY criado_em DESC`,
        values: [status],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "campanha" }, "Erro ao buscar campanhas por status:");
      throw error;
    }
  }

  async create(campanha) {
    try {
      const query = {
        text: `INSERT INTO ${this.tableName} (id, nome, descricao, valor_min, quantidade_min, desconto_porcentagem, status, fornecedor_id, criado_em, atualizado_em) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
               RETURNING *`,
        values: [
          campanha.id,
          campanha.nome,
          campanha.descricao,
          campanha.valor_min,
          campanha.quantidade_min,
          campanha.desconto_porcentagem,
          campanha.status,
          campanha.fornecedor_id,
          campanha.criado_em,
          campanha.atualizado_em,
        ],
      };
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, entity: "campanha" }, "Erro ao criar campanha:");
      throw error;
    }
  }

  async update(id, campanha) {
    try {
      const fields = Object.keys(campanha);
      const setClause = fields.map((field, index) => `"${field}" = $${index + 2}`).join(", ");
      const values = [id, ...Object.values(campanha)];

      const query = {
        text: `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1 AND deletado_em IS NULL RETURNING *`,
        values: values,
      };

      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "campanha" }, "Erro ao atualizar campanha:");
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
      logger.error({ err: error, entity: "campanha" }, "Erro ao deletar campanha:");
      throw error;
    }
  }
}

module.exports = CampanhasModel;
