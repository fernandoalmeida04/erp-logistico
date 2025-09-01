import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, IconButton, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

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

const statusOptions = [
    'Em Aberto',
    'Em Execução',
    'Aguardando'
];

const ModalOS = ({ osNumber, onClose }) => {
    const [osData, setOsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('');
    const [statusLoading, setStatusLoading] = useState(false);

    useEffect(() => {
        const fetchOSDetails = async () => {
            setIsLoading(true);
            try {
                const response = await axios.post(`${apiUrl}/excelFiles/osDetailModal`, { osNumber });
                setOsData(response.data);
                setStatus(response.data.nm_status || '');
                setError(null);
            } catch (err) {
                setError('Erro ao buscar os detalhes da OS.');
            } finally {
                setIsLoading(false);
            }
        };

        if (osNumber) {
            fetchOSDetails();
        }
    }, [osNumber]);

    // Atualiza status no banco ao trocar o select ou finalizar
    const handleStatusChange = async (eventOrStatus) => {
        const newStatus = typeof eventOrStatus === 'string' ? eventOrStatus : eventOrStatus.target.value;
        setStatus(newStatus);
        setStatusLoading(true);
        try {
            await axios.post(`${apiUrl}/checklist/updateOSStatus`, {
                cd_os: osNumber,
                nm_status: newStatus
            });
        } catch (err) {
            alert('Erro ao atualizar status da OS.');
        } finally {
            setStatusLoading(false);
        }
    };

    // Corrige a data sem somar 3 horas
    const formatDate = (isoDate) => {
        if (!isoDate) return 'N/A';
        const date = new Date(isoDate);
        date.setHours(date.getHours());
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    if (!osNumber) return null;

    // Cor da faixa lateral
    const faixaCor = osData && cores[osData.nm_setor] ? cores[osData.nm_setor] : '#ccc';

    return (
        <Modal open={true} onClose={onClose}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '400px',
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 0,
                    borderRadius: 2,
                    display: 'flex',
                    minHeight: 320
                }}
            >
                {/* Faixa colorida à esquerda */}
                <Box sx={{
                    width: 12,
                    borderTopLeftRadius: 8,
                    borderBottomLeftRadius: 8,
                    background: faixaCor,
                    minHeight: '100%'
                }} />

                <Box sx={{ flex: 1, p: 4, position: 'relative' }}>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                        }}
                    >
                        <CloseIcon />
                    </IconButton>

                    {isLoading ? (
                        <Typography>Carregando...</Typography>
                    ) : error ? (
                        <Typography color="error">{error}</Typography>
                    ) : (
                        <>
                            <Typography variant="h4" component="h2" sx={{ marginBottom: 2 }}>
                                OS #{osNumber}
                            </Typography>

                            <div>
                                <Typography variant="h6" component="h2" sx={{ mb: 2, marginBottom: 0 }}>
                                    Dados
                                </Typography>
                                <Typography sx={{ mt: 1, textAlign: 'start', fontSize: '0.8rem' }}>
                                    <strong>Placa:</strong> {osData.nm_placa || 'N/A'}
                                </Typography>
                                <Box sx={{ mt: 1, textAlign: 'start', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <strong>Status:</strong>
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel id="status-select-label">Status</InputLabel>
                                        <Select
                                            labelId="status-select-label"
                                            value={status}
                                            label="Status"
                                            onChange={handleStatusChange}
                                            disabled={statusLoading || status === 'Finalizado'}
                                            sx={{ fontSize: '0.9rem' }}
                                        >
                                            {statusOptions.map(opt => (
                                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                                <Typography sx={{ mt: 1, textAlign: 'start', fontSize: '0.8rem' }}>
                                    <strong>Data de Emissão:</strong> {formatDate(osData.dt_emissao)}
                                </Typography>
                                <Typography sx={{ mt: 1, textAlign: 'start', fontSize: '0.8rem' }}>
                                    <strong>Checklist:</strong> {osData.cd_checklist} - {osData.nm_setor || 'N/A'}
                                </Typography>
                                <Typography sx={{ mt: 1, textAlign: 'start', fontSize: '0.8rem' }}>
                                    <strong>Observação:</strong>
                                </Typography>
                                <Typography sx={{ textAlign: 'start', fontSize: '0.8rem', whiteSpace: 'pre-line' }}>
                                    {osData.nm_observacao || 'N/A'}
                                </Typography>
                            </div>
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start' }}>
                                <Button
                                    variant="contained"
                                    color="success"
                                    disabled={statusLoading || status === 'Finalizado'}
                                    onClick={() => {
                                        if (window.confirm(`Deseja realmente finalizar a OS #${osNumber}?`)) {
                                            handleStatusChange('Finalizado');
                                        }
                                    }}
                                >
                                    Finalizar OS
                                </Button>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>
        </Modal>
    );
};

export default ModalOS;