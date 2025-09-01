import React, { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    CircularProgress,
    useMediaQuery
} from '@mui/material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const DashboardEntradas = () => {
    const [entradas, setEntradas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saidaLoading, setSaidaLoading] = useState({});
    const [msg, setMsg] = useState('');

    // Responsivo: calcula quantos cards por linha conforme largura da tela
    const isXs = useMediaQuery('(max-width:600px)');
    const isSm = useMediaQuery('(max-width:900px)');
    const isMd = useMediaQuery('(max-width:1200px)');
    let gridColumns = 4;
    if (isXs) gridColumns = 1;
    else if (isSm) gridColumns = 2;
    else if (isMd) gridColumns = 3;

    const fetchEntradas = async () => {
        setLoading(true);
        setMsg('');
        try {
            const response = await axios.post(`${API_URL}/seguranca/listEntrance`);
            setEntradas(response.data);
        } catch (error) {
            setMsg('Erro ao buscar entradas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntradas();
        const interval = setInterval(fetchEntradas, 180000);
        return () => clearInterval(interval);
    }, []);

    const handleSaida = async (placa) => {
        setSaidaLoading(prev => ({ ...prev, [placa]: true }));
        setMsg('');
        try {
            await axios.post(`${API_URL}/seguranca/saveExit`, { placa });
            setMsg('Saída registrada com sucesso!');
            fetchEntradas();
        } catch (error) {
            setMsg('Erro ao registrar saída.');
        } finally {
            setSaidaLoading(prev => ({ ...prev, [placa]: false }));
        }
    };

    // Função para definir cor do card conforme tipo de entrada
    const getCardColors = (tipo) => {
        if (tipo === 'Empresa') {
            return { bg: '#e8f5e9', border: '#43a047' }; // verde
        } else if (tipo === 'Entrega') {
            return { bg: '#e3f2fd', border: '#1976d2' }; // azul
        } else if (tipo === 'Prestador') {
            return { bg: '#fffde7', border: '#fbc02d' }; // amarelo
        } else if (tipo === 'Operacao') {
            return { bg: '#f3e5f5', border: '#e1b1bc' }; // roxo
        }
        return { bg: '#fff', border: '#e0e0e0' };
    };

    return (
        <Box sx={{ maxWidth: 1400, mr: 'auto', p: { xs: 1, sm: 3 } }}>
            <Typography variant="h4" align="start" gutterBottom>
                Entradas
            </Typography>
            {/* Legenda de cores */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 15, height: 15, bgcolor: '#e8f5e9', border: '2px solid #43a047', borderRadius: 1 }} />
                    <Typography variant="body2">Empresa</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 15, height: 15, bgcolor: '#e3f2fd', border: '2px solid #1976d2', borderRadius: 1 }} />
                    <Typography variant="body2">Entrega</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 15, height: 15, bgcolor: '#fffde7', border: '2px solid #fbc02d', borderRadius: 1 }} />
                    <Typography variant="body2">Prestador</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 15, height: 15, bgcolor: '#f3e5f5', border: '2px solid #e1b1bc', borderRadius: 1 }} />
                    <Typography variant="body2">Operação</Typography>
                </Box>
            </Box>
            {msg && (
                <Typography align="start" color={msg.includes('sucesso') ? 'success.main' : 'error.main'} sx={{ mb: 2 }}>
                    {msg}
                </Typography>
            )}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {entradas.map((entrada) => {
                        const { bg, border } = getCardColors(entrada.nm_entrada);
                        return (
                            <Grid
                                item
                                xs={12}
                                sm={12 / gridColumns}
                                md={12 / gridColumns}
                                lg={12 / gridColumns}
                                xl={12 / gridColumns}
                                key={entrada.id || entrada.nm_placa + entrada.dt_entrada}
                            >
                                <Card
                                    sx={{
                                        backgroundColor: bg,
                                        borderLeft: `6px solid ${border}`,
                                        boxShadow: 2
                                    }}
                                >
                                    <CardContent sx={{ textAlign: 'left' }}>
                                        <Typography variant="h6" gutterBottom>
                                            Placa: {entrada.nm_placa}
                                        </Typography>
                                        {entrada.nm_entrada === 'Operacao' && (
                                            <>
                                                {entrada.nm_placa2 && (
                                                    <Typography sx={{ textAlign: 'start' }}>
                                                        <strong>Placa Carreta:</strong> {entrada.nm_placa2}
                                                    </Typography>
                                                )}
                                                {entrada.nm_placa3 && (
                                                    <Typography sx={{ textAlign: 'start' }}>
                                                        <strong>Placa Carreta 2:</strong> {entrada.nm_placa3}
                                                    </Typography>
                                                )}
                                            </>
                                        )}
                                        <Typography sx={{ textAlign: 'start'}}>
                                            <strong>Nome:</strong> {entrada.nm_nome}
                                        </Typography>
                                        <Typography sx={{ textAlign: 'start'}}>
                                            <strong>Documento:</strong> {entrada.cd_documento}
                                        </Typography>
                                        <Typography sx={{ textAlign: 'start'}}>
                                            <strong>Data de Entrada:</strong> {new Date(entrada.dt_entrada).toLocaleString('pt-BR')}
                                        </Typography>
                                        <Typography sx={{ textAlign: 'start'}}>
                                            <strong>Motivo:</strong> {entrada.nm_motivo}
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            fullWidth
                                            sx={{ mt: 2 }}
                                            onClick={() => handleSaida(entrada.nm_placa)}
                                            disabled={saidaLoading[entrada.nm_placa]}
                                        >
                                            {saidaLoading[entrada.nm_placa] ? 'Registrando...' : 'Saída'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                    {entradas.length === 0 && !loading && (
                        <Grid item xs={12}>
                            <Typography align="center" color="text.secondary">
                                Nenhuma entrada pendente de saída.
                            </Typography>
                        </Grid>
                    )}
                </Grid>
            )}
        </Box>
    );
};

export default DashboardEntradas;