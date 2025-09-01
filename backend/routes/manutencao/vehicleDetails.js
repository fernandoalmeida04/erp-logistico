const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sqlPoolExt = require('../../config/dbConfigExt');
const router = express.Router();
require('dotenv').config();

// Rota básica
router.get('/', (req, res) => {
    res.send('Olá, Backend!');
});

//Rota para trazer os dados do veículo pesquisado
router.post('/vehicleDetails', async (req, res) => {
    const placa = req.body.placa;
    const query = `
        SELECT cod_mot, snome_mot, splacapadrao_mot, splacacarreta_mot, splacacarreta2_mot 
        FROM tbl_motorista where splacapadrao_mot = ? ORDER BY cod_mot DESC;
    `;
    sqlPoolExt.query(query, [placa], (err, results, fields) => {
        if (err) {
            console.error('Erro ao executar a query:', err.stack);
            res.status(500).send('Erro ao conectar ao banco de dados.');
            return;
        }
        res.json(results);
    });
});

module.exports = router;