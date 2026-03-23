const database = require("../../db/database");
const logger = require("../lib/logger");

class FornecedoresModel {
  constructor() {
    this.tableName = "fornecedores";
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
      logger.error({ err: error, entity: "fornecedor" }, "Erro ao buscar fornecedores:");
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
      logger.error({ err: error, entity: "fornecedor" }, "Erro ao buscar fornecedor por ID:");
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
      logger.error({ err: error, entity: "fornecedor" }, "Erro ao buscar fornecedor por CNPJ:");
      throw error;
    }
  }

  async selectByUsuarioId(usuario_id) {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} 
               WHERE usuario_id = $1 
               AND deletado_em IS NULL 
               ORDER BY criado_em DESC`,
        values: [usuario_id],
      };
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error, entity: "fornecedor" }, "Erro ao buscar fornecedores por usuário:");
      throw error;
    }
  }

  async create(fornecedor) {
    try {
      const query = {
        text: `INSERT INTO ${this.tableName} (id, cnpj, razao_social, nome_fantasia, descricao, usuario_id, criado_em, atualizado_em) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
               RETURNING *`,
        values: [
          fornecedor.id,
          fornecedor.cnpj,
          fornecedor.razao_social || null,
          fornecedor.nome_fantasia || null,
          fornecedor.descricao || null,
          fornecedor.usuario_id || null,
          fornecedor.criado_em,
          fornecedor.atualizado_em,
        ],
      };
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, entity: "fornecedor" }, "Erro ao criar fornecedor:");
      throw error;
    }
  }

  async update(id, fornecedor) {
    try {
      const fields = Object.keys(fornecedor);
      const setClause = fields.map((field, index) => `"${field}" = $${index + 2}`).join(", ");
      const values = [id, ...Object.values(fornecedor)];

      const query = {
        text: `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1 AND deletado_em IS NULL RETURNING *`,
        values: values,
      };

      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "fornecedor" }, "Erro ao atualizar fornecedor:");
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
      logger.error({ err: error, entity: "fornecedor" }, "Erro ao deletar fornecedor:");
      throw error;
    }
  }
}

module.exports = FornecedoresModel;
