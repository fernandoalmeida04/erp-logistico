import React, { useState } from 'react';
import {
Button, Dialog, DialogTitle, DialogContent, Table, TableHead, TableRow,
TableCell, TableBody, CircularProgress, Typography, Stack, TextField, Grid, Select, MenuItem
} from '@mui/material';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import dayjs from 'dayjs';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const apiUrl = process.env.REACT_APP_API_URL;

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('DD/MM/YYYY HH:mm');
};

const calcTempoPermanencia = (entrada, saida) => {
    const dtEntrada = dayjs(entrada);
    const dtSaida = saida ? dayjs(saida) : dayjs();
    const diffMin = dtSaida.diff(dtEntrada, 'minute');
    if (diffMin < 60) return `${diffMin} min`;
    const horas = Math.floor(diffMin / 60);
    const minutos = diffMin % 60;
    return minutos > 0 ? `${horas}h ${minutos}min` : `${horas} horas`;
};

export default function RelatorioPermanenciaPatio() {
    const [open, setOpen] = useState(false);
    const [dados, setDados] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filtros
    const [filtroPlaca, setFiltroPlaca] = useState('');
    const [filtroDataInicio, setFiltroDataInicio] = useState('');
    const [filtroDataFim, setFiltroDataFim] = useState('');
    const [filtroPatio, setFiltroPatio] = useState('');

    const handleAbrirModal = () => {
        setOpen(true);
        setDados([]);
    };

    const handleBuscar = async () => {
        setLoading(true);
        try {
            const resp = await axios.post(`${apiUrl}/placas/relatorioPermanencia`, {
                placa: filtroPlaca || undefined,
                filtroPoligono: filtroPatio || undefined,
                dataInicio: filtroDataInicio ? `${filtroDataInicio} 00:00:00` : undefined,
                dataFim: filtroDataFim ? `${filtroDataFim} 23:59:59` : undefined,
            });
            setDados(resp.data);
        } catch {
            setDados([]);
        }
        setLoading(false);
    };

    const handleClosePermanencia = () => {
        setOpen(false);
        setFiltroPlaca('');
        setFiltroDataInicio('');
        setFiltroDataFim('');
        setFiltroPatio('');
        setDados([]);
    };

    // Função para exportar CSV
    const handleExportCSV = () => {
        if (!dados.length) return;
        const header = ['Placa', 'Pátio', 'Entrada', 'Saída', 'Tempo Permanência'];
        const rows = dados.map(row => [
            row.nm_placa,
            row.nm_poligono,
            formatDate(row.dt_entrada),
            formatDate(row.dt_saida),
            calcTempoPermanencia(row.dt_entrada, row.dt_saida)
        ]);
        const csvContent =
            [header, ...rows]
                .map(e => e.map(v => `"${v}"`).join(','))
                .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'relatorio_permanencia_local.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Função para exportar Excel
    const handleExportExcel = () => {
        if (!dados.length) return;
        const wsData = [
            ['Placa', 'Local', 'Entrada', 'Saída', 'Tempo Permanência'],
            ...dados.map(row => [
                row.nm_placa,
                row.nm_poligono,
                formatDate(row.dt_entrada),
                formatDate(row.dt_saida),
                calcTempoPermanencia(row.dt_entrada, row.dt_saida)
            ])
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
        XLSX.writeFile(wb, 'relatorio_permanencia_local.xlsx');
    };

    // Função para exportar PDF
    const handleExportPDF = () => {
        if (!dados.length) return;
        const doc = new jsPDF();
        doc.text('Relatório de Permanência:', 14, 14);
        const tableColumn = ['Placa', 'Local', 'Entrada', 'Saída', 'Tempo Permanência'];
        const tableRows = dados.map(row => [
            row.nm_placa,
            row.nm_poligono,
            formatDate(row.dt_entrada),
            formatDate(row.dt_saida),
            calcTempoPermanencia(row.dt_entrada, row.dt_saida)
        ]);
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
        });
        doc.save('relatorio_permanencia_local.pdf');
    };

    return (
        <>
            <Button
                variant="outlined"
                color="primary"
                startIcon={<SummarizeOutlinedIcon />}
                onClick={handleAbrirModal}
                sx={{ ml: 2 }}
            >
                Permanência
            </Button>
            <Dialog open={open} onClose={handleClosePermanencia} maxWidth="lg" fullWidth>
                <DialogTitle>
                    Relatório de Permanência
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mb: 2, mt: 1 }}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Placa"
                                value={filtroPlaca}
                                onChange={e => setFiltroPlaca(e.target.value.toUpperCase())}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Select
                                value={filtroPatio}
                                label="Filtrar por Pátio"
                                onChange={e => setFiltroPatio(e.target.value)}
                                sx={{ width: 200, height: 40 }}
                            >
                                <MenuItem value="Pátio Volks SBC">Pátio VW Anchieta</MenuItem>
                                <MenuItem value="Pátio Volks SJP">Pátio VW São José dos Pinhais</MenuItem>
                                <MenuItem value="Doca Volkswagen SBC">Doca VW Anchieta</MenuItem>
                                <MenuItem value="Doca Volkswagen SJP">Doca VW São José Dos Pinhais</MenuItem>
                                <MenuItem value="Graal Petropen">Graal Petropen</MenuItem>
                            </Select>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Data Início"
                                type="date"
                                value={filtroDataInicio}
                                onChange={e => setFiltroDataInicio(e.target.value)}
                                fullWidth
                                size="small"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Data Fim"
                                type="date"
                                value={filtroDataFim}
                                onChange={e => setFiltroDataFim(e.target.value)}
                                fullWidth
                                size="small"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={12}>
                            <Button variant="contained" onClick={handleBuscar} fullWidth>
                                Buscar
                            </Button>
                        </Grid>
                    </Grid>
                    {loading ? (
                        <CircularProgress />
                    ) : (
                        <>
                            {dados.length === 0 ? (
                                <Typography>Nenhum dado encontrado.</Typography>
                            ) : (
                                <>
                                    <Stack direction="row" spacing={1} sx={{ mb: 2, justifyContent: 'flex-end' }}>
                                        <Button variant="contained" size="small" onClick={handleExportCSV}>
                                            CSV
                                        </Button>
                                        <Button variant="contained" size="small" color="success" onClick={handleExportExcel}>
                                            EXCEL
                                        </Button>
                                        <Button variant="contained" size="small" color="secondary" onClick={handleExportPDF}>
                                            PDF
                                        </Button>
                                    </Stack>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Placa</TableCell>
                                                <TableCell>Pátio</TableCell>
                                                <TableCell>Entrada</TableCell>
                                                <TableCell>Saída</TableCell>
                                                <TableCell>Tempo Permanência</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {dados.map((row, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{row.nm_placa}</TableCell>
                                                    <TableCell>{row.nm_poligono}</TableCell>
                                                    <TableCell>{formatDate(row.dt_entrada)}</TableCell>
                                                    <TableCell>{formatDate(row.dt_saida)}</TableCell>
                                                    <TableCell>
                                                        {calcTempoPermanencia(row.dt_entrada, row.dt_saida)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}