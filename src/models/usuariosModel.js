const database = require("../../db/database");
const logger = require("../lib/logger");

class UsuariosModel {
  constructor() {
    this.tableName = "usuarios";
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
      logger.error({ err: error, entity: "usuario" }, "Erro ao buscar usuários:");
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
      logger.error({ err: error, entity: "usuario" }, "Erro ao buscar usuário por ID:");
      throw error;
    }
  }

  async selectByEmail(email) {
    try {
      const query = {
        text: `SELECT * FROM ${this.tableName} WHERE email = $1 AND deletado_em IS NULL`,
        values: [email],
      };
      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "usuario" }, "Erro ao buscar usuário por email:");
      throw error;
    }
  }

  async create(usuario) {
    try {
      const query = {
        text: `INSERT INTO ${this.tableName} (id, nome, sobrenome, senha, email, telefone, funcao, endereco_id, criado_em, atualizado_em, email_verificado) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
               RETURNING *`,
        values: [
          usuario.id,
          usuario.nome,
          usuario.sobrenome,
          usuario.senha,
          usuario.email,
          usuario.telefone,
          usuario.funcao,
          usuario.endereco_id || null,
          usuario.criado_em,
          usuario.atualizado_em,
          usuario.email_verificado,
        ],
      };
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, entity: "usuario" }, "Erro ao criar usuário:");
      throw error;
    }
  }

  async update(id, usuario) {
    try {
      const fields = Object.keys(usuario);
      const setClause = fields.map((field, index) => `"${field}" = $${index + 2}`).join(", ");
      const values = [id, ...Object.values(usuario)];

      const query = {
        text: `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1 AND deletado_em IS NULL RETURNING *`,
        values: values,
      };

      const result = await database.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error({ err: error, entity: "usuario" }, "Erro ao atualizar usuário:");
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
      logger.error({ err: error, entity: "usuario" }, "Erro ao deletar usuário:");
      throw error;
    }
  }
}

module.exports = UsuariosModel;
