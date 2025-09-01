const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const axios = require('axios'); // Importando axios
const app = express();
const sql = require('mssql');
const poolmysql = require('../../config/dbConfigLocal');

// Create a connection pool to your SQL Server database
const pool = new sql.ConnectionPool({
    user: 'sa',
    password: 'Fksadm@TI',
    server: 'VM-APLI3',
    database: 'db_PROD_FKS',
    trustServerCertificate: true
});

pool.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
        return;
    }
    console.log('Conectado ao banco de dados');
});

const moment = require('moment');

router.post('/', async (req, res) => {
    const ordemColeta       = req.body.oc;
    const motorista         = req.body.motorista;
    const placa1            = req.body.placa1;
    const placa2            = req.body.placa2;
    const placa3            = req.body.placa3;
    const observacao        = req.body.observacao;
    const coletaprogramada  = moment(req.body.cp, 'DD/MM/YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
    const entregaprogramada = moment(req.body.ep, 'DD/MM/YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
    const usuario           = req.body.usuario;
    const contrato          = req.body.contrato;

    try {
        const request = new sql.Request(pool);
        request.input('ordemColeta', sql.VarChar, ordemColeta); // Injetando o parâmetro de forma segura
        const sqlQuery = ` SELECT * FROM tb_coletas_plan WHERE ORDEM_COLETA = @ordemColeta`;
        const sqlCheck = ` SELECT * FROM tb_coletas WHERE ORDEM_COLETA = @ordemColeta`;

        const result = await request.query(sqlQuery);
        const resultCheck = await request.query(sqlCheck);

        if (result.recordset.length > 0) {
            // Atualiza registros
            request.input('ordemColetaUp', sql.VarChar, ordemColeta);
            request.input('motoristaUp', sql.VarChar, motorista);
            request.input('placa1Up', sql.VarChar, placa1);
            request.input('placa2Up', sql.VarChar, placa2);
            request.input('placa3Up', sql.VarChar, placa3);
            request.input('observacaoUp', sql.VarChar, observacao);
            request.input('usuario', sql.VarChar, usuario);
            request.input('contratoUp', sql.VarChar, contrato);

            const sqlQueryUpdate = `
                UPDATE
                    tb_coletas_plan
                SET
                    ATUALIZACAO = GETDATE(),
                    ATUALIZADO_POR = @usuario,
                    MOTORISTA = @motoristaUp,
                    PLACA1 = @placa1Up,
                    PLACA2 = @placa2Up,
                    PLACA3 = @placa3Up,
                    OBSERVACAO = @observacaoUp,
                    CONTRATO = @contratoUp
                WHERE
                    ORDEM_COLETA = @ordemColetaUp 
                    AND STS <> 998
            `;

            const resultUpdate = await request.query(sqlQueryUpdate);
            res.json({ message: 'Registros atualizados', data: resultUpdate.recordset });
        } else {
            // Insere novos registros
            request.input('ordemColetaIn', sql.VarChar, ordemColeta);
            request.input('motoristaIn', sql.VarChar, motorista);
            request.input('placa1In', sql.VarChar, placa1);
            request.input('placa2In', sql.VarChar, placa2);
            request.input('placa3In', sql.VarChar, placa3);
            request.input('observacaoIn', sql.VarChar, observacao);
            request.input('coletaProgramadaIn', sql.DateTime, coletaprogramada);
            request.input('entregaProgramadaIn', sql.DateTime, entregaprogramada);
            request.input('usuario', sql.VarChar, usuario);
            request.input('contratoIn', sql.VarChar, contrato);

            const sqlQueryInsert = `
                INSERT INTO 
                    tb_coletas_plan
                    (REGISTRO, ORDEM_COLETA, PLACA1, PLACA2, PLACA3, MOTORISTA, COLETA_PROGRAMADA, ENTREGA_PROGRAMADA, OBSERVACAO, CRIADO_POR, STS, STATUS, CONTRATO)
                VALUES
                    (GETDATE(), @ordemColetaIn, @placa1In, @placa2In, @placa3In, @motoristaIn, @coletaProgramadaIn, @entregaProgramadaIn, @observacaoIn, @usuario, '100', 'PROGRAMADO', @contratoIn)
            `;

            const resultInsert = await request.query(sqlQueryInsert);
            res.json({ message: 'Registros criados', data: resultInsert.recordset });
        }
    } catch (error) {
        console.error('Erro ao executar a rota:', error.stack);
        res.status(500).send('Erro ao executar a rota');
    }
});

router.post('/cancelar', async (req, res) => {
    const ordemColeta       = req.body.oc;

    const request = new sql.Request(pool);
    request.input('ordemColeta', sql.VarChar, ordemColeta); // Injetando o parâmetro de forma segura
    const sqlQuery = `
        UPDATE
            tb_coletas_plan
        SET
            ATUALIZACAO = GETDATE(),
            ATUALIZADO_POR = 'Teste Atualização',
            STS = 998,
            STATUS = 'CANCELADO'
        WHERE
            ORDEM_COLETA = @ordemColeta 
            AND STS <> 998
    `;

    const result = await request.query(sqlQuery);
    res.json({ message: 'Registros cancelado', data: result.recordset });
})

router.post('/alterar-inicio', async (req, res) => {
    const ordemColeta = req.body.oc;
    const newDate = req.body.newDate;

    try {
        const request = new sql.Request(pool);
        request.input('ordemColeta', sql.VarChar, ordemColeta); // Injetando o parâmetro de forma segura
        request.input('newDate', sql.VarChar, newDate);

        const sqlInsert = `
            INSERT INTO 
                tb_oc_ajuste_inicio
                (REGISTRO, ORDEM_COLETA, COLETA_PLANEJADA, COLETA_AJUSTADA, AJUSTADO_POR)
            SELECT 
                GETDATE() AS REG, 
                @ordemColeta, 
                C.COLETA_PLANEJADA, 
                @newDate AS AJUSTADA, 
                'Teste' AS USUARIO
            FROM 
                tb_coletas C
            WHERE 
                C.ORDEM_COLETA = @ordemColeta 
                AND C.STATUS <> 'CANCELAMENTO'
                AND C.COLETA_PLANEJADA < @newDate
        `;
        
        const sqlUpdate = `
            UPDATE tb_coletas set ATUALIZACAO = GETDATE(), COLETA_PLANEJADA = @newDate WHERE ORDEM_COLETA = @ordemColeta
        `;

        const resultIns = await request.query(sqlInsert);
        const resultUp = await request.query(sqlUpdate);
        res.status(200).send(resultIns); // Retorna o resultado
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao alterar a data de início');
    }
});

router.post('/dados-oc-server', async (req, res) => {
    const ordemColeta = req.body.oc;

    try {
        const request = new sql.Request(pool);
        request.input('ordemColeta', sql.VarChar, ordemColeta); // Injetando o parâmetro de forma segura

        const sqlQuery = `
            SELECT
                C.ORDEM_COLETA AS ORDEM_COLETA,
                C.PLACA1 AS PLACA1,
                C.PLACA2 AS PLACA2,
                C.PLACA3 AS PLACA3,
                C.MOTORISTA AS MOTORISTA,
                C.COLETA_PROGRAMADA AS COLETA_PLANEJADA,
                C.ENTREGA_PROGRAMADA AS ENTREGA_PLANEJADA,
                C.ID_RAST_CLIENTE AS ID_RAST_CLIENTE,
                C.ROTA AS ROTA,
                C.TOMADOR AS TOMADOR,
                C.TOMADOR_CNPJ AS TOMADOR_CNPJ,
                C.ORIGEM AS ORIGEM,
                C.ORIGEM_CNPJ AS ORIGEM_CNPJ,
                C.ORIGEM_CEP AS ORIGEM_CEP,
                C.ORIGEM_CIDADE AS ORIGEM_CIDADE,
                C.ORIGEM_UF AS ORIGEM_UF,
                C.DESTINO AS DESTINO,
                C.DESTINO_CEP AS DESTINO_CEP,
                C.DESTINO_CIDADE AS DESTINO_CIDADE,
                C.DESTINO_CNPJ AS DESTINO_CNPJ,
                C.DESTINO_UF AS DESTINO_UF,
                C.TIPO_VEICULO AS TIPO_VEICULO,
                C.STATUS AS STATUS
            FROM
                TB_COLETAS_PLAN C
            WHERE
                C.ORDEM_COLETA = @ordemColeta
        `;

        const result = await request.query(sqlQuery);
        res.status(200).send(result.recordset); // Enviar apenas o recordset, que contém os dados
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao alterar a data de início');
    }
});

router.post('/desmembrar', async (req, res) => {
    const ordemColeta = req.body.oc;
    const observacao = req.body.observacao;

    try {
        const request = new sql.Request(pool);
        request.input('ordemColeta', sql.VarChar, ordemColeta);
        request.input('observacao', sql.VarChar, observacao);

        const sqlQuery = `
            SELECT COUNT(*) AS QTD_OC, ENTREGA_PLANEJADA, ID_AGRUPAMENTO
            FROM TB_COLETAS
            WHERE ORDEM_COLETA LIKE @ordemColeta
            GROUP BY ENTREGA_PLANEJADA, ID_AGRUPAMENTO
        `;

        const result = await request.query(sqlQuery);

        if (result.recordset.length > 0) {
            const qtdOc = result.recordset[0].QTD_OC;
            const entregaPlanejada = new Date(result.recordset[0].ENTREGA_PLANEJADA);
            const idAgrupamento = result.recordset[0].ID_AGRUPAMENTO;

            let minutos = entregaPlanejada.getMinutes();
            if (minutos < 15) {
                entregaPlanejada.setMinutes(0);
            } else if (minutos >= 15 && minutos < 30) {
                entregaPlanejada.setMinutes(15);
            } else if (minutos >= 30 && minutos < 45) {
                entregaPlanejada.setMinutes(30);
            } else if (minutos >= 45) {
                entregaPlanejada.setMinutes(45);
            }

            entregaPlanejada.setMinutes(entregaPlanejada.getMinutes() + 15);
            const entregaAjustada = entregaPlanejada.toISOString().slice(0, 19).replace('T', ' ');

            const sulfixQtd = String.fromCharCode(qtdOc + 65);
            const novaOc = ordemColeta + "-" + sulfixQtd;
            console.log("Nova ordem de coleta: " + novaOc);

            if (idAgrupamento !== '') {
                const requestAgrupamento = new sql.Request(pool);
                requestAgrupamento.input('idAgrupamento', sql.VarChar, idAgrupamento);
                const sqlAgrupamento = `SELECT C.ORDEM_COLETA FROM tb_coletas C WHERE ID_AGRUPAMENTO = @idAgrupamento`;
                const resultAgrupamento = await requestAgrupamento.query(sqlAgrupamento);
                
                const ordensColeta = resultAgrupamento.recordset;

                const sqlNewAgrupamento = `
                    SELECT COUNT(DISTINCT ID_AGRUPAMENTO) AS QTD_OC_AGRUPADAS FROM tb_consolidacao_coletas;
                `;
    
                const result = await request.query(sqlNewAgrupamento);
                const ordensAgrupamento = result.recordset[0].QTD_OC_AGRUPADAS;
                const novoIDAgrupamento = "FKS" + String(ordensAgrupamento + 1).padStart(6, '0');

                for (const ordem of ordensColeta) {
                    const request2 = new sql.Request(pool);
                    const ocOriginal = ordem.ORDEM_COLETA;
                    const novasOc = ocOriginal + "-" + sulfixQtd;
                    
                    request2.input('novoIdAgrupamento', sql.VarChar, novoIDAgrupamento);
                    request2.input('novaOc', sql.VarChar, novasOc);
                    request2.input('ocOriginal', sql.VarChar, ocOriginal);
                    request2.input('entregaAjustada', sql.VarChar, entregaAjustada);
                    request2.input('observacao', sql.VarChar, observacao);

                    const sqlNovoAgrupamento = `
                        INSERT INTO tb_consolidacao_coletas(REGISTRO, ID_AGRUPAMENTO, ORDEM_COLETA, AGRUPADO_POR)
                        VALUES (GETDATE(), @novoIdAgrupamento, @novaOc, 'Usuário Teste')
                    `;
                    await request2.query(sqlNovoAgrupamento);

                    const sqlInsertQuery = `
                        INSERT INTO 
                            TB_COLETAS
                            (REGISTRO, UNIDADE, ORDEM_COLETA, ROTA, DATA, ID_AGRUPAMENTO, ID_RAST_CLIENTE, TOMADOR, TOMADOR_CNPJ, ORIGEM, 
                            ORIGEM_CNPJ, ORIGEM_CIDADE, ORIGEM_UF, ORIGEM_CEP, DESTINO, DESTINO_CNPJ, DESTINO_CIDADE, DESTINO_UF, DESTINO_CEP, COLETA_PLANEJADA, 
                            SAIDA_PLANEJADA, ENTREGA_PLANEJADA, SAIDA_ENTREGA_PLANEJADA, PLACA1, PLACA2, PLACA3, TIPO_VEICULO, MOTORISTA, STATUS, OBSERVACAO)
                        SELECT
                            GETDATE() AS REGISTRO, C.UNIDADE, @novaOc as ORDEM_COLETA, C.ROTA, C.DATA, @novoIdAgrupamento, C.ID_RAST_CLIENTE, C.TOMADOR, C.TOMADOR_CNPJ, C.ORIGEM,
                            C.ORIGEM_CNPJ, C.ORIGEM_CIDADE, C.ORIGEM_UF, C.ORIGEM_CEP, C.DESTINO, C.DESTINO_CNPJ, C.DESTINO_CIDADE, C.DESTINO_UF, C.DESTINO_CEP, @entregaAjustada, NULL, C.ENTREGA_PLANEJADA,
                            C.SAIDA_ENTREGA_PLANEJADA, C.PLACA1, C.PLACA2, C.PLACA3, C.TIPO_VEICULO, C.MOTORISTA, C.STATUS, @observacao
                        FROM TB_COLETAS C
                        WHERE C.ORDEM_COLETA = @ocOriginal;
                    `;
                    await request2.query(sqlInsertQuery);

                    const sqlUpdate1 = `
                        UPDATE tb_coletas_plan
                        SET ATUALIZACAO = GETDATE(), ENTREGA_AJUSTADA = @entregaAjustada, OC_SOLIC_AJUSTE = @ocOriginal, LANCAMENTO_MANUAL = 1, LANC_MANUAL_POR = 'Usuário Teste', STS = 999, STATUS = 'FINALIZADO'
                        WHERE ORDEM_COLETA = @ocOriginal AND STS <> 998;
                    `;
                    await request2.query(sqlUpdate1);

                    const sqlUpdate2 = `
                        UPDATE tb_coletas
                        SET ATUALIZACAO = GETDATE(), DESTINO_CIDADE = ORIGEM_CIDADE, DESTINO_UF = ORIGEM_UF, DESTINO_CEP = ORIGEM_CEP
                        WHERE ORDEM_COLETA = @ocOriginal;
                    `;
                    await request2.query(sqlUpdate2);
                }
            }

            res.status(200).send({ result: result.recordset, sufixo: sulfixQtd });
        } else {
            res.status(404).send('Nenhum resultado encontrado.');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao desmembrar');
    }
});

router.post('/consolidar', async (req, res) => {
    const ordensColetaList = req.body.oc;

    try {
        const request = new sql.Request(pool);

        const sqlQuery = `
            SELECT COUNT(DISTINCT ID_AGRUPAMENTO) AS QTD_OC_AGRUPADAS FROM tb_consolidacao_coletas;
        `;

        const result = await request.query(sqlQuery);
        const ordensColeta = result.recordset[0].QTD_OC_AGRUPADAS;
        novoIDAgrupamento = "FKS" + String(ordensColeta + 1).padStart(6, '0');

        //Instruções em Loop
        for (const ordem of ordensColetaList) {
            const coleta = ordem.oc;
            const request2 = new sql.Request(pool);
            request2.input('idAgrupamento', sql.VarChar, novoIDAgrupamento);
            request2.input('idAgrupamento2', sql.VarChar, novoIDAgrupamento);
            request2.input('ordemColeta', sql.VarChar, coleta);
            const sqlInsert = `INSERT INTO tb_consolidacao_coletas(REGISTRO, ID_AGRUPAMENTO, ORDEM_COLETA, AGRUPADO_POR) VALUES (GETDATe(), @idAgrupamento, @ordemColeta, 'Usuário Teste')`;
            const sqlUpdate = `UPDATE tb_coletas SET ID_AGRUPAMENTO = @idAgrupamento2, AGRUPADO_POR = 'Usuário Teste' WHERE ORDEM_COLETA = @ordemColeta AND STATUS <> 'CANCELAMENTO'`
            await request2.query(sqlInsert);
            await request2.query(sqlUpdate);
        }
        res.status(200).send('Consolidação efetuada com sucesso')
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao consolidar');
    }
});

router.post('/alterar-cod-rast-cli', async (req, res) => {
    const ordensColetaList = req.body.oc;
    const observacao = req.body.observacao;
    const idRastCliente = req.body.idrastcliente;
    const tomadorCnpj = req.body.tomadorcnpj;

    const ocArray = ordensColetaList.map(ordem => ordem.oc);

    try {
        const request = new sql.Request(pool);

        if (ocArray.length === 1) {
            request.input('ordemColeta', sql.VarChar, ocArray[0]);
            request.input('ordemColeta2', sql.VarChar, ocArray[0]);
            request.input('observacao', sql.VarChar, observacao);
            request.input('idRastCliente', sql.VarChar, idRastCliente);
            request.input('tomadorCnpj', sql.VarChar, tomadorCnpj);

            const sqlQuery = `
            UPDATE tb_coletas
            SET ATUALIZACAO = GETDATE(),
                ID_RAST_CLIENTE = '1 | ' + @idRastCliente,
                OBSERVACAO = @observacao,
                AJUSTADO_POR = 'Usuário Teste'
            WHERE ORDEM_COLETA = @ordemColeta
                AND STATUS <> 'CANCELAMENTO';
            `;

            const sqlQuery2 = `
            UPDATE tb_coletas
            SET ATUALIZACAO = GETDATE(),
                ID_RAST_CLIENTE = '2 | ' + @idRastCliente,
                AJUSTADO_POR = 'Usuário Teste'
            WHERE ORDEM_COLETA <> @ordemColeta2
                AND STATUS <> 'CANCELAMENTO'
                AND ID_RAST_CLIENTE = @idRastCliente
                AND TOMADOR_CNPJ = @tomadorCnpj;
            `;

            await request.query(sqlQuery);
            await request.query(sqlQuery2);
        } else if (ocArray.length > 1) {
            for (let ordem of ocArray) {
                // Limpa os parâmetros anteriores
                request.parameters = {};

                request.input('ordemColeta3', sql.VarChar, ordem);
                request.input('ordemColeta4', sql.VarChar, ordem);
                request.input('observacao2', sql.VarChar, observacao);
                request.input('idRastCliente2', sql.VarChar, idRastCliente);
                request.input('tomadorCnpj2', sql.VarChar, tomadorCnpj);

                const sqlQuery = `
                UPDATE tb_coletas
                SET ATUALIZACAO = GETDATE(),
                    ID_RAST_CLIENTE = '1 | ' + @idRastCliente2,
                    OBSERVACAO = @observacao2,
                    AJUSTADO_POR = 'Usuário Teste'
                WHERE ORDEM_COLETA = @ordemColeta3
                    AND STATUS <> 'CANCELAMENTO';
                `;

                const sqlQuery2 = `
                UPDATE tb_coletas
                SET ATUALIZACAO = GETDATE(),
                    ID_RAST_CLIENTE = '2 | ' + @idRastCliente2,
                    AJUSTADO_POR = 'Usuário Teste'
                WHERE ORDEM_COLETA <> @ordemColeta4
                    AND STATUS <> 'CANCELAMENTO'
                    AND ID_RAST_CLIENTE = @idRastCliente2
                    AND TOMADOR_CNPJ = @tomadorCnpj2;
                `;

                await request.query(sqlQuery);
                await request.query(sqlQuery2);
            }
        }

        res.status(200).send('Alterações realizadas com sucesso.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao realizar as alterações.');
    }
});

router.post('/oc-adicionais', async (req, res) => {
    const idRastCliente = req.body.irc;
    const tomadorCnpj = req.body.tcnpj;
    try {
        const request = new sql.Request(pool);
        request.input('idRastCliente', sql.VarChar, idRastCliente); // Injetando o parâmetro de forma segura
        request.input('tomadorCnpj', sql.VarChar, tomadorCnpj);
        const sqlQuery = `
            WITH TEMP_COLETAS AS
                (SELECT ORDEM_COLETA, ORIGEM, ORIGEM_CIDADE, ORIGEM_UF, DESTINO, DESTINO_CIDADE, DESTINO_UF, COLETA_PLANEJADA, ENTREGA_PLANEJADA,
                (SELECT TOP 1 COLETA_PLANEJADA FROM tb_coletas
                WHERE ID_RAST_CLIENTE= @idRastCliente AND TOMADOR_CNPJ = @tomadorCnpj AND
                STATUS <> 'CANCELAMENTO' AND ID_AGRUPAMENTO IS NULL ORDER BY COLETA_PLANEJADA) AS PRI_COLETA,
                (SELECT TOP 1 ENTREGA_PLANEJADA FROM tb_coletas
                WHERE ID_RAST_CLIENTE= @idRastCliente AND TOMADOR_CNPJ = @tomadorCnpj AND
                STATUS <> 'CANCELAMENTO' AND ID_AGRUPAMENTO IS NULL ORDER BY ENTREGA_PLANEJADA DESC) AS ULT_ENTREGA,
                (SELECT TOP 1 ORDEM_COLETA FROM tb_coletas
                WHERE ID_RAST_CLIENTE= @idRastCliente AND TOMADOR_CNPJ = @tomadorCnpj AND
                STATUS <> 'CANCELAMENTO' AND ID_AGRUPAMENTO IS NULL ORDER BY ENTREGA_PLANEJADA DESC) AS ULT_OC,
                ROW_NUMBER() OVER (PARTITION BY LEFT(C.ORDEM_COLETA, CHARINDEX('-', C.ORDEM_COLETA + '-') - 1) ORDER BY C.REGISTRO DESC) AS ROWNUM
                FROM tb_coletas C
            WHERE C.ID_RAST_CLIENTE= @idRastCliente AND C.TOMADOR_CNPJ = @tomadorCnpj AND 
            C.STATUS <> 'CANCELAMENTO' AND C.ID_AGRUPAMENTO IS NULL
            GROUP BY ORDEM_COLETA, REGISTRO, ORIGEM, ORIGEM_CIDADE, ORIGEM_UF, DESTINO, DESTINO_CIDADE, DESTINO_UF, COLETA_PLANEJADA, ENTREGA_PLANEJADA)
            
            SELECT * FROM TEMP_COLETAS WHERE ROWNUM = 1
            ORDER BY COLETA_PLANEJADA, ENTREGA_PLANEJADA
        `;

        const result = await request.query(sqlQuery);
        res.status(200).send(result.recordset); // Enviar apenas o recordset, que contém os dados
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao alterar a data de início');
    }
});

module.exports = router;
