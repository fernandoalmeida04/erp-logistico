import React, { useEffect, useState } from 'react';
import axios from 'axios';


const API_URL = process.env.REACT_APP_API_URL;

const cardStyle = {
    background: '#fff',
    border: '1px solid #f37215',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    padding: '12px 18px',
    margin: '12px 8px',
    minWidth: '220px',
    maxWidth: '260px',
    display: 'inline-block',
    verticalAlign: 'top',
};

const infoStyle = {
    margin: '4px 0',
    fontSize: '15px',
    color: '#333',
};

const SolicitacaoAbastecimento = () => {
    const [solicitacoes, setSolicitacoes] = useState([]);

    // Carrega solicitações pendentes ao entrar no componente
    useEffect(() => {
        const listarSolicitacoes = async () => {
            try {
                const res = await axios.post(`${API_URL}/abastecimento/listarSolictacao`);
                setSolicitacoes(res.data);
            } catch (error) {
                alert('Erro ao buscar solicitações');
            }
        };

        listarSolicitacoes();

        // // WebSocket: adiciona novas solicitações em tempo real
        // socket.on('novaSolicitacao', (data) => {
        //     setSolicitacoes((prev) => [data, ...prev]);
        // });

        // socket.on('solicitacaoLiberada', (data) => {
        //     setSolicitacoes((prev) =>
        //         prev.filter((item) =>
        //             String(item.cd_solicitacao) !== String(data.cd_solicitacao)
        //         )
        //     );
        // });

        // return () => {
        //     socket.off('novaSolicitacao');
        //     socket.off('solicitacaoLiberada');
        // };
    }, []);

    const aprovarSolicitacao = async (solicitacaoId, litros) => {
        try {
            await axios.post(`${API_URL}/abastecimento/liberar`, {
                solicitacaoId,
                litros,
            });
            // O card será removido pelo evento socket 'solicitacaoLiberada'
        } catch (error) {
            alert('Erro ao aprovar solicitação');
        }
    };

    return (
        <div>
            <h1 style={{ marginBottom: 18 }}>Visualizar Abastecimentos</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                {solicitacoes.map((item) => (
                        <div
                            key={item.cd_solicitacao}
                            style={cardStyle}
                        >
                        <div style={infoStyle}><strong>ID:</strong> {item.cd_solicitacao}</div>
                        <div style={infoStyle}><strong>Usuário:</strong> {item.usuario || item.nm_motorista}</div>
                        <div style={infoStyle}><strong>Placa:</strong> {item.placa || item.nm_placa1}</div>
                        <div style={infoStyle}><strong>Litros:</strong> {item.litros || item.cd_litros_liberados}</div>
                        <button
                            style={{
                                marginTop: 10,
                                background: '#44B5DB',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 5,
                                padding: '6px 16px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                            }}
                            onClick={() => aprovarSolicitacao(item.cd_solicitacao, item.litros || item.cd_litros_liberados)}
                        >
                            Aprovar
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SolicitacaoAbastecimento;