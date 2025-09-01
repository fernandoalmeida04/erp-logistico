import React, { useState, useEffect } from 'react';
import {
    Button, Dialog, DialogTitle, DialogContent, Table, TableHead, TableRow,
    TableCell, TableBody, CircularProgress, Typography, Stack, TextField, Grid
} from '@mui/material';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

export default function ModalAtraso({ open, onClose, placa, tempoAtraso }) {
    const [motivo, setMotivo] = useState('');
    const [historico, setHistorico] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mensagem, setMensagem] = useState('');

    // tempoAtraso em minutos
    const tempoFormatado = tempoAtraso
        ? `${Math.floor(tempoAtraso / 60)}h ${tempoAtraso % 60}min`
        : '0 minutos';

    // Busca histórico ao abrir o modal
    useEffect(() => {
        if (open && placa) {
            setLoading(true);
            axios.post(`${apiUrl}/posicoes/getHistoricoAtraso`, { nm_placa: placa })
                .then(res => {
                    setHistorico(res.data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [open, placa]);

    // Salva motivo do atraso
    const handleSalvar = async () => {
        if (!motivo.trim()) {
            setMensagem('Digite o motivo do atraso.');
            return;
        }
        setSaving(true);
        setMensagem('');
        try {
            const usuario = localStorage.getItem('user') || 'Usuário';
            await axios.post(`${apiUrl}/posicoes/saveInfo`, {
                nm_placa: placa,
                nm_obs_atraso: motivo,
                nm_usr_create: usuario
            });
            setMotivo('');
            setMensagem('Atraso salvo com sucesso!');
            // Atualiza histórico
            axios.post(`${apiUrl}/posicoes/getHistoricoAtraso`, { nm_placa: placa })
                .then(res => setHistorico(res.data));
            // Remove mensagem após 2 segundos
            setTimeout(() => setMensagem(''), 2000);
        } catch (e) {
            setMensagem('Erro ao salvar motivo.');
        }
        setSaving(false);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Atraso {placa && `- ${placa}`}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} md={8}>
                        <TextField
                            label="Motivo atraso"
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                            sx={{ width: 400}}
                        />
                    </Grid>
                    <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSalvar}
                            disabled={saving || !motivo.trim()}
                            sx={{ height: 56, minWidth: 120 }}
                        >
                            Salvar
                        </Button>
                    </Grid>
                </Grid>
                {mensagem && (
                    <Typography color={mensagem.includes('sucesso') ? 'primary' : 'error'} sx={{ mb: 2 }}>
                        {mensagem}
                    </Typography>
                )}
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Histórico de atrasos da placa
                </Typography>
                {loading ? (
                    <CircularProgress size={24} />
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Data</TableCell>
                                <TableCell>Motivo</TableCell>
                                <TableCell>Usuário</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {historico.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        Nenhum atraso registrado para esta placa.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                historico.map((row, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>
                                            {row.dt_atraso
                                                ? new Date(row.dt_atraso).toLocaleString('pt-BR')
                                                : '-'}
                                        </TableCell>
                                        <TableCell>{row.nm_obs_atraso}</TableCell>
                                        <TableCell>{row.nm_usr_create}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
        </Dialog>
    );
}