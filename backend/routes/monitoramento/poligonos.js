const express = require('express');
const axios = require('axios');
const sqlPoolLocal = require('../../config/dbConfigLocal'); 
const router = express.Router();
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

//Rota para carregar um poligono
router.post('/showPolygon', async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'O corpo da requisição deve conter um ID.' });
        }

        const query = 'SELECT ST_AsGeoJSON(js_poligono) AS POLIGONO, nm_poligono AS NOME, nm_tipo_poligono AS TIPO FROM tb_poligono WHERE cd_poligono = ?';
        sqlPoolLocal.query(query, [id], (error, results) => {
            if (error) {
                console.error('Erro ao carregar o polígono:', error);
                return res.status(500).json({ error: 'Erro ao carregar o polígono.' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Polígono não encontrado.' });
            }
            res.status(200).json(results[0]);
        });
    } catch (error) {
        console.error('Erro ao processar a requisição:', error);
        res.status(500).json({ error: 'Erro ao processar a requisição.' });
    }
});

// Rota para salvar um poligono
router.post('/savePolygon', async (req, res) => {
    try {
        const { nome, geoJson, tipo } = req.body;

        if (!nome || !geoJson) {
            return res.status(400).json({ error: 'O corpo da requisição deve conter um nome e um GeoJSON.' });
        }

        // Use apenas o geometry do GeoJSON
        const query = 'INSERT INTO tb_poligono (nm_poligono, js_poligono, nm_tipo_poligono) VALUES (?, ST_GeomFromGeoJSON(?), ?)';
        const values = [nome, JSON.stringify(geoJson.geometry), tipo];

        sqlPoolLocal.query(query, values, (error, results) => {
            if (error) {
                console.error('Erro ao salvar o polígono:', error);
                return res.status(500).json({ error: 'Erro ao salvar o polígono.' });
            }
            res.status(201).json({ message: 'Polígono salvo com sucesso!' });
        });
    } catch (error) {
        console.error('Erro ao processar a requisição:', error);
        res.status(500).json({ error: 'Erro ao processar a requisição.' });
    }
});

// Rota para atualizar um poligono 
router.post('/updatePolygon', async (req, res) => {
    try {
        const { id, nome, geoJson, tipo } = req.body;

        if (!id || !nome || !geoJson || !tipo) {
            return res.status(400).json({ error: 'O corpo da requisição deve conter um ID, nome, tipo e um GeoJSON.' });
        }

        const query = 'UPDATE tb_poligono SET nm_poligono = ?, js_poligono = ST_GeomFromGeoJSON(?), nm_tipo_poligono = ? WHERE cd_poligono = ?';
        const values = [nome, JSON.stringify(geoJson.geometry), tipo, id];

        sqlPoolLocal.query(query, values, (error, results) => {
            if (error) {
                console.error('Erro ao atualizar o polígono:', error);
                return res.status(500).json({ error: 'Erro ao atualizar o polígono.' });
            }
            res.status(200).json({ message: 'Polígono atualizado com sucesso!' });
        });
    } catch (error) {
        console.error('Erro ao processar a requisição:', error);
        res.status(500).json({ error: 'Erro ao processar a requisição.' });
    }
});

// Rota para deletar um poligono
router.post('/deletePolygon', async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'O corpo da requisição deve conter um ID.' });
        }

        const query = 'DELETE FROM tb_poligono WHERE cd_poligono = ?';
        sqlPoolLocal.query(query, [id], (error, results) => {
            if (error) {
                console.error('Erro ao deletar o polígono:', error);
                return res.status(500).json({ error: 'Erro ao deletar o polígono.' });
            }
            res.status(200).json({ message: 'Polígono deletado com sucesso!' });
        });
    } catch (error) {
        console.error('Erro ao processar a requisição:', error);
        res.status(500).json({ error: 'Erro ao processar a requisição.' });
    }
});

// Rota para listar todos os poligonos
router.get('/listPolygons', async (req, res) => {
    try {
        const query = 'SELECT cd_poligono AS id, nm_poligono AS nome, nm_tipo_poligono AS tipo FROM tb_poligono WHERE cd_poligono NOT IN(1, 30, 40)';
        sqlPoolLocal.query(query, (error, results) => {
            if (error) {
                console.error('Erro ao listar os polígonos:', error);
                return res.status(500).json({ error: 'Erro ao listar os polígonos.' });
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error('Erro ao processar a requisição:', error);
        res.status(500).json({ error: 'Erro ao processar a requisição.' });
    }
});

module.exports = router;