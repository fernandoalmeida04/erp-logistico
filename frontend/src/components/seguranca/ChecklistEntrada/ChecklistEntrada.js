import React, { useState } from 'react';
import {
    Box,
    TextField,
    Typography,
    Button,
    MenuItem,
    Grid,
    Paper,
    InputLabel,
    Select,
    FormControl,
    Checkbox,
    FormControlLabel,
    FormGroup
} from '@mui/material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const ChecklistEntrada = () => {
    const [placa, setPlaca] = useState('');
    const [nome, setNome] = useState('');
    const [documento, setDocumento] = useState('');
    const [dataHora, setDataHora] = useState('');
    const [tipoEntrada, setTipoEntrada] = useState('');
    const [motivo, setMotivo] = useState('');
    const [kilometragem, setKilometragem] = useState('');
    const [notaFiscal, setNotaFiscal] = useState('');
    const [servico, setServico] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    // Novos campos para "Operação"
    const [placaCarreta, setPlacaCarreta] = useState('');
    const [placaCarreta2, setPlacaCarreta2] = useState('');
    const [verificarCabo, setVerificarCabo] = useState(false);
    const [verificarCinta, setVerificarCinta] = useState(false);
    const [observacao, setObservacao] = useState('');
    const [tipoMotorista, setTipoMotorista] = useState('');
    const [epiCapacete, setEpiCapacete] = useState(false);
    const [epiColete, setEpiColete] = useState(false);
    const [epiBota, setEpiBota] = useState(false);

    // Estado para controle de erro dos campos obrigatórios
    const [camposErro, setCamposErro] = useState({});

    const validarCampos = () => {
        const erros = {};
        if (!placa.trim()) erros.placa = true;
        if (!nome.trim()) erros.nome = true;
        if (!documento.trim()) erros.documento = true;
        if (!dataHora.trim()) erros.dataHora = true;
        if (!tipoEntrada.trim()) erros.tipoEntrada = true;

        if (
            (tipoEntrada === 'Empresa' ||
            tipoEntrada === 'Entrega' ||
            tipoEntrada === 'Prestador' ||
            tipoEntrada === 'Operacao') &&
            !motivo.trim()
        ) erros.motivo = true;

        return erros;
    };

    const handleRegistrar = async () => {
        setMsg('');
        const erros = validarCampos();
        setCamposErro(erros);

        if (Object.keys(erros).length > 0) {
            setMsg('Preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                placa,
                nome,
                documento,
                data: dataHora,
                tipoEntrada,
                motivoEntrada: motivo,
                kilometragem,
                notaFiscal,
                servico,
                ...(tipoEntrada === 'Operacao' && {
                    placa2: placaCarreta,
                    placa3: placaCarreta2,
                    verificarCabo,
                    verificarCinta,
                    observacaoOperacao: observacao,
                    tipoMotorista,
                    capacete: epiCapacete,
                    colete: epiColete,
                    bota: epiBota
                })
            };
            await axios.post(`${API_URL}/seguranca/saveEntrance`, payload);
            setMsg('Entrada registrada com sucesso!');
            setPlaca('');
            setNome('');
            setDocumento('');
            setDataHora('');
            setTipoEntrada('');
            setMotivo('');
            setKilometragem('');
            setNotaFiscal('');
            setServico('');
            setPlacaCarreta('');
            setPlacaCarreta2('');
            setVerificarCabo(false);
            setVerificarCinta(false);
            setObservacao('');
            setTipoMotorista('');
            setEpiCapacete(false);
            setEpiColete(false);
            setEpiBota(false);
            setCamposErro({});
        } catch (error) {
            setMsg('Erro ao registrar entrada.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 500, mx: 'auto', p: { xs: 1, sm: 3 }, ml: { xs: -6, sm: -4 } }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, mt: 3 }}>
                <Typography variant="h5" align="center" gutterBottom>
                    Checklist de Entrada
                </Typography>
                <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                        <FormControl fullWidth error={!!camposErro.tipoEntrada}>
                            <InputLabel id="tipo-entrada-label">Tipo de entrada</InputLabel>
                            <Select
                                labelId="tipo-entrada-label"
                                value={tipoEntrada}
                                label="Tipo de entrada"
                                onChange={e => setTipoEntrada(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="Empresa">Empresa</MenuItem>
                                <MenuItem value="Entrega">Entrega</MenuItem>
                                <MenuItem value="Prestador">Prestador</MenuItem>
                                <MenuItem value="Operacao">Operação</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Grid>
                <Grid container spacing={2} direction="column">
                    <Grid item xs={12}>
                        <TextField
                            label="Placa"
                            value={placa}
                            onChange={e => setPlaca(e.target.value.toUpperCase())}
                            fullWidth
                            inputProps={{ maxLength: 8 }}
                            required
                            error={!!camposErro.placa}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Nome completo"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            fullWidth
                            required
                            error={!!camposErro.nome}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Documento"
                            value={documento}
                            onChange={e => setDocumento(e.target.value.replace(/\D/g, ''))}
                            fullWidth
                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                            required
                            error={!!camposErro.documento}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Box sx={{ mb: 2 }}>
                            <TextField
                                label="Data e hora da entrada"
                                type="datetime-local"
                                value={dataHora}
                                onChange={e => setDataHora(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                required
                                error={!!camposErro.dataHora}
                            />
                        </Box>
                    </Grid>
                    {tipoEntrada === 'Empresa' && (
                        <>
                            <Grid item xs={12}>
                                <TextField
                                    label="Motivo da entrada"
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    fullWidth
                                    required
                                    error={!!camposErro.motivo}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Kilometragem"
                                    value={kilometragem}
                                    onChange={e => setKilometragem(e.target.value.replace(/\D/g, ''))}
                                    fullWidth
                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                />
                            </Grid>
                        </>
                    )}
                    {tipoEntrada === 'Entrega' && (
                        <>
                            <Grid item xs={12}>
                                <TextField
                                    label="Motivo da entrada"
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    fullWidth
                                    required
                                    error={!!camposErro.motivo}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Número da nota fiscal"
                                    value={notaFiscal}
                                    onChange={e => setNotaFiscal(e.target.value.replace(/\D/g, ''))}
                                    fullWidth
                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                />
                            </Grid>
                        </>
                    )}
                    {tipoEntrada === 'Prestador' && (
                        <>
                            <Grid item xs={12}>
                                <TextField
                                    label="Motivo da entrada"
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    fullWidth
                                    required
                                    error={!!camposErro.motivo}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Serviço a ser prestado"
                                    value={servico}
                                    onChange={e => setServico(e.target.value)}
                                    fullWidth
                                />
                            </Grid>
                        </>
                    )}
                    {tipoEntrada === 'Operacao' && (
                        <>
                            <Grid item xs={12}>
                                <TextField
                                    label="Motivo da entrada"
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    fullWidth
                                    required
                                    error={!!camposErro.motivo}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Placa Carreta"
                                    value={placaCarreta}
                                    onChange={e => setPlacaCarreta(e.target.value.toUpperCase())}
                                    fullWidth
                                    inputProps={{ maxLength: 8 }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Placa Carreta 2"
                                    value={placaCarreta2}
                                    onChange={e => setPlacaCarreta2(e.target.value.toUpperCase())}
                                    fullWidth
                                    inputProps={{ maxLength: 8 }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormGroup row>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={verificarCabo}
                                                onChange={e => setVerificarCabo(e.target.checked)}
                                            />
                                        }
                                        label="Verificar Cabo"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={verificarCinta}
                                                onChange={e => setVerificarCinta(e.target.checked)}
                                            />
                                        }
                                        label="Verificar Cinta"
                                    />
                                </FormGroup>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Observação"
                                    value={observacao}
                                    onChange={e => setObservacao(e.target.value)}
                                    fullWidth
                                    multiline
                                    rows={2}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel id="tipo-motorista-label">Tipo de motorista</InputLabel>
                                    <Select
                                        labelId="tipo-motorista-label"
                                        value={tipoMotorista}
                                        label="Tipo de motorista"
                                        onChange={e => setTipoMotorista(e.target.value)}
                                        displayEmpty
                                    >
                                        <MenuItem value="Casa">Casa</MenuItem>
                                        <MenuItem value="Terceiro">Terceiro</MenuItem>
                                        <MenuItem value="Freelancer">Freelancer</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                    EPI
                                </Typography>
                                <FormGroup row>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={epiCapacete}
                                                onChange={e => setEpiCapacete(e.target.checked)}
                                            />
                                        }
                                        label="Capacete"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={epiColete}
                                                onChange={e => setEpiColete(e.target.checked)}
                                            />
                                        }
                                        label="Colete"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={epiBota}
                                                onChange={e => setEpiBota(e.target.checked)}
                                            />
                                        }
                                        label="Bota"
                                    />
                                </FormGroup>
                            </Grid>
                        </>
                    )}
                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            size="large"
                            sx={{ mt: 2 }}
                            onClick={handleRegistrar}
                            disabled={loading}
                        >
                            {loading ? 'Registrando...' : 'Registrar'}
                        </Button>
                        {msg && (
                            <Typography sx={{ mt: 2 }} color={msg.includes('sucesso') ? 'success.main' : 'error.main'}>
                                {msg}
                            </Typography>
                        )}
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
};

export default ChecklistEntrada;