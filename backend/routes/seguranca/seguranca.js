const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sqlPoolLocal = require('../../config/dbConfigLocal');
const sqlPoolExt = require('../../config/dbConfigExt');
const router = express.Router();
require('dotenv').config();

// Rota básica
router.get('/', (req, res) => {
    res.send('Olá, Backend!');
});

// Salvar checklist feito
router.post('/saveEntrance', async (req, res) => {
    const { placa, nome, documento, data, tipoEntrada, motivoEntrada, kilometragem, notaFiscal, servico,
            placa2, placa3, verificarCabo, verificarCinta, observacaoOperacao, tipoMotorista, capacete, colete, bota } = req.body;

    if(tipoEntrada === 'Empresa') {
        const insertQuery = `
            INSERT INTO tb_entrada(nm_placa, nm_nome, cd_documento, dt_entrada, nm_entrada, nm_motivo, cd_kilometragem)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        sqlPoolLocal.query(insertQuery, [placa, nome, documento, data, tipoEntrada, motivoEntrada, kilometragem], (err, results) => {
            if (err) {
                console.error('Erro ao executar a query:', err.stack);
                return res.status(500).send('Erro ao conectar ao banco de dados.');
            }
            res.json(results);
        });
    }
    else if(tipoEntrada === 'Entrega') {
        const insertQuery = `
            INSERT INTO tb_entrada(nm_placa, nm_nome, cd_documento, dt_entrada, nm_entrada, nm_motivo, cd_notafiscal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        sqlPoolLocal.query(insertQuery, [placa, nome, documento, data, tipoEntrada, motivoEntrada, notaFiscal], (err, results) => {
            if (err) {
                console.error('Erro ao executar a query:', err.stack);
                return res.status(500).send('Erro ao conectar ao banco de dados.');
            }
            res.json(results);
        });
    }
    else if (tipoEntrada === 'Prestador') {
        const insertQuery = `
            INSERT INTO tb_entrada(nm_placa, nm_nome, cd_documento, dt_entrada, nm_entrada, nm_motivo, nm_servico)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        sqlPoolLocal.query(insertQuery, [placa, nome, documento, data, tipoEntrada, motivoEntrada, servico], (err, results) => {
            if (err) {
                console.error('Erro ao executar a query:', err.stack);
                return res.status(500).send('Erro ao conectar ao banco de dados.');
            }
            res.json(results);
        });
    }
    else if (tipoEntrada === 'Operacao') {
        const insertQuery = `
            INSERT INTO tb_entrada(nm_placa, nm_nome, cd_documento, dt_entrada, nm_entrada, nm_motivo, nm_placa2, nm_placa3,
            cd_verificar_cabo, cd_verificar_cinta, nm_observacao_operacao, nm_tipo_motorista, cd_capacete, cd_colete, cd_bota)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        sqlPoolLocal.query(insertQuery, [placa, nome, documento, data, tipoEntrada, motivoEntrada, placa2, placa3, verificarCabo, verificarCinta, observacaoOperacao, tipoMotorista, capacete, colete, bota], (err, results) => {
            if (err) {
                console.error('Erro ao executar a query:', err.stack);
                return res.status(500).send('Erro ao conectar ao banco de dados.');
            }
            res.json(results);
        });
    }
});

router.post('/listEntrance', async (req, res) => {

    const selectQuery = `
        SELECT * FROM tb_entrada WHERE dt_saida IS NULL
        ORDER BY dt_entrada DESC
    `;
    sqlPoolLocal.query(selectQuery, (err, results) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            return res.status(500).send('Erro ao conectar ao banco de dados.');
        }
        res.json(results);
    });
});

router.post('/saveExit', async (req, res) => {
    const { placa } = req.body;

    const insertQuery = `
        UPDATE tb_entrada
        SET dt_saida = NOW()
        WHERE nm_placa = ? AND dt_saida IS NULL
    `;
    sqlPoolLocal.query(insertQuery, [placa], (err, results) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            return res.status(500).send('Erro ao conectar ao banco de dados.');
        }
        res.json(results);
    });
});

module.exports = router;