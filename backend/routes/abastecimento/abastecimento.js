const express = require('express');
const axios = require('axios');
const cors = require('cors');
const router = express.Router();
const sqlPoolLocal = require('../../config/dbConfigLocal');
const sqlPoolExt = require('../../config/dbConfigExt');
const sql = require('mssql');
require('dotenv').config();

const pool = new sql.ConnectionPool({
    user: 'sa',
    password: 'Fksadm@TI',
    server: 'VM-APLI3',
    database: 'db_BI_FKS',
    trustServerCertificate: true,
    requestTimeout: 60000
});

pool.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
        return;
    }
    //console.log('Conectado ao banco de dados');
});

// Habilitar CORS
router.use(cors());

router.post('/solicitar', async (req, res) => {
    const { usuario, placa, latitude, longitude, litros, situacao } = req.body;
    if (!usuario || !placa || !latitude || !longitude || !litros) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }

    try {
        const query = `
            INSERT INTO tb_solicitacao_abastecimento(dt_solicitacao, nm_motorista, nm_placa1, nm_placa2, nm_placa3, cd_latitude, cd_longitude, cd_litros_liberados, nm_situacao)
            VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [usuario, placa, placa, placa, latitude, longitude, litros, situacao];
        const [result] = await sqlPoolLocal.promise().query(query, values);
        const solicitacaoId = result.insertId;

        // Emite evento para todos os clientes conectados
        req.io.emit('novaSolicitacao', {
            cd_solicitacao: solicitacaoId,
            usuario,
            placa,
            latitude,
            longitude,
            litros
        });

        res.status(201).json({
            message: 'Solicitação de abastecimento criada com sucesso',
            solicitacaoId,
            litros
        });
    } catch (error) {
        console.error('Erro ao solicitar abastecimento:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});

router.post('/liberar', async (req, res) => {
    const { solicitacaoId, litros } = req.body;
    if (!solicitacaoId || !litros) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    try {
        const query = `
            UPDATE tb_solicitacao_abastecimento
            SET cd_litros_liberados = ?, nm_situacao = 'Liberado'
            WHERE cd_solicitacao = ?
        `;
        const values = [litros, solicitacaoId];
        await sqlPoolLocal.promise().query(query, values);
        console.log('Emitindo evento solicitacaoLiberada:', { cd_solicitacao: solicitacaoId, litros });
        // Emite evento para todos os clientes conectados
        req.io.emit('solicitacaoLiberada', {
            cd_solicitacao: solicitacaoId,
            litros
        });

        res.status(200).json({
            message: 'Solicitação de abastecimento liberada com sucesso',
            solicitacaoId,
            litros
        });
    } catch (error) {
        console.error('Erro ao liberar abastecimento:', error);
        res.status(500).json({ error: 'Erro ao processar a liberação' });
    }
});

router.post('/listarSolictacao', async (req, res) => {
    try {
        const query = `
            SELECT * FROM tb_solicitacao_abastecimento
            WHERE nm_situacao = 'Pendente' ORDER BY dt_solicitacao DESC
        `;
        const [result] = await sqlPoolLocal.promise().query(query);

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao listar solicitações:', error);
        res.status(500).json({ error: 'Erro ao processar a lista de solicitações' });
    }
});

router.post('/listarHistoricoDiesel', async (req, res) => {
    const { placa } = req.body;
    if (!placa) {
        return res.status(400).json({ error: 'Placa é obrigatória' });
    }

    try {
        const query = `
            WITH HodometroAnterior AS (
            SELECT
                tb1.cod_atkt,
                (
                SELECT tb2.nkm_atkt
                FROM tbl_aereo_ticket AS tb2
                INNER JOIN tbl_veiculo AS v2 ON tb2.cod_veic = v2.cod_veic
                INNER JOIN tbl_tipocombustivel AS c2 ON tb2.cod_tpcomb = c2.cod_tpcomb
                WHERE v2.splaca_veic = v1.splaca_veic
                    AND (tb2.dtdata_atkt < tb1.dtdata_atkt
                        OR (tb2.dtdata_atkt = tb1.dtdata_atkt AND tb2.cod_atkt < tb1.cod_atkt))
                    AND tb2.nstatus_atkt <> 99
                    AND c2.ssigla_tpcomb IN ('S10', 'S50')
                ORDER BY tb2.dtdata_atkt DESC, tb2.cod_atkt DESC
                LIMIT 1
                ) AS valor
            FROM tbl_aereo_ticket tb1
            INNER JOIN tbl_veiculo v1 ON tb1.cod_veic = v1.cod_veic
            WHERE v1.splaca_veic = '${placa}'
            )
            SELECT
                IFNULL(NULLIF(DATE(tbl_aereo_ticket.dtdata_atkt), '0000-00-00'), NULL) AS DATA,
                tbl_aereo_ticket.cod_atkt AS ID_ERP,
                tbl_aereo_ticket.nnumero_atkt AS TICKET,
                tbl_veiculo.splaca_veic AS PLACA,
                tbl_empresa.srazao_emp AS FORNECEDOR,
                sdesc_ntcav AS TIPO_VEICULO,
                tbl_aereo_ticket.nkm_atkt AS HODOMETRO,
                ha.valor AS HodometroAnterior,
                CASE
                WHEN tbl_aereo_ticket.nkm_atkt - COALESCE(ha.valor, 0) < 0 THEN 0
                ELSE tbl_aereo_ticket.nkm_atkt - COALESCE(ha.valor, 0)
                END AS KM,
                tbl_aereo_ticket.dlitros_atkt AS LITROS,   
                CASE
                WHEN tbl_aereo_ticket.dlitros_atkt IS NULL OR tbl_aereo_ticket.dlitros_atkt = 0 THEN NULL
                ELSE
                    (CASE
                    WHEN tbl_aereo_ticket.nkm_atkt - COALESCE(ha.valor, 0) < 0 THEN 0
                    ELSE tbl_aereo_ticket.nkm_atkt - COALESCE(ha.valor, 0)
                    END) / tbl_aereo_ticket.dlitros_atkt
                END AS CONSUMO,  
                tbl_tipocombustivel.ssigla_tpcomb AS COMBUSTIVEL,
                tbl_aereo_ticket.dtarifa_atkt AS PRECO,    
                tbl_aereo_ticket.bintegracao_atkt AS INTEGRACAO,
                CASE
                    WHEN tbl_aereo_ticket.nstatus_atkt = 1 THEN 'EMITIDO'
                    WHEN tbl_aereo_ticket.nstatus_atkt = 99 THEN 'CANCELADO'
                    ELSE 'OUTRO'
                END AS STATUS,
                IFNULL(NULLIF(tbl_aereo_ticket.dtcreate_atkt, '0000-00-00'), NULL) AS DATA_CRIACAO,
                IFNULL(NULLIF(tbl_aereo_ticket.dtupdate_atkt, '0000-00-00'), NULL) AS DATA_UPDATE,
                CASE
                    WHEN sdesc_ntcav = 'CAVALO 4X2' THEN 2.75
                    WHEN sdesc_ntcav = 'CAVALO 6X2' THEN 2.70
                    WHEN sdesc_ntcav = 'CAVALO 6X4' THEN 1.90
                    WHEN sdesc_ntcav = 'TRUCK' THEN 3.90
                    ELSE NULL
                END AS META1,
                CASE
                    WHEN sdesc_ntcav = 'CAVALO 4X2' THEN 3.00
                    WHEN sdesc_ntcav = 'CAVALO 6X2' THEN 2.75
                    WHEN sdesc_ntcav = 'CAVALO 6X4' THEN 2.00
                    WHEN sdesc_ntcav = 'TRUCK' THEN 4.00
                    ELSE NULL
                END AS META2,
                CASE
                    WHEN sdesc_ntcav = 'CAVALO 4X2' THEN 3.25
                    WHEN sdesc_ntcav = 'CAVALO 6X2' THEN 3.00
                    WHEN sdesc_ntcav = 'CAVALO 6X4' THEN 2.10
                    WHEN sdesc_ntcav = 'TRUCK' THEN 4.15
                    ELSE NULL
                END AS META3
            FROM
                tbl_aereo_ticket
                INNER JOIN tbl_veiculo ON tbl_aereo_ticket.cod_veic = tbl_veiculo.cod_veic
                LEFT JOIN tbl_empresa ON tbl_aereo_ticket.scnpj_emp = tbl_empresa.scnpj_emp
                LEFT JOIN tbl_aereo_voo_trecho_ticket ON tbl_aereo_ticket.cod_atkt = tbl_aereo_voo_trecho_ticket.cod_atkt
                LEFT JOIN tbl_aereo_voo_trecho ON tbl_aereo_voo_trecho_ticket.cod_avt = tbl_aereo_voo_trecho.cod_avt
                LEFT JOIN tbl_aereo_flightlog ON tbl_aereo_voo_trecho.cod_afl = tbl_aereo_flightlog.cod_afl
                LEFT JOIN tbl_nucci_tipocavalo ON tbl_nucci_tipocavalo.cod_ntcav = tbl_veiculo.cod_tcav
                LEFT JOIN tbl_tipocombustivel ON tbl_aereo_ticket.cod_tpcomb = tbl_tipocombustivel.cod_tpcomb
                LEFT JOIN tbl_nfs ON tbl_aereo_ticket.cod_nfs = tbl_nfs.cod_nfs
                LEFT JOIN HodometroAnterior ha ON tbl_aereo_ticket.cod_atkt = ha.cod_atkt
            WHERE  	
                tbl_veiculo.splaca_veic = '${placa}'
                AND tbl_tipocombustivel.ssigla_tpcomb <> 'ARL'
            ORDER BY
                tbl_aereo_ticket.dtdata_atkt DESC
            LIMIT 1
        `;
        const [result] = await sqlPoolExt.promise().query(query, [placa]);

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao listar histórico:', error);
        res.status(500).json({ error: 'Erro ao processar o histórico de solicitações' });
    }
});

router.post('/listarHistoricoArla', async (req, res) => {
    const { placa } = req.body;
    if (!placa) {
        return res.status(400).json({ error: 'Placa é obrigatória' });
    }

    try {
        const query = `
                WITH HodometroAnterior AS (
                    SELECT
                        tb1.cod_atkt,
                        (
                        SELECT tb2.nkm_atkt
                        FROM tbl_aereo_ticket AS tb2
                        INNER JOIN tbl_veiculo AS v2 ON tb2.cod_veic = v2.cod_veic
                        INNER JOIN tbl_tipocombustivel AS c2 ON tb2.cod_tpcomb = c2.cod_tpcomb
                        WHERE v2.splaca_veic = v1.splaca_veic
                            AND (tb2.dtdata_atkt < tb1.dtdata_atkt
                                OR (tb2.dtdata_atkt = tb1.dtdata_atkt AND tb2.cod_atkt < tb1.cod_atkt))
                            AND tb2.nstatus_atkt <> 99
                            AND c2.ssigla_tpcomb IN ('S10', 'S50')
                        ORDER BY tb2.dtdata_atkt DESC, tb2.cod_atkt DESC
                        LIMIT 1
                        ) AS valor
                    FROM tbl_aereo_ticket tb1
                    INNER JOIN tbl_veiculo v1 ON tb1.cod_veic = v1.cod_veic
                    WHERE v1.splaca_veic = '${placa}'
                    )
                    SELECT
                        IFNULL(NULLIF(DATE(tbl_aereo_ticket.dtdata_atkt), '0000-00-00'), NULL) AS DATA,
                        tbl_aereo_ticket.cod_atkt AS ID_ERP,
                        tbl_aereo_ticket.nnumero_atkt AS TICKET,
                        tbl_veiculo.splaca_veic AS PLACA,
                        tbl_empresa.srazao_emp AS FORNECEDOR,
                        sdesc_ntcav AS TIPO_VEICULO,
                        tbl_aereo_ticket.nkm_atkt AS HODOMETRO,
                        ha.valor AS HodometroAnterior,
                        CASE
                        WHEN tbl_aereo_ticket.nkm_atkt - COALESCE(ha.valor, 0) < 0 THEN 0
                        ELSE tbl_aereo_ticket.nkm_atkt - COALESCE(ha.valor, 0)
                        END AS KM,
                        tbl_aereo_ticket.dlitros_atkt AS LITROS,  
                        CASE
                        WHEN tbl_aereo_ticket.dlitros_atkt IS NULL OR tbl_aereo_ticket.dlitros_atkt = 0 THEN NULL
                        ELSE
                            (CASE
                            WHEN tbl_aereo_ticket.nkm_atkt - COALESCE(ha.valor, 0) < 0 THEN 0
                            ELSE tbl_aereo_ticket.nkm_atkt - COALESCE(ha.valor, 0)
                            END) / tbl_aereo_ticket.dlitros_atkt
                        END AS CONSUMO,  
                        tbl_tipocombustivel.ssigla_tpcomb AS COMBUSTIVEL,
                        tbl_aereo_ticket.dtarifa_atkt AS PRECO,    
                        tbl_aereo_ticket.bintegracao_atkt AS INTEGRACAO,
                        CASE
                            WHEN tbl_aereo_ticket.nstatus_atkt = 1 THEN 'EMITIDO'
                            WHEN tbl_aereo_ticket.nstatus_atkt = 99 THEN 'CANCELADO'
                            ELSE 'OUTRO'
                        END AS STATUS,
                        IFNULL(NULLIF(tbl_aereo_ticket.dtcreate_atkt, '0000-00-00'), NULL) AS DATA_CRIACAO,
                        IFNULL(NULLIF(tbl_aereo_ticket.dtupdate_atkt, '0000-00-00'), NULL) AS DATA_UPDATE,
                        CASE
                            WHEN sdesc_ntcav = 'CAVALO 4X2' THEN 2.75
                            WHEN sdesc_ntcav = 'CAVALO 6X2' THEN 2.70
                            WHEN sdesc_ntcav = 'CAVALO 6X4' THEN 1.90
                            WHEN sdesc_ntcav = 'TRUCK' THEN 3.90
                            ELSE NULL
                        END AS META1,
                        CASE
                            WHEN sdesc_ntcav = 'CAVALO 4X2' THEN 3.00
                            WHEN sdesc_ntcav = 'CAVALO 6X2' THEN 2.75
                            WHEN sdesc_ntcav = 'CAVALO 6X4' THEN 2.00
                            WHEN sdesc_ntcav = 'TRUCK' THEN 4.00
                            ELSE NULL
                        END AS META2,
                        CASE
                            WHEN sdesc_ntcav = 'CAVALO 4X2' THEN 3.25
                            WHEN sdesc_ntcav = 'CAVALO 6X2' THEN 3.00
                            WHEN sdesc_ntcav = 'CAVALO 6X4' THEN 2.10
                            WHEN sdesc_ntcav = 'TRUCK' THEN 4.15
                            ELSE NULL
                        END AS META3,
                        CASE   
   							WHEN sdesc_ntcav = 'CAVALO 4X2' AND smodelo_veic in ('19380','ACTROS 2045S') THEN 39
   							WHEN sdesc_ntcav = 'CAVALO 4X2' AND smodelo_veic = 'AXOR 2041 LS' THEN 70
    						WHEN sdesc_ntcav = 'CAVALO 6X2' AND smodelo_veic = '25480' THEN 40
    						WHEN sdesc_ntcav = 'CAVALO 6X2' AND smodelo_veic IN ('ACTROS 2548S','STRALIS 600S44 T') THEN 44
    						WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic IN ('29530','ACTROS 2653S') THEN 38
    						WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic = 'ACTROS 2651S' THEN 30
    						WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic = 'FH 540 6X4' THEN 25
    						WHEN sdesc_ntcav = 'TRUCK' THEN 35 ELSE NULL
						END AS META1_ARLA,
						CASE
							WHEN sdesc_ntcav = 'CAVALO 4X2' AND smodelo_veic IN ('19380','ACTROS 2045S') THEN 42
   							WHEN sdesc_ntcav = 'CAVALO 4X2' AND smodelo_veic = 'AXOR 2041 LS' THEN 80
    						WHEN sdesc_ntcav = 'CAVALO 6X2' AND smodelo_veic = '25480' THEN 46
    						WHEN sdesc_ntcav = 'CAVALO 6X2' AND smodelo_veic IN ('ACTROS 2548S','STRALIS 600S44 T') THEN 48
    						WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic IN ('29530','ACTROS 2653S') THEN 41
    						WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic = 'ACTROS 2651S' THEN 35
    						WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic = 'FH 540 6X4' THEN 30
    						WHEN sdesc_ntcav = 'TRUCK' THEN 40  ELSE NULL
   						END as META2_ARLA,
   						CASE
   							WHEN sdesc_ntcav = 'CAVALO 4X2'  AND smodelo_veic IN ('19380','ACTROS 2045S') THEN 42
    						WHEN sdesc_ntcav = 'CAVALO 4X2'  AND smodelo_veic = 'AXOR 2041 LS' THEN 80
   							WHEN sdesc_ntcav = 'CAVALO 6X2'  AND smodelo_veic = '25480' THEN 46
   							WHEN sdesc_ntcav = 'CAVALO 6X2'  AND smodelo_veic IN ('ACTROS 2548S','STRALIS 600S44 T') THEN 48
    						WHEN sdesc_ntcav = 'CAVALO 6X4'  AND smodelo_veic IN ('29530','ACTROS 2653S') THEN 41
    						WHEN sdesc_ntcav = 'CAVALO 6X4'  AND smodelo_veic = 'ACTROS 2651S' THEN 35
    						WHEN sdesc_ntcav = 'CAVALO 6X4'  AND smodelo_veic = 'FH 540 6X4' THEN 30
    						WHEN sdesc_ntcav = 'TRUCK' THEN 40
    						END AS META3_ARLA
                        FROM
                        tbl_aereo_ticket
                        INNER JOIN tbl_veiculo ON tbl_aereo_ticket.cod_veic = tbl_veiculo.cod_veic
                        LEFT JOIN tbl_empresa ON tbl_aereo_ticket.scnpj_emp = tbl_empresa.scnpj_emp
                        LEFT JOIN tbl_aereo_voo_trecho_ticket ON tbl_aereo_ticket.cod_atkt = tbl_aereo_voo_trecho_ticket.cod_atkt
                        LEFT JOIN tbl_aereo_voo_trecho ON tbl_aereo_voo_trecho_ticket.cod_avt = tbl_aereo_voo_trecho.cod_avt
                        LEFT JOIN tbl_aereo_flightlog ON tbl_aereo_voo_trecho.cod_afl = tbl_aereo_flightlog.cod_afl
                        LEFT JOIN tbl_nucci_tipocavalo ON tbl_nucci_tipocavalo.cod_ntcav = tbl_veiculo.cod_tcav
                        LEFT JOIN tbl_tipocombustivel ON tbl_aereo_ticket.cod_tpcomb = tbl_tipocombustivel.cod_tpcomb
                        LEFT JOIN tbl_nfs ON tbl_aereo_ticket.cod_nfs = tbl_nfs.cod_nfs
                        LEFT JOIN HodometroAnterior ha ON tbl_aereo_ticket.cod_atkt = ha.cod_atkt
                    WHERE  
                        tbl_veiculo.splaca_veic = '${placa}'
                        AND tbl_tipocombustivel.ssigla_tpcomb = 'ARL'
                    ORDER BY
                        tbl_aereo_ticket.dtdata_atkt DESC
                    LIMIT 1
        `;
        const [result] = await sqlPoolExt.promise().query(query, [placa]);

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao listar histórico:', error);
        res.status(500).json({ error: 'Erro ao processar o histórico de solicitações' });
    }
});

router.post('/checkDadosViagens', async (req, res) => {
    const placa = req.body.placa;

    const request = new sql.Request(pool);
    request.input('placa', sql.VarChar, placa); // Injetando o parâmetro de forma segura
    const sqlQuery = `
        select top 1
            coleta_id,
            ct.registro,
            cl.COLETA_PLANEJADA,
            SAIDA_PLANEJADA,
            distancia_km,
            CAST(ROUND(distancia_km / 2.70, 2) AS DECIMAL(10, 2)) AS meta1,
            CAST(ROUND(distancia_km / 2.75, 2) AS DECIMAL(10, 2)) AS meta2,
            CAST(ROUND(distancia_km / 3.00, 2) AS DECIMAL(10, 2)) AS meta3,
            CAST(ROUND(distancia_km / 2.82, 2) AS DECIMAL(10, 2)) AS Ideal,
            cl.PLACA1,
            te.LATITUDE as ORIGEM_LAT,
            te.LONGITUDE as ORIGEM_LONG,
            te2.LATITUDE as DESTINO_LAT,
            te2.LONGITUDE as DESTINO_LONG
        from tb_cotacoes ct
        left join tb_coletas cl on cl.ordem_coleta = ct.COLETA_ID
        left join tb_empresas te on ct.ORIGEM_CNPJ = te.CNPJ
        left join tb_empresas te2 on ct.DESTINO_CNPJ = te2.CNPJ
        where PLACA1 = @placa
        order by ct.REGISTRO desc
    `;

    const result = await request.query(sqlQuery);
    res.status(200).json(result);
});

router.post('/savePreticketAbastecimento', async (req, res) => {
    const {
        codTicketNucci,
        placa,
        tipoVeiculo,
        tipoAbastecimento,
        posto,
        qtdeLitros,
        valorLitro,
        valorTotal,
        consumoAnterior,
        litrosCalculados,
        litrosReais,
        motorista,
        metaReal,
        observacao,
        hodometroAnterior,
        hodometroAtual,
        distancia,
        usuario
    } = req.body;

    if (
        !codTicketNucci || !placa || !tipoVeiculo || !tipoAbastecimento || !posto ||
        qtdeLitros == null || valorLitro == null || valorTotal == null ||
        consumoAnterior == null || hodometroAnterior == null || hodometroAtual == null ||
        distancia == null || !usuario || !motorista
    ) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }

    const insertQuery = `
        INSERT INTO tb_preticket_abastecimento (
            dt_create,
            cd_ticket_nucci,
            nm_placa,
            nm_tipo_veiculo,
            nm_tipo_abastecimento,
            nm_posto,
            cd_litros,
            cd_valor_litro,
            cd_valor_total,
            cd_consumo_anterior,
            nm_motorista,
            cd_consumo_atual,
            nm_observacao,
            cd_hodometro_anterior,
            cd_hodometro_atual,
            cd_distancia,
            nm_usrcreate,
            cd_valor_calculado,
            cd_valor_real
        ) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        codTicketNucci,
        placa,
        tipoVeiculo,
        tipoAbastecimento,
        posto,
        qtdeLitros,
        valorLitro,
        valorTotal,
        consumoAnterior,
        motorista,
        metaReal,
        observacao,
        hodometroAnterior,
        hodometroAtual,
        distancia,
        usuario,
        litrosCalculados,
        litrosReais
    ];

    sqlPoolLocal.query(insertQuery, values, (err, results) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            return res.status(500).send('Erro ao conectar ao banco de dados.');
        }
        res.json({ success: true, id: results.insertId });
    });
});

router.post('/checkAbastecimento', async (req, res) => {
    const { placa, tipoAbastecimento } = req.body;
    if (!placa) {
        return res.status(400).json({ error: 'Placa é obrigatória' });
    }

    try {
        const query = `
            SELECT 
            *,
            CASE
                WHEN nm_tipo_veiculo = 'Cavalo 4x2' THEN 2.75
                WHEN nm_tipo_veiculo = 'Cavalo 6x2' THEN 2.70
                WHEN nm_tipo_veiculo = 'Cavalo 6x4' THEN 1.90
                WHEN nm_tipo_veiculo = 'Truck' THEN 3.90
                ELSE NULL
            END AS META1,
            CASE
                WHEN nm_tipo_veiculo = 'Cavalo 4x2' THEN 3.00
                WHEN nm_tipo_veiculo = 'Cavalo 6x2' THEN 2.75
                WHEN nm_tipo_veiculo = 'Cavalo 6x4' THEN 2.00
                WHEN nm_tipo_veiculo = 'Truck' THEN 4.00
                ELSE NULL
            END AS META2,
            CASE
                WHEN nm_tipo_veiculo = 'Cavalo 4x2' THEN 3.25
                WHEN nm_tipo_veiculo = 'Cavalo 6x2' THEN 3.00
                WHEN nm_tipo_veiculo = 'Cavalo 6x4' THEN 2.10
                WHEN nm_tipo_veiculo = 'Truck' THEN 4.15
                ELSE NULL
            END AS META3 
            FROM tb_preticket_abastecimento
            WHERE nm_placa = ? AND nm_tipo_abastecimento = ?
            ORDER BY dt_create DESC
        `;
        const [result] = await sqlPoolLocal.promise().query(query, [placa, tipoAbastecimento]);

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao verificar abastecimento:', error);
        res.status(500).json({ error: 'Erro ao processar a verificação de abastecimento' });
    }
});

router.post('/autoCompletePlaca', async (req, res) => {
    const query = `
        SELECT DISTINCT splaca_veic
        FROM tbl_veiculo
        LEFT JOIN tbl_nucci_tipocavalo ON tbl_nucci_tipocavalo.cod_ntcav = tbl_veiculo.cod_tcav
        WHERE nstatus_veic NOT IN (99, 8) 
        AND tbl_nucci_tipocavalo.sdesc_ntcav IN ('CAVALO 4X2', 'CAVALO 6X2', 'CAVALO 6X4', 'TRUCK')
        AND tbl_veiculo.nclassinterna_veic = 1
    `;
    try {
        const [results] = await sqlPoolExt.promise().query(query);
        res.status(200).json(results);
    } catch (error) {
        console.error('Erro ao buscar placas:', error);
        res.status(500).json({ error: 'Erro ao buscar placas' });
    }
});

router.post('/autoCompletePlacaChecklist', async (req, res) => {
    const query = `
        SELECT DISTINCT splaca_veic, sdesc_ntcav
        FROM tbl_veiculo
        LEFT JOIN tbl_nucci_tipocavalo ON tbl_nucci_tipocavalo.cod_ntcav = tbl_veiculo.cod_tcav
        WHERE nstatus_veic NOT IN (99, 8)
        AND tbl_nucci_tipocavalo.sdesc_ntcav IN ('CAVALO 4X2', 'CAVALO 6X2', 'CAVALO 6X4', 'TRUCK', 'Carreta Reta', 'Carreta Rebaixada', 'Carreta Vanderleia', 'Carreta BigSider', 'Carreta Porta Container')
        AND tbl_veiculo.nclassinterna_veic = 1
    `;
    try {
        const [results] = await sqlPoolExt.promise().query(query);
        res.status(200).json(results);
    } catch (error) {
        console.error('Erro ao buscar placas:', error);
        res.status(500).json({ error: 'Erro ao buscar placas' });
    }
});

router.post('/autoCompleteMotorista', async (req, res) => {
    const query = `
        SELECT DISTINCT snome_mot FROM tbl_motorista m WHERE m.nstatus_mot IN (0,1) AND m.setnia_mot <> 'XXX'
    `;
    try {
        const [results] = await sqlPoolExt.promise().query(query);
        res.status(200).json(results);
    } catch (error) {
        console.error('Erro ao buscar motoristas:', error);
        res.status(500).json({ error: 'Erro ao buscar motoristas' });
    }
});

router.post('/checkVehicleType', async (req, res) => {
    const { placa } = req.body;
    if (!placa) {
        return res.status(400).json({ error: 'Placa é obrigatória' });
    }

    try {
        const query = `
            SELECT
                sdesc_ntcav AS TIPO_VEICULO,
                smodelo_veic AS MODELO_VEICULO,
                CASE
                    WHEN sdesc_ntcav = 'CAVALO 4X2' THEN 2.75
                    WHEN sdesc_ntcav = 'CAVALO 6X2' THEN 2.70
                    WHEN sdesc_ntcav = 'CAVALO 6X4' THEN 1.90
                    WHEN sdesc_ntcav = 'TRUCK' THEN 3.90
                    ELSE NULL
                END AS META1,
                CASE
                    WHEN sdesc_ntcav = 'CAVALO 4X2' THEN 3.00
                    WHEN sdesc_ntcav = 'CAVALO 6X2' THEN 2.75
                    WHEN sdesc_ntcav = 'CAVALO 6X4' THEN 2.00
                    WHEN sdesc_ntcav = 'TRUCK' THEN 4.00
                    ELSE NULL
                END AS META2,
                CASE
                    WHEN sdesc_ntcav = 'CAVALO 4X2' THEN 3.25
                    WHEN sdesc_ntcav = 'CAVALO 6X2' THEN 3.00
                    WHEN sdesc_ntcav = 'CAVALO 6X4' THEN 2.10
                    WHEN sdesc_ntcav = 'TRUCK' THEN 4.15
                    ELSE NULL
                END AS META3,
				CASE   
                    WHEN sdesc_ntcav = 'CAVALO 4X2' AND smodelo_veic in ('19380','ACTROS 2045S') THEN 39
                    WHEN sdesc_ntcav = 'CAVALO 4X2' AND smodelo_veic = 'AXOR 2041 LS' THEN 70
                    WHEN sdesc_ntcav = 'CAVALO 6X2' AND smodelo_veic = '25480' THEN 40
                    WHEN sdesc_ntcav = 'CAVALO 6X2' AND smodelo_veic IN ('ACTROS 2548S','STRALIS 600S44 T') THEN 44
                    WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic IN ('29530','ACTROS 2653S') THEN 38
                    WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic = 'ACTROS 2651S' THEN 30
                    WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic = 'FH 540 6X4' THEN 25
                    WHEN sdesc_ntcav = 'TRUCK' THEN 35 ELSE NULL
				END AS META1_ARLA,
				CASE
					WHEN sdesc_ntcav = 'CAVALO 4X2' AND smodelo_veic IN ('19380','ACTROS 2045S') THEN 42
                    WHEN sdesc_ntcav = 'CAVALO 4X2' AND smodelo_veic = 'AXOR 2041 LS' THEN 80
                    WHEN sdesc_ntcav = 'CAVALO 6X2' AND smodelo_veic = '25480' THEN 46
                    WHEN sdesc_ntcav = 'CAVALO 6X2' AND smodelo_veic IN ('ACTROS 2548S','STRALIS 600S44 T') THEN 48
                    WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic IN ('29530','ACTROS 2653S') THEN 41
                    WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic = 'ACTROS 2651S' THEN 35
                    WHEN sdesc_ntcav = 'CAVALO 6X4' AND smodelo_veic = 'FH 540 6X4' THEN 30
                    WHEN sdesc_ntcav = 'TRUCK' THEN 40  ELSE NULL
                END as META2_ARLA,
                CASE
                    WHEN sdesc_ntcav = 'CAVALO 4X2'  AND smodelo_veic IN ('19380','ACTROS 2045S') THEN 42
                    WHEN sdesc_ntcav = 'CAVALO 4X2'  AND smodelo_veic = 'AXOR 2041 LS' THEN 80
                    WHEN sdesc_ntcav = 'CAVALO 6X2'  AND smodelo_veic = '25480' THEN 46
                    WHEN sdesc_ntcav = 'CAVALO 6X2'  AND smodelo_veic IN ('ACTROS 2548S','STRALIS 600S44 T') THEN 48
                    WHEN sdesc_ntcav = 'CAVALO 6X4'  AND smodelo_veic IN ('29530','ACTROS 2653S') THEN 41
                    WHEN sdesc_ntcav = 'CAVALO 6X4'  AND smodelo_veic = 'ACTROS 2651S' THEN 35
                    WHEN sdesc_ntcav = 'CAVALO 6X4'  AND smodelo_veic = 'FH 540 6X4' THEN 30
                    WHEN sdesc_ntcav = 'TRUCK' THEN 40
                END AS META3_ARLA
            FROM
                tbl_aereo_ticket
                INNER JOIN tbl_veiculo ON tbl_aereo_ticket.cod_veic = tbl_veiculo.cod_veic
                LEFT JOIN tbl_nucci_tipocavalo ON tbl_nucci_tipocavalo.cod_ntcav = tbl_veiculo.cod_tcav
            WHERE  	
                tbl_veiculo.splaca_veic = '${placa}'
            LIMIT 1
        `;
        const [result] = await sqlPoolExt.promise().query(query, [placa]);

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao verificar tipo de veículo:', error);
        res.status(500).json({ error: 'Erro ao processar a verificação de tipo de veículo' });
    }
});

router.post('/listaPostos', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT(nm_posto) FROM tb_preticket_abastecimento
        `;
        const [result] = await sqlPoolLocal.promise().query(query);

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao listar postos:', error);
        res.status(500).json({ error: 'Erro ao processar a lista de postos' });
    }
});

module.exports = router;