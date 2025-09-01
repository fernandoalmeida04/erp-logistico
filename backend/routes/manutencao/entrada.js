const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sqlPoolLocal = require('../../config/dbConfigLocal');
const router = express.Router();
require('dotenv').config();

// Rota básica
router.get('/', (req, res) => {
    res.send('Olá, Backend!');
});

// Adição de um item na tabela de manutenção - ok
router.post('/register-entrance', async (req, res) => {
    const { placa1, placa2, placa3, motorista } = req.body; // Receber o array de BIs

    try {
    const query = `INSERT INTO tb_entrada_manutencao 
                    (nm_placa1, nm_placa2, nm_placa3, nm_motorista, nm_situacao) 
                    VALUES 
                    (?, ?, ?, ?, 'ENTRADA')`;
    await new Promise((resolve, reject) => {
        sqlPoolLocal.query(query, [placa1, placa2, placa3, motorista], (err, results) => {
        if (err) return reject(err);
        resolve(results);
        });
    });

    res.status(200).json({ message: 'Entrada efetuada com sucesso' });
    } catch (error) {
    console.error('Erro ao realizar entrada:', error);
    res.status(500).json({ message: 'Erro ao realizar entrada' });
    }
});

// Exibição das entradas - ok
router.post('/show-entrance', async (req, res) => {
    const query = `
        SELECT cd_manut, dt_entrada, nm_placa1, nm_placa2, nm_placa3, nm_motorista, nm_situacao, dt_saida
        FROM tb_entrada_manutencao WHERE dt_saida is null
    `;

    sqlPoolLocal.query(query, (err, results, fields) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            res.status(500).send('Erro ao conectar ao banco de dados.');
            return;
        }

        // Formatar o campo dt_entrada
        const formattedResults = results.map((row) => {
            if (row.dt_entrada) {
                const date = new Date(row.dt_entrada);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
                const year = date.getFullYear();
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                row.dt_entrada = `${day}/${month}/${year} ${hours}:${minutes}`;
            }
            return row;
        });

        res.json(formattedResults);
    });
});

module.exports = router;