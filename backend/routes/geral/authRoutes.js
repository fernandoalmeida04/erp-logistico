const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const sqlPoolLocal = require('../../config/dbConfigLocal');
const sqlPoolExt = require('../../config/dbConfigExt');
const nodemailer = require('nodemailer'); // Adicione se for usar nodemailer

const JWT_SECRET = process.env.JWT_SECRET || 'seusegredoseguro';

// Cadastro - ok
router.post('/register', async (req, res) => {
  const { nome, email, usuario, cpf, setor, codNucci, bIs, menus } = req.body; // Receber o array de BIs

  try {

    // Inserir o novo usuário
    const query =
      `INSERT INTO tb_usuario (nm_nome, nm_username, nm_senha, nm_email, nm_setor, dt_cadastro, cd_cpf, cd_codnucci, cd_primeiroLogin, cd_ativo) 
      VALUES (?, ?, AES_ENCRYPT('mudar@123', 'dec_ps@fksTI'), ?, ?, NOW(), ?, ?, 1, 1)`;
    
    await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [nome, usuario, email, setor, cpf, codNucci || null], (err, results) => {
      if (err) return reject(err);
      resolve(results);
      })
    })

    const queryId = `
      SELECT cd_usuario FROM tb_usuario WHERE nm_username = ?
    `
    const userId = await new Promise((resolve, reject) => {
      sqlPoolLocal.query(queryId, [ usuario ], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      })
    })
    const newUserId = userId[0].cd_usuario;

    // Inserir os BIs associados ao usuário na tabela de relacionamento
    if (bIs && bIs.length > 0) {
      const biValues = bIs.map(biId => [newUserId, biId]);

      const queryBis =
      `INSERT INTO tb_usuarios_bi (cd_usuario, cd_bi) VALUES ?`;
    
      await new Promise((resolve, reject) => {
        sqlPoolLocal.query(queryBis, [biValues], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        })
      })
    }

    res.status(201).json({ message: 'Usuário cadastrado com sucesso e BI associado!' });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ message: 'Erro no cadastro' });
  }
});

router.get('/health', (req, res) => res.send('OK'));
router.get('/health/local', (req, res) => {
  sqlPoolLocal.query('SELECT 1', (err) => {
    if (err) return res.status(500).send('Erro');
    res.send('OK');
  });
});
router.get('/health/ext', (req, res) => {
  sqlPoolExt.query('SELECT 1', (err) => {
    if (err) return res.status(500).send('Erro');
    res.send('OK');
  });
});

// Login - ok
router.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;

  try {
    // Consulta o usuário no banco de dados
    const query = `
      SELECT u.nm_username, u.nm_nome, u.nm_setor, AES_DECRYPT(nm_senha, 'dec_ps@fksTI') as senha, u.cd_PrimeiroLogin, u.cd_ativo
      FROM tb_usuario u

      WHERE nm_username = ? AND AES_DECRYPT(nm_senha, 'dec_ps@fksTI') = ?;
    `;
    const result = await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [usuario, senha], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // Verifica se o usuário foi encontrado
    if (result.length === 0) {
      return res.status(401).json({ message: 'Usuário ou senha incorretos' });
    }

    const usuarioEncontrado = result[0];
    if (usuarioEncontrado) {
      const token = jwt.sign({ id: usuarioEncontrado.cd_usuario }, 'secretkey', { expiresIn: '1h' });
      res.json({ 
        token, 
        primeiroLogin: usuarioEncontrado.cd_PrimeiroLogin,
        setor: usuarioEncontrado.nm_setor,
        nome: usuarioEncontrado.nm_nome,
        ativo: usuarioEncontrado.cd_ativo,
      });
    } else {
      res.status(400).json({ message: 'Credenciais inválidas' });
    }
  } catch (error) {
    console.error('Erro ao tentar login:', error);
    res.status(500).json({ message: 'Erro ao tentar login' });
  }
});

// E-mail recuperação senha
router.post('/send-recovery-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });

  // Busque o usuário pelo e-mail
  sqlPoolLocal.query(
    'SELECT nm_nome, nm_username FROM tb_usuario WHERE nm_email = ?',
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar usuário.' });
      if (!results.length) return res.status(200).json({ message: 'Se o e-mail estiver cadastrado, você receberá um link.' });

      const usuario = results[0].usuario;
      const nome = results[0].nm_nome;
      const username = results[0].nm_username;
      // Cria token de redefinição válido por 1 hora
      const token = jwt.sign({ usuario }, JWT_SECRET, { expiresIn: '1h' });
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/redefinir-senha?token=${token}&email=${encodeURIComponent(email)}`;

      // Envie o e-mail
      const transporter = nodemailer.createTransport({
        host: 'smtp.office365.com', // ou o SMTP do seu provedor
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Recuperação de senha',
        html: `
          <p>Olá, <b>${nome}</b>!</p>
          <p>Seu nome de usuário é <b>${username}</b></p>
          <p>Para redefinir sua senha, clique no link abaixo:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>O link é válido por <b>1 hora.</b></p>
        `,
      };

      try {
        transporter.verify(function(error, success) {
        if (error) {
          console.log('Erro SMTP:', error);
        } else {
          console.log("SMTP pronto para enviar mensagens");
        }
      });
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'E-mail enviado com sucesso.' });
      } catch (e) {
        res.status(500).json({ error: 'Erro ao enviar e-mail.' });
      }
    }
  );
});

// Listar menus
router.get('/listMenus', async (req, res) => {
  try {
    const query = `SELECT cd_menu, nm_menu, nm_categoria FROM tb_menus_disponiveis`;
    const results = await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
    res.status(200).json(results);
  } catch (error) {
    console.error('Erro ao listar menus:', error);
    res.status(500).json({ message: 'Erro ao listar menus' });
  }
});

// Troca de Senha - ok
router.post('/changePassword', async (req, res) => {
  const { token, novaSenha, email } = req.body;

  try {
    const query = `UPDATE tb_usuario SET nm_senha = AES_ENCRYPT(?, 'dec_ps@fksTI'), cd_PrimeiroLogin = 0 WHERE nm_email = ?`;
    await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [novaSenha, email], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    res.status(200).json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao trocar a senha:', error);
    res.status(500).json({ message: 'Erro ao trocar a senha' });
  }
});

// Pesquisa - ok
router.post('/search', async (req, res) => {
  const { usuario } = req.body;

  try {
    const query = `SELECT * FROM tb_usuario WHERE nm_username = ?`;
    const result = await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [ usuario ], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (result[0]) {
      res.status(200).json(result[0]);
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar usuário' });
  }
});

// // Update do Usuário - ok
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, usuario, cpf, setor, codNucci, menus, ativo } = req.body;
  try {

      const query = `
      UPDATE tb_usuario SET nm_nome = ?, nm_username = ?, nm_email = ?, cd_cpf = ?, nm_setor = ?, cd_codnucci = ?, cd_ativo = ? WHERE cd_usuario = ?`;
      const result = await new Promise((resolve, reject) => {
        sqlPoolLocal.query(query, [nome, usuario, email, cpf, setor, codNucci || null, ativo, id], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        })
      })      

      if (result.affectedRows > 0) {
        res.status(200).json({ message: 'Usuário atualizado com sucesso' });
      } else {
        res.status(404).json({ message: 'Usuário não encontrado' });
      }
  } catch (error) {
    console.error('Erro na atualização do usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// // Update de BI por usuario - ok
router.put('/updateBi/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, usuario, cpf, setor, codNucci, bIs } = req.body;

  try {
    let result; // Defina a variável result no escopo principal do try

    // Atualizar os dados do usuário
    const query = `
      UPDATE tb_usuario SET nm_nome = ?, nm_username = ?, nm_email = ?, cd_cpf = ?, nm_setor = ?, cd_codnucci = ? WHERE cd_usuario = ?`;
    result = await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [nome, usuario, email, cpf, setor, codNucci || null, id], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // Atualizar os BIs associados ao usuário
    if (bIs && bIs.length > 0) {
      // Primeiro, remove os IDs do banco que não estão no array bIs
      const query1 = `
        DELETE FROM tb_usuarios_bi
        WHERE cd_usuario = ?
        AND cd_bi NOT IN (${bIs.join(',')})`;
      await new Promise((resolve, reject) => {
        sqlPoolLocal.query(query1, [id], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });

      // Depois, insere ou atualiza os IDs que estão no array bIs
      for (const biId of bIs) {
        const query2 = `
          INSERT INTO tb_usuarios_bi (cd_usuario, cd_bi)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE
          cd_usuario = VALUES(cd_usuario), cd_bi = VALUES(cd_bi)`;
        await new Promise((resolve, reject) => {
          sqlPoolLocal.query(query2, [id, biId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });
      }
    } else {
      // Se o array estiver vazio, remove todos os registros do usuário
      const query4 = `
        DELETE FROM tb_usuarios_bi
        WHERE cd_usuario = ?;`;
      await new Promise((resolve, reject) => {
        sqlPoolLocal.query(query4, [id], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
    }

    // Verifica se o usuário foi atualizado
    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Usuário atualizado com sucesso' });
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  } catch (error) {
    console.error('Erro na atualização do usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// Listar menus de um usuário
router.post('/listMenusUser', async (req, res) => {
  const { usuario } = req.body;
  try {
    const query = `
      SELECT m.cd_menu, m.nm_menu, u.nm_setor, m.nm_categoria, m.nm_url
              FROM tb_usuario u
              JOIN tb_usuarios_menu um ON u.cd_usuario = um.cd_usuario
              JOIN tb_menus_disponiveis m ON um.cd_menu = m.cd_menu
              WHERE u.nm_username = ?`;
    const result = await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [usuario], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
    
    // Verifica se há pelo menos um menu disponível para o usuário
    if (result[0]) {
      const setor = result[0].nm_setor; // Setor do usuário
      const menus = result.map(row => ({
        cd_menu: row.cd_menu,
        nm_nome: row.nm_menu,
        nm_categoria: row.nm_categoria,
        nm_url: row.nm_url
      }));

      res.json({
        menus,   // Lista de menus disponíveis
        setor  // Setor do usuário
      });
    } else {
      res.json({
        menus: [],
        setor: null
      });
    }
  } catch (error) {
    console.error('Erro ao listar menus do usuário:', error);
    res.status(500).json({ message: 'Erro ao listar menus do usuário' });
  }
});

// Atualizar menus de um usuário
router.post('/updateMenus/:cd_usuario', async (req, res) => {
  try {
    const { cd_usuario } = req.params;
    const { menus } = req.body; // menus: array de cd_menu

    // Remove todos os menus atuais do usuário
    await new Promise((resolve, reject) => {
      sqlPoolLocal.query(
        'DELETE FROM tb_usuarios_menu WHERE cd_usuario = ?',
        [cd_usuario],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // Insere os novos menus
    if (Array.isArray(menus) && menus.length > 0) {
      const values = menus.map(cd_menu => [cd_usuario, cd_menu]);
      await new Promise((resolve, reject) => {
        sqlPoolLocal.query(
          'INSERT INTO tb_usuarios_menu (cd_usuario, cd_menu) VALUES ?',
          [values],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
    }

    res.status(200).json({ message: 'Menus atualizados com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar menus do usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar menus do usuário' });
  }
});

// Adição de um BI na lista - ok
router.post('/register-report', async (req, res) => {
  const { nome, codReport, codGroup, codBi } = req.body; // Receber o array de BIs

  try {
    const query = `INSERT INTO tb_catalogo_bi (nm_nome, nm_embed, nm_grupo, cd_bi) VALUES (?, ?, ?, ?)`;
    await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [nome, codReport, codGroup, codBi], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    res.status(200).json({ message: 'Relatório Adicionado com sucesso' });
  } catch (error) {
    console.error('Erro ao adicionar relatório:', error);
    res.status(500).json({ message: 'Erro ao adicionar relatório' });
  }
});

// Cadastro de Menu
router.post('/registerMenu', async (req, res) => {
  const { nmMenu, nmCategoria, nmUrl, userName } = req.body;
  try {
    const query = `INSERT INTO tb_menus_disponiveis (dt_create, nm_menu, nm_categoria, nm_url, nm_usuario) VALUES (NOW(), ?, ?, ?, ?)`;
    await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [nmMenu, nmCategoria, nmUrl, userName], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
  });
    res.status(201).json({ message: 'Menu cadastrado com sucesso!' });
  } catch (error) {
    console.error('Erro no cadastro de menu:', error);
    res.status(500).json({ message: 'Erro no cadastro de menu' });
  }
});

module.exports = router;
