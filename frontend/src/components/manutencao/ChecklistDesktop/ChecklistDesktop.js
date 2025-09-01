import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, FormControlLabel, Checkbox, CircularProgress, TextField, Button, Autocomplete } from '@mui/material';
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

// Função para normalizar string (remover acentos e deixar minúsculo)
function normaliza(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

const ChecklistDesktop = () => {
    const [perguntas, setPerguntas] = useState([]);
    const [respostas, setRespostas] = useState({});
    const [observacoes, setObservacoes] = useState({});
    const [arquivos, setArquivos] = useState({});
    const [loading, setLoading] = useState(true);
    const [placa, setPlaca] = useState('');
    const [hodometro, setHodometro] = useState('');
    const [motorista, setMotorista] = useState('');
    const [uploading, setUploading] = useState(false);
    const [tipoVeiculo, setTipoVeiculo] = useState('');
    const [perguntasFiltradas, setPerguntasFiltradas] = useState([]);

    // Estado para autocomplete de placas
    const [placasOptions, setPlacasOptions] = useState([]);
    const [loadingPlacas, setLoadingPlacas] = useState(false);

    // Estado para autocomplete de motoristas
    const [motoristasOptions, setMotoristasOptions] = useState([]);
    const [loadingMotoristas, setLoadingMotoristas] = useState(false);

    useEffect(() => {
        const fetchPerguntas = async () => {
            try {
                const res = await axios.get(`${apiUrl}/checklist/listchecklistSteps`);
                if (Array.isArray(res.data)) {
                    setPerguntas(res.data.sort((a, b) => Number(a.cd_ordem) - Number(b.cd_ordem)));
                } else {
                    setPerguntas([]);
                }
            } catch (error) {
                setPerguntas([]);
            } finally {
                setLoading(false);
            }
        };
        const fetchPlacas = async () => {
            setLoadingPlacas(true);
            try {
                const resp = await axios.post(`${apiUrl}/abastecimento/autoCompletePlacaChecklist`);
                setPlacasOptions(resp.data.map(item => item.splaca_veic));
            } catch {
                setPlacasOptions([]);
            } finally {
                setLoadingPlacas(false);
            }
        };
        const fetchMotoristas = async () => {
            setLoadingMotoristas(true);
            try {
                const resp = await axios.post(`${apiUrl}/abastecimento/autoCompleteMotorista`);
                // Remove duplicados e vazios
                const uniqueMotoristas = Array.from(new Set(resp.data.map(item => item.snome_mot).filter(Boolean)));
                setMotoristasOptions(uniqueMotoristas);
            } catch {
                setMotoristasOptions([]);
            } finally {
                setLoadingMotoristas(false);
            }
        };

        fetchPerguntas();
        fetchPlacas();
        fetchMotoristas();
    }, []);

    useEffect(() => {
        if (!tipoVeiculo) {
            setPerguntasFiltradas(perguntas);
        } else {
            setPerguntasFiltradas(
                perguntas.filter(p => normaliza(p.nm_tipoveiculo) === normaliza(tipoVeiculo))
            );
        }
    }, [tipoVeiculo, perguntas]);

    const handleChange = (id, value) => {
        setRespostas(prev => ({
            ...prev,
            [id]: value
        }));
        setObservacoes(prev => ({
            ...prev,
            [id]: ''
        }));
        setArquivos(prev => ({
            ...prev,
            [id]: null
        }));
    };

    const handleObservacaoChange = (id, value) => {
        setObservacoes(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleArquivoChange = (id, file) => {
        setArquivos(prev => ({
            ...prev,
            [id]: file
        }));
    };

    const handlePlacaBlur = async () => {
        if (!placa.trim()) return;
        try {
            const res = await axios.post(`${apiUrl}/checklist/checkVehicleType`, {
                placa
            });
            if (res.data && res.data.sdesc_ntcav) {
                if (normaliza(res.data.sdesc_ntcav).includes('cavalo')) {
                    setTipoVeiculo('Cavalo');
                } else if (normaliza(res.data.sdesc_ntcav).includes('carreta')) {
                    setTipoVeiculo('Carreta');
                } else {
                    setTipoVeiculo('');
                }
            } else {
                setTipoVeiculo('');
            }
        } catch (error) {
            setTipoVeiculo('');
        }
    };

    const handlePlacaChange = (event, newValue) => {
        if (newValue) {
            setPlaca(newValue.toUpperCase());
        }
    };

    const handlePlacaInputChange = (event, newInputValue) => {
        setPlaca(newInputValue.toUpperCase());
    };

    const handleMotoristaChange = (event, newValue) => {
        setMotorista(newValue ? newValue.toUpperCase() : '');
    };

    const handleMotoristaInputChange = (event, newInputValue) => {
        setMotorista(newInputValue.toUpperCase());
    };

    // Função para enviar checklist e criar OS para não conformidades
    const handleEnviar = async () => {
        setUploading(true);
        try {
            // Monta o array checklist conforme solicitado
            const checklist = perguntasFiltradas.map((pergunta) => ({
                etapa: pergunta.cd_ordem,
                pergunta: pergunta.nm_etapa,
                resposta: respostas[pergunta.cd_id] || '',
                observacao: observacoes[pergunta.cd_id] || '',
                arquivoUpload: arquivos[pergunta.cd_id]?.name || ''
            }));

            // Salva o checklist e obtém o número do checklist criado (cd_id)
            const checklistRes = await axios.post(`${apiUrl}/checklist/saveChecklist`, {
                placa,
                hodometro,
                motorista,
                checklist
            });

            // cd_id do checklist criado (ajuste conforme retorno da API)
            const checklistId = checklistRes.data?.insertId || checklistRes.data?.cd_id || checklistRes.data?.id;

            // Para cada pergunta com resposta igual a não conformidade, cria uma OS
            for (const pergunta of perguntasFiltradas) {
                const resposta = respostas[pergunta.cd_id];
                if (
                    resposta &&
                    pergunta.nm_conformidade &&
                    normaliza(resposta) === normaliza(pergunta.nm_conformidade)
                ) {
                    await axios.post(`${apiUrl}/checklist/createOS`, {
                        placa,
                        setor: pergunta.nm_grupo,
                        tipoVeiculo,
                        checklist: checklistId,
                        observacao: observacoes[pergunta.cd_id] || ''
                    });
                }
            }

            // Resetar todos os campos e estados
            setPlaca('');
            setHodometro('');
            setMotorista('');
            setRespostas({});
            setObservacoes({});
            setArquivos({});
            setTipoVeiculo('');
            setPerguntasFiltradas(perguntas); // Mostra todas as perguntas novamente

            alert('Checklist enviado com sucesso!');
        } catch (error) {
            alert('Erro ao enviar checklist ou criar OS.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 700, margin: '0 auto', p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Checklist
            </Typography>

            {/* Inputs de placa e hodometro */}
            <Box display="flex" gap={2} alignItems="center" sx={{ mb: 2 }}>
                <Autocomplete
                    options={placasOptions}
                    loading={loadingPlacas}
                    value={placa}
                    onChange={handlePlacaChange}
                    onInputChange={handlePlacaInputChange}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Placa"
                            variant="outlined"
                            inputProps={{ ...params.inputProps, maxLength: 8 }}
                            onBlur={handlePlacaBlur}
                            required
                        />
                    )}
                    sx={{ flex: 1, mr: { xs: 0, sm: 2 }, mb: { xs: 2, sm: 0 } }}
                    freeSolo
                />
                <TextField
                    label="Hodômetro"
                    value={hodometro}
                    onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setHodometro(val);
                    }}
                    variant="outlined"
                    sx={{ width: '50%' }}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                    required
                    disabled={tipoVeiculo === 'Carreta'} // <-- Adicionado para desativar se Carreta
                />
            </Box>


            <Autocomplete
                options={motoristasOptions}
                loading={loadingMotoristas}
                value={motorista}
                onChange={handleMotoristaChange}
                onInputChange={handleMotoristaInputChange}
                getOptionLabel={option => option ? option.toString() : ''}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Motorista"
                        variant="outlined"
                        inputProps={{ ...params.inputProps, maxLength: 100 }}
                        required
                    />
                )}
                sx={{ mb: 3, width: '82%' }}
                freeSolo
                required
            />
            {/* Input do motorista */}
            {/* <TextField
                label="Motorista"
                value={motorista}
                onChange={e => setMotorista(e.target.value)}
                variant="outlined"
                sx={{ mb: 3, width: '82%' }}
                required
            /> */}

            {perguntasFiltradas.map((pergunta) => {
                const resposta = respostas[pergunta.cd_id];
                const mostrarCampos = normaliza(resposta) === normaliza(pergunta.nm_conformidade);
                return (
                    <Paper key={pergunta.cd_id} sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            {pergunta.cd_ordem}.&nbsp;
                            <span style={{
                                color: grupos.find(g => g.nome === pergunta.nm_grupo)?.cor || '#333',
                                fontWeight: 600
                            }}>
                                ({pergunta.nm_grupo})
                            </span>{' '}
                            {pergunta.nm_etapa}
                        </Typography>
                        <Box display="flex" gap={4} alignItems="center">
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={normaliza(resposta) === 'sim'}
                                        onChange={() => handleChange(pergunta.cd_id, 'Sim')}
                                        color="success"
                                    />
                                }
                                label="Sim"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={normaliza(resposta) === 'nao'}
                                        onChange={() => handleChange(pergunta.cd_id, 'Não')}
                                        color="error"
                                    />
                                }
                                label="Não"
                            />
                        </Box>
                        {mostrarCampos && (
                            <Box mt={2} display="flex" flexDirection="column" gap={2}>
                                <TextField
                                    label="Observação"
                                    value={observacoes[pergunta.cd_id] || ''}
                                    onChange={e => handleObservacaoChange(pergunta.cd_id, e.target.value)}
                                    multiline
                                    minRows={2}
                                    fullWidth
                                />
                                <Button
                                    variant="outlined"
                                    component="label"
                                    sx={{ alignSelf: 'flex-start' }}
                                >
                                    Upload de arquivo
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*,video/*,.pdf,.doc,.docx"
                                        onChange={e => handleArquivoChange(pergunta.cd_id, e.target.files[0])}
                                    />
                                </Button>
                                {arquivos[pergunta.cd_id] && (
                                    <Typography variant="body2" color="text.secondary">
                                        Arquivo selecionado: {arquivos[pergunta.cd_id].name}
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Paper>
                );
            })}
            {perguntasFiltradas.length === 0 && (
                <Typography align="center" color="text.secondary">
                    Nenhuma pergunta cadastrada para o tipo de veículo selecionado.
                </Typography>
            )}

            {/* Botão enviar */}
            <Box display="flex" justifyContent="flex-end" mt={4}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleEnviar}
                    disabled={uploading}
                    sx={{
                        backgroundColor: '#f37215',
                        color: '#fff',
                        py: 1.2,
                        borderRadius: 2,
                        fontWeight: 'bold',
                        minWidth: 120
                    }}
                >
                    {uploading ? 'Enviando...' : 'Enviar'}
                </Button>
            </Box>
        </Box>
    );
};

export default ChecklistDesktop;