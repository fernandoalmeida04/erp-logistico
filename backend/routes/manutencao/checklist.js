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

// Rota para trazer os dados da etapa do Checklist
router.post('/saveChecklistStep', async (req, res) => {
    const { nomeItem, grupo, userName, nConformidade, tipoVeiculo } = req.body;

    // 1. Buscar o próximo valor de cd_ordem
    const getNextOrdemQuery = `SELECT IFNULL(MAX(cd_ordem),0)+1 AS nextOrdem FROM tb_etapas_checklist`;
    sqlPoolLocal.query(getNextOrdemQuery, (err, results) => {
        if (err) {
            console.error('Erro ao buscar próxima ordem:', err.stack);
            return res.status(500).send('Erro ao conectar ao banco de dados.');
        }
        const nextOrdem = results[0].nextOrdem;

        // 2. Inserir o novo registro com o valor de ordem correto
        const insertQuery = `
            INSERT INTO tb_etapas_checklist (nm_etapa, nm_grupo, dt_create, nm_usucreate, cd_ordem, nm_conformidade, nm_tipoveiculo)
            VALUES (?, ?, NOW(), ?, ?, ?, ?)
        `;
        sqlPoolLocal.query(insertQuery, [nomeItem, grupo, userName, nextOrdem, nConformidade, tipoVeiculo], (err, results) => {
            if (err) {
                console.error('Erro ao executar a query:', err.stack);
                return res.status(500).send('Erro ao conectar ao banco de dados.');
            }
            res.json(results);
        });
    });
});

// Rota para listar todas as etapas do Checklist
router.get('/listChecklistSteps', (req, res) => {
    const query = `
        SELECT * FROM tb_etapas_checklist;
    `;
    sqlPoolLocal.query(query, (err, results, fields) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            res.status(500).send('Erro ao conectar ao banco de dados.');
            return;
        }
        res.json(results);
    });
});

// Rota para atualizar uma etapa do Checklist
router.post('/updateChecklistStep', (req, res) => {
    const { id, nomeItem, grupo } = req.body;

    const query = `
        UPDATE tb_etapas_checklist
        SET nm_etapa = ?, nm_grupo = ?
        WHERE cd_id = ?
    `;
    sqlPoolLocal.query(query, [nomeItem, grupo, id], (err, results) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            res.status(500).send('Erro ao conectar ao banco de dados.');
            return;
        }
        res.json(results);
    });
});

// Rota para deletar uma etapa do Checklist
router.post('/deleteChecklistStep', (req, res) => {
    const { id } = req.body; // id = cd_id (primary key)

    // 1. Descobrir o cd_ordem da etapa a ser deletada
    const getOrdemQuery = `SELECT cd_ordem FROM tb_etapas_checklist WHERE cd_id = ?`;
    sqlPoolLocal.query(getOrdemQuery, [id], (err, results) => {
        if (err) {
            console.error('Erro ao buscar ordem:', err.stack);
            return res.status(500).send('Erro ao conectar ao banco de dados.');
        }
        if (!results.length) {
            return res.status(404).send('Etapa não encontrada.');
        }
        const ordemDeletada = results[0].cd_ordem;

        // 2. Deletar a etapa
        const deleteQuery = `DELETE FROM tb_etapas_checklist WHERE cd_id = ?`;
        sqlPoolLocal.query(deleteQuery, [id], (err) => {
            if (err) {
                console.error('Erro ao deletar etapa:', err.stack);
                return res.status(500).send('Erro ao deletar etapa.');
            }

            // 3. Atualizar os cd_ordem dos registros subsequentes
            const updateQuery = `
                UPDATE tb_etapas_checklist
                SET cd_ordem = cd_ordem - 1
                WHERE cd_ordem > ?
            `;
            sqlPoolLocal.query(updateQuery, [ordemDeletada], (err) => {
                if (err) {
                    console.error('Erro ao atualizar ordem:', err.stack);
                    return res.status(500).send('Erro ao atualizar ordem.');
                }
                res.json({ message: 'Etapa deletada e ordens atualizadas com sucesso.' });
            });
        });
    });
});

// Salvar checklist feito
router.post('/saveChecklist', async (req, res) => {
    const { placa, checklist, hodometro, motorista } = req.body;

    const insertQuery = `
            INSERT INTO tb_historico_checklist(dt_create, nm_placa, js_checklist, cd_hodometro, nm_motorista)
            VALUES (NOW(), ?, ?, ?, ?)
        `;
        sqlPoolLocal.query(insertQuery, [placa, JSON.stringify(checklist), hodometro, motorista], (err, results) => {
            if (err) {
                console.error('Erro ao executar a query:', err.stack);
                return res.status(500).send('Erro ao conectar ao banco de dados.');
            }
            res.json(results);
        });
});

// Rota para buscar o tipo do veiculo 
router.post('/checkVehicleType', async (req, res) => {
    const { placa } = req.body;

    const query = `
        SELECT c.sdesc_ntcav 
        FROM tbl_veiculo v 
        LEFT JOIN tbl_nucci_tipocavalo c on v.cod_tcav = c.cod_ntcav
        WHERE v.splaca_veic = ?
    `;
    sqlPoolExt.query(query, [placa], (err, results) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            return res.status(500).send('Erro ao conectar ao banco de dados.');
        }
        if (results.length === 0) {
            return res.status(404).send('Veículo não encontrado.');
        }
        res.json(results[0]);
    });
});

// Rota para criar uma OS com o item do checklist
router.post('/createOS', async (req, res) => {
    const {placa, setor, tipoVeiculo, checklist, observacao } = req.body;

    // 1. Buscar o próximo valor de cd_ordem
    const getNextOrdemQuery = `SELECT IFNULL(MAX(cd_os),0)+1 AS nextOrdem FROM tb_ordem_servico`;
    sqlPoolLocal.query(getNextOrdemQuery, (err, results) => {
        if (err) {
            console.error('Erro ao buscar próxima ordem:', err.stack);
            return res.status(500).send('Erro ao conectar ao banco de dados.');
        }
        const nextOrdem = results[0].nextOrdem;

        // 2. Inserir o novo registro com o valor de ordem correto
        const insertQuery = `
            INSERT INTO tb_ordem_servico(dt_emissao, cd_os, nm_placa, nm_setor, nm_status, nm_tipoveiculo, cd_checklist, nm_observacao)
            VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)
        `;
        sqlPoolLocal.query(insertQuery, [nextOrdem, placa, setor, 'Em Aberto', tipoVeiculo, checklist, observacao], (err, results) => {
            if (err) {
                console.error('Erro ao executar a query:', err.stack);
                return res.status(500).send('Erro ao conectar ao banco de dados.');
            }
            res.json(results);
        });
    });
});

// Rota para listar as OS
router.get('/listOS', (req, res) => {
    const query = `
        SELECT * FROM tb_ordem_servico WHERE nm_status != 'Finalizado' ORDER BY dt_emissao DESC;
    `;
    sqlPoolLocal.query(query, (err, results, fields) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            res.status(500).send('Erro ao conectar ao banco de dados.');
            return;
        }
        res.json(results);
    });
});

router.post('/updateOSStatus', async (req, res) => {
    const { cd_os, nm_status } = req.body;

    const updateQuery = `
        UPDATE tb_ordem_servico
        SET nm_status = ?
        WHERE cd_os = ?
    `;
    sqlPoolLocal.query(updateQuery, [nm_status, cd_os], (err) => {
        if (err) {
            console.error('Erro ao atualizar status da OS:', err.stack);
            return res.status(500).send('Erro ao atualizar status da OS.');
        }
        res.json({ message: 'Status da OS atualizado com sucesso.' });
    });
});

router.get('/checklistDetails', async (req, res) => {
    const { cd_checklist } = req.query;

    const query = `
        SELECT * FROM tb_checklist WHERE cd_checklist = ?
    `;
    sqlPoolLocal.query(query, [cd_checklist], (err, results) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            return res.status(500).send('Erro ao conectar ao banco de dados.');
        }
        if (results.length === 0) {
            return res.status(404).send('Checklist não encontrado.');
        }
        res.json(results[0]);
    });
});

module.exports = router;