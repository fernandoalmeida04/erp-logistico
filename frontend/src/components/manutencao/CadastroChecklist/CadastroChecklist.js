import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, Button, MenuItem, Select, InputLabel, FormControl, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

const grupos = [
    { nome: 'Borracharia', cor: 'rgb(247, 176, 66)' },
    { nome: 'Elétrico', cor: 'rgb(116, 184, 236)' },
    { nome: 'Funilaria', cor: 'rgb(236, 74, 74)' },
    { nome: 'Lavagem', cor: 'rgb(76, 168, 107)' },
    { nome: 'Mecânico', cor: 'rgb(51, 51, 51)' },
    { nome: 'Rastreador', cor: 'rgb(142, 68, 173)' },
    { nome: 'Gases', cor: 'rgb(52, 152, 219)' },
    { nome: 'Soldagem', cor: 'rgb(230, 126, 34)' },
    { nome: 'Sider', cor: 'rgb(2, 156, 25)' },
];

const nConformidadeOptions = [
    { value: 'Sim', label: 'Sim' },
    { value: 'Não', label: 'Não' }
];

const tipoVeiculoOptions = [
    { value: 'Carreta', label: 'Carreta' },
    { value: 'Cavalo', label: 'Cavalo' }
];

const CadastroChecklist = () => {
    const [nomeItem, setNomeItem] = useState('');
    const [grupo, setGrupo] = useState('');
    const [nConformidade, setNConformidade] = useState('');
    const [tipoVeiculo, setTipoVeiculo] = useState('');
    const [erros, setErros] = useState({});
    const [loading, setLoading] = useState(false);
    const [proximaOrdem, setProximaOrdem] = useState(1);
    const [etapas, setEtapas] = useState([]);
    const [filtroGrupo, setFiltroGrupo] = useState('');

    useEffect(() => {
        const fetchEtapas = async () => {
            try {
                const res = await axios.get(`${apiUrl}/checklist/listchecklistSteps`);
                if (Array.isArray(res.data)) {
                    setEtapas(res.data.sort((a, b) => Number(a.cd_ordem) - Number(b.cd_ordem)));
                    if (res.data.length > 0) {
                        const maxOrdem = Math.max(...res.data.map(item => Number(item.cd_ordem) || 0));
                        setProximaOrdem(maxOrdem + 1);
                    } else {
                        setProximaOrdem(1);
                    }
                } else {
                    setEtapas([]);
                    setProximaOrdem(1);
                }
            } catch (error) {
                setEtapas([]);
                setProximaOrdem(1);
            }
        };
        fetchEtapas();
    }, [loading]);

    const handleSalvar = async () => {
        let errosTemp = {};
        if (!nomeItem.trim()) errosTemp.nomeItem = 'Obrigatório';
        if (!grupo.trim()) errosTemp.grupo = 'Obrigatório';
        if (!nConformidade) errosTemp.nConformidade = 'Obrigatório';
        if (!tipoVeiculo) errosTemp.tipoVeiculo = 'Obrigatório';
        setErros(errosTemp);
        if (Object.keys(errosTemp).length > 0) return;

        setLoading(true);
        const userName = localStorage.getItem('user');
        try {
            await axios.post(`${apiUrl}/checklist/savechecklistStep`, {
                nomeItem, grupo, userName, nConformidade, tipoVeiculo
            });
            setNomeItem('');
            setGrupo('');
            setNConformidade('');
            setTipoVeiculo('');
        } catch (error) {
            alert('Erro no cadastro');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (cd_id) => {
        if (!window.confirm('Tem certeza que deseja deletar esta pergunta?')) return;
        setLoading(true);
        try {
            await axios.post(`${apiUrl}/checklist/deletechecklistStep`, { id: cd_id });
        } catch (error) {
            alert('Erro ao deletar pergunta');
        } finally {
            setLoading(false);
        }
    };

    const etapasFiltradas = filtroGrupo
        ? etapas.filter(e => e.nm_grupo === filtroGrupo)
        : etapas;

    return (
        <div style={{ padding: '24px', maxWidth: '75vw' }}>
            <h1>Cadastrar Perguntas Checklist</h1>

            <Box display="flex" alignItems="center" gap={2}>
                <TextField
                    label="Ordem *"
                    name="ordem"
                    value={proximaOrdem}
                    InputProps={{
                        readOnly: true,
                        style: { background: '#d2e4f9ff', pointerEvents: 'none' }
                    }}
                    margin="normal"
                    variant="outlined"
                    sx={{
                        width: '6vw',
                        mr: 2,
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                                borderColor: '#f37215',
                            },
                        },
                        '& .MuiInputLabel-root': {
                            '&.Mui-focused': {
                                color: '#f37215',
                            },
                        },
                    }}
                />

                <TextField
                    label="Pergunta"
                    name="nomeItem"
                    value={nomeItem}
                    onChange={e => setNomeItem(e.target.value)}
                    error={!!erros.nomeItem}
                    helperText={erros.nomeItem}
                    required
                    margin="normal"
                    variant="outlined"
                    sx={{
                        width: '20vw',
                        mr: 2,
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                                borderColor: '#f37215',
                            },
                        },
                        '& .MuiInputLabel-root': {
                            '&.Mui-focused': {
                                color: '#f37215',
                            },
                        },
                    }}
                />

                <FormControl
                    required
                    margin="normal"
                    sx={{
                        width: '15vw',
                        mr: 2,
                    }}
                    error={!!erros.grupo}
                >
                    <InputLabel id="grupo-label" sx={{
                        '&.Mui-focused': { color: '#f37215' }
                    }}>
                        Grupo
                    </InputLabel>
                    <Select
                        labelId="grupo-label"
                        id="grupo"
                        value={grupo}
                        label="Grupo *"
                        onChange={e => setGrupo(e.target.value)}
                        sx={{
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#f37215',
                            },
                        }}
                    >
                        {grupos.map((g) => (
                            <MenuItem key={g.nome} value={g.nome}>
                                <span
                                    style={{
                                        display: 'inline-block',
                                        width: 16,
                                        height: 16,
                                        borderRadius: '50%',
                                        backgroundColor: g.cor,
                                        marginRight: 10,
                                        border: '1px solid #ccc',
                                        verticalAlign: 'middle'
                                    }}
                                />
                                {g.nome}
                            </MenuItem>
                        ))}
                    </Select>
                    {erros.grupo && (
                        <Typography variant="caption" color="error">
                            {erros.grupo}
                        </Typography>
                    )}
                </FormControl>

                <FormControl
                    required
                    margin="normal"
                    sx={{
                        width: '12vw',
                        mr: 2,
                    }}
                    error={!!erros.nConformidade}
                >
                    <InputLabel id="nconformidade-label" sx={{
                        '&.Mui-focused': { color: '#f37215' }
                    }}>
                        Não conformidade
                    </InputLabel>
                    <Select
                        labelId="nconformidade-label"
                        id="nconformidade"
                        value={nConformidade}
                        label="Não conformidade"
                        onChange={e => setNConformidade(e.target.value)}
                        sx={{
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#f37215',
                            },
                        }}
                    >
                        {nConformidadeOptions.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </Select>
                    {erros.nConformidade && (
                        <Typography variant="caption" color="error">
                            {erros.nConformidade}
                        </Typography>
                    )}
                </FormControl>

                <FormControl
                    required
                    margin="normal"
                    sx={{
                        width: '12vw',
                        mr: 2,
                    }}
                    error={!!erros.tipoVeiculo}
                >
                    <InputLabel id="tipoveiculo-label" sx={{
                        '&.Mui-focused': { color: '#f37215' }
                    }}>
                        Tipo de veículo
                    </InputLabel>
                    <Select
                        labelId="tipoveiculo-label"
                        id="tipoVeiculo"
                        value={tipoVeiculo}
                        label="Tipo de veículo"
                        onChange={e => setTipoVeiculo(e.target.value)}
                        sx={{
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#f37215',
                            },
                        }}
                    >
                        {tipoVeiculoOptions.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </Select>
                    {erros.tipoVeiculo && (
                        <Typography variant="caption" color="error">
                            {erros.tipoVeiculo}
                        </Typography>
                    )}
                </FormControl>

                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSalvar}
                    disabled={loading}
                    sx={{
                        backgroundColor: '#f37215',
                        color: '#fff',
                        py: 1.2,
                        borderRadius: 2,
                        fontWeight: 'bold',
                        mt: 1,
                        height: 56,
                        minWidth: 120
                    }}
                >
                    {loading ? 'Adicionando...' : 'Adicionar'}
                </Button>
            </Box>

            {/* Tabela de etapas cadastradas */}
            <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
            </Typography>
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <b>
                                    Item
                                    {' '}
                                    <span style={{ color: '#888', fontWeight: 'normal' }}>
                                        ({etapasFiltradas.length})
                                    </span>
                                </b>
                            </TableCell>
                            <TableCell><b>Setor</b></TableCell>
                            <TableCell><b>Pergunta</b></TableCell>
                            <TableCell><b>Não Conformidade</b></TableCell>
                            <TableCell><b>Tipo de veículo</b></TableCell>
                            <TableCell><b>Ações</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {etapasFiltradas.map((etapa) => (
                            <TableRow key={etapa.cd_id}>
                                <TableCell>{etapa.cd_ordem}</TableCell>
                                <TableCell>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            backgroundColor: (grupos.find(g => g.nome === etapa.nm_grupo)?.cor) || '#ccc',
                                            marginRight: 8,
                                            border: '1px solid #ccc',
                                            verticalAlign: 'middle'
                                        }}
                                    />
                                    {etapa.nm_grupo}
                                </TableCell>
                                <TableCell>{etapa.nm_etapa}</TableCell>
                                <TableCell>{etapa.nm_conformidade}</TableCell>
                                <TableCell>{etapa.nm_tipoveiculo || '-'}</TableCell>
                                <TableCell>
                                    <IconButton
                                        aria-label="delete"
                                        color="error"
                                        onClick={() => handleDelete(etapa.cd_id)}
                                        disabled={loading}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {etapasFiltradas.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    Nenhuma pergunta cadastrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};

export default CadastroChecklist;