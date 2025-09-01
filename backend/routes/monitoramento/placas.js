const express = require('express');
const axios = require('axios');
const sqlPoolLocal = require('../../config/dbConfigLocal'); 
const sqlPoolExt = require('../../config/dbConfigExt');
const router = express.Router();
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

router.post('/addPlaca', async (req, res) => {
    const { placa, tipoVeiculo } = req.body;

    if (!placa || !tipoVeiculo) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    let tipo;
    if(tipoVeiculo == "Frota") {
        tipo = 0
    }
    else if(tipoVeiculo == "Agregado") {
        tipo = 1
    }

    try {
        const query = 'INSERT INTO tb_estado_veiculo (nm_placa, cd_tipo_veiculo) VALUES (?, ?)';
        await new Promise((resolve, reject) => {
        sqlPoolLocal.query(query, [placa, tipo], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
        });
        res.status(201).json({ message: 'Placa adicionada com sucesso.' });
    } catch (error) {
        console.error('Erro ao adicionar placa:', error);
        res.status(500).json({ error: 'Erro ao adicionar placa.' });
    }
});

router.post('/dadosExcel', async (req, res) => {
    try {
        const placasDirecoes = req.body.placasDirecoes || [];
        const placas = placasDirecoes.map(obj => obj.placa);
        const direcaoMap = {};
        placasDirecoes.forEach(obj => {
            direcaoMap[obj.placa] = obj.direcao;
        });

        let filtroPlacas = '';
        let filtroCavalo = '';
        if (placas.length > 0) {
            const placasSql = placas.map(p => `'${p}'`).join(',');
            filtroPlacas = `AND (C2.splaca1_col IN (${placasSql}) OR C3.splaca_motor_ctrt IN (${placasSql}))`;
            filtroCavalo = `AND t.CAVALO IN (${placasSql})`;
        }
        const query = `
        SELECT *
            FROM (
                SELECT
                    C.scoletacliente_cot AS SOLICITACAO,
                    C.dtcreate_cot AS DATA_CRIADO,
                    C.dtcoleta_cot AS DATA_COLETA,
                    C.scodativacao_cot AS CVA,
                    DATE_FORMAT(C.dtcoleta_cot, '%H:%i') AS JANELA,
                    'REDONDA' AS VIAGEM,
                    'REBAIXADA' AS CARRETA,
                    M.snome_mot AS MOTORISTA,
                    IF(C2.splaca1_col IS NULL OR C2.splaca1_col = '', C3.splaca_motor_ctrt, C2.splaca1_col) AS CAVALO,
                    ROW_NUMBER() OVER (
                        PARTITION BY IF(C2.splaca1_col IS NULL OR C2.splaca1_col = '', C3.splaca_motor_ctrt, C2.splaca1_col)
                        ORDER BY C.dtcreate_cot DESC
                    ) AS rn
                FROM tbl_cotacao C
                LEFT JOIN tbl_coleta C2 ON C2.cod_col = C.cod_col 
                LEFT JOIN tbl_contrato_ordem_coleta CC ON CC.nordemcoleta_coc = C2.nnumero_col AND CC.npr_coc = C.npr_col
                LEFT JOIN tbl_contrato_nucci C3 ON C3.cod_ctrt = CC.cod_ctrt 
                LEFT JOIN tbl_motorista M ON C2.scpf_mot = M.scpf_mot
                WHERE (C.scnpj_emp = '59104422005704' OR C.scnpj_emp = '59104422010384')
                AND NOT C.nstatus_cot IN (99,20)
                AND C2.cod_sit NOT IN (999, 10, 11)
                ${filtroPlacas}
            ) t
            WHERE t.rn = 1
            ${filtroCavalo}
            ORDER BY t.DATA_CRIADO ASC
        `;
        // Busca dados principais
        const dados = await new Promise((resolve, reject) => {
            sqlPoolExt.query(query, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // Busca dados de posição/distância no banco local
        let dadosEstado = [];
        if (placas.length > 0) {
            const placasSql = placas.map(p => `'${p}'`).join(',');
            const queryEstado = `SELECT nm_placa, nm_poligono_atual, cd_distancia FROM tb_estado_veiculo WHERE nm_placa IN (${placasSql})`;
            dadosEstado = await new Promise((resolve, reject) => {
                sqlPoolLocal.query(queryEstado, (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });
        }

        // Busca dados de timestamps para excel no banco local
        let dadosTimestamps = [];
        if (placas.length > 0) {
            const placasSql = placas.map(p => `'${p}'`).join(',');
            const queryTimestamps = `
                SELECT 
                    nm_placa,
                    CASE WHEN dt_a_chegada_planta IS NULL OR dt_a_chegada_planta = '0000-00-00 00:00:00' THEN NULL
                        ELSE DATE_FORMAT(CONVERT_TZ(dt_a_chegada_planta, '+00:00', '-00:00'), '%H:%i') END AS ACHEGADAPLANTA,
                    CASE WHEN dt_a_chegada_gate IS NULL OR dt_a_chegada_gate = '0000-00-00 00:00:00' THEN NULL
                        ELSE DATE_FORMAT(CONVERT_TZ(dt_a_chegada_gate, '+00:00', '-00:00'), '%H:%i') END AS ACHEGADAGATE,
                    CASE WHEN dt_a_saida_planta IS NULL OR dt_a_saida_planta = '0000-00-00 00:00:00' THEN NULL
                        ELSE DATE_FORMAT(CONVERT_TZ(dt_a_saida_planta, '+00:00', '-00:00'), '%H:%i') END AS ASAIDAPLANTA,
                    CASE WHEN dt_p_previsao_chegada IS NULL OR dt_p_previsao_chegada = '0000-00-00 00:00:00' THEN NULL
                        ELSE DATE_FORMAT(CONVERT_TZ(dt_p_previsao_chegada, '+00:00', '-00:00'), '%H:%i') END AS PPREVISAOCHEGADA,
                    CASE WHEN dt_p_chegada_planta IS NULL OR dt_p_chegada_planta = '0000-00-00 00:00:00' THEN NULL
                        ELSE DATE_FORMAT(CONVERT_TZ(dt_p_chegada_planta, '+00:00', '-00:00'), '%H:%i') END AS PCHEGADAPLANTA,
                    CASE WHEN dt_p_chegada_gate IS NULL OR dt_p_chegada_gate = '0000-00-00 00:00:00' THEN NULL
                        ELSE DATE_FORMAT(CONVERT_TZ(dt_p_chegada_gate, '+00:00', '-00:00'), '%H:%i') END AS PCHEGADAGATE,
                    CASE WHEN dt_p_saida_planta IS NULL OR dt_p_saida_planta = '0000-00-00 00:00:00' THEN NULL
                        ELSE DATE_FORMAT(CONVERT_TZ(dt_p_saida_planta, '+00:00', '-00:00'), '%H:%i') END AS PSAIDAPLANTA,
                    cd_qtd_racks AS QTDRACK,
                    nm_atendimento_status AS STATUSATENDIMENTO
                FROM tb_marco_veiculo
                WHERE nm_placa IN (${placasSql})
            `;
            dadosTimestamps = await new Promise((resolve, reject) => {
                sqlPoolLocal.query(queryTimestamps, (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });
        }

        // Cria um map para acesso rápido
        const estadoMap = {};
        dadosEstado.forEach(row => {
            estadoMap[row.nm_placa] = row;
        });

        // Cria um map para os timestamps
        const timestampsMap = {};
        dadosTimestamps.forEach(row => {
            timestampsMap[row.nm_placa] = row;
        });

        // Mescla os dados
        const dadosComDirecao = dados.map(row => {
            const cavalo = row.CAVALO;
            const timestamps = timestampsMap[cavalo] || {};
            return {
                ...row,
                DIRECAO_ORIGINAL: direcaoMap[cavalo] || '',
                cd_distancia: estadoMap[cavalo]?.cd_distancia || null,
                nm_poligono_atual: estadoMap[cavalo]?.nm_poligono_atual || null,
                // Campos para Excel
                ACHEGADAPLANTA: timestamps.ACHEGADAPLANTA || null,
                ACHEGADAGATE: timestamps.ACHEGADAGATE || null,
                ASAIDAPLANTA: timestamps.ASAIDAPLANTA || null,
                PPREVISAOCHEGADA: timestamps.PPREVISAOCHEGADA || null,
                PCHEGADAPLANTA: timestamps.PCHEGADAPLANTA || null,
                PCHEGADAGATE: timestamps.PCHEGADAGATE || null,
                PSAIDAPLANTA: timestamps.PSAIDAPLANTA || null,
                STATUSATENDIMENTO: timestamps.STATUSATENDIMENTO || null,
                QTDRACK: timestamps.QTDRACK !== undefined && timestamps.QTDRACK !== null ? Number(timestamps.QTDRACK) : null
            };
        });

        res.status(200).json(dadosComDirecao);
    } catch (error) {
        console.error('Erro ao listar dados:', error);
        res.status(500).json({ error: 'Erro ao listar dados.' });
    }
});

router.post('/deletePlaca', async (req, res) => {
    const { placa } = req.body;

    if (!placa) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        const query = 'DELETE FROM tb_estado_veiculo WHERE nm_placa = ?';
        await new Promise((resolve, reject) => {
        sqlPoolLocal.query(query, [placa], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
        });
        res.status(201).json({ message: 'Placa removida com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover placa:', error);
        res.status(500).json({ error: 'Erro ao remover placa.' });
    }
});

router.post('/registerDelete', async (req, res) => {
    const { placa, motivo, usuario } = req.body;

    if (!placa || !motivo || !usuario) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        const query = 'INSERT INTO tb_historico_exclusao_placa(dt_delete, nm_placa, nm_motivo, nm_usuario) VALUES (NOW(),?, ?, ?)';
        await new Promise((resolve, reject) => {
        sqlPoolLocal.query(query, [placa, motivo, usuario], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
        });
        res.status(201).json({ message: 'Placa removida com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover placa:', error);
        res.status(500).json({ error: 'Erro ao remover placa.' });
    }
});

router.post('/listarPlacas', async (req, res) => {
    try {
        const query = 'SELECT * FROM tb_estado_veiculo';
        const placas = await new Promise((resolve, reject) => {
            sqlPoolLocal.query(query, (err, results) => {
                if (err) return reject(err);
                resolve(results);
        });
        });

        res.status(200).json(placas);
    } catch (error) {
        console.error('Erro ao listar placas:', error);
        res.status(500).json({ error: 'Erro ao listar placas.' });
    }
});

router.post('/salvarHistorico', async (req, res) => {
    const { historico } = req.body;

    if (!Array.isArray(historico) || historico.length === 0) {
        return res.status(400).json({ error: 'Histórico deve ser um array com pelo menos um item.' });
    }

    try {
        for (const item of historico) {
            const { placa, posicao, latitude, longitude } = item;
            if (!placa || !posicao || !latitude || !longitude) {
                return res.status(400).json({ error: 'Todos os campos são obrigatórios em cada item.' });
            }

            // Se for "Em Trânsito", cd_posicao = 1, senão busca pelo nome do polígono
            let query, params;
            if (posicao === "Em Trânsito") {
                query = 'INSERT INTO tb_historico_posicoes (nm_placa, cd_posicao, nm_latitude, nm_longitude, dt_registro) VALUES (?, 1, ?, ?, NOW())';
                params = [placa, latitude, longitude];
            } else {
                query = 'INSERT INTO tb_historico_posicoes (nm_placa, cd_posicao, nm_latitude, nm_longitude, dt_registro) VALUES (?, (SELECT cd_poligono FROM tb_poligono WHERE nm_poligono = ?), ?, ?, NOW())';
                params = [placa, posicao, latitude, longitude];
            }

            await new Promise((resolve, reject) => {
                sqlPoolLocal.query(query, params, (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });
        }
        res.status(201).json({ message: 'Histórico adicionado com sucesso.' });
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
        res.status(500).json({ error: 'Erro ao salvar histórico.' });
    }
});

router.post('/salvarSaida', async (req, res) => {
    const { placa, posicao, latitude, longitude } = req.body;

    if (!placa || !posicao || !latitude || !longitude) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        let query, params;
        if (posicao === "Saída SBC") {
            query = 'INSERT INTO tb_historico_posicoes (nm_placa, cd_posicao, nm_latitude, nm_longitude, dt_registro) VALUES (?, 30, ?, ?, NOW())';
            params = [placa, latitude, longitude];
        }
        if (posicao === "Saída SJP") {
            query = 'INSERT INTO tb_historico_posicoes (nm_placa, cd_posicao, nm_latitude, nm_longitude, dt_registro) VALUES (?, 40, ?, ?, NOW())';
            params = [placa, posicao, latitude, longitude];
        }

        await new Promise((resolve, reject) => {
            sqlPoolLocal.query(query, params, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
        res.status(201).json({ message: 'Saída registrada com sucesso.' });
    } catch (error) {
        console.error('Erro ao registrar saída:', error);
        res.status(500).json({ error: 'Erro ao registrar saída.' });
    }
});

router.post('/salvarTimestamp', async (req, res) => {
    const { placa, aChegadaPlanta, aChegadaGate, aSaidaPlanta, sPrevisaoChegada, sChegadaPlanta, sChegadaGate, sSaidaPlanta, statusAtendimento } = req.body;
    const qtdeRacks = req.body.sQtdeRacks;
    const valorParaSalvar = qtdeRacks === null || qtdeRacks === undefined ? null : qtdeRacks;
    try {
        // Verifica se já existe registro para a placa
        const selectQuery = "SELECT * FROM tb_marco_veiculo WHERE nm_placa = ?";
        const existing = await new Promise((resolve, reject) => {
            sqlPoolLocal.query(selectQuery, [placa], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        let query, params;
        if (existing && existing.length > 0) {
            // Já existe, faz UPDATE
            query = `UPDATE tb_marco_veiculo 
                SET dt_a_chegada_planta = ?, dt_a_chegada_gate = ?, dt_a_saida_planta = ?, 
                    dt_p_previsao_chegada = ?, dt_p_chegada_planta = ?, dt_p_chegada_gate = ?, 
                    dt_p_saida_planta = ?, cd_qtd_racks = ?, nm_atendimento_status = ?
                WHERE nm_placa = ?`;
            params = [aChegadaPlanta, aChegadaGate, aSaidaPlanta, sPrevisaoChegada, sChegadaPlanta, sChegadaGate, sSaidaPlanta, valorParaSalvar, statusAtendimento, placa];
        } else {
            // Não existe, faz INSERT
            query = `INSERT INTO tb_marco_veiculo 
                (nm_placa, dt_a_chegada_planta, dt_a_chegada_gate, dt_a_saida_planta, 
                    dt_p_previsao_chegada, dt_p_chegada_planta, dt_p_chegada_gate, 
                    dt_p_saida_planta, cd_qtd_racks, nm_atendimento_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            params = [placa, aChegadaPlanta, aChegadaGate, aSaidaPlanta, sPrevisaoChegada, sChegadaPlanta, sChegadaGate, sSaidaPlanta, valorParaSalvar, statusAtendimento];
        }

        await new Promise((resolve, reject) => {
            sqlPoolLocal.query(query, params, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        res.status(200).json({ message: 'Timestamp atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar timestamp:', error);
        res.status(500).json({ error: 'Erro ao atualizar timestamp.' });
    }
});

router.post('/listarTimestamps', async (req, res) => {
    const { placa } = req.body;
    if (!placa) {   
        return res.status(400).json({ error: 'Placa é obrigatória.' });
    }
    try {
        const query = 'SELECT * FROM tb_marco_veiculo WHERE nm_placa = ?';
        const timestamps = await new Promise((resolve, reject) => {
            sqlPoolLocal.query(query, [placa], (err, results) => {
                if (err) return reject(err);
                resolve(results); 
            });
        });

        if (timestamps.length === 0) {
            return res.status(404).json({ message: 'Nenhum timestamp encontrado para a placa informada.' });
        }

        res.status(200).json(timestamps);
    } catch (error) {
        console.error('Erro ao listar timestamps:', error);
        res.status(500).json({ error: 'Erro ao listar timestamps.' });
    }
});

router.post('/limpaTimestamp', async (req, res) => {
    const { placa } = req.body;
    if (!placa) {
        return res.status(400).json({ error: 'Placa é obrigatória.' });
    }
    try {
        const query = 'DELETE FROM tb_marco_veiculo WHERE nm_placa = ?';
        await new Promise((resolve, reject) => {
            sqlPoolLocal.query(query, [placa], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        res.status(200).json({ message: 'Timestamp limpo com sucesso.' });
    } catch (error) {
        console.error('Erro ao limpar timestamp:', error);
        res.status(500).json({ error: 'Erro ao limpar timestamp.' });
    }
});

router.post('/relatorioPermanencia', async (req, res) => {
    try {
        const { placa, filtroPoligono, dataInicio, dataFim } = req.body;

        let query = `
            SELECT 
                nm_placa, 
                nm_poligono, 
                dt_entrada, 
                dt_saida,
                TIMESTAMPDIFF(MINUTE, dt_entrada, dt_saida) AS tempo_permanencia
            FROM tb_permanencia_poligono
            WHERE dt_entrada IS NOT NULL
        `;
        const params = [];

        if (placa) {
            query += ' AND nm_placa = ?';
            params.push(placa);
        }
        if (filtroPoligono) {
            query += ' AND nm_poligono = ?';
            params.push(filtroPoligono);
        }
        if (dataInicio) {
            query += ' AND dt_entrada >= ?';
            params.push(dataInicio);
        }
        if (dataFim) {
            query += ' AND dt_entrada <= ?';
            params.push(dataFim);
        }

        query += ' ORDER BY dt_entrada ASC';

        const permanencias = await new Promise((resolve, reject) => {
            sqlPoolLocal.query(query, params, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        res.status(200).json(permanencias);
    } catch (error) {
        console.error('Erro ao gerar relatório de permanência:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório de permanência.' });
    }
});

module.exports = router;