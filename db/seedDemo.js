const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const logger = require("../src/lib/logger");
const database = require("./database");

dotenv.config();

const now = () => new Date();

const DEMO_PASSWORD = process.env.DEMO_DEFAULT_PASSWORD || "demo1234";
const SALT_ROUNDS = 12;
const shouldResetBeforeSeed = process.argv.includes("--reset") || String(process.env.SEED_RESET_BEFORE || "false").toLowerCase() === "true";

const normalizeCep = (cep) =>
  String(cep || "")
    .replace(/\D/g, "")
    .slice(0, 8);

const demoUsers = {
  admin: {
    email: "admin@demo.com",
    nome: "Admin",
    sobrenome: "Demo",
    telefone: "+5511999990001",
    funcao: "admin",
  },
  supplier: {
    email: "fornecedor@demo.com",
    nome: "Fornecedor",
    sobrenome: "Demo",
    telefone: "+5511999990002",
    funcao: "fornecedor",
  },
  store: {
    email: "usuario@demo.com",
    nome: "Usuario",
    sobrenome: "Demo",
    telefone: "+5511999990003",
    funcao: "loja",
  },
};

async function resetDatabase() {
  await database.query({
    text: `
      TRUNCATE TABLE
        pedidoproduto,
        pedidos,
        campanhaspromocionais,
        condicoescomerciais,
        produtos,
        lojas,
        fornecedores,
        usuarios,
        enderecos
      RESTART IDENTITY CASCADE
    `,
  });
}

async function findEnderecoByCepNumero(cep, numero) {
  const normalizedCep = normalizeCep(cep);

  const result = await database.query({
    text: "SELECT * FROM enderecos WHERE cep = $1 AND numero = $2 AND deletado_em IS NULL LIMIT 1",
    values: [normalizedCep, numero],
  });

  return result.rows[0] || null;
}

async function upsertEndereco(payload) {
  const normalizedCep = normalizeCep(payload.cep);
  const existing = await findEnderecoByCepNumero(normalizedCep, payload.numero);

  if (existing) {
    const updated = await database.query({
      text: `
        UPDATE enderecos
        SET estado = $2,
            cidade = $3,
            bairro = $4,
            rua = $5,
            complemento = $6,
            atualizado_em = $7
        WHERE id = $1
        RETURNING *
      `,
      values: [existing.id, payload.estado, payload.cidade, payload.bairro, payload.rua, payload.complemento || null, now()],
    });

    return updated.rows[0];
  }

  const id = uuidv4();
  const created = await database.query({
    text: `
      INSERT INTO enderecos (id, estado, cidade, bairro, rua, numero, complemento, cep, criado_em, atualizado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    values: [id, payload.estado, payload.cidade, payload.bairro, payload.rua, payload.numero, payload.complemento || null, normalizedCep, now(), now()],
  });

  return created.rows[0];
}

async function findUsuarioByEmail(email) {
  const result = await database.query({
    text: "SELECT * FROM usuarios WHERE email = $1 LIMIT 1",
    values: [email],
  });

  return result.rows[0] || null;
}

async function upsertUsuario(userPayload, enderecoId, passwordHash) {
  const existing = await findUsuarioByEmail(userPayload.email);

  if (existing) {
    const updated = await database.query({
      text: `
        UPDATE usuarios
        SET nome = $2,
            sobrenome = $3,
            senha = $4,
            telefone = $5,
            funcao = $6,
            endereco_id = $7,
            email_verificado = true,
            atualizado_em = $8,
            deletado_em = NULL
        WHERE id = $1
        RETURNING *
      `,
      values: [existing.id, userPayload.nome, userPayload.sobrenome, passwordHash, userPayload.telefone, userPayload.funcao, enderecoId, now()],
    });

    return updated.rows[0];
  }

  const id = uuidv4();
  const created = await database.query({
    text: `
      INSERT INTO usuarios (id, nome, sobrenome, senha, email, telefone, funcao, endereco_id, criado_em, atualizado_em, email_verificado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *
    `,
    values: [id, userPayload.nome, userPayload.sobrenome, passwordHash, userPayload.email, userPayload.telefone, userPayload.funcao, enderecoId, now(), now()],
  });

  return created.rows[0];
}

async function upsertFornecedor(usuarioId) {
  const existing = await database.query({
    text: "SELECT * FROM fornecedores WHERE usuario_id = $1 LIMIT 1",
    values: [usuarioId],
  });

  if (existing.rows[0]) {
    const updated = await database.query({
      text: `
        UPDATE fornecedores
        SET cnpj = $2,
            razao_social = $3,
            nome_fantasia = $4,
            descricao = $5,
            atualizado_em = $6,
            deletado_em = NULL
        WHERE id = $1
        RETURNING *
      `,
      values: [existing.rows[0].id, "11222333000181", "Fornecedor Demo LTDA", "Fornecedor Demo", "Fornecedor de demonstração para ambiente acadêmico", now()],
    });

    return updated.rows[0];
  }

  const created = await database.query({
    text: `
      INSERT INTO fornecedores (id, cnpj, razao_social, nome_fantasia, descricao, usuario_id, criado_em, atualizado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    values: [uuidv4(), "11222333000181", "Fornecedor Demo LTDA", "Fornecedor Demo", "Fornecedor de demonstração para ambiente acadêmico", usuarioId, now(), now()],
  });

  return created.rows[0];
}

async function upsertLoja(usuarioId, enderecoId) {
  const existing = await database.query({
    text: "SELECT * FROM lojas WHERE usuario_id = $1 LIMIT 1",
    values: [usuarioId],
  });

  if (existing.rows[0]) {
    const updated = await database.query({
      text: `
        UPDATE lojas
        SET nome = $2,
            cnpj = $3,
            endereco_id = $4,
            atualizado_em = $5,
            deletado_em = NULL
        WHERE id = $1
        RETURNING *
      `,
      values: [existing.rows[0].id, "Loja Demo Centro", "55444333000199", enderecoId, now()],
    });

    return updated.rows[0];
  }

  const created = await database.query({
    text: `
      INSERT INTO lojas (id, nome, cnpj, usuario_id, endereco_id, criado_em, atualizado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    values: [uuidv4(), "Loja Demo Centro", "55444333000199", usuarioId, enderecoId, now(), now()],
  });

  return created.rows[0];
}

async function upsertProduto(fornecedorId, payload) {
  const existing = await database.query({
    text: "SELECT * FROM produtos WHERE fornecedor_id = $1 AND LOWER(nome) = LOWER($2) LIMIT 1",
    values: [fornecedorId, payload.nome],
  });

  if (existing.rows[0]) {
    const updated = await database.query({
      text: `
        UPDATE produtos
        SET descricao = $2,
            valor_unitario = $3,
            quantidade_estoque = $4,
            categoria = $5,
            imagem_url = $6,
            atualizado_em = $7,
            deletado_em = NULL
        WHERE id = $1
        RETURNING *
      `,
      values: [existing.rows[0].id, payload.descricao, payload.valor_unitario, payload.quantidade_estoque, payload.categoria, payload.imagem_url, now()],
    });

    return updated.rows[0];
  }

  const created = await database.query({
    text: `
      INSERT INTO produtos (id, nome, descricao, valor_unitario, quantidade_estoque, fornecedor_id, categoria, imagem_url, criado_em, atualizado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    values: [uuidv4(), payload.nome, payload.descricao, payload.valor_unitario, payload.quantidade_estoque, fornecedorId, payload.categoria, payload.imagem_url, now(), now()],
  });

  return created.rows[0];
}

async function upsertCampanha(fornecedorId, payload) {
  const campanhaPayload = {
    ...payload,
    valor_min: payload.valor_min ?? 0,
    quantidade_min: payload.quantidade_min ?? 1,
  };

  const existing = await database.query({
    text: "SELECT * FROM campanhaspromocionais WHERE fornecedor_id = $1 AND LOWER(nome) = LOWER($2) LIMIT 1",
    values: [fornecedorId, campanhaPayload.nome],
  });

  if (existing.rows[0]) {
    const updated = await database.query({
      text: `
        UPDATE campanhaspromocionais
        SET descricao = $2,
            valor_min = $3,
            quantidade_min = $4,
            desconto_porcentagem = $5,
            status = $6,
            atualizado_em = $7,
            deletado_em = NULL
        WHERE id = $1
        RETURNING *
      `,
      values: [existing.rows[0].id, campanhaPayload.descricao, campanhaPayload.valor_min, campanhaPayload.quantidade_min, campanhaPayload.desconto_porcentagem, campanhaPayload.status, now()],
    });

    return updated.rows[0];
  }

  const created = await database.query({
    text: `
      INSERT INTO campanhaspromocionais (
        id,
        nome,
        descricao,
        valor_min,
        quantidade_min,
        desconto_porcentagem,
        status,
        fornecedor_id,
        criado_em,
        atualizado_em
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    values: [
      uuidv4(),
      campanhaPayload.nome,
      campanhaPayload.descricao,
      campanhaPayload.valor_min,
      campanhaPayload.quantidade_min,
      campanhaPayload.desconto_porcentagem,
      campanhaPayload.status,
      fornecedorId,
      now(),
      now(),
    ],
  });

  return created.rows[0];
}

async function upsertCondicaoComercial(fornecedorId, payload) {
  const existing = await database.query({
    text: "SELECT * FROM condicoescomerciais WHERE fornecedor_id = $1 AND uf = $2 LIMIT 1",
    values: [fornecedorId, payload.uf],
  });

  if (existing.rows[0]) {
    const updated = await database.query({
      text: `
        UPDATE condicoescomerciais
        SET cashback_porcentagem = $2,
            prazo_extendido_dias = $3,
            variacao_unitario = $4,
            atualizado_em = $5,
            deletado_em = NULL
        WHERE id = $1
        RETURNING *
      `,
      values: [existing.rows[0].id, payload.cashback_porcentagem, payload.prazo_extendido_dias, payload.variacao_unitario, now()],
    });

    return updated.rows[0];
  }

  const created = await database.query({
    text: `
      INSERT INTO condicoescomerciais (
        id,
        uf,
        cashback_porcentagem,
        prazo_extendido_dias,
        variacao_unitario,
        fornecedor_id,
        criado_em,
        atualizado_em
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    values: [uuidv4(), payload.uf, payload.cashback_porcentagem, payload.prazo_extendido_dias, payload.variacao_unitario, fornecedorId, now(), now()],
  });

  return created.rows[0];
}

async function upsertPedidoDemo(usuarioId, lojaId, fornecedorId, produtos) {
  const existingPedido = await database.query({
    text: "SELECT * FROM pedidos WHERE usuario_id = $1 AND loja_id = $2 AND descricao = $3 LIMIT 1",
    values: [usuarioId, lojaId, "Pedido demo inicial"],
  });

  const valorTotal = produtos.reduce((acc, item) => acc + item.valor_unitario * item.quantidade, 0);

  let pedidoId;

  if (existingPedido.rows[0]) {
    pedidoId = existingPedido.rows[0].id;

    await database.query({
      text: `
        UPDATE pedidos
        SET valor_total = $2,
            status = $3,
            forma_pagamento = $4,
            prazo_dias = $5,
            fornecedor_id = $6,
            deletado_em = NULL
        WHERE id = $1
      `,
      values: [pedidoId, valorTotal, "entregue", "pix", 7, fornecedorId],
    });

    await database.query({
      text: "UPDATE pedidoproduto SET deletado_em = NOW() WHERE pedido_id = $1 AND deletado_em IS NULL",
      values: [pedidoId],
    });
  } else {
    pedidoId = uuidv4();

    await database.query({
      text: `
        INSERT INTO pedidos (id, valor_total, descricao, usuario_id, loja_id, status, forma_pagamento, prazo_dias, criado_em, fornecedor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      values: [pedidoId, valorTotal, "Pedido demo inicial", usuarioId, lojaId, "entregue", "pix", 7, now(), fornecedorId],
    });
  }

  for (const item of produtos) {
    await database.query({
      text: `
        INSERT INTO pedidoproduto (id, pedido_id, produto_id, quantidade, valor_unitario, criado_em, atualizado_em)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      values: [uuidv4(), pedidoId, item.id, item.quantidade, item.valor_unitario, now(), now()],
    });
  }
}

async function seedDemo() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET precisa estar definido para manter ambiente consistente");
  }

  if (shouldResetBeforeSeed) {
    await resetDatabase();
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  const enderecoAdmin = await upsertEndereco({
    estado: "SC",
    cidade: "Criciuma",
    bairro: "Centro",
    rua: "Rua da Demo",
    numero: "101",
    complemento: "Sala A",
    cep: "88800-000",
  });

  const enderecoSupplier = await upsertEndereco({
    estado: "SC",
    cidade: "Criciuma",
    bairro: "Próspera",
    rua: "Avenida Fornecedor",
    numero: "220",
    complemento: "Galpão 3",
    cep: "88801-100",
  });

  const enderecoStore = await upsertEndereco({
    estado: "SC",
    cidade: "Criciuma",
    bairro: "Santa Barbara",
    rua: "Rua Compras",
    numero: "55",
    complemento: "Loja 2",
    cep: "88802-200",
  });

  const adminUser = await upsertUsuario(demoUsers.admin, enderecoAdmin.id, passwordHash);
  const supplierUser = await upsertUsuario(demoUsers.supplier, enderecoSupplier.id, passwordHash);
  const storeUser = await upsertUsuario(demoUsers.store, enderecoStore.id, passwordHash);

  const fornecedor = await upsertFornecedor(supplierUser.id);
  const loja = await upsertLoja(storeUser.id, enderecoStore.id);

  await upsertCondicaoComercial(fornecedor.id, {
    uf: "SC",
    cashback_porcentagem: 2.5,
    prazo_extendido_dias: 10,
    variacao_unitario: -1.5,
  });

  await upsertCondicaoComercial(fornecedor.id, {
    uf: "PR",
    cashback_porcentagem: 1.75,
    prazo_extendido_dias: 7,
    variacao_unitario: 0,
  });

  await upsertCampanha(fornecedor.id, {
    nome: "Workstation Build Week",
    descricao: "Volume discount for stores purchasing components for workstation kits.",
    valor_min: 5000,
    quantidade_min: 1,
    desconto_porcentagem: 12,
    status: "ativo",
  });

  await upsertCampanha(fornecedor.id, {
    nome: "Embedded Lab Starter",
    descricao: "Special deal for educational institutions buying microcontrollers and dev boards.",
    valor_min: 0,
    quantidade_min: 40,
    desconto_porcentagem: 9,
    status: "ativo",
  });

  const produtos = [];
  produtos.push(
    await upsertProduto(fornecedor.id, {
      nome: "NVIDIA RTX 4070 Super 12GB",
      descricao: "High-performance graphics card for CAD, rendering, and AI workloads.",
      valor_unitario: 4399.9,
      quantidade_estoque: 18,
      categoria: "GPUs",
      imagem_url: "https://images.unsplash.com/photo-1727176763565-1d983341bb95?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    }),
  );

  produtos.push(
    await upsertProduto(fornecedor.id, {
      nome: "AMD Ryzen 7 7800X3D",
      descricao: "8-core CPU with outstanding gaming and simulation performance.",
      valor_unitario: 2699.0,
      quantidade_estoque: 25,
      categoria: "CPUs",
      imagem_url: "https://images.unsplash.com/photo-1600348759986-dc35c2ec7743?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    }),
  );

  produtos.push(
    await upsertProduto(fornecedor.id, {
      nome: "Keychron K8 Pro Mechanical Keyboard",
      descricao: "Wireless mechanical keyboard with hot-swappable switches and RGB backlight.",
      valor_unitario: 789.5,
      quantidade_estoque: 60,
      categoria: "Peripherals",
      imagem_url: "https://images.unsplash.com/photo-1643803792614-039e749d05b5?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    }),
  );

  produtos.push(
    await upsertProduto(fornecedor.id, {
      nome: "Logitech MX Master 3S",
      descricao: "Precision productivity mouse with silent clicks and USB-C charging.",
      valor_unitario: 549.9,
      quantidade_estoque: 75,
      categoria: "Peripherals",
      imagem_url: "https://images.unsplash.com/photo-1739742473235-34a7bd9b8f87?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    }),
  );

  produtos.push(
    await upsertProduto(fornecedor.id, {
      nome: "Samsung 990 Pro 2TB NVMe SSD",
      descricao: "PCIe 4.0 NVMe SSD for ultra-fast boot times and project load speeds.",
      valor_unitario: 1249.0,
      quantidade_estoque: 42,
      categoria: "Storage",
      imagem_url: "https://plus.unsplash.com/premium_photo-1721133221361-4f2b2af3b6fe?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    }),
  );

  produtos.push(
    await upsertProduto(fornecedor.id, {
      nome: "Raspberry Pi 5 - 8GB",
      descricao: "Single-board computer for prototyping IoT gateways and edge automation.",
      valor_unitario: 689.9,
      quantidade_estoque: 50,
      categoria: "Embedded",
      imagem_url: "https://images.unsplash.com/photo-1610812387871-806d3db9f5aa?q=80&w=1940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    }),
  );

  produtos.push(
    await upsertProduto(fornecedor.id, {
      nome: "ESP32 DevKit V1",
      descricao: "Wi-Fi and Bluetooth microcontroller board for IoT and telemetry projects.",
      valor_unitario: 74.9,
      quantidade_estoque: 220,
      categoria: "Microcontrollers",
      imagem_url: "https://images.unsplash.com/photo-1631376604914-572212a3ede5?q=80&w=1973&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    }),
  );

  produtos.push(
    await upsertProduto(fornecedor.id, {
      nome: "Ubiquiti UniFi 6 Lite Access Point",
      descricao: "Dual-band Wi-Fi 6 access point for high-density office coverage.",
      valor_unitario: 999.0,
      quantidade_estoque: 30,
      categoria: "Networking",
      imagem_url: "https://media.istockphoto.com/id/495732397/photo/black-wi-fi-router.webp?a=1&b=1&s=612x612&w=0&k=20&c=F5aKRp9FTGxO57mj7qJrORJa5K8OCM8ElmUbvA55J0A=",
    }),
  );

  produtos.push(
    await upsertProduto(fornecedor.id, {
      nome: "Dell UltraSharp 27 4K USB-C",
      descricao: "Color-accurate 27-inch 4K monitor for design and development teams.",
      valor_unitario: 2999.0,
      quantidade_estoque: 22,
      categoria: "Displays",
      imagem_url: "https://plus.unsplash.com/premium_photo-1680721575441-18d5a0567269?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bW9uaXRvcnxlbnwwfHwwfHx8MA%3D%3D",
    }),
  );

  await upsertPedidoDemo(storeUser.id, loja.id, fornecedor.id, [
    { id: produtos[0].id, quantidade: 2, valor_unitario: produtos[0].valor_unitario },
    { id: produtos[1].id, quantidade: 2, valor_unitario: produtos[1].valor_unitario },
    { id: produtos[6].id, quantidade: 10, valor_unitario: produtos[6].valor_unitario },
    { id: produtos[7].id, quantidade: 4, valor_unitario: produtos[7].valor_unitario },
  ]);

  return {
    admin: demoUsers.admin.email,
    supplier: demoUsers.supplier.email,
    store: demoUsers.store.email,
    password: DEMO_PASSWORD,
  };
}

seedDemo()
  .then((result) => {
    logger.info({ entity: "seed", action: "demo" }, "Seed demo concluido com sucesso");
    if (shouldResetBeforeSeed) {
      logger.info({ entity: "seed", action: "reset-before-demo" }, "Banco resetado antes do seed");
    }
    logger.info(
      {
        entity: "seed",
        action: "demo-summary",
        admin: result.admin,
        supplier: result.supplier,
        store: result.store,
      },
      "Usuarios de demo criados",
    );
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ err: error, entity: "seed", action: "demo" }, "Erro ao executar seed demo");
    process.exit(1);
  });
