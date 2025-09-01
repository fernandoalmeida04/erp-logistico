const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const pool = require('../../config/dbConfigExt'); // Ajuste o caminho conforme necessário


app.use(bodyParser.json());

// Rota para monitoramento de frotas
router.post('/novarota', async (req, res) => {
    const parametro = req.body.param;
    
    // Verifica se o valor de "param" é vazio (Outros)
    let query = `
        SELECT tbl_empresa.snome_emp
                , tbl_cotacao.*
                , tbl_unidade.ssigla_uni
                ,TIME_TO_SEC(TIMEDIFF(now(), IF(SUBDATE(dtcoleta_cot, INTERVAL 5 HOUR)>dtstatus_cot,SUBDATE(dtcoleta_cot, INTERVAL 5 HOUR),dtstatus_cot))) AS TEMPO_CRIACAO
                ,date_format(LASTHIST,'%d/%m/%Y %H:%i') as LASTHIST
                ,TIME_TO_SEC(TIMEDIFF(now(), IF(SUBDATE(dtcoletasolicitada_col, INTERVAL 5 HOUR)>LASTHIST,SUBDATE(dtcoletasolicitada_col, INTERVAL 5 HOUR),LASTHIST))) AS TEMPO_CRIACAO_COLETA
                ,tbl_coleta_operacao.sdesc_colop
                ,tbl_nucci_tipocavalo.sdesc_ntcav
                ,snome_ctrtrf
                ,tbl_coleta.cod_col
                ,tbl_coleta.cod_sit
                ,tbl_coleta.nlastocorrencia_col
                ,tbl_contrato_nucci.cod_ctrt
        FROM tbl_cotacao 
        LEFT JOIN tbl_empresa ON tbl_cotacao.scnpj_emp = tbl_empresa.scnpj_emp
        LEFT JOIN tbl_unidade ON tbl_cotacao.npr_uni = tbl_unidade.npr_uni
        LEFT JOIN tbl_coleta_operacao ON tbl_cotacao.cod_colop = tbl_coleta_operacao.cod_colop
        LEFT JOIN tbl_coleta ON tbl_cotacao.cod_col = tbl_coleta.cod_col
        LEFT JOIN ( select cod_col, max(dtdata_chst) as LASTHIST from tbl_coleta_historico group by cod_col ) as historico on tbl_coleta.cod_col = historico.cod_col
        LEFT JOIN tbl_nucci_tipocavalo ON tbl_cotacao.ntipoveiculo_cot = tbl_nucci_tipocavalo.cod_ntcav
        LEFT JOIN tbl_contrato_ordem_coleta ON tbl_coleta.nnumero_col = tbl_contrato_ordem_coleta.nordemcoleta_coc 
            AND tbl_coleta.npr_col = tbl_contrato_ordem_coleta.npr_coc
        LEFT JOIN tbl_contrato_nucci ON tbl_contrato_ordem_coleta.cod_ctrt = tbl_contrato_nucci.cod_ctrt
        LEFT JOIN tbl_veiculo ON tbl_contrato_nucci.splaca_motor_ctrt = tbl_veiculo.splaca_veic 
        LEFT JOIN tbl_contrato_rotafinanceira ON tbl_coleta.cod_ctrtrf = tbl_contrato_rotafinanceira.cod_ctrtrf
        WHERE 
            (((((tbl_coleta.scpf_mot IS NULL or tbl_coleta.scpf_mot = '') and (tbl_coleta.splaca1_col IS NULL or tbl_coleta.splaca1_col = '')) 
                or (tbl_contrato_nucci.cod_ctrt IS NULL OR tbl_contrato_nucci.nstatus_ctrt >= 90)
            )
            AND NOT EXISTS (
                SELECT 1
                FROM tbl_contrato_ordem_coleta AS coc
                INNER JOIN tbl_contrato_nucci AS cn ON coc.cod_ctrt = cn.cod_ctrt
                WHERE coc.nordemcoleta_coc = tbl_coleta.nnumero_col
                AND coc.npr_coc = tbl_coleta.npr_col
                AND cn.nstatus_ctrt < 90
            )
            and bveic_nao_disp_col=0 
            and tbl_coleta.nlastocorrencia_col NOT IN (98) 
            )
            or (tbl_coleta.cod_sit=29 and tbl_coleta.nlastocorrencia_col IN (94,95,96) and bveic_nao_disp_col=0 ) )
            and tbl_coleta.cod_sit < 30 and tbl_coleta.cod_sit <> 11
            and tbl_cotacao.nstatus_cot <> 99
    `;

    // Condição para "Outros": Excluir PSA, Fiat e Brose
    if (parametro === 'outros') {
        query += ` AND tbl_empresa.snome_emp NOT LIKE '%psa%' AND tbl_empresa.snome_emp NOT LIKE '%brose%' AND tbl_empresa.snome_emp NOT LIKE '%stellantis%'`;
    } else if (parametro === 'stellantis') {
        query += ` AND tbl_empresa.snome_emp LIKE ? AND tbl_empresa.snome_emp NOT LIKE '%psa%'`;
    } else {
        query += ` AND tbl_empresa.snome_emp LIKE ?`;
    }

    query += `
        GROUP BY tbl_cotacao.cod_cot
        ORDER BY IF(tbl_coleta.cod_sit=29,0,1), TIME_TO_SEC(TIMEDIFF(now(), IF(SUBDATE(dtcoleta_cot, INTERVAL 5 HOUR)>dtstatus_cot,SUBDATE(dtcoleta_cot, INTERVAL 5 HOUR),dtstatus_cot))) DESC, tbl_cotacao.cod_cot ASC 
    `;

    pool.query(query, parametro ? [`%${parametro}%`] : [], (err, results, fields) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            res.status(500).send('Erro ao conectar ao banco de dados.');
            return;
        }
        res.json(results);
    });
});


module.exports = router;