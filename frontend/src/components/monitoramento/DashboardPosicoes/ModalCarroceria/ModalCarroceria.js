import React, { useEffect, useState, useRef } from 'react';
import { Modal, Box, Typography, IconButton, TextField, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import DirectionsBusFilledIcon from '@mui/icons-material/DirectionsBusFilled';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import axios from 'axios';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '96vw', sm: 900, md: '96vw' },
    maxWidth: 1600,
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    fontSize: 18,
    p: { xs: 3, sm: 5 },
};

const fullscreenStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '95vw',
    height: '95vh',
    bgcolor: 'background.paper',
    borderRadius: 0,
    boxShadow: 24,
    fontSize: 18,
    p: { xs: 2, sm: 4 },
    zIndex: 1300,
    maxWidth: '98vw',
    maxHeight: '95vh',
    overflow: 'auto'
};

const alertaComboioStyle = {
    animation: 'blinker 1s linear infinite',
    color: '#fff',
    background: '#d32f2f',
    borderRadius: 2,
    padding: '4px 12px',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
    cursor: 'pointer',
    boxShadow: '0 0 8px #d32f2f',
};
const keyframes = `
@keyframes blinker {
    50% { opacity: 0; }
}
`;

const REGUA_HORAS = 24;
const AUTO_REFRESH_INTERVAL = 120; // segundos

const ModalCarroceria = ({ open, onClose }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dataFiltro, setDataFiltro] = useState(() => {
        const hoje = new Date();
        return hoje.toISOString().slice(0, 10);
    });
    const [fullscreen, setFullscreen] = useState(false);
    const [secondsToRefresh, setSecondsToRefresh] = useState(AUTO_REFRESH_INTERVAL);
    const intervalRef = useRef();

    const fetchData = () => {
        setLoading(true);
        axios.post(`${process.env.REACT_APP_API_URL}/posicoes/getRealTransit`)
            .then(res => {
                setData(res.data);
                setLoading(false);
                setSecondsToRefresh(AUTO_REFRESH_INTERVAL); // reinicia timer ao atualizar
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        if (open) {
            fetchData();
            intervalRef.current = setInterval(() => {
                setSecondsToRefresh(prev => {
                    if (prev <= 1) {
                        fetchData();
                        return AUTO_REFRESH_INTERVAL;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            clearInterval(intervalRef.current);
        };
    }, [open]);

    // Filtra por data selecionada
    const dataFiltrada = data.filter(item => {
        if (!item.dt_realTransit) return false;
        const dataItem = new Date(item.dt_realTransit);
        return dataItem.toISOString().slice(0, 10) === dataFiltro;
    });

    // Agrupa placas por hora
    const placasPorHora = {};
    dataFiltrada.forEach(item => {
        const dt = new Date(item.dt_realTransit);
        const hora = dt.getHours();
        placasPorHora[hora] = placasPorHora[hora] || [];
        placasPorHora[hora].push({
            placa: item.nm_placa,
            horaChegada: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            dt_realTransit: item.dt_realTransit
        });
    });

    // Identifica comboios (5 ou mais placas no mesmo horário)
    const horas = Object.keys(placasPorHora).sort((a, b) => a - b);
    const comboios = horas
        .map(h => ({
            hora: h,
            placas: placasPorHora[h].map(p => p.placa)
        }))
        .filter(grupo => grupo.placas.length >= 5);

    // Tooltip do alerta comboio
    const comboioTooltip = comboios.length > 0
        ? comboios.map(c =>
            `${c.hora}h: ${c.placas.join(', ')}`
        ).join('\n')
        : '';

    // Gera os horários de 00h até 23h
    const timelineHoras = Array.from({ length: REGUA_HORAS }, (_, i) => i);

    // Formata timer para mm:ss
    const formatTimer = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <>
            <style>{keyframes}</style>
            <Modal open={open} onClose={onClose}>
                <Box sx={fullscreen ? fullscreenStyle : style}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                            Carrocerias - Timeline de Chegada
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                                px: 1.5,
                                py: 0.5,
                                bgcolor: '#e3f2fd',
                                borderRadius: 2,
                                fontWeight: 'bold',
                                fontSize: 15,
                                color: '#1976d2',
                                minWidth: 60,
                                textAlign: 'center'
                            }}
                                title="Tempo para atualizar automaticamente"
                            >
                                {formatTimer(secondsToRefresh)}
                            </Box>
                            {/* <IconButton onClick={() => setFullscreen(f => !f)} title={fullscreen ? "Restaurar" : "Maximizar"}>
                                <FullscreenIcon />
                            </IconButton> */}
                            <IconButton onClick={onClose}><CloseIcon /></IconButton>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TextField
                            label="Filtrar por data"
                            type="date"
                            value={dataFiltro}
                            onChange={e => setDataFiltro(e.target.value)}
                            sx={{ minWidth: 180 }}
                            InputLabelProps={{ shrink: true }}
                        />
                        <IconButton
                            onClick={fetchData}
                            sx={{ ml: 1 }}
                            title="Atualizar dados"
                            disabled={loading}
                        >
                            <RefreshIcon />
                        </IconButton>
                        {comboios.length > 0 && (
                            <Tooltip title={comboioTooltip.replace(/\n/g, '<br/>')} arrow placement="top" componentsProps={{
                                tooltip: { sx: { whiteSpace: 'pre-line', fontSize: 14 } }
                            }}>
                                <Box sx={alertaComboioStyle}>
                                    ALERTA COMBOIO!
                                </Box>
                            </Tooltip>
                        )}
                    </Box>
                    {loading ? (
                        <Typography>Carregando...</Typography>
                    ) : (
                        <Box sx={{
                            pt: 2,
                            pb: 2,
                            position: 'relative',
                            minHeight: 120,
                            maxHeight: fullscreen ? 'calc(100vh - 120px)' : '60vh',
                            overflowX: 'auto',
                            width: '100%'
                        }}>
                            {/* Timeline horizontal customizada */}
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                width: 'max-content',
                                minWidth: '100%',
                                borderBottom: '2px solid #fff',
                                pb: 3,
                                mb: 2
                            }}>
                                {timelineHoras.map(hora => (
                                    <Box key={hora} sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        minWidth: 60,
                                        mx: 1
                                    }}>
                                        <Typography sx={{
                                            fontSize: 13,
                                            color: '#1976d2',
                                            fontWeight: 'bold',
                                            mb: 1
                                        }}>
                                            {hora.toString().padStart(2, '0')}h
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            {placasPorHora[hora] &&
                                                placasPorHora[hora]
                                                    .sort((a, b) => new Date(a.dt_realTransit) - new Date(b.dt_realTransit))
                                                    .map((p, idx) => (
                                                        <Tooltip
                                                            key={p.placa + idx}
                                                            title={`Placa: ${p.placa}\nChegada: ${p.horaChegada}`}
                                                            arrow
                                                            placement="top"
                                                            componentsProps={{
                                                                tooltip: { sx: { whiteSpace: 'pre-line', fontSize: 13 } }
                                                            }}
                                                        >
                                                            <DirectionsBusFilledIcon
                                                                sx={{
                                                                    color: '#202020ff',
                                                                    fontSize: 22,
                                                                    cursor: 'pointer',
                                                                    transition: 'transform 0.2s',
                                                                    '&:hover': { transform: 'scale(1.2)', color: '#111111ff' }
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    ))
                                            }
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                            {/* Mensagem caso não haja placas */}
                            {dataFiltrada.length === 0 && (
                                <Typography sx={{ color: '#888', mt: 2 }}>
                                    Nenhuma placa encontrada para o dia selecionado.
                                </Typography>
                            )}
                        </Box>
                    )}
                </Box>
            </Modal>
        </>
    );
};

export default ModalCarroceria;