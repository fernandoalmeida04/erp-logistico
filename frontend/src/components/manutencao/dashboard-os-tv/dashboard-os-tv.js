import React, { useState, useEffect, useRef } from 'react';
import './dashboard-os-tv.css';
import { Box, Typography, Paper } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

// Array de cores em tons pastéis claros
const cores = {
    'mecanico': '#f7b042',
    'eletricista': '#74b8ec',
    'funilaria': '#ec4a4a',
    'lavagem': '#4ca86b',
    'borracharia': '#333',
    'rastreador': '#8e44ad',
    'gases': '#3498db',
    'soldagem': '#e67e22',
    'Sider': '#029c19',
};

const DashboardOS = () => {
    const [data, setData] = useState([]); // Inicialize como array
    const [isLoading, setIsLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState(300);
    const [error, setError] = useState(''); // Estado para mensagens de erro
    const hasFetched = useRef(false); // Sinalizador para evitar múltiplas chamadas redundantes

    // Buscar dados da API
    const fetchData = async () => {
        try {
            const response = await axios.post(`${apiUrl}/excelFiles/osDetails`, {});
            const rawData = response.data;

            // Reorganizar os dados por placa
            const groupedData = rawData.reduce((acc, os) => {
                const { nm_placa, nm_setor, cd_os, dt_emissao, nm_status } = os;

                if (!acc[nm_placa]) {
                    acc[nm_placa] = {
                        Borracharia: [],
                        Elétrico: [],
                        Funilaria: [],
                        Lavagem: [],
                        Mecânico: [],
                        Rastreador: [],
                        Gases: [],
                        Soldagem: [],
                        Sider: [],
                        tipoVeiculo: nm_setor.toLowerCase().includes('carreta') ? 'Carreta' : 'Cavalo',
                    };
                }

                // Mapear o setor para a coluna correta
                const setorMap = {
                    'INSPEÇÃO CAVALO - BORRACHARIA': 'Borracharia',
                    'INSPEÇÃO CAVALO - ELETRICO': 'Elétrico',
                    'INSPEÇÃO CAVALO - FUNILARIA': 'Funilaria',
                    'INSPEÇÃO CAVALO - LAVAGEM/LIMPEZA ': 'Lavagem',
                    'INSPEÇÃO CAVALO - MECANICO': 'Mecânico',
                    'INSPEÇÃO CAVALO - RASTREADOR / CAMERA': 'Rastreador',
                    'INSPEÇÃO CAVALO - REGENERACAO DE GASES': 'Gases',
                    'INSPEÇÃO CAVALO - SOLDAGEM': 'Soldagem',
                    'INSPEÇÃO CARRETA - BORRACHARIA': 'Borracharia',
                    'INSPEÇÃO CARRETA - ELETRICO': 'Elétrico',
                    'INSPEÇÃO CARRETA - FUNILARIA': 'Funilaria',
                    'INSPEÇÃO CARRETA - LIMPEZA': 'Lavagem',
                    'INSPEÇÃO CARRETA - MECANICO': 'Mecânico',
                    'INSPEÇÃO CARRETA - RASTREADOR': 'Rastreador',
                    'INSPEÇÃO CARRETA - REFORMA DE SIDER': 'Sider',
                };

                const column = setorMap[nm_setor];
                if (column) {
                    acc[nm_placa][column].push({ cd_os, dt_emissao, nm_status });
                }

                return acc;
            }, {});

            setData(groupedData); // Atualize o estado com os dados reorganizados
            setError(''); // Limpa o erro se a requisição for bem-sucedida
        } catch (error) {
            console.error('Erro ao buscar os dados:', error);
            setError('Erro ao buscar os dados do backend. Tente novamente mais tarde.');
        } finally {
            setIsLoading(false); // Finalize o carregamento
        }
    };

    const calculateTimeSinceEmission = (dataEmissao) => {
        if (!dataEmissao) {
            return 'Data inválida'; // Retorna uma mensagem padrão se o campo estiver vazio
        }

        const emissionDate = new Date(dataEmissao);

        // Verifica se a data é válida
        if (isNaN(emissionDate.getTime())) {
            console.error('Data inválida recebida:', dataEmissao);
            return 'Data inválida'; // Retorna uma mensagem padrão se a data não for válida
        }

        const now = new Date();
        const diffInMilliseconds = now - emissionDate;

        const days = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffInMilliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        return `${days}d ${hours}h`;
    };

    useEffect(() => {
        if (!hasFetched.current) {
            fetchData();
            hasFetched.current = true;
        }

        // Configura o intervalo para executar fetchData a cada 5 minutos
        const intervalId = setInterval(() => {
            fetchData();
            setTimeRemaining(300); // Reinicia o timer
        }, 300000); // 300.000 ms = 5 minutos

        // Atualiza o timer a cada segundo
        const timerId = setInterval(() => {
            setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        // Limpa os intervalos ao desmontar o componente
        return () => {
            clearInterval(intervalId);
            clearInterval(timerId);
        };
    }, []);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const columns = ['Borracharia', 'Elétrico', 'Funilaria', 'Lavagem', 'Mecânico', 'Rastreador', 'Gases', 'Soldagem', 'Sider'];

    return (
        <div className="dashboard-os" style={{ height: '100vh', display: 'flex', flexDirection: 'column', marginLeft: '2vw' }}>
            <div className="dashboard-header" style={{ padding: '16px' }}>
                <h1>Dashboard OS</h1>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'gray' }}>
                    Atualização em: {formatTime(timeRemaining)}
                </Typography>
                {error && (
                    <Typography variant="body2" color="error" sx={{ marginTop: 2 }}>
                        {error}
                    </Typography>
                )}
            </div>
            <TableContainer component={Paper} style={{ maxHeight: '80vh', overflow: 'auto' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell
                                style={{
                                    position: 'sticky',
                                    top: 0,
                                    backgroundColor: '#fff',
                                    zIndex: 1,
                                    fontWeight: 'bold',
                                }}
                            >
                                <strong>Placa</strong>
                            </TableCell>
                            {columns.map((col, index) => {
                                const totalOS = Object.values(data).reduce((sum, placaData) => {
                                    return sum + (placaData[col]?.length || 0);
                                }, 0);

                                return (
                                    <TableCell
                                        key={col}
                                        style={{
                                            position: 'sticky',
                                            top: 0,
                                            backgroundColor: Object.values(cores)[index],
                                            color: '#fff',
                                            zIndex: 1,
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {col} - {totalOS}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} align="center">Carregando...</TableCell>
                            </TableRow>
                        ) : (
                            Object.keys(data).map((placa) => (
                                <TableRow key={placa}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>
                                        {placa}
                                        <Typography variant="body2" sx={{ color: '#555', textAlign: 'start', fontSize: '12px' }}>
                                            {data[placa]?.tipoVeiculo || 'Tipo não disponível'}
                                        </Typography>
                                    </TableCell>
                                    {columns.map((col, index) => (
                                        <TableCell key={col} sx={{ padding: '2px' }}>
                                            <div
                                                style={{
                                                    maxHeight: '150px',
                                                    overflowY: 'auto',
                                                    padding: '4px',
                                                    borderRadius: '4px',
                                                }}
                                            >
                                                {data[placa][col] && data[placa][col].length > 0 ? (
                                                    data[placa][col].map((os, osIndex) => (
                                                        <div
                                                            key={osIndex}
                                                            style={{
                                                                border: '1px solid #ccc',
                                                                borderRadius: '4px',
                                                                marginBottom: '8px',
                                                                backgroundColor: '#fff',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    height: '5px',
                                                                    backgroundColor: Object.values(cores)[index],
                                                                    borderTopLeftRadius: '4px',
                                                                    borderTopRightRadius: '4px',
                                                                }}
                                                            ></div>
                                                            <div style={{ padding: '8px' }}>
                                                                <strong>OS:</strong> {os.cd_os || 'N/A'}
                                                                <span style={{ color: 'red', fontWeight: 'bold', float: 'right' }}>
                                                                    {calculateTimeSinceEmission(os.dt_emissao)}
                                                                </span>
                                                                <Typography variant="body2" sx={{ textAlign: 'start' }}>
                                                                    {os.nm_status || 'Status não disponível'}
                                                                </Typography>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ color: '#aaa' }}></div>
                                                )}
                                            </div>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};

export default DashboardOS;