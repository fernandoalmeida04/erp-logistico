const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const sqlPoolLocal = require('../../config/dbConfigLocal'); // Certifique-se de que este arquivo usa mysql2/promise
const router = express.Router();

// Configuração do multer para upload de arquivos
const upload = multer({ storage: multer.memoryStorage() });


// Rota para ler os dois arquivos excel e salvar os dados no banco de dados
router.post('/compare-files', upload.fields([{ name: 'file1' }, { name: 'file2' }]), async (req, res) => {
    try {
        // Verifica se os arquivos foram enviados
        if (!req.files || !req.files.file1 || !req.files.file2) {
            return res.status(400).json({ error: 'Ambos os arquivos devem ser enviados.' });
        }

        // Lê o conteúdo do primeiro arquivo Excel
        const workbook1 = xlsx.read(req.files.file1[0].buffer, { type: 'buffer' });
        const sheet1 = workbook1.Sheets[workbook1.SheetNames[0]];
        const data1 = xlsx.utils.sheet_to_json(sheet1, { header: 1 }); // Lê o cabeçalho como array

        // Lê o conteúdo do segundo arquivo Excel
        const workbook2 = xlsx.read(req.files.file2[0].buffer, { type: 'buffer' });
        const sheet2 = workbook2.Sheets[workbook2.SheetNames[0]];
        const data2 = xlsx.utils.sheet_to_json(sheet2, { header: 1 }); // Lê o cabeçalho como array

        // Verifica se os arquivos estão invertidos
        let file1Data, file2Data;
        if (data1[0][0] === 'Número da OS' && data2[0][0] === 'Empresa') {
            file1Data = xlsx.utils.sheet_to_json(sheet1); // Converte para JSON
            file2Data = xlsx.utils.sheet_to_json(sheet2); // Converte para JSON
        } else if (data1[0][0] === 'Empresa' && data2[0][0] === 'Número da OS') {
            file1Data = xlsx.utils.sheet_to_json(sheet2); // Inverte os arquivos
            file2Data = xlsx.utils.sheet_to_json(sheet1); // Inverte os arquivos
        } else {
            return res.status(400).json({ error: 'Os arquivos enviados não possuem os cabeçalhos esperados.' });
        }

        // Mapeia os dados do segundo arquivo para facilitar a busca
        const checklistMap = new Map();
        file2Data.forEach((row) => {
            if (row['Número da OS'] && row['Modelo Checklist']) {
                checklistMap.set(row['Número da OS'], row['Modelo Checklist']);
            }
        });

        // Função para converter valores numéricos de data para formato legível
        const convertExcelDate = (excelDate) => {
            const date = xlsx.SSF.parse_date_code(excelDate);
            return new Date(date.y, date.m - 1, date.d, date.H, date.M, date.S).toISOString();
        };

        // Filtra as OS presentes nos dois arquivos e com Status "Em Execução" ou "Aprovadas"
        const result = file1Data
            .filter((row) => 
                row['Número da OS'] && 
                checklistMap.has(row['Número da OS']) &&
                (row['Status'].toLowerCase() === 'em execução' || row['Status'].toLowerCase() === 'em aberto')
            )
            .map((row) => {
                const checklist = checklistMap.get(row['Número da OS']);
                const tipoveículo = checklist.toLowerCase().includes('carreta') ? 'Carreta' : 'Cavalo';
        
                return {
                    os: row['Número da OS'],
                    placa: row['Veículo (Placa)'],
                    checklist,
                    status: row['Status'],
                    tipoveículo,
                    dataEmissao: typeof row['Data Emissão'] === 'number' 
                        ? convertExcelDate(row['Data Emissão']) 
                        : row['Data Emissão'], // Converte a data se for numérica
                };
            });

        const selectQuery = `
            SELECT COUNT(*) AS count FROM tb_ordem_servico WHERE cd_os = ?
        `;
        const insertQuery = `
            INSERT INTO tb_ordem_servico (dt_emissao, cd_os, nm_placa, nm_setor, nm_status)
            VALUES (?, ?, ?, ?, ?)
        `;
        const updateQuery = `
            UPDATE tb_ordem_servico
            SET dt_emissao = ?, nm_placa = ?, nm_setor = ?, nm_status = ?
            WHERE cd_os = ?
        `;


        for (const item of result) {
            try {
                // Verifica se a OS já existe no banco de dados
                const [rows] = await sqlPoolLocal.promise().query(selectQuery, [item.os]);
                const exists = rows[0].count > 0;

                if (exists) {
                    // Realiza o UPDATE se a OS já existir
                    await sqlPoolLocal.promise().query(updateQuery, [
                        item.dataEmissao,
                        item.placa,
                        item.checklist,
                        item.status,
                        item.os, // WHERE cd_os = ?
                    ]);
                } else {
                    // Realiza o INSERT se a OS não existir
                    await sqlPoolLocal.promise().query(insertQuery, [
                        item.dataEmissao,
                        item.os,
                        item.placa,
                        item.checklist,
                        item.status,
                    ]);
                }
            } catch (err) {
                console.error(`Erro ao processar a OS ${item.os}:`, err);
                throw err; // Lança o erro para ser tratado no bloco `catch` principal
            }
        }

        res.json({ message: 'Dados salvos ou atualizados com sucesso no banco de dados.' });
    } catch (error) {
        console.error('Erro ao processar a requisição:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erro ao processar os arquivos ou salvar no banco de dados.' });
        }
    }
});

//Rota para trazer os dados das OS do banco de dados
router.post('/osDetails', async (req, res) => {
    const query = `
        SELECT *
        FROM tb_ordem_servico WHERE nm_status = 'Em Execução' OR nm_status = 'Em Aberto' ORDER BY dt_emissao ASC;
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

router.post('/osDetailModal', async (req, res) => {
    const { osNumber } = req.body;

    if (!osNumber) {
        return res.status(400).json({ error: 'Número da OS não fornecido.' });
    }

    const query = `
        SELECT *
        FROM tb_ordem_servico 
        WHERE cd_os = ?;
    `;

    try {
        const [results] = await sqlPoolLocal.promise().query(query, [osNumber]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'OS não encontrada.' });
        }

        res.json(results[0]); // Retorna os detalhes da OS
    } catch (err) {
        console.error('Erro ao buscar os detalhes da OS:', err.stack);
        res.status(500).json({ error: 'Erro ao buscar os detalhes da OS.' });
    }
});

module.exports = router;