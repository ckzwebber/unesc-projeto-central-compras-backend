const database = require("../../db/database");
const logger = require("../lib/logger");

class LojasModel {
  constructor() {
    this.tableName = "lojas";
  }

  async select() {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} WHERE deletado_em IS NULL ORDER BY nome ASC`,
        values: [],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "loja" }, "Erro ao buscar lojas:");
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
      logger.error({ err: error, entity: "loja" }, "Erro ao buscar loja por ID:");
      throw error;
    }
  }

  async selectByCnpj(cnpj) {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} WHERE cnpj = $1 AND deletado_em IS NULL`,
        values: [cnpj],
      };
      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "loja" }, "Erro ao buscar loja por CNPJ:");
      throw error;
    }
  }

  async selectByUsuarioId(usuario_id) {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} 
               WHERE usuario_id = $1 
               AND deletado_em IS NULL 
               ORDER BY nome ASC`,
        values: [usuario_id],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "loja" }, "Erro ao buscar lojas por usuário:");
      throw error;
    }
  }

  async create(loja) {
    try {
      const query = {
        text: `INSERT INTO ${this.tableName} 
               (id, nome, cnpj, usuario_id, endereco_id, criado_em, atualizado_em) 
               VALUES ($1, $2, $3, $4, $5, $6, $7) 
               RETURNING *`,
        values: [loja.id, loja.nome, loja.cnpj, loja.usuario_id, loja.endereco_id || null, loja.criado_em, loja.atualizado_em],
      };
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, entity: "loja" }, "Erro ao criar loja:");
      throw error;
    }
  }

  async update(id, loja) {
    try {
      const fields = Object.keys(loja);
      const setClause = fields.map((field, index) => `"${field}" = $${index + 2}`).join(", ");
      const values = [id, ...Object.values(loja)];

      const query = {
        text: `UPDATE ${this.tableName} 
               SET ${setClause} 
               WHERE id = $1 AND deletado_em IS NULL 
               RETURNING *`,
        values: values,
      };

      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "loja" }, "Erro ao atualizar loja:");
      throw error;
    }
  }

  async delete(id) {
    try {
      const query = {
        text: `UPDATE ${this.tableName} 
               SET deletado_em = NOW() 
               WHERE id = $1 AND deletado_em IS NULL`,
        values: [id],
      };
      const result = await database.query(query);
      return result.rowCount > 0;
    } catch (error) {
      logger.error({ err: error, entity: "loja" }, "Erro ao deletar loja:");
      throw error;
    }
  }
}

module.exports = LojasModel;
