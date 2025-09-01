const { GraphQLObjectType, GraphQLString, GraphQLFloat, GraphQLSchema, GraphQLNonNull } = require('graphql');
const { GraphQLISODateTime } = require('graphql-scalars');
const sqlPoolExt = require('../../config/dbConfigExt');
const sqlPoolLocal = require('../../config/dbConfigLocal');
const sql = require('mssql');

const pool = new sql.ConnectionPool({
    user: 'sa',
    password: 'Fksadm@TI',
    server: 'VM-APLI3',
    database: 'db_BI_FKS',
    trustServerCertificate: true
});

pool.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
        return;
    }
    //console.log('Conectado ao banco de dados');
});

const HistoricoType = new GraphQLObjectType({
    name: 'Historico',
    fields: {
        DATA: { type: GraphQLString },
        PLACA: { type: GraphQLString },
        TIPO_VEICULO: { type: GraphQLString },
        HODOMETRO: { type: GraphQLFloat },
        LITROS: { type: GraphQLFloat },
        PRECO: { type: GraphQLFloat },
        META1: { type: GraphQLFloat },
        META2: { type: GraphQLFloat },
        META3: { type: GraphQLFloat },
        CONSUMO: { type: GraphQLFloat },
        // outros campos...
    }
});

const HistoricoArlaType = new GraphQLObjectType({
    name: 'HistoricoArla',
    fields: {
        DATA: { type: GraphQLString },
        PLACA: { type: GraphQLString },
        TIPO_VEICULO: { type: GraphQLString },
        HODOMETRO: { type: GraphQLFloat },
        LITROS: { type: GraphQLFloat },
        PRECO: { type: GraphQLFloat },
        META1_ARLA: { type: GraphQLFloat },
        META2_ARLA: { type: GraphQLFloat },
        META3_ARLA: { type: GraphQLFloat },
        CONSUMO: { type: GraphQLFloat },
        // outros campos...
    }
});

const ViagemType = new GraphQLObjectType({
    name: 'Viagem',
    fields: {
        coleta_id: { type: GraphQLString },
        COLETA_PLANEJADA: { type: GraphQLString },
        SAIDA_PLANEJADA: { type: GraphQLString },
        distancia_km: { type: GraphQLFloat },
        meta1: { type: GraphQLFloat },
        meta2: { type: GraphQLFloat },
        meta3: { type: GraphQLFloat },
        Ideal: { type: GraphQLFloat },
        PLACA1: { type: GraphQLString },
        DESTINO_LAT: { type: GraphQLFloat },
        DESTINO_LONG: { type: GraphQLFloat },
        // outros campos...
    }
});

const RootQuery = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
        historico: {
            type: HistoricoType,
            args: { placa: { type: new GraphQLNonNull(GraphQLString) } },
            async resolve(parent, args) {
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
                    WHERE v1.splaca_veic = ?
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
                        tbl_veiculo.splaca_veic = ? 
                        AND tbl_tipocombustivel.ssigla_tpcomb <> 'ARL'
                    ORDER BY
                        tbl_aereo_ticket.dtdata_atkt DESC
                    LIMIT 1`;
                const [result] = await sqlPoolExt.promise().query(query, [args.placa, args.placa]);
                if (result[0] && result[0].DATA) {
                    // Se DATA for numérico, converte para ISO string
                    if (!isNaN(result[0].DATA)) {
                        result[0].DATA = new Date(Number(result[0].DATA)).toISOString();
                    }
                }
                return result[0];
            }
        },
        historicoArla: {
            type: HistoricoArlaType,
            args: { placa: { type: new GraphQLNonNull(GraphQLString) } },
            async resolve(parent, args) {
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
                    WHERE v1.splaca_veic = 'FKS1D64'
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
                        tbl_veiculo.splaca_veic = ?
                        AND tbl_tipocombustivel.ssigla_tpcomb = 'ARL'
                    ORDER BY
                        tbl_aereo_ticket.dtdata_atkt DESC
                    LIMIT 1`;
                const [result] = await sqlPoolExt.promise().query(query, [args.placa, args.placa]);
                if (result[0] && result[0].DATA) {
                    // Se DATA for numérico, converte para ISO string
                    if (!isNaN(result[0].DATA)) {
                        result[0].DATA = new Date(Number(result[0].DATA)).toISOString();
                    }
                }
                return result[0];
            }
        },
        viagem: {
            type: ViagemType,
            args: { placa: { type: new GraphQLNonNull(GraphQLString) } },
            async resolve(parent, args) {
                const request = new sql.Request(pool);
                request.input('placa', sql.VarChar, args.placa);
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
                    order by ct.REGISTRO desc`;
                const result = await request.query(sqlQuery);

                return result.recordset[0];
            }
        }
    }
});

module.exports = new GraphQLSchema({
    query: RootQuery
});