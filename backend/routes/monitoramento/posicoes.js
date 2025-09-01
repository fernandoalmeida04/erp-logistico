const express = require('express');
const axios = require('axios');
const sqlPoolLocal = require('../../config/dbConfigLocal'); 
const sqlPoolExt = require('../../config/dbConfigExt');
const router = express.Router();
const bodyParser = require('body-parser');
const googleMapsApiKey = 'AIzaSyBn1iQ-G1WQNYa-WHoZ7wQzhdAE6xNq5Kw';
const app = express();

app.use(bodyParser.json());

require('dotenv').config();

// Middleware para armazenar o token de autenticação na requisição
let cachedToken = null;
let tokenExpiresAt = 0; // timestamp em ms

const authMiddleware = async (req, res, next) => {
    try {
        const now = Date.now();
        // 2 horas = 2 * 60 * 60 * 1000 ms
        if (!cachedToken || now >= tokenExpiresAt) {
            const loginResponse = await axios.post('https://api.showtecnologia.com/api/login', {
                user: "rodrigo.nascimento@fkslogistics.com.br",
                password: "78393c9d90bd592a185735d28b4b42a8"
            });
            cachedToken = loginResponse.data.token;
            tokenExpiresAt = now + 2 * 60 * 60 * 1000; // 2 horas
            console.log('Novo token gerado em', new Date(now).toLocaleString());
        }
        req.authToken = cachedToken;
        next();
    } catch (error) {
        console.error('Erro ao realizar login:', error.response ? error.response.data : error.message);
        res.status(500).send('Erro ao realizar login');
    }
};

function agendarMonitoramento() {
    async function executarMonitoramento() {
        const inicio = Date.now();
        try {
            await axios.post('http://localhost:3003/api/posicoes/frotas/monitoramento');
            //console.log('Monitoramento automático executado:', new Date().toLocaleString());
        } catch (err) {
            console.error('Erro ao executar monitoramento automático:', err.message);
        }
        const duracao = Date.now() - inicio;
        setTimeout(executarMonitoramento, Math.max(0, 2 * 60 * 1000 - duracao));
    }
    executarMonitoramento();
}

function apagarBanco() {
    async function executaDelecao() {
        try {
            await new Promise((resolve, reject) => {
                sqlPoolLocal.query('DELETE FROM tb_historico_posicoes WHERE dt_registro < NOW() - INTERVAL 2 DAY', (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
            console.log('Banco apagado com sucesso.');
        } catch (err) {
            console.error('Erro ao apagar banco:', err.message);
        }
    }

    function agendarParaMeiaNoite() {
        const agora = new Date();
        const proximaMeiaNoite = new Date(
            agora.getFullYear(),
            agora.getMonth(),
            agora.getDate() + 1,
            0, 0, 0, 0
        );
        const msAteMeiaNoite = proximaMeiaNoite - agora;
        setTimeout(async () => {
            await executaDelecao();
            setInterval(executaDelecao, 24 * 60 * 60 * 1000); // Depois, executa todo dia à meia-noite
        }, msAteMeiaNoite);
    }

    agendarParaMeiaNoite();
}

agendarMonitoramento();
console.log('agendarMonitoramento foi chamado!');
apagarBanco();

// Nova função para forçar refresh do token
async function forceRefreshToken(req) {
    const now = Date.now();
    const loginResponse = await axios.post('https://api.showtecnologia.com/api/login', {
        user: "rodrigo.nascimento@fkslogistics.com.br",
        password: "78393c9d90bd592a185735d28b4b42a8"
    });
    cachedToken = loginResponse.data.token;
    tokenExpiresAt = now + 2 * 60 * 60 * 1000; // 2 horas
    req.authToken = cachedToken;
    console.log('Token forçado a ser renovado em', new Date(now).toLocaleString());
}

async function atualizarPermanenciaPoligono({ placa, poligonoAtual, poligonoAnterior, dataAtual }) {
    // Polígonos a ignorar para ABERTURA de permanência
    const ignorar = ["Volkswagen SJP", "Volkswagen SBC"];
    if (!placa) return;

    // Sempre fecha permanência do polígono anterior se saiu dele e não for ignorado
    if (
        poligonoAnterior &&
        poligonoAnterior !== poligonoAtual &&
        !ignorar.includes(poligonoAnterior)
    ) {
        await new Promise((resolve, reject) => {
            sqlPoolLocal.query(
                `UPDATE tb_permanencia_poligono
                    SET dt_saida = ?
                    WHERE nm_placa = ? AND nm_poligono = ? AND dt_saida IS NULL`,
                [dataAtual, placa, poligonoAnterior],
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
    }

    // Só abre permanência se o polígono atual não for ignorado
    if (
        poligonoAtual &&
        poligonoAtual !== "Em Trânsito" &&
        !ignorar.includes(poligonoAtual)
    ) {
        // Verifica se já existe registro aberto
        const [registroAberto] = await new Promise((resolve, reject) => {
            sqlPoolLocal.query(
                `SELECT 1 FROM tb_permanencia_poligono
                    WHERE nm_placa = ? AND nm_poligono = ? AND dt_saida IS NULL LIMIT 1`,
                [placa, poligonoAtual],
                (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                }
            );
        });
        if (!registroAberto) {
            // Abre novo registro de entrada
            await new Promise((resolve, reject) => {
                sqlPoolLocal.query(
                    `INSERT INTO tb_permanencia_poligono (nm_placa, nm_poligono, dt_entrada)
                        VALUES (?, ?, ?)`,
                    [placa, poligonoAtual, dataAtual],
                    (err) => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });
        }
    }
}

function isPointInPolygon(point, polygon) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i].x, yi = polygon[i].y;
        let xj = polygon[j].x, yj = polygon[j].y;
        let intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi + 0.0000001) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Utilize a middleware em suas rotas
router.use(authMiddleware);

// Nova rota para acessar o endpoint de monitoramento de frotas
router.post('/frotas/monitoramento', async (req, res) => {
    try {
        // Buscar placas diretamente do banco (padroniza para maiúsculas)
        const placas = await new Promise((resolve, reject) => {
            sqlPoolLocal.query(
                'SELECT nm_placa, cd_tipo_veiculo FROM tb_estado_veiculo',
                (err, results) => {
                    if (err) return reject(err);
                    resolve(results.map(r => ({
                        placa: r.nm_placa ? r.nm_placa.toUpperCase() : '',
                        cd_tipo_veiculo: r.cd_tipo_veiculo
                    })));
                }
            );
        });

        if (!placas || !Array.isArray(placas) || placas.length === 0) {
            return res.status(400).json({ error: 'Nenhuma placa encontrada na tabela tb_placa_filtrada.' });
        }

        // 1. Buscar polígonos do banco (mantido para lógica de direção)
        const polygonsList = await new Promise((resolve, reject) => {
            sqlPoolLocal.query('SELECT * FROM tb_poligono', (err, results) => {
                if (err) return reject(err);
                results.forEach(p => {
                    if (typeof p.js_poligono === 'string') {
                        p.js_poligono = JSON.parse(p.js_poligono);
                    }
                });
                resolve(results);
            });
        });

        // 2. Buscar estados anteriores das placas
        const placasStr = placas.map(p => `'${p.placa}'`).join(',');
        const estadosAnteriores = {};
        await new Promise((resolve, reject) => {
            sqlPoolLocal.query(
                `SELECT * FROM tb_estado_veiculo WHERE nm_placa IN (${placasStr}) ORDER BY dt_atualizacao DESC`,
                (err, results) => {
                    if (err) return reject(err);
                    results.forEach(r => estadosAnteriores[r.nm_placa ? r.nm_placa.toUpperCase() : ''] = r);
                    resolve(results);
                }
            );
        });

        let response;

        // 3. Buscar dados atuais dos veículos (API externa)
        try {
            response = await axios.post(
                'https://api.showtecnologia.com/api/frotas/monitoramento/grid',
                {
                    "campos": [
                        "veiculo",
                        "velocidade",
                        "localizacao",
                        "dataUltimaComunicacaoValida"
                    ]
                },
                {
                    headers: {
                        'x-access-token': req.authToken
                    }
                }
            );
        } catch (error) {
            // Verifica se é o erro de token inválido
            if (
                error.response &&
                error.response.data &&
                error.response.data.status === -1 &&
                error.response.data.auth === false &&
                error.response.data.dados === 'Token inválido.'
            ) {
                // Força refresh do token e tenta novamente UMA vez
                await forceRefreshToken(req);
                response = await axios.post(
                    'https://api.showtecnologia.com/api/frotas/monitoramento/grid',
                    {
                        "campos": [
                            "veiculo",
                            "localizacao",
                            "dataUltimaComunicacaoValida"
                        ]
                    },
                    {
                        headers: {
                            'x-access-token': req.authToken
                        }
                    }
                );
            } else {
                throw error;
            }
        }

        const basicAuth = 'Basic ' + Buffer.from(
            `${process.env.RASTREADOR_EMAIL}:${process.env.RASTREADOR_SENHA}`
        ).toString('base64');

        const authHeaders = { headers: { Authorization: basicAuth } };

        // 2. Buscar dispositivos do segundo rastreador
        let devices = [];
        try {
            const devicesResp = await axios.get('http://104.237.9.194:8082/api/devices', authHeaders);
            devices = devicesResp.data;
        } catch (e) {
            console.error('Erro ao buscar devices do rastreador secundário:', e.message);
        }

        // 3. Buscar posições do segundo rastreador
        let positions = [];
        try {
            const positionsResp = await axios.get('http://104.237.9.194:8082/api/positions', authHeaders);
            positions = positionsResp.data;
        } catch (e) {
            console.error('Erro ao buscar positions do rastreador secundário:', e.message);
        }

        // 4. Montar um map de placa para deviceId do rastreador secundário
        const deviceMap = {};
        devices.forEach(device => {
            if (device.name) {
                deviceMap[device.name.toUpperCase()] = device.id;
            }
        });

        // 5. Montar um map de deviceId para posição
        const positionMap = {};
        positions.forEach(pos => {
            positionMap[pos.deviceId] = pos;
        });

        // 6. Filtrar e AGRUPAR por placa (pega o registro mais recente por placa)
        const filteredData = response.data.dados.grid
            .filter(item =>
                placas.some((placaObj) => placaObj.placa === item.veiculo.placa.toUpperCase())
            );

        // Agrupa por placa e seleciona o registro mais recente (pelo campo dataUltimaComunicacaoValida)
        const placasMap = {};
        filteredData.forEach(item => {
            const placa = item.veiculo.placa.toUpperCase();
            const dataComunicacao = item.dataUltimaComunicacaoValida;
            if (
                !placasMap[placa] ||
                (dataComunicacao && dataComunicacao > placasMap[placa].dataUltimaComunicacaoValida)
            ) {
                placasMap[placa] = item;
            }
        });

        // 7. Para placas que não vieram da API principal, buscar no rastreador secundário
        placas.forEach(placaObj => {
            const placa = placaObj.placa;
            if (!placasMap[placa] && deviceMap[placa]) {
                const deviceId = deviceMap[placa];
                const pos = positionMap[deviceId];
                if (pos) {
                    // Monta um objeto no mesmo formato esperado
                    placasMap[placa] = {
                        veiculo: { placa },
                        localizacao: {
                            latitude: pos.latitude,
                            longitude: pos.longitude
                        },
                        dataUltimaComunicacaoValida: pos.fixTime || pos.deviceTime || pos.serverTime
                    };
                }
            }
        });
        const agrupados = Object.values(placasMap);

        // Polígonos onde NÃO deve marcar atraso
        const poligonosIgnorarAtraso = [
            "Pátio Volks SBC",
            "Pátio Volks SJP",
            "Volkswagen SBC",
            "Volkswagen SJP",
            "Pátio FKS"
        ];

        // 5. Lógica principal
        const pontoVolta = { lat: -23.740318351997846, lon: -46.54370230415042 };
        const pontoIda = { lat: -25.669676943366916, lon: -49.16914052279594 };
        const resultado = [];

        for (const item of agrupados) {
            const placa = item.veiculo.placa.toUpperCase();
            const latitude = item.localizacao.latitude;
            const longitude = item.localizacao.longitude;
            const latAtual = Number(latitude);
            const lonAtual = Number(longitude);
            const ponto = { x: longitude, y: latitude };
            const placaObj = placas.find(p => p.placa === placa);
            const cd_tipo_veiculo = placaObj && placaObj.cd_tipo_veiculo !== undefined && placaObj.cd_tipo_veiculo !== null
                ? placaObj.cd_tipo_veiculo
                : 0;

            // Descobrir polígono atual
            let situacao = "Em Trânsito";
            let poligonoAtual = null;
            const polygonsOrdenados = [...polygonsList].sort((a, b) => {
                if (a.nm_tipo_poligono === b.nm_tipo_poligono) return 0;
                if (a.nm_tipo_poligono === "Setor") return -1;
                if (b.nm_tipo_poligono === "Setor") return 1;
                return 0;
            });
            for (const poligono of polygonsOrdenados) {
                for (const poly of poligono.js_poligono) {
                    if (isPointInPolygon(ponto, poly)) {
                        situacao = poligono.nm_poligono;
                        poligonoAtual = poligono.nm_poligono;
                        break;
                    }
                }
                if (situacao !== "Em Trânsito") break;
            }

            // Buscar estado anterior
            const estadoAnterior = estadosAnteriores[placa] || {};
            const poligonoAnterior = estadoAnterior.nm_poligono_atual;

            await atualizarPermanenciaPoligono({
                placa,
                poligonoAtual: situacao,
                poligonoAnterior,
                dataAtual: new Date()
            });

            let saida = estadoAnterior.dt_saida;
            let direcao = estadoAnterior.nm_direcao || '-';

            // Variáveis precisam ser declaradas antes de qualquer uso!
            let distancia = null;
            let distanciaAnterior = estadoAnterior.cd_distancia !== null && estadoAnterior.cd_distancia !== undefined ? Number(estadoAnterior.cd_distancia) : null;
            let direcaoAnterior = estadoAnterior.nm_direcao || '-';
            let tendenciaVolta = Number(estadoAnterior.cd_tendenciaVolta) || 0;
            let tendenciaIda = Number(estadoAnterior.cd_tendenciaIda) || 0;
            let transitTime = saida ? new Date(new Date(saida).getTime() + 10 * 60 * 60 * 1000) : null;

            // --- Lógica de direção baseada em transição de polígono (mantida) ---
            if (
                (
                    poligonoAnterior === "Volkswagen SBC" ||
                    poligonoAnterior === "Doca Volkswagen SBC" ||
                    poligonoAnterior === "Pátio Volks SBC"
                ) && situacao === "Em Trânsito"
            ) {
                if (!saida) {
                    saida = new Date();
                    await new Promise((resolve, reject) => {
                        sqlPoolLocal.query(
                            `INSERT INTO tb_historico_posicoes(dt_registro, nm_placa, cd_posicao, nm_latitude, nm_longitude)
                            VALUES (NOW(), ?, 41, ?, ?)`,
                            [placa, latitude, longitude],
                            (err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                    });
                }
                direcao = "Ida - São José dos Pinhais";
            }
            else if (
                (
                    poligonoAnterior === "Volkswagen SJP" ||
                    poligonoAnterior === "Doca Volkswagen SJP" ||
                    poligonoAnterior === "Pátio Volks SJP"
                ) && situacao === "Em Trânsito"
            ) {
                if (!saida) {
                    saida = new Date();
                    await new Promise((resolve, reject) => {
                        sqlPoolLocal.query(
                            `INSERT INTO tb_historico_posicoes(dt_registro, nm_placa, cd_posicao, nm_latitude, nm_longitude)
                            VALUES (NOW(), ?, 51, ?, ?)`,
                            [placa, latitude, longitude],
                            (err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                    });
                }
                direcao = "Volta - São Bernardo do Campo";
            }
            else if (
                poligonoAnterior === "Em Trânsito" &&
                (
                    situacao === "Volkswagen SJP" ||
                    situacao === "Doca Volkswagen SJP" ||
                    situacao === "Pátio Volks SJP"
                )
            ) {
                saida = null;
                transitTime = null;
                direcao = "Ida - São José dos Pinhais";
                await new Promise((resolve, reject) => {
                    sqlPoolLocal.query(
                        `INSERT INTO tb_historico_posicoes(dt_registro, nm_placa, cd_posicao, nm_latitude, nm_longitude)
                        VALUES (NOW(), ?, 50, ?, ?)`,
                        [placa, latitude, longitude],
                        (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                });
                await new Promise((resolve, reject) => {
                    sqlPoolLocal.query(
                        `REPLACE INTO tb_estado_veiculo 
                        (nm_placa, nm_latitude, nm_longitude, nm_poligono_atual, nm_poligono_anterior, nm_direcao, dt_saida, dt_transitTime, cd_distancia, cd_tendenciaVolta, cd_tendenciaIda, cd_atraso, cd_tipo_veiculo, dt_atualizacao)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
                        [
                            placa,
                            latitude,
                            longitude,
                            situacao,
                            poligonoAnterior,
                            direcao,
                            null,
                            null,
                            distancia,
                            tendenciaVolta,
                            tendenciaIda,
                            cd_tipo_veiculo
                        ],
                        (err) => {
                            if (err) return reject(err);
                            resolve();
                        }
                    );
                });
                continue;
            }
            else if (
                poligonoAnterior === "Em Trânsito" &&
                (
                    situacao === "Volkswagen SBC" ||
                    situacao === "Doca Volkswagen SBC" ||
                    situacao === "Pátio Volks SBC"
                )
            ) {
                saida = null;
                transitTime = null;
                direcao = "Volta - São Bernardo do Campo";
                await new Promise((resolve, reject) => {
                    sqlPoolLocal.query(
                        `INSERT INTO tb_historico_posicoes(dt_registro, nm_placa, cd_posicao, nm_latitude, nm_longitude)
                        VALUES (NOW(), ?, 40, ?, ?)`,
                        [placa, latitude, longitude],
                        (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                });
                await new Promise((resolve, reject) => {
                    sqlPoolLocal.query(
                        `REPLACE INTO tb_estado_veiculo 
                        (nm_placa, nm_latitude, nm_longitude, nm_poligono_atual, nm_poligono_anterior, nm_direcao, dt_saida, dt_transitTime, cd_distancia, cd_tendenciaVolta, cd_tendenciaIda, cd_atraso, cd_tipo_veiculo, dt_atualizacao)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
                        [
                            placa,
                            latitude,
                            longitude,
                            situacao,
                            poligonoAnterior,
                            direcao,
                            null,
                            null,
                            distancia,
                            tendenciaVolta,
                            tendenciaIda,
                            cd_tipo_veiculo
                        ],
                        (err) => {
                            if (err) return reject(err);
                            resolve();
                        }
                    );
                });
                continue;
            }

            if (situacao === "Pátio FKS") {
                direcao = "Volta - São Bernardo do Campo";
            }

            if (
                situacao === "Pátio Volks SBC" ||
                situacao === "Doca Volkswagen SBC"
            ) {
                direcao = "Volta - São Bernardo do Campo";
            } else if (
                situacao === "Pátio Volks SJP" ||
                situacao === "Doca Volkswagen SJP"
            ) {
                direcao = "Ida - São José dos Pinhais";
            } else if (direcao === "-") {
                direcao = estadoAnterior.nm_direcao && estadoAnterior.nm_direcao !== '-' ? estadoAnterior.nm_direcao : "-";
            }



            // --- Cálculo da distância via OSRM ---
            try {
                const url = `http://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${pontoVolta.lon},${pontoVolta.lat}?overview=false`;
                let osrmResp;
                try {
                    osrmResp = await axios.get(url);
                } catch (e) {
                    if (e.code === 'ECONNRESET') {
                        console.warn('OSRM temporariamente indisponível, tentando novamente...');
                        osrmResp = await axios.get(url);
                    } else {
                        throw e;
                    }
                }
                if (
                    osrmResp &&
                    osrmResp.data &&
                    osrmResp.data.routes &&
                    osrmResp.data.routes.length > 0
                ) {
                    distancia = +(osrmResp.data.routes[0].distance / 1000).toFixed(1);
                }
            } catch (e) {
                console.error('Erro OSRM Distance:', e);
                distancia = null;
            }

                        let realTransitTime = null;
            let destinoCoords = null;
            if (direcao === "Ida - São José dos Pinhais") {
                destinoCoords = pontoIda;
            } else if (direcao === "Volta - São Bernardo do Campo") {
                destinoCoords = pontoVolta;
            }

            if (destinoCoords && latitude && longitude && item.velocidade) {
                try {
                    // Extrai velocidade numérica (ex: "82,0 km/h" => 82.0)
                    const velocidadeStr = item.velocidade.split(' ')[0].replace(',', '.');
                    const velocidadeNum = parseFloat(velocidadeStr);

                    // Se velocidade for 0 ou inválida, não calcula tempo
                    if (velocidadeNum > 0) {
                        const urlDestino = `http://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${destinoCoords.lon},${destinoCoords.lat}?overview=false`;
                        const osrmRespDestino = await axios.get(urlDestino);

                        if (
                            osrmRespDestino.data &&
                            osrmRespDestino.data.routes &&
                            osrmRespDestino.data.routes.length > 0
                        ) {
                            const distanciaDestino = osrmRespDestino.data.routes[0].distance / 1000; // km
                            const tempoHoras = distanciaDestino / velocidadeNum;
                            const chegada = new Date(Date.now() + tempoHoras * 60 * 60 * 1000);
                            realTransitTime = chegada.toISOString();
                        }
                    } else {
                        // Se velocidade for 0, retorna null
                        realTransitTime = null;
                    }
                } catch (e) {
                    console.error('Erro ao calcular realTransitTime:', e);
                    realTransitTime = null;
                }
            }

            // Salva histórico de posição/distância
            await new Promise((resolve, reject) => {
                sqlPoolLocal.query(
                    `INSERT INTO tb_historico_posicoes (nm_placa, dt_registro, cd_distancia)
                    VALUES (?, NOW(), ?)`,
                    [placa, distancia],
                    (err) => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });

            // Busca o registro de uma hora atrás no histórico
            const [registroAntigo] = await new Promise((resolve, reject) => {
                sqlPoolLocal.query(
                    `SELECT cd_distancia, dt_registro FROM tb_historico_posicoes
                    WHERE nm_placa = ? AND dt_registro <= DATE_SUB(NOW(), INTERVAL 1 HOUR)
                    ORDER BY dt_registro DESC LIMIT 1`,
                    [placa],
                    (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    }
                );
            });

            // --- LÓGICA DE ATRASO ---
            let cd_atraso = 0;
            let tempoAtrasoMinutos = 0;

            if (situacao === "Em Trânsito") {
                // Regra: não andou 2km em 1 hora
                if (registroAntigo && distancia !== null && registroAntigo.cd_distancia !== null) {
                    const distanciaPercorrida = Math.abs(Number(distancia) - Number(registroAntigo.cd_distancia));
                    if (distanciaPercorrida < 2) {
                        cd_atraso = 1;
                        // Tempo de atraso: quanto tempo está sem andar 2km
                        tempoAtrasoMinutos = Math.floor((new Date() - new Date(registroAntigo.dt_registro)) / 60000);
                    }
                }
            } else if (!poligonosIgnorarAtraso.includes(situacao)) {
                // Regra: ficou 1h ou mais parado no mesmo polígono, exceto nos ignorados
                // Busca a última entrada nesse polígono para a placa
                const [entradaPoligono] = await new Promise((resolve, reject) => {
                    sqlPoolLocal.query(
                        `SELECT dt_entrada FROM tb_permanencia_poligono
                            WHERE nm_placa = ? AND nm_poligono = ? AND dt_saida IS NULL
                            ORDER BY dt_entrada DESC LIMIT 1`,
                        [placa, situacao],
                        (err, results) => {
                            if (err) return reject(err);
                            resolve(results);
                        }
                    );
                });
                if (entradaPoligono) {
                    const tempoNoPoligono = (Date.now() - new Date(entradaPoligono.dt_entrada).getTime()) / (1000 * 60); // minutos
                    if (tempoNoPoligono >= 60) {
                        cd_atraso = 1;
                        tempoAtrasoMinutos = Math.floor(tempoNoPoligono);
                    }
                }
            }

            // Atualiza sempre o registro da placa (tb_estado_veiculo)
            await new Promise((resolve, reject) => {
                sqlPoolLocal.query(
                    `REPLACE INTO tb_estado_veiculo 
                    (nm_placa, nm_latitude, nm_longitude, nm_poligono_atual, nm_poligono_anterior, nm_direcao, dt_saida, dt_transitTime, cd_distancia, cd_tendenciaVolta, cd_tendenciaIda, cd_atraso, cd_tipo_veiculo, cd_velocidade, dt_realTransit, dt_atualizacao)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        placa,
                        latAtual,
                        lonAtual,
                        situacao,
                        poligonoAnterior,
                        direcao,
                        saida ? new Date(saida) : null,
                        transitTime ? new Date(transitTime) : null,
                        distancia,
                        tendenciaVolta,
                        tendenciaIda,
                        cd_atraso, 
                        cd_tipo_veiculo,
                        item.velocidade ? parseFloat(item.velocidade.split(' ')[0].replace(',', '.')) : null,
                        realTransitTime
                    ],
                    (err) => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });
            
            resultado.push({
                placa,
                latitude: latAtual,
                longitude: lonAtual,
                situacao,
                direcao,
                saida,
                transitTime,
                distancia: distancia !== null ? `${distancia}km` : null,
                cd_atraso,
                cd_tipo_veiculo,
                tempoAtrasoMinutos,
                realTransitTime,
                velocidade: item.velocidade
            });
        }
        //console.log(resultado);
        res.json({ resultado });
    } catch (error) {
        console.error('Erro ao acessar o endpoint de monitoramento de frotas:', error.response ? error.response.data : error.message);
        res.status(500).send('Erro ao acessar o endpoint de monitoramento de frotas');
    }
});

router.post('/loadVehicles', async (req, res) => {
    try {
    const query = `SELECT * FROM tb_estado_veiculo`;
    const result = await new Promise((resolve, reject) => {
        sqlPoolLocal.query(query, [ ], (err, results) => {
        if (err) return reject(err);
        resolve(results);
        });
    });

    if (result) {
        res.status(200).json(result);
    } else {
        res.status(404).json({ message: 'Veículos não encontrados' });
    }
    } catch (error) {
    console.error('Erro ao buscar veículos:', error);
    res.status(500).json({ message: 'Erro ao buscar veículos' });
    }
});

router.post('/salvarAgregado', async (req, res) => {
    const { placa, tipoVeiculo, posicao, direcao, saida, latitude, longitude, distancia } = req.body;
    if (!placa || !tipoVeiculo || !posicao || !direcao || !saida || !latitude || !longitude) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // Calcula transitTime: 10 horas após a saída
    const saidaDate = new Date(saida);
    const transitTime = new Date(saidaDate.getTime() + 10 * 60 * 60 * 1000);

    await new Promise((resolve, reject) => {
        sqlPoolLocal.query(
            `REPLACE INTO tb_estado_veiculo 
            (nm_placa, nm_latitude, nm_longitude, nm_poligono_atual, nm_direcao, dt_saida, dt_transitTime, cd_distancia, cd_tipo_veiculo, dt_atualizacao)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
            [
                placa,
                latitude,
                longitude,
                posicao,
                direcao,
                saidaDate,
                transitTime,
                distancia
            ],
            (err) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });

    res.json({ success: true });
});

// Calcula em qual polígono está a latitude/longitude 
router.post('/calcularPoligono', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        if (
            typeof latitude === 'undefined' ||
            typeof longitude === 'undefined' ||
            latitude === '' ||
            longitude === ''
        ) {
            return res.status(400).json({ error: 'Latitude e longitude são obrigatórios.' });
        }

        // Busca todos os polígonos do banco
        const poligonos = await new Promise((resolve, reject) => {
            sqlPoolLocal.query('SELECT nm_poligono, js_poligono FROM tb_poligono', (err, results) => {
                if (err) return reject(err);
                results.forEach(p => {
                    if (typeof p.js_poligono === 'string') {
                        p.js_poligono = JSON.parse(p.js_poligono);
                    }
                });
                resolve(results);
            });
        });

        // Monta o ponto
        const ponto = { x: Number(longitude), y: Number(latitude) };

        // Procura em qual polígono está
        let poligonoEncontrado = null;
        for (const poligono of poligonos) {
            for (const poly of poligono.js_poligono) {
                if (isPointInPolygon(ponto, poly)) {
                    poligonoEncontrado = poligono.nm_poligono;
                    break;
                }
            }
            if (poligonoEncontrado) break;
        }

        let distancia = null;
        // Só calcula a distância se estiver em trânsito (fora de qualquer polígono)
        if (!poligonoEncontrado) {
            const pontoReferencia = { lat: -23.740318351997846, lon: -46.54370230415042 }; // SBC
            try {
                const url = `http://router.project-osrm.org/route/v1/driving/${Number(longitude)},${Number(latitude)};${pontoReferencia.lon},${pontoReferencia.lat}?overview=false`;
                const osrmResp = await axios.get(url);
                if (
                    osrmResp.data &&
                    osrmResp.data.routes &&
                    osrmResp.data.routes.length > 0
                ) {
                    // Distância em metros, converte para km com 1 casa decimal
                    distancia = +(osrmResp.data.routes[0].distance / 1000).toFixed(1);
                }
            } catch (e) {
                console.error('Erro OSRM Distance:', e);
                distancia = null;
            }
        }

        res.json({
            posicao: poligonoEncontrado || 'Em Trânsito',
            distancia: !poligonoEncontrado && distancia !== null ? `${distancia}km` : null
        });
    } catch (error) {
        console.error('Erro ao calcular polígono:', error);
        res.status(500).json({ error: 'Erro ao calcular polígono.' });
    }
});

// Rota para trazer os polígonos cadastrados
router.post('/polygons', async (req, res) => {
    try {
        const query = `SELECT cd_poligono, nm_poligono, nm_tipo_poligono, js_poligono FROM tb_poligono`;
        const poligonos = await new Promise((resolve, reject) => {
        sqlPoolLocal.query(query, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
        });

        res.json(poligonos);
    } catch (error) {
        console.error('Erro ao trocar a senha:', error);
        res.status(500).json({ message: 'Erro ao trocar a senha' });
    }
});

router.post('/distanciaReferencia', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return res.status(400).json({ error: 'O corpo da requisição deve conter latitude e longitude numéricos.' });
        }

        const response = await axios.post(
            'https://api.showtecnologia.com/api/frotas/monitoramento/grid',
            {
                "campos": [
                    "veiculo",
                    "localizacao",
                ]
            },
            {
                headers: {
                    'x-access-token': req.authToken
                }
            }
        );

        // Função para calcular distância em km
        function calculateDistance(lat1, lon1, lat2, lon2) {
            const toRadians = (degree) => (degree * Math.PI) / 180;
            const R = 6371;
            const dLat = toRadians(lat2 - lat1);
            const dLon = toRadians(lon2 - lon1);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }

        // Filtra e calcula distância
        const placasDistancias = response.data.dados.grid
            .filter(item => item.veiculo.tipoPlano === "LICENCA DE USO OMNITURBO")
            .map(item => {
                const dist = calculateDistance(
                    latitude,
                    longitude,
                    item.localizacao.latitude,
                    item.localizacao.longitude
                );
                return {
                    placa: item.veiculo.placa,
                    latitude: item.localizacao.latitude,
                    longitude: item.localizacao.longitude,
                    distancia: Number(dist.toFixed(2))
                };
            })
            .sort((a, b) => a.distancia - b.distancia);

        res.json(placasDistancias);
    } catch (error) {
        console.error('Erro ao acessar o endpoint de monitoramento de frotas:', error.response ? error.response.data : error.message);
        res.status(500).send('Erro ao acessar o endpoint de monitoramento de frotas');
    }
});

router.post('/calcDistanciaAbastecimento', async (req, res) => {
    try {
        const { placa, latitude, longitude } = req.body;

        let response;
        // Buscar dados atuais dos veículos (API externa)
        try {
            response = await axios.post(
                'https://api.showtecnologia.com/api/frotas/monitoramento/grid',
                {
                    "campos": [
                        "veiculo",
                        "localizacao",
                        "dataUltimaComunicacaoValida"
                    ]
                },
                {
                    headers: {
                        'x-access-token': req.authToken
                    }
                }
            );
        } catch (error) {
            // Verifica se é o erro de token inválido
            if (
                error.response &&
                error.response.data &&
                error.response.data.status === -1 &&
                error.response.data.auth === false &&
                error.response.data.dados === 'Token inválido.'
            ) {
                // Força refresh do token e tenta novamente UMA vez
                await forceRefreshToken(req);
                response = await axios.post(
                    'https://api.showtecnologia.com/api/frotas/monitoramento/grid',
                    {
                        "campos": [
                            "veiculo",
                            "localizacao",
                            "dataUltimaComunicacaoValida"
                        ]
                    },
                    {
                        headers: {
                            'x-access-token': req.authToken
                        }
                    }
                );
            } else {
                throw error;
            }
        }

        const basicAuth = 'Basic ' + Buffer.from(
            `${process.env.RASTREADOR_EMAIL}:${process.env.RASTREADOR_SENHA}`
        ).toString('base64');

        const authHeaders = { headers: { Authorization: basicAuth } };

        // Buscar dispositivos do segundo rastreador
        let devices = [];
        try {
            const devicesResp = await axios.get('http://104.237.9.194:8082/api/devices', authHeaders);
            devices = devicesResp.data;
        } catch (e) {
            console.error('Erro ao buscar devices do rastreador secundário:', e.message);
        }

        // Buscar posições do segundo rastreador
        let positions = [];
        try {
            const positionsResp = await axios.get('http://104.237.9.194:8082/api/positions', authHeaders);
            positions = positionsResp.data;
        } catch (e) {
            console.error('Erro ao buscar positions do rastreador secundário:', e.message);
        }

        // Montar um map de placa para deviceId do rastreador secundário
        const deviceMap = {};
        devices.forEach(device => {
            if (device.name) {
                deviceMap[device.name.toUpperCase()] = device.id;
            }
        });

        // Montar um map de deviceId para posição
        const positionMap = {};
        positions.forEach(pos => {
            positionMap[pos.deviceId] = pos;
        });

        // Filtrar e AGRUPAR por placa (pega o registro mais recente por placa)
        const filteredData = response.data.dados.grid
            .filter(item => item.veiculo.placa.toUpperCase() === placa.toUpperCase());

        // Agrupa por placa e seleciona o registro mais recente (pelo campo dataUltimaComunicacaoValida)
        const placasMap = {};
        filteredData.forEach(item => {
            const placaItem = item.veiculo.placa.toUpperCase();
            const dataComunicacao = item.dataUltimaComunicacaoValida;
            if (
                !placasMap[placaItem] ||
                (dataComunicacao && dataComunicacao > placasMap[placaItem].dataUltimaComunicacaoValida)
            ) {
                placasMap[placaItem] = item;
            }
        });

        // Para placas que não vieram da API principal, buscar no rastreador secundário
        const placaUpper = placa.toUpperCase();
        if (!placasMap[placaUpper] && deviceMap[placaUpper]) {
            const deviceId = deviceMap[placaUpper];
            const pos = positionMap[deviceId];
            if (pos) {
                placasMap[placaUpper] = {
                    veiculo: { placa: placaUpper },
                    localizacao: {
                        latitude: pos.latitude,
                        longitude: pos.longitude
                    },
                    dataUltimaComunicacaoValida: pos.fixTime || pos.deviceTime || pos.serverTime
                };
            }
        }

        // Busca a localização da placa informada
        const placaInfo = placasMap[placaUpper];

        if (!placaInfo || !placaInfo.localizacao) {
            return res.status(404).json({ error: 'Localização da placa não encontrada.' });
        }

        const placaLat = Number(placaInfo.localizacao.latitude);
        const placaLon = Number(placaInfo.localizacao.longitude);

        // Calcula a distância usando OSRM entre a placa e o ponto informado
        const url = `http://router.project-osrm.org/route/v1/driving/${placaLon},${placaLat};${longitude},${latitude}?overview=false`;
        const osrmResp = await axios.get(url);

        if (
            osrmResp.data &&
            osrmResp.data.routes &&
            osrmResp.data.routes.length > 0
        ) {
            // Distância em metros, converte para km com 1 casa decimal
            const distancia = +(osrmResp.data.routes[0].distance / 1000).toFixed(1);
            res.json({ distancia: `${distancia}km` });
        } else {
            res.status(404).json({ error: 'Rota não encontrada.' });
        }
    } catch (error) {
        console.error('Erro ao calcular distância de abastecimento:', error);
        res.status(500).json({ error: 'Erro ao calcular distância de abastecimento.' });
    }
});

router.post('/getRealTransit', async (req, res) => {

    try {
        const query = `
            SELECT nm_placa, dt_realTransit FROM tb_estado_veiculo WHERE dt_realTransit IS NOT NULL AND nm_direcao = 'Ida - São José dos Pinhais' AND nm_poligono_atual = 'Em Trânsito';
        `;
        const [result] = await sqlPoolLocal.promise().query(query, []);

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar último trânsito real:', error);
        res.status(500).json({ error: 'Erro ao processar a busca do último trânsito real' });
    }
});

router.post('/saveInfo', async (req, res) => {
    try {
        const query = `
            INSERT INTO tb_atraso (dt_atraso, nm_placa, nm_obs_atraso, nm_usr_create) VALUES (NOW(), ?, ?, ?);
        `;
        const [result] = await sqlPoolLocal.promise().query(query, [req.body.nm_placa, req.body.nm_obs_atraso, req.body.nm_usr_create]);

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao salvar informações:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação de salvamento de informações' });
    }
});

router.post('/getHistoricoAtraso', async (req, res) => {
    try {
        const query = `
            SELECT * FROM tb_atraso WHERE nm_placa = ? ORDER BY dt_atraso DESC;
        `;
        const [result] = await sqlPoolLocal.promise().query(query, [req.body.nm_placa]);

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar histórico de atrasos:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação de histórico de atrasos' });
    }
});

module.exports = router;