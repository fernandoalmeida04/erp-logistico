import React, { useState, useEffect } from 'react';
import './dashboard.css';
import ModalNovaEntrada from './ModalNovaEntrada/ModalNovaEntrada';
import ModalDelete from './ModalDelete/ModalDelete';
import axios from 'axios';
import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';

const apiUrl = process.env.REACT_APP_API_URL;

const Dashboard = () => {
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [isDeleModalOpen, setIsDeleteModalOpen] = useState(false);
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    // Colunas da tabela
    const columns = [
        { field: 'dt_entrada', headerName: 'Data', width: 220 },
        { field: 'nm_placa1', headerName: 'Placa Cavalo', width: 150 },
        { field: 'nm_placa2', headerName: 'Placa Carreta', width: 150 },
        { field: 'nm_placa3', headerName: 'Placa Carreta 2', width: 150 },
        { field: 'nm_motorista', headerName: 'Motorista', width: 300 },
        {
            field: 'actions',
            headerName: 'Ações',
            width: 150,
            renderCell: (params) => (
                <Button
                    variant="contained"
                    sx={{ backgroundColor: 'red', color: 'white', '&:hover': { backgroundColor: 'darkred' } }}
                    onClick={() => setIsDeleteModalOpen(true)}
                >
                    SAÍDA
                </Button>
            ),
        },
    ];

    // Buscar dados da API
    const fetchData = async () => {
        try {
            const response = await axios.post(`${apiUrl}/entrada/show-entrance`, {});
            setData(response.data);
        } catch (error) {
            console.error('Erro ao buscar os dados:', error);
            alert('Erro ao buscar os dados do backend.');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="dashboard">
            <div className="dashboard-header" style={{ padding: '16px' }}>
                <h1>Dashboard Entradas</h1>
                <Button
                    variant="contained"
                    sx={{ backgroundColor: 'green', color: 'white', '&:hover': { backgroundColor: 'darkgreen' } }}
                    onClick={() => setIsNewModalOpen(true)}
                >
                    NOVA ENTRADA +
                </Button>
            </div>

            <Paper sx={{ height: 500, width: '110%' }}>
                <DataGrid
                    rows={data.map((item, index) => ({ id: index, ...item }))}
                    columns={columns}
                    pageSize={pageSize}
                    onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
                    pagination
                    checkboxSelection
                    sx={{
                        border: 0,
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: '#f5f5f5',
                        },
                    }}
                    autoHeight
                />
            </Paper>

            {isNewModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button
                            className="close-modal-button"
                            onClick={() => setIsNewModalOpen(false)}
                        >
                            X
                        </button>
                        <ModalNovaEntrada />
                    </div>
                </div>
            )}
            {isDeleModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button
                            className="close-modal-button"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            X
                        </button>
                        <ModalDelete />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;