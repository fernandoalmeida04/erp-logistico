const express = require('express');
const axios = require('axios');
const cors = require('cors');
const router = express.Router();
const sqlPoolLocal = require('../../config/dbConfigLocal');
require('dotenv').config();

// Habilitar CORS
router.use(cors());

let accessTokenCache = null;
let accessTokenExpiry = null;

const generateUserAccessToken = async () => {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const username = process.env.AZURE_USERNAME;
  const password = process.env.AZURE_PASSWORD;

  const now = new Date();
  if (accessTokenCache && accessTokenExpiry && now < accessTokenExpiry) {
    return accessTokenCache;
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const data = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
    scope: 'https://analysis.windows.net/powerbi/api/.default',
  });

  try {
    const response = await axios.post(url, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    accessTokenCache = response.data.access_token;
    accessTokenExpiry = new Date(now.getTime() + response.data.expires_in * 1000);

    return accessTokenCache;
  } catch (error) {
    console.error('Erro ao obter token:', error.response?.data || error.message);
    throw new Error('Falha na autenticação.');
  }
};


let embedTokenCache = null;
let tokenExpiryTime = null;

const generateEmbedToken = async (accessToken, reportId, groupId) => {
  // Reutiliza o token se ainda for válido
  const now = new Date();
  if (embedTokenCache && tokenExpiryTime && now < tokenExpiryTime) {
    return embedTokenCache;
  }

  const url = `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/reports/${reportId}/GenerateToken`;

  try {
    const response = await axios.post(
      url,
      { accessLevel: 'View' },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // Atualiza cache com novo token e tempo de expiração
    embedTokenCache = response.data.token;
    tokenExpiryTime = new Date(now.getTime() + response.data.expiry * 1000);

    return embedTokenCache;
  } catch (error) {
    console.error('Erro ao gerar Embed Token:', error.response?.data || error.message);
    throw new Error('Falha ao gerar Embed Token.');
  }
};

// Rota para gerar Embed Token - ok
router.post('/generate-embed-token', async (req, res) => {
  const { reportId, groupId } = req.body;
  if (!reportId || !groupId) {
    return res.status(400).json({ error: 'Parâmetros reportId e groupId são obrigatórios.' });
  }

  try {
    const accessToken = await generateUserAccessToken();
    const embedToken = await generateEmbedToken(accessToken, reportId, groupId);
    res.json({ embedToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Buscar os BIs do catálogo - ok
router.get('/bi-catalog', async (req, res) => {
  try {
    const query =
    `SELECT cd_id, nm_nome, nm_embed, nm_grupo, cd_bi FROM tb_catalogo_bi`;
  
    const result = await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      })
    })
    res.json(result); // Retornar os BIs como JSON
  } catch (error) {
    console.error('Erro ao buscar BIs:', error);
    res.status(500).json({ error: 'Erro ao buscar BIs' });
  }
});

// Informações de um BI específico - ok
router.get('/bi-catalog/:biId', async (req, res) => {
  const { biId } = req.params;
  try {
    const query =
    `SELECT cd_id, nm_nome, nm_embed, nm_grupo, cd_bi FROM tb_catalogo_bi WHERE cd_id = ?`;
  
    const result = await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [biId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      })
    })
    res.json(result[0]); // Retornar os BIs como JSON
  } catch (error) {
    console.error('Erro ao buscar BI específico:', error);
    res.status(500).json({ error: 'Erro ao buscar BI específico' });
  }
});

// BI disponíveis por usuário - ok
router.post('/available-bi', async (req, res) => {
  const { usuario } = req.body;


  try {
    const query = `SELECT bi.cd_id, bi.nm_nome, u.nm_setor
              FROM tb_usuario u
              JOIN tb_usuarios_bi ub ON u.cd_usuario = ub.cd_usuario
              JOIN tb_catalogo_bi bi ON ub.cd_bi = bi.cd_id
              WHERE u.nm_username = ?`;
    const result = await new Promise((resolve, reject) => {
      sqlPoolLocal.query(query, [ usuario ], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // Verifica se há pelo menos um BI disponível para o usuário
    if (result[0]) {
      const setor = result[0].nm_setor; // Setor do usuário
      const bis = result.map(row => ({
        cd_id: row.cd_id,
        nm_nome: row.nm_nome
      }));

      res.json({
        bis,   // Lista de BIs disponíveis
        setor  // Setor do usuário
      });
    } else {
      res.json({
        bis: [],
        setor: null
      });
    }
  } catch (error) {
    console.error('Erro ao buscar BIs:', error);
    res.status(500).json({ message: 'Erro ao buscar BIs' });
  }
});


module.exports = router;
