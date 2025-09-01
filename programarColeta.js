const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios'); // Importando axios
const app = express();
const port = 3001;
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const pool = require('../../config/dbConfigExt');
const ordemcoletaRoutes = require('./ordemcoleta');
const programacao = require('./programacao');
const specificCases = require('./specificCases');
const apiNucci = process.env.APP_API_URL_NUCCI;
const router = express.Router();

router.use(cors());
router.use(bodyParser.json()); // Adicionando body-parser para processar JSON
router.use(express.json());

// Rota básica
router.get('/', (req, res) => {
    res.send('Olá, Backend!');
});

// Middleware para armazenar o token de autenticação na requisição
const authMiddleware = async (req, res, next) => {
    try {
      const loginResponse = await axios.post('https://api.showtecnologia.com/api/login', {
        user: "rodrigo.nascimento@fkslogistics.com.br",
        password: "78393c9d90bd592a185735d28b4b42a8"
      });
  
      const authToken = loginResponse.data.token;
      req.authToken = authToken;

      next();
    } catch (error) {
      console.error('Erro ao realizar login:', error.response ? error.response.data : error.message);
      res.status(500).send('Erro ao realizar login');
    }
};
  
// Utilize a middleware em suas rotas
router.use(authMiddleware);

// Usando as rotas do outro arquivo js
router.use('/oc', ordemcoletaRoutes);
router.use('/programar', programacao);
router.use('/specificCases', specificCases);

// Rota para criação de contratos da nucci
router.post('/proxy-tms', async (req, res) => {
  try {
    // Faz a requisição para o servidor TMS
    const response = await fetch(`https://fks.nuccierp.com.br/rest/tms/v1.2/contrato/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('fks_apifernando:noaRn#ugvf6r7goFW9pwbfdipsug56d54f$e').toString('base64')
      },
      body: JSON.stringify(req.body)
    });

    // Verifica se a requisição foi bem-sucedida
    if (!response.ok) {
      throw new Error('Erro na resposta do servidor TMS');
    }

    const data = await response.json();
    res.json(data); // Retorna a resposta ao frontend

  } catch (error) {
    console.error('Erro ao comunicar com o TMS:', error.message);
    res.status(500).json({ error: 'Erro ao comunicar com o TMS' });
  }
});

// Verifica se existe oc de volta na cotação
router.post('/checkContract', async (req, res) => {
  const codCol = req.body.codCol; // Parâmetro enviado pela requisição
  
  try {
    // Consulta o usuário no banco de dados
    const query = `SELECT c.scontacontabil_cot FROM tbl_cotacao c WHERE c.cod_col = ? AND nstatus_cot <> 99`;
    const result = await new Promise((resolve, reject) => {
      pool.query(query, [codCol], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if(result.length > 0){
      res.json({ status: 'OK', data: result[0].scontacontabil_cot });
    }
    else {
      res.json({ status: 'NO_RESULT' });
    }
  } catch (error) {
    console.error('Erro na consulta MySQL:', error);
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// Nova rota para acessar o endpoint de monitoramento de frotas
router.post('/frotas/monitoramento', async (req, res) => {
    try {
      const response = await axios.post('https://api.showtecnologia.com/api/frotas/monitoramento/grid', 
        {
        }, // corpo da requisição
        {
          headers: {
            'x-access-token': req.authToken
          }
        }
      );
      res.json(response.data.dados.grid)
    } catch (error) {
      console.error('Erro ao acessar o endpoint de monitoramento de frotas:', error.response ? error.response.data : error.message);
      res.status(500).send('Erro ao acessar o endpoint de monitoramento de frotas');
    }
});

// Rota que trás as informações da Ordem de Coleta digitada
router.post('/dados-oc', async (req, res) => {
  const ocoleta = req.body.oc;
  const query = `
  SELECT 
    tc.cod_col AS ORDEM_COLETA,
    tc.scodativacao_col AS ID_RAST_CLIENTE,
    null AS ID_AGRUPAMENTO,
    tv.mobs_veic AS OPERACAO,
    tc.scnpj_emp_col AS TOMADOR_CNPJ,
    E3.srazao_emp AS TOMADOR_NOME,
    tc.dtcoletasolicitada_col AS COLETA_PLANEJADA,
    COALESCE(tc.dtcoletaefetiva_col, tc.dtprevisaoentrega_col) AS ENTREGA_PLANEJADA,
    IF(CP.scnpjcpf_clocal IS NULL,E3.snome_emp, te.srazao_emp) AS ORIGEM,
    IF(CP.scnpjcpf_clocal IS NULL,E3.scnpj_emp, te.scnpj_emp) AS ORIGEM_CNPJ,
    IF(CP.scidade_clocal  IS NULL,E3.scidade_emp,CP.scidade_clocal) AS ORIGEM_CIDADE,
    IF(CP.suf_clocal      IS NULL,E3.suf_emp , te.suf_emp) AS ORIGEM_UF,
    IF(CP.scnpjcpf_clocal IS NULL,E3.scep_emp, te.scep_emp) AS ORIGEM_CEP,
    E2.snome_emp AS DESTINO,
    E2.scidade_emp AS DESTINO_CIDADE,
    E2.suf_emp AS DESTINO_UF,
    E2.dlatitude_emp AS DESTINO_LATITUDE,
    E2.dlongitude_emp AS DESTINO_LONGITUDE,
    UPPER(tnv.sdesc_ntcav) AS TIPO_VEICULO,
    tv.smodelo_veic AS MODELO,
    tcr.snome_ctrtrf AS ROTA,
    tc.splaca1_col AS PLACA1,
    tc.splaca2_col AS PLACA2,
    tc.splaca3_col AS PLACA3,
    tm.snome_mot AS MOTORISTA,
    tm.scpf_mot AS MOTORISTA_CPF,
    ts.snome_sit AS STATUS,
    (SELECT MIN(tc.cod_col) FROM tbl_coleta tc WHERE tc.cod_col = ?) AS PRI_OC,
    (SELECT MAX(tc.cod_col) FROM tbl_coleta tc WHERE tc.cod_col = ?) AS ULT_OC,
    tc.cod_ctrtrf as CONTRATO
  FROM tbl_coleta tc
    LEFT JOIN tbl_coleta_local CP ON CP.cod_col = tc.cod_col
    LEFT JOIN tbl_empresa te ON te.scnpj_emp = CP.scnpjcpf_clocal
    LEFT JOIN tbl_empresa E2 ON E2.scnpj_emp = tc.scnpj_emp_dest
    LEFT JOIN tbl_empresa E3 ON E3.scnpj_emp = tc.scnpj_emp_col
    LEFT JOIN tbl_veiculo tv ON tc.splaca1_col = tv.splaca_veic
    LEFT JOIN tbl_contrato_rotafinanceira tcr ON tcr.cod_ctrtrf = tc.cod_ctrtrf 
    LEFT JOIN tbl_motorista tm ON tc.splaca1_col = tm.splacapadrao_mot
    LEFT JOIN tbl_contrato_ordem_coleta tcoc ON tc.cod_col = tcoc.nordemcoleta_coc
    LEFT JOIN tbl_situacao ts ON tc.cod_sit = ts.cod_sit 
    LEFT JOIN tbl_nucci_tipocavalo tnv ON tv.cod_tcav = tnv.cod_ntcav
  WHERE 
    tc.cod_col = ?
  GROUP BY tc.cod_col, tc.scodativacao_col, tv.mobs_veic, tc.scnpj_emp_col, E3.srazao_emp, tc.dtcoletasolicitada_col, ENTREGA_PLANEJADA, te.snome_emp,
    tc.scnpj_emp_col, te.scep_emp, te.scidade_emp, te.suf_emp, tc.sclientedestino_col, TIPO_VEICULO, tv.smodelo_veic, tcr.snome_ctrtrf,
    tc.splaca1_col, tc.splaca2_col, tc.splaca3_col, tm.snome_mot, ts.snome_sit, ULT_OC, tc.cod_ctrtrf
  `;

  pool.query(query, [ocoleta, ocoleta, ocoleta], (err, results, fields) => {
    if (err) {
        console.error('Erro ao executar a query:', err.stack);
        res.status(500).send('Erro ao conectar ao banco de dados.');
        return;
    }

    let pagador = '';
    if (results.length > 0) {
      const firstResult = results[0];  // Obtém o primeiro resultado

      if (firstResult.TOMADOR_CNPJ === '16701716003414' || 
          firstResult.TOMADOR_CNPJ === '07374996000578' || 
          firstResult.TOMADOR_CNPJ === '18084354000550' || 
          firstResult.TOMADOR_CNPJ === '18084354000399') {
          pagador = 'DANILO ANDRADE'
      } else if (firstResult.TOMADOR_CNPJ === '17155276000141' ||
          firstResult.TOMADOR_CNPJ === '17155276000575' ||
          firstResult.TOMADOR_CNPJ === '50605987000146') {
          pagador = 'FRANCIELY AZZOLINI'
      } else if (firstResult.TOMADOR_CNPJ === '02258243000745' ||
          firstResult.TOMADOR_CNPJ === '02258243000150' ||
          firstResult.TOMADOR_CNPJ === '02258243000664' ||
          firstResult.TOMADOR_CNPJ === '67405936000173' ||
          firstResult.TOMADOR_CNPJ === '33241196000165' ||
          firstResult.TOMADOR_CNPJ === '02433453000137') {
        pagador = 'LARISSA LAGARES'
      } else if (firstResult.TOMADOR_CNPJ === '16701716003686' ||
          firstResult.TOMADOR_CNPJ === '16701716000156' ||
          firstResult.TOMADOR_CNPJ === '16701716003171' ||
          firstResult.TOMADOR_CNPJ === '16701716001713' ||
          firstResult.TOMADOR_CNPJ === '16701716002957' ||
          firstResult.TOMADOR_CNPJ === '16701716003333') {
        pagador = 'THIAGO GARCIA'
      }

      results[0].PAGADOR = pagador;
    } else {
      console.log('Nenhum resultado encontrado');
    }

    res.json(results); // Envia os resultados da query como resposta em formato JSON
  });
});

// Rota que trás as informações de outras ordens de coleta da mesma load
router.post('/oc-adjacentes', async (req, res) => {
  const idAgrupamento = req.body.idAgrupamento;
  const idRastCliente = req.body.idRastCliente;
  const tomadorCnpj = req.body.tomadorCnpj;
  const ordemColeta = req.body.oc;

  let query, params;

  if (tomadorCnpj === '02258243000664' || tomadorCnpj === '02258243000400' || tomadorCnpj === '02258243000150' || tomadorCnpj === '02258243000745'){
        // Se idRastCliente estiver vazio, executa a segunda query
        query = `
        SELECT
          tc.cod_col AS ORDEM_COLETA,
          IF(CP.scnpjcpf_clocal IS NULL, E2.snome_emp, te.srazao_emp) AS ORIGEM,
          IF(CP.scidade_clocal IS NULL, E2.scidade_emp, CP.scidade_clocal) AS ORIGEM_CIDADE,
          IF(CP.suf_clocal IS NULL, E2.suf_emp, te.suf_emp) AS ORIGEM_UF,
          E3.snome_emp AS DESTINO, 
          E3.scnpj_emp AS DESTINO_CNPJ, 
          E3.dlatitude_emp AS DESTINO_LATITUDE,
          E3.dlongitude_emp AS DESTINO_LONGITUDE,
          E3.scidade_emp AS DESTINO_CIDADE, 
          E3.suf_emp AS DESTINO_UF, 
          E3.scep_emp AS DESTINO_CEP,
          tc.dtcoletasolicitada_col AS COLETA_PLANEJADA,
          tc.dtcoletasolicitada_col AS PRIM_COLETA,
          tc.dtprevisaoentrega_col AS ENTREGA_PLANEJADA,
          tc.dtprevisaoentrega_col AS ULTIMA_ENTREGA,
          ts.snome_sit AS STATUS,
          UPPER(tnv2.sdesc_ntcav) AS TIPO_VEICULO_COT
        FROM tbl_coleta tc
        LEFT JOIN tbl_situacao ts ON tc.cod_sit = ts.cod_sit
        LEFT JOIN tbl_coleta_local CP ON CP.cod_col = tc.cod_col
        LEFT JOIN tbl_empresa te ON te.scnpj_emp = CP.scnpjcpf_clocal
        LEFT JOIN tbl_empresa E2 ON E2.scnpj_emp = tc.scnpj_emp_col
        LEFT JOIN tbl_empresa E3 ON E3.scnpj_emp = tc.scnpj_emp_dest
        LEFT JOIN tbl_cotacao tcc ON tcc.cod_cot = tc.cod_cot
        LEFT JOIN tbl_nucci_tipocavalo tnv2 ON tcc.ntipoveiculo_cot = tnv2.cod_ntcav
        WHERE tc.cod_col = ?
      `;
  
      params = [ordemColeta];
  } else if (idRastCliente && idRastCliente.trim() !== '') {
    // Se idRastCliente não estiver vazio, executa a primeira query
    query = `
      SELECT
        tc.cod_col AS ORDEM_COLETA,
        IF(CP.scnpjcpf_clocal IS NULL,E2.snome_emp, te.srazao_emp) AS ORIGEM,
        IF(CP.scidade_clocal  IS NULL,E2.scidade_emp,CP.scidade_clocal) AS ORIGEM_CIDADE,
        IF(CP.suf_clocal IS NULL,E2.suf_emp , te.suf_emp) AS ORIGEM_UF,
        E3.snome_emp AS DESTINO, 
        E3.scnpj_emp AS DESTINO_CNPJ,
        E3.dlatitude_emp AS DESTINO_LATITUDE,
        E3.dlongitude_emp AS DESTINO_LONGITUDE,
        E3.scidade_emp AS DESTINO_CIDADE, 
        E3.suf_emp AS DESTINO_UF, 
        E3.scep_emp AS DESTINO_CEP,
        tc.dtcoletasolicitada_col AS COLETA_PLANEJADA,
        tc.dtprevisaoentrega_col AS ENTREGA_PLANEJADA,
        tc.scodativacao_col AS ATIVACAO,
        tc5.PRIM_COLETA AS PRIM_COLETA,
        ts.snome_sit AS STATUS,
        UPPER(tnv.sdesc_ntcav) AS TIPO_VEICULO,
        UPPER(tnv2.sdesc_ntcav) AS TIPO_VEICULO_COT,
        tc5.ULTIMA_ENTREGA AS ULTIMA_ENTREGA,
        (SELECT tc2.dtcoletasolicitada_col FROM tbl_coleta tc2 
        LEFT JOIN tbl_situacao ts ON tc2.cod_sit = ts.cod_sit 
        WHERE tc.scodativacao_col = ? AND tc.scnpj_emp_col = ? 
        AND ts.snome_sit <> "Cancelamento" 
        ORDER BY tc2.dtcoletasolicitada_col LIMIT 1) AS PRI_COLETA,
        (SELECT COALESCE(tc3.dtcoletaefetiva_col, tc3.dtprevisaoentrega_col) FROM tbl_coleta tc3 
        LEFT JOIN tbl_situacao ts ON tc3.cod_sit = ts.cod_sit 
        WHERE tc.scodativacao_col = ? AND tc.scnpj_emp_col = ? 
        AND ts.snome_sit <> "Cancelamento" 
        ORDER BY tc3.dtprevisaoentrega_col LIMIT 1) AS ULT_ENTREGA,
        (SELECT tc4.cod_col FROM tbl_coleta tc4 
        LEFT JOIN tbl_situacao ts ON tc4.cod_sit = ts.cod_sit 
        WHERE tc.scodativacao_col = ? AND tc.scnpj_emp_col = ? 
        AND ts.snome_sit <> "Cancelamento" 
        ORDER BY tc4.dtprevisaoentrega_col LIMIT 1) AS ULT_OC
      FROM tbl_coleta tc
      LEFT JOIN tbl_coleta_local CP ON CP.cod_col = tc.cod_col
      LEFT JOIN tbl_empresa te ON te.scnpj_emp = CP.scnpjcpf_clocal
      LEFT JOIN tbl_empresa E2 ON E2.scnpj_emp = tc.scnpj_emp_col
      LEFT JOIN tbl_empresa E3 ON E3.scnpj_emp = tc.scnpj_emp_dest 
      LEFT JOIN tbl_situacao ts ON tc.cod_sit = ts.cod_sit
      LEFT JOIN tbl_veiculo tv ON tc.splaca1_col = tv.splaca_veic
      LEFT JOIN tbl_nucci_tipocavalo tnv ON tv.cod_tcav = tnv.cod_ntcav
      LEFT JOIN tbl_cotacao tcc ON tcc.cod_cot = tc.cod_cot
      LEFT JOIN tbl_nucci_tipocavalo tnv2 ON tcc.ntipoveiculo_cot = tnv2.cod_ntcav
      LEFT JOIN (SELECT
                    tc.scodativacao_col, 
                    MIN(tc.dtcoletasolicitada_col) AS PRIM_COLETA,
                    MAX(tc.dtprevisaoentrega_col) AS ULTIMA_ENTREGA
                FROM tbl_coleta tc
                WHERE tc.scodativacao_col = ? 
                AND tc.scnpj_emp_col = ? 
                AND tc.cod_sit <> "999") tc5 ON tc.scodativacao_col = tc.scodativacao_col        
      WHERE tc.scodativacao_col = ? AND tc.scnpj_emp_col = ? AND tc.cod_sit <> "999"
      GROUP BY tc.cod_col, te.snome_emp, te.scidade_emp, te.suf_emp, 
                tc.sclientedestino_col, tc.scidadedestino_col, tc.sufdestino_col,
                tc.dtcoletasolicitada_col, tc.dtprevisaoentrega_col
      ORDER BY tc.dtcoletasolicitada_col, tc.dtprevisaoentrega_col
    `;

    params = [idRastCliente, tomadorCnpj, idRastCliente, tomadorCnpj, idRastCliente, tomadorCnpj, idRastCliente, tomadorCnpj, idRastCliente, tomadorCnpj];
  } else {
    // Se idRastCliente estiver vazio, executa a segunda query
    query = `
        SELECT
          tc.cod_col AS ORDEM_COLETA,
          IF(CP.scnpjcpf_clocal IS NULL, E2.snome_emp, te.srazao_emp) AS ORIGEM,
          IF(CP.scidade_clocal IS NULL, E2.scidade_emp, CP.scidade_clocal) AS ORIGEM_CIDADE,
          IF(CP.suf_clocal IS NULL, E2.suf_emp, te.suf_emp) AS ORIGEM_UF,
          E3.snome_emp AS DESTINO, 
          E3.scnpj_emp AS DESTINO_CNPJ,
          E3.dlatitude_emp AS DESTINO_LATITUDE,
          E3.dlongitude_emp AS DESTINO_LONGITUDE,
          E3.scidade_emp AS DESTINO_CIDADE, 
          E3.suf_emp AS DESTINO_UF, 
          E3.scep_emp AS DESTINO_CEP,
          tc.dtcoletasolicitada_col AS COLETA_PLANEJADA,
          tc.dtcoletasolicitada_col AS PRIM_COLETA,
          tc.dtprevisaoentrega_col AS ENTREGA_PLANEJADA,
          tc.dtprevisaoentrega_col AS ULTIMA_ENTREGA,
          ts.snome_sit AS STATUS,
          UPPER(tnv2.sdesc_ntcav) AS TIPO_VEICULO_COT
        FROM tbl_coleta tc
        LEFT JOIN tbl_situacao ts ON tc.cod_sit = ts.cod_sit
        LEFT JOIN tbl_coleta_local CP ON CP.cod_col = tc.cod_col
        LEFT JOIN tbl_empresa te ON te.scnpj_emp = CP.scnpjcpf_clocal
        LEFT JOIN tbl_empresa E2 ON E2.scnpj_emp = tc.scnpj_emp_col
        LEFT JOIN tbl_empresa E3 ON E3.scnpj_emp = tc.scnpj_emp_dest
        LEFT JOIN tbl_cotacao tcc ON tcc.cod_cot = tc.cod_cot
        LEFT JOIN tbl_nucci_tipocavalo tnv2 ON tcc.ntipoveiculo_cot = tnv2.cod_ntcav
        WHERE tc.cod_col = ?
    `;

    params = [ordemColeta];
  }

  // Executa a query com os parâmetros definidos acima
  pool.query(query, params, (err, results, fields) => {
    if (err) {
      console.error('Erro ao executar a query:', err.stack);
      res.status(500).send('Erro ao conectar ao banco de dados.');
      return;
    }
    res.json(results); // Envia os resultados da query como resposta em formato JSON
  });
});

// Rota que lista os veículos disponíveis e ordena eles para exibir o melhor qualificado para aquela rota
router.post('/veiculos', async (req, res) => {
  // Formatar a data para "YYYY-MM-DD HH:mm:ss"
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    date.setUTCHours(date.getUTCHours() + 3);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };
  const ordemColeta = req.body.ordemColeta;
  const dataColeta = formatDate(req.body.coletaSolicitada);
  const dataEntrega = formatDate(req.body.saidaColeta);
  const pagador = req.body.pagador;
  const tipoVeiculo = req.body.tipoVeiculo;
  
  let tipoVeiculoFiltro = '';
  let filtroTruck = '';
  let filtroPagador = '';
  const queryParams = [dataColeta, dataEntrega, dataEntrega, dataColeta, dataEntrega, dataColeta, dataEntrega, dataColeta, dataColeta, dataEntrega, dataColeta];
  
  if (tipoVeiculo && tipoVeiculo.length > 0) {
    if (tipoVeiculo.includes('CARRETA')) {
      tipoVeiculoFiltro = "AND UPPER(tnv4.sdesc_ntcav) LIKE '%CARRETA%' AND UPPER(tnv3.sdesc_ntcav) NOT LIKE '%TRUCK%'";
    }
  
    if (tipoVeiculo.includes('TRUCK') || tipoVeiculo.includes('3/4') || tipoVeiculo.includes('TOCO')) {
      filtroTruck = "CASE WHEN UPPER(tnv.sdesc_ntcav) LIKE '%TRUCK%' THEN 1 ELSE 2 END, ";
    }
  }
  
  if (pagador === 'TODOS') {
    filtroPagador = ''; // Não adiciona filtro para V.mobs_veic
  } else if (pagador.includes('DANILO ANDRADE')) {
    tipoVeiculoFiltro = "AND UPPER(tnv.sdesc_ntcav) LIKE '%BI-TREM%'";
    filtroPagador = "AND V.mobs_veic = ?";
    queryParams.push(pagador);
  } else {
    filtroPagador = "AND V.mobs_veic = ?";
    queryParams.push(pagador);
  }
  
  // Inclua outros parâmetros faltantes
  queryParams.push(dataEntrega, ordemColeta, ordemColeta);
  
  const query = `
  WITH TEMP_VEIC_OCUP AS (
        SELECT 
            COALESCE(C.splaca1_col, C2.splaca_motor_ctrt) AS PLACA1,
            C.cod_col AS ORDEM_COLETA,
            C.dtcoletasolicitada_col AS COLETA_PLANEJADA,
            C.dtsaidacoleta_col AS SAIDA_PLANEJADA,
            COALESCE(C.splaca2_col, C2.splaca_carreta_1_ctrt) AS PLACA2,
            COALESCE(C.splaca3_col, NULLIF(C2.splaca_carreta_2_ctrt, 'ZZZ9999')) AS PLACA3
        FROM 
            tbl_coleta C
            LEFT JOIN tbl_contrato_ordem_coleta CC 
                ON CC.nordemcoleta_coc = C.nnumero_col 
                AND CC.npr_coc = C.npr_col
            LEFT JOIN tbl_contrato_nucci C2 
                ON C2.cod_ctrt = CC.cod_ctrt 
                AND C2.nstatus_ctrt NOT IN (99)
            LEFT JOIN tbl_veiculo V 
                ON V.splaca_veic = COALESCE(C.splaca1_col, C2.splaca_motor_ctrt)
        WHERE 
            (
                (C.dtcoletasolicitada_col BETWEEN ? AND ? AND IF(C.dtcoletaefetiva_col IS NULL, C.dtprevisaoentrega_col, C.dtcoletaefetiva_col) < ?) OR
                (C.dtcoletasolicitada_col >=      ? AND IF(C.dtcoletaefetiva_col IS NULL, C.dtprevisaoentrega_col, C.dtcoletaefetiva_col) <= ?) OR
                (C.dtcoletasolicitada_col <= 	  ? AND IF(C.dtcoletaefetiva_col IS NULL, C.dtprevisaoentrega_col, C.dtcoletaefetiva_col) >= ?) OR
                (C.dtcoletasolicitada_col >= 	  ? AND IF(C.dtcoletaefetiva_col IS NULL, C.dtprevisaoentrega_col, C.dtcoletaefetiva_col) BETWEEN ? AND ?)
            ) 
            AND V.nstatus_veic NOT IN (99, 8, 4, 5) 
            AND V.nclassinterna_veic = 1
        GROUP BY PLACA1
    )
    SELECT 
        CAST(toc.cod_col AS CHAR) AS ORDEM_COLETA, 
        m.splacapadrao_mot AS PLACA1, 
        v4.cod_tcav AS CD_CAV_1, 
        IF(v4.cod_tcav = 2, m.splacapadrao_mot, m.splacacarreta_mot) AS PLACA2, 
        IF(v4.cod_tcav = 2, v4.cod_tcav, v5.cod_tcav) AS CD_CAV_2, 
        toc.max_data_entrega AS ENTREGA,
        m.splacacarreta2_mot AS PLACA3,
        m.snome_mot AS MOTORISTA,
        UPPER(tnv4.sdesc_ntcav) AS TIPO_CARRETA,
        COALESCE(UPPER(tnv4.sdesc_ntcav), UPPER(tnv3.sdesc_ntcav), 'NÃO INFORMADO') AS TIPO_VEICULO,
        m.scategoriahabilitacao_mot AS HABILITACAO,
        ts.snome_sit AS SITUACAO,
        toc.cod_sit AS SIT_COL,
        c.scnpj_emp_col AS TOMADOR_CNPJ,
        m.nstatus_mot AS STATUS_MOT, 
        V.nstatus_veic AS STATUS_VEIC,
        V.smodelo_veic AS MODELO,
        V.SCARTAO_VEIC AS CARTAO,
        toc.scep_emp AS DESTINO_CEP, 
        toc.scidade_emp AS DESTINO_CIDADE, 
        toc.suf_emp AS DESTINO_UF,
        toc.dlatitude_emp AS LATITUDE,
        toc.dlongitude_emp AS LONGITUDE,
        V.SCARTAO_VEIC AS CARTAO, 
        m.ntipo_mot AS TIPO_MOTO,
        V.mobs_veic AS OPERACAO
    FROM 
        tbl_veiculo V
        LEFT JOIN tbl_motorista m ON V.splaca_veic = m.splacapadrao_mot AND m.nstatus_mot IN (0, 1)
        LEFT JOIN tbl_coleta c ON V.splaca_veic = c.splaca1_col
        LEFT JOIN tbl_situacao ts ON c.cod_sit = ts.cod_sit
        LEFT JOIN tbl_veiculo v2 ON v2.splaca_veic = c.splaca2_col
        LEFT JOIN tbl_empresa e ON c.scnpj_emp_dest = e.scnpj_emp
        LEFT JOIN tbl_nucci_tipocavalo tnv2 ON V.cod_tcav = tnv2.cod_ntcav
        LEFT JOIN ( SELECT C2.splaca1_col, C2.splaca2_col, C2.splaca3_col, C2.cod_col, C2.cod_sit, E2.scep_emp, E2.scidade_emp, E2.suf_emp, E2.dlatitude_emp, E2.dlongitude_emp, IF(C2.dtcoletaefetiva_col IS NULL, MAX(C2.dtprevisaoentrega_col), MAX(C2.dtcoletaefetiva_col)) AS max_data_entrega FROM 
            tbl_coleta C2 
            LEFT JOIN tbl_empresa E2 ON C2.scnpj_emp_dest = E2.scnpj_emp 
            WHERE C2.dtcoletasolicitada_col <= ? AND C2.cod_sit <> 999 
            GROUP BY C2.splaca1_col, C2.cod_col
            ORDER BY C2.dtcoletasolicitada_col asc
        ) AS toc ON V.splaca_veic = toc.splaca1_col
        LEFT JOIN tbl_veiculo v3 ON toc.splaca2_col = v3.splaca_veic
        LEFT JOIN tbl_nucci_tipocavalo tnv ON v3.cod_tcav = tnv.cod_ntcav
        LEFT JOIN tbl_veiculo v4 ON v4.splaca_veic = m.splacapadrao_mot 
        LEFT JOIN tbl_nucci_tipocavalo tnv3 ON v4.cod_tcav = tnv3.cod_ntcav
        LEFT JOIN tbl_veiculo v5 ON v5.splaca_veic = m.splacacarreta_mot 
        LEFT JOIN tbl_nucci_tipocavalo tnv4 ON v5.cod_tcav = tnv4.cod_ntcav
    WHERE
        V.nstatus_veic IN (0, 1, 3) 
        AND V.nclassinterna_veic = 1
        ${filtroPagador}
        AND ts.snome_sit <> 'CANCELAMENTO'
        AND m.setnia_mot <> 'XXX'
        AND toc.max_data_entrega < ?
        ${tipoVeiculoFiltro}
        AND UPPER(V.SCARTAO_VEIC) NOT LIKE '%INTERNO'
        AND (
            V.cod_tcav IN (
                SELECT ntipoveiculo_crpedag 
                FROM tbl_contrato_rotafinanceira_pedagio tcrp2 
                WHERE cod_ctrtrf = (
                    SELECT tc.cod_ctrtrf 
                    FROM tbl_cotacao tc 
                    INNER JOIN tbl_coleta tl 
                        ON tc.cod_col = tl.cod_col 
                    WHERE tc.cod_col = ? LIMIT 1
                )
            ) OR
            v2.cod_tcav IN (
                SELECT ntipoveiculo_crpedag 
                FROM tbl_contrato_rotafinanceira_pedagio tcrp2 
                WHERE cod_ctrtrf = (
                    SELECT tc.cod_ctrtrf 
                    FROM tbl_cotacao tc 
                    INNER JOIN tbl_coleta tl 
                        ON tc.cod_col = tl.cod_col 
                    WHERE tc.cod_col = ? LIMIT 1
                )
            )
        )
        AND V.cod_tcav NOT IN (22, 73, 74, 75, 76, 77)
        AND V.splaca_veic NOT IN ('NAN5E00', 'GER0006')
        AND NOT EXISTS (
            SELECT 1 
            FROM TEMP_VEIC_OCUP 
            WHERE PLACA1 = V.splaca_veic
        )
    GROUP BY 
        V.splaca_veic
    ORDER BY 
        ${filtroTruck}
        toc.max_data_entrega DESC
  `;
  
  pool.query(query, queryParams, async (err, results, fields) => {
    if (err) {
      console.error('Erro ao executar a query:', err.stack);
      res.status(500).send('Erro ao conectar ao banco de dados 1.');
      return;
    }

    const veiculos = results;
    const placas = veiculos.map(veiculo => veiculo.PLACA1);
    const token = req.authToken;

    // Obter a latitude e longitude do destino final
    const destinoQuery = `
      SELECT 
      IF(CP.scnpjcpf_clocal IS NULL, E2.dlatitude_emp, te.dlatitude_emp)  AS latitude, 
      IF(CP.scnpjcpf_clocal IS NULL, E2.dlongitude_emp, te.dlongitude_emp) AS longitude,
      te.snome_emp,
      E2.snome_emp
      FROM tbl_coleta tc
      LEFT JOIN tbl_coleta_local CP ON CP.cod_col = tc.cod_col
      LEFT JOIN tbl_empresa te ON te.scnpj_emp = CP.scnpjcpf_clocal
      LEFT JOIN tbl_empresa E2 ON E2.scnpj_emp = tc.scnpj_emp_dest 
      where tc.cod_col = ?
    `;

    pool.query(destinoQuery, [ordemColeta], async (err, destinoResults) => {
      if (err) {
        console.error('Erro ao executar a query de destino:', err.stack);
        res.status(500).send('Erro ao conectar ao banco de dados 2.');
        return;
      }

      if (destinoResults.length === 0) {
        res.status(404).send('Destino não encontrado.');
        return;
      }

      const destinoLat = destinoResults[0].latitude;
      const destinoLon = destinoResults[0].longitude;

      try {
        // Distância veículo-destino atual
        const response = await axios.post('https://api.showtecnologia.com/api/frotas/monitoramento/grid', {}, {headers: {'x-access-token': req.authToken} });
        const todosVeiculos = response.data.dados.grid;
        const veiculosFiltrados = todosVeiculos.filter(veiculo => placas.includes(veiculo.veiculo.placa));
        const veiculosUnicos = placas.map(placa => veiculosFiltrados.find(veiculo => veiculo.veiculo.placa === placa)).filter(Boolean);
        const distances2 = [];
        const veiculosDistancias = [];

        for (let i = 0; i < veiculos.length; i++) {
          const date = new Date(veiculos[i].ENTREGA);

          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');

          const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;

          const diferenca = calcularDiferencaCompleta(dataColeta, formattedDate);

          if (veiculosUnicos[i] && veiculos[i].PLACA1 === veiculosUnicos[i].veiculo.placa) {
            const origem = `${veiculos[i].LATITUDE},${veiculos[i].LONGITUDE}`;
            const expectLat = veiculos[i].LATITUDE;
            const expectLong = veiculos[i].LONGITUDE;
            const realLat = veiculosUnicos[i].localizacao.latitude;
            const realLong = veiculosUnicos[i].localizacao.longitude;
            const veiculoSituacao = veiculos[i].SIT_COL;
            const tiposVeiculos = veiculos[i].TIPO_VEICULO;

            // OSRM espera longitude,latitude
            const origemOSRM = `${veiculos[i].LONGITUDE},${veiculos[i].LATITUDE}`;
            const destinoOSRM = `${destinoLon},${destinoLat}`;
            const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${origemOSRM};${destinoOSRM}?overview=false`;

            let distanciaValueNew2 = null;
            let duracaoValueNew2 = null;
            let distanciaTextNew2 = '';
            let duracaoTextNew2 = '';

            try {
              const osrmResponse = await axios.get(osrmUrl);
              const osrmData = osrmResponse.data;

              if (osrmData.code === "Ok" && osrmData.routes && osrmData.routes.length > 0) {
                distanciaValueNew2 = osrmData.routes[0].distance; // em metros
                duracaoValueNew2 = osrmData.routes[0].duration;   // em segundos
                distanciaTextNew2 = `${(distanciaValueNew2 / 1000).toFixed(1)} km`;
                duracaoTextNew2 = `${Math.floor(duracaoValueNew2 / 60)} min`;

                distances2.push({
                  placaOrigem: veiculos[i].PLACA1,
                  origem: origem,
                  destinoFinal: `${destinoLat},${destinoLon}`,
                  distanciaText2: distanciaTextNew2,
                  distanciaValue2: distanciaValueNew2,
                  duracaoText2: duracaoTextNew2,
                  duracaoValue2: duracaoValueNew2
                });
              } else {
                distanciaValueNew2 = 0;
                duracaoValueNew2 = 0;
                distanciaTextNew2 = '';
                duracaoTextNew2 = '';
                distances2.push({
                  origem: origem,
                  destino: `${destinoLat},${destinoLon}`,
                  error: "Distância não disponível"
                });
              }
            } catch (err) {
              distanciaValueNew2 = 0;
              duracaoValueNew2 = 0;
              distanciaTextNew2 = '';
              duracaoTextNew2 = '';
              distances2.push({
                origem: origem,
                destino: `${destinoLat},${destinoLon}`,
                error: "Erro ao consultar OSRM"
              });
            }
            
            veiculosDistancias.push({
              placa: veiculos[i].PLACA1,
              situacao: veiculoSituacao,
              distancia2: distanciaValueNew2,
              duracao2: duracaoValueNew2,
              distanciaTexto: distanciaTextNew2,
              duracaoTexto: duracaoTextNew2,
              duracaoETAETD: diferenca,
              expectLat: expectLat,
              expectLong: expectLong,
              realLat: realLat,
              realLong: realLong,
              tipoVeicNovo: tiposVeiculos
            });
            
          }
        }

        // Ordenar os veículos pela menor distância total
        veiculosDistancias.sort((a, b) => {
          // Priorizar veículos com 'tipoVeicNovo' igual a "TRUCK"
          if (a.tipoVeicNovo === "TRUCK" && b.tipoVeicNovo !== "TRUCK") {
            return -1; // a (TRUCK) vem antes de b
          }
          if (a.tipoVeicNovo !== "TRUCK" && b.tipoVeicNovo === "TRUCK") {
            return 1; // b (TRUCK) vem antes de a
          }

          // Se ambos têm o mesmo 'tipoVeicNovo', priorize pela 'situacao' igual a 30
          if (a.situacao === 30 && b.situacao !== 30) {
            return -1; // a vem antes de b
          }
          if (a.situacao !== 30 && b.situacao === 30) {
            return 1; // b vem antes de a
          }

          // Se ambos têm a mesma 'situacao', ordene pela distância
          return a.distancia2 - b.distancia2;
        });

        // Formatar os dados para retornar no formato desejado
        const veiculosFormatados = veiculosDistancias.map(veiculo => {
          const veiculoData = veiculos.find(v => v.PLACA1 === veiculo.placa);
          return {
            ORDEM_COLETA: veiculoData.ORDEM_COLETA,
            ENTREGA: veiculoData.ENTREGA,
            PLACA1: veiculoData.PLACA1,
            PLACA2: veiculoData.PLACA2,
            PLACA3: veiculoData.PLACA3,
            MOTORISTA: veiculoData.MOTORISTA,
            HABILITACAO: veiculoData.HABILITACAO,
            DESTINO_CEP: veiculoData.DESTINO_CEP,
            DESTINO_CIDADE: veiculoData.DESTINO_CIDADE,
            DESTINO_UF: veiculoData.DESTINO_UF,
            DISTANCIA: veiculo.distanciaTexto,
            TEMPO1: veiculo.duracaoETAETD,
            TEMPO2: veiculo.duracaoTexto,
            TIPO_CARRETA: veiculoData.TIPO_CARRETA,
            MODELO: veiculoData.MODELO,
            STATUS: veiculoData.SIT_COL,
            STATUS_VEIC: veiculoData.STATUS_VEIC,
            TIPO_VEICULO: veiculoData.TIPO_VEICULO,
            OPERACAO: veiculoData.OPERACAO,
            EXPECTLAT: veiculo.expectLat,
            EXPECTLONG: veiculo.expectLong,
            REALLAT: veiculo.realLat,
            REALLONG: veiculo.realLong
          }
        });

        res.json({ veiculosFormatados });
        //console.log(veiculosDistancias);
        //res.json({ distances1, distances2 });

      } catch (error) {
        if (error.response) {
          console.error('Erro ao acessar o endpoint de monitoramento de frotas:', error.response.data);
          res.status(500).send('Erro ao acessar o endpoint de monitoramento de frotas');
        } else {
          console.error('Erro de rede:', error.message);
          res.status(500).send('Erro de rede');
        }
      }
    });
  });
});

router.post('/available-vehicles', async (req, res) => {
  const ordemColeta = req.body.oc;
  const query = `
    SELECT tcrp2.ntipoveiculo_crpedag, tnv2.sdesc_ntcav 
    FROM tbl_contrato_rotafinanceira_pedagio tcrp2
    LEFT JOIN tbl_nucci_tipocavalo tnv2 on tcrp2.ntipoveiculo_crpedag = tnv2.cod_ntcav
    WHERE cod_ctrtrf = (
      SELECT tc.cod_ctrtrf 
      FROM tbl_cotacao tc 
      INNER JOIN tbl_coleta tl ON tc.cod_col = tl.cod_col 
    WHERE tc.cod_col = ? LIMIT 1) 
  `;
  pool.query(query, [ordemColeta], (err, results, fields) => {
      if (err) {
          console.error('Erro ao executar a query:', err.stack);
          res.status(500).send('Erro ao conectar ao banco de dados.');
          return;
      }
      res.json(results);
  });
});

router.post('/checkManual', async (req, res) => {
  const tipoPesquisa = req.body.tipoPesquisa;
  const valorPesquisa = `%${req.body.valorPesquisa}%`; // Adiciona '%' para busca relativa

  let condicao = '';
  if (tipoPesquisa === 'nome') {
    condicao = 'WHERE m.snome_mot LIKE ?';
  } else if (tipoPesquisa === 'cpf') {
    condicao = 'WHERE m.scpf_mot LIKE ?';
  } else if (tipoPesquisa === 'placa') {
    condicao = 'WHERE m.splacapadrao_mot LIKE ?';
  }

  const query = `
    SELECT toc.coleta AS ORDEM_COLETA, toc.maxEntrega AS ENTREGA, 
          m.splacapadrao_mot AS PLACA1, V.smodelo_veic AS MODELO, 
          UPPER(tnv2.sdesc_ntcav) AS TIPO_VEICULO, m.splacacarreta_mot AS PLACA2, 
          UPPER(tnv.sdesc_ntcav) AS TIPO_CARRETA, m.splacacarreta2_mot AS PLACA3, 
          m.snome_mot AS MOTORISTA, '' AS CIDADE, '' AS DISTANCIA, 
          '' AS TEMPO, '' AS ETAETD, m.scpf_mot AS MOTORISTA_CPF
    FROM tbl_motorista m
    LEFT JOIN (
      SELECT C2.splaca1_col AS placa, C2.cod_col AS coleta, 
            IF(C2.dtcoletaefetiva_col IS NULL, MAX(C2.dtprevisaoentrega_col), MAX(C2.dtcoletaefetiva_col)) AS maxEntrega
      FROM tbl_coleta C2
      WHERE C2.cod_sit <> 999
        AND EXISTS (
          SELECT 1
          FROM tbl_motorista m
          ${condicao.replace('m.', '')} -- Remove 'm.' para adequar ao contexto da subquery
          AND C2.splaca1_col = m.splacapadrao_mot
        )
      GROUP BY C2.cod_col
      ORDER BY C2.dtcoletasolicitada_col DESC, C2.cod_col DESC
      LIMIT 1
    ) AS toc ON toc.placa = m.splacapadrao_mot
    LEFT JOIN tbl_veiculo V ON V.splaca_veic = m.splacapadrao_mot AND m.nstatus_mot IN (0, 1)
    LEFT JOIN tbl_nucci_tipocavalo tnv2 ON V.cod_tcav = tnv2.cod_ntcav
    LEFT JOIN tbl_veiculo v3 ON m.splacacarreta_mot = v3.splaca_veic
    LEFT JOIN tbl_nucci_tipocavalo tnv ON v3.cod_tcav = tnv.cod_ntcav
    ${condicao};
  `;

  pool.query(query, [valorPesquisa, valorPesquisa], (err, results) => {
    if (err) {
      console.error('Erro ao executar a query:', err.stack);
      res.status(500).send('Erro ao conectar ao banco de dados.');
      return;
    }

    res.json(results);
  });
});

function calcularDiferencaCompleta(data1, data2) {
  // Converte as datas em objetos Date
  const date1 = new Date(data1);
  const date2 = new Date(data2);

  // Calcula a diferença em milissegundos
  const diferencaEmMilissegundos = date1 - date2;
  
  // Verifica se a diferença é negativa (ou seja, data2 é maior que data1)
  const diferencaPositiva = Math.abs(diferencaEmMilissegundos);

  // Calcula a diferença em dias, horas, minutos e segundos
  let dias = Math.floor(diferencaPositiva / (1000 * 60 * 60 * 24));
  let horas = Math.floor((diferencaPositiva % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diferencaPositiva % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diferencaPositiva % (1000 * 60)) / 1000);

  // Ajusta o valor das horas, garantindo que não seja negativo
  horas -= 3;
  if (horas < 0) {
    horas += 24;
    dias -= 1;
  }

  // Se a diferença é negativa (data2 maior), retorna apenas a diferença em minutos
  if (diferencaEmMilissegundos < 0 && dias === 0 && horas === 0) {
    return `${-minutos} minutos`;
  }

  // Caso contrário, continua com o cálculo normal
  if (dias === 0) {
    return `${horas} horas e ${minutos} minutos`;
  } else {
    return `${dias} dias, ${horas} horas e ${minutos} minutos`;
  }
};

module.exports = router;