const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const pool = require('../../config/dbConfigLocal');

app.use(bodyParser.json());

// Rota para verificar se é coleta de ida ou volta
router.post('/checkType', async (req, res) => {
    //Se for 0 é uma coleta de ida, se for 1 é uma coleta de retorno
    const codCol = req.body.oc;

    let query = `SELECT c.nroundtrip_col FROM tbl_coleta c WHERE c.cod_col = ?`;
    pool.query(query, [codCol], (err, results, fields) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            res.status(500).send('Erro ao conectar ao banco de dados.');
            return;
        }
        res.json(results);
    });
});

router.post('/checkAll', async (req, res) => {
    const type = req.body.tipo;
    const ativacao = req.body.ativacao;
    const oc = req.body.oc;

    // Verificar se 'ativacao' é nulo ou vazio
    if (!ativacao) {
        let query = `SELECT c.cod_col FROM tbl_coleta c WHERE c.cod_col = ?`;
        pool.query(query, [oc], (err, results, fields) => {
            if (err) {
                console.error('Erro ao executar a query:', err.stack);
                res.status(500).send('Erro ao conectar ao banco de dados.');
                return;
            }
            res.json(results);
        });
    }
    else {
        let query = `SELECT c.cod_col FROM tbl_coleta c WHERE c.scodativacao_col = ? AND c.nroundtrip_col = ?`;
        pool.query(query, [ativacao, type], (err, results, fields) => {
            if (err) {
                console.error('Erro ao executar a query:', err.stack);
                res.status(500).send('Erro ao conectar ao banco de dados.');
                return;
            }
            res.json(results);
        });
    }

});

router.post('/listVehicles', async (req, res) => {

    let query = `SELECT tnv2.sdesc_ntcav FROM tbl_nucci_tipocavalo tnv2 
                    where sdesc_ntcav IN ('Bi-Trem', 'Carreta', 'Carreta BigSider', 'Carreta Rebaixada', 'Carreta Reta', 'Carreta Porta Container', 'Carreta Vnaderleia', 'Truck', 'Toco', '3/4')`;
    pool.query(query, (err, results, fields) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            res.status(500).send('Erro ao conectar ao banco de dados.');
            return;
        }
        const vehicleTypes = results.map(row => row.sdesc_ntcav);
        res.json(vehicleTypes);
    });
});

module.exports = router;