import React, { useState, useEffect } from 'react';
import './dashboard-os.css';
import { Typography, Paper, Button } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import ModalUpload from './ModalUpload/ModalUpload';
import ModalOS from './ModalOS/ModalOS';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

// Array de cores em tons pastéis claros
const cores = {
    'Borracharia': '#f7b042',
    'Elétrico': '#74b8ec',
    'Funilaria': '#ec4a4a',
    'Lavagem': '#4ca86b',
    'Mecânico': '#333',
    'Rastreador': '#8e44ad',
    'Gases': '#3498db',
    'Soldagem': '#e67e22',
    'Sider': '#029c19',
};

const columns = ['Borracharia', 'Elétrico', 'Funilaria', 'Lavagem', 'Mecânico', 'Rastreador', 'Gases', 'Soldagem', 'Sider'];

const DashboardOS = () => {
    const [data, setData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedOS, setSelectedOS] = useState(null);
    const [isModalOSOpen, setIsModalOSOpen] = useState(false);

    // Buscar dados da API de OS
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${apiUrl}/checklist/listOS`);
            const rawData = response.data;

            // Reorganizar os dados por placa
            const groupedData = rawData.reduce((acc, os) => {
                const { nm_placa, nm_setor, cd_os, dt_emissao, nm_status, nm_tipoveiculo } = os;

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
                        tipoVeiculo: nm_tipoveiculo || '',
                    };
                }

                // O setor já vem padronizado do banco
                if (columns.includes(nm_setor)) {
                    acc[nm_placa][nm_setor].push({ cd_os, dt_emissao, nm_status });
                }

                return acc;
            }, {});

            setData(groupedData);
        } catch (error) {
            console.error('Erro ao buscar os dados:', error);
            alert('Erro ao buscar os dados do backend.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCardClick = (os) => {
        setSelectedOS(os.cd_os);
        setIsModalOSOpen(true);
    };

    const calculateTimeSinceEmission = (dataEmissao) => {
        if (!dataEmissao) return 'Data inválida';
        const emissionDate = new Date(dataEmissao);
        if (isNaN(emissionDate.getTime())) return 'Data inválida';
        const now = new Date();
        const diffInMilliseconds = now - emissionDate;
        const days = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffInMilliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days}d ${hours}h`;
    };

    useEffect(() => {
        fetchData();
        // Atualização automática a cada 5 minutos
        const interval = setInterval(() => {
            fetchData();
        }, 300000); // 300000 ms = 5 minutos

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="dashboard-os" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="dashboard-header" style={{ padding: '16px' }}>
                <h1>Dashboard OS</h1>
                <Button
                    variant="contained"
                    sx={{ backgroundColor: 'green', color: 'white', '&:hover': { backgroundColor: 'darkgreen' } }}
                    onClick={fetchData}
                >
                    ATUALIZAR
                </Button>
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
                                            {data[placa].tipoVeiculo}
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
                                                            onClick={() => handleCardClick(os)}
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
                                                                <strong>OS:</strong> {os.cd_os} <span style={{ color: 'red', fontWeight: 'bold', float: 'right' }}>{calculateTimeSinceEmission(os.dt_emissao)}</span>
                                                                <Typography variant="body2" sx={{ textAlign: 'start' }}>
                                                                    {os.nm_status}
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

            {isUploadModalOpen && (
                <div className="modal-overlay">
                    <button
                        className="close-modal-button"
                        onClick={() => setIsUploadModalOpen(false)}
                    >
                        X
                    </button>
                    <ModalUpload
                        onClose={() => setIsUploadModalOpen(false)}
                    />
                </div>
            )}
            {isModalOSOpen && (
                <div className="modal-overlay">
                    <button
                        className="close-modal-button"
                        onClick={() => setIsModalOSOpen(false)}
                    >
                        X
                    </button>
                    <ModalOS
                        osNumber={selectedOS}
                        onClose={() => setIsModalOSOpen(false)}
                    />
                </div>
            )}
        </div>
    );
};

export default DashboardOS;