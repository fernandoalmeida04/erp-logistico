const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const abastecimentoSchema = require('./routes/graphql/abastecimento');
const cors = require('cors');
const http = require('http');
//const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
//const io = socketIo(server, { cors: { origin: '*' } });

const vehicleDetails = require('./routes/manutencao/vehicleDetails');
const entrada = require('./routes/manutencao/entrada');
const excelFiles = require('./routes/manutencao/excelFiles');
const checklist = require('./routes/manutencao/checklist');
const authRoutes = require('./routes/geral/authRoutes');
const biRoutes = require('./routes/encapsulamentoBI/biExibition');
const ordemcoletaRoutes = require('./routes/programacao/ordemcoleta');
const programarInternoRoutes = require('./routes/programacao/programacao');
const programarColetaRoutes = require('./routes/programacao/programarColeta');
const specificCasesRoutes = require('./routes/programacao/specificCases');
const posicoes = require('./routes/monitoramento/posicoes');
const poligonos = require('./routes/monitoramento/poligonos');
const placas = require('./routes/monitoramento/placas');
const abastecimento = require('./routes/abastecimento/abastecimento');
const seguranca = require('./routes/seguranca/seguranca');

app.use(cors());
app.use(express.json());

// Middleware para passar io para as rotas
// app.use((req, res, next) => {
//     req.io = io;
//     next();
// });

// Rotas
app.use('/api/vehicleDetails', vehicleDetails);
app.use('/api/entrada', entrada);
app.use('/api/excelFiles', excelFiles);
app.use('/api/checklist', checklist);
app.use('/api/auth', authRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/oc', ordemcoletaRoutes);
app.use('/api/programacao', programarInternoRoutes);
app.use('/api/specificCases', specificCasesRoutes);
app.use('/api/programarColeta', programarColetaRoutes);
app.use('/api/posicoes', posicoes);
app.use('/api/poligonos', poligonos);
app.use('/api/placas', placas);
app.use('/api/abastecimento', abastecimento);
app.use('/api/seguranca', seguranca);
app.use('/api/graphql', graphqlHTTP({
    schema: abastecimentoSchema,
    graphiql: true
}));
// Rota básica
app.get('/', (req, res) => {
    res.send('Olá, Backend!');
});

// Evento de conexão do socket
// io.on('connection', (socket) => {
//     console.log('Novo cliente conectado');
// });

server.listen(3003, () => {
    console.log('Servidor rodando na porta 3003');
});