import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, Paper, Button, CircularProgress, Grid, Autocomplete, Checkbox, FormControlLabel } from '@mui/material';
import Divider from '@mui/material/Divider';
import ModalCalculoKM from './ModalCalculoKM/Modalcalculokm';
import ModalPreTicket from './ModalPreTicket/ModalPreTicket';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

const getDataAtualISO = () => {
    const now = new Date();
    now.setHours(now.getHours() - 3);
    return now.toISOString().slice(0, 16);
};

const AprovacaoAbastecimento = () => {
    const [placa, setPlaca] = useState('');
    const [historicoDiesel, setHistoricoDiesel] = useState(null);
    const [newHistoricoDiesel, setNewHistoricoDiesel] = useState(null);
    const [historicoArla, setHistoricoArla] = useState(null);
    const [newHistoricoArla, setNewHistoricoArla] = useState(null);
    const [tipoVeiculo, setTipoVeiculo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [motorista, setMotorista] = useState('');
    

    // Estados compartilhados para hodômetro atual e posto
    const [hodometroAtual, setHodometroAtual] = useState('');
    const [hodometroAnterior, setHodometroAnterior] = useState('');
    const [posto, setPosto] = useState('');

    // Estados separados para Diesel
    const [dataAtualDiesel, setDataAtualDiesel] = useState(getDataAtualISO());
    const [novaDataAtualDiesel, setNovaDataAtualDiesel] = useState(getDataAtualISO());
    const [valorLitrosDiesel, setValorLitrosDiesel] = useState('');
    const [novoValorLitrosDiesel, setNovoValorLitrosDiesel] = useState('');
    const [distanciaDiesel, setDistanciaDiesel] = useState(null);
    const [litrosCalculadoDiesel, setLitrosCalculadoDiesel] = useState('');
    const [novoLitrosCalculadoDiesel, setNovoLitrosCalculadoDiesel] = useState('');
    const [metasDiesel, setMetasDiesel] = useState({ meta1: '', meta2: '', meta3: '' });
    const [msgHodometroDiesel, setMsgHodometroDiesel] = useState('');
    const [msgLitrosDiesel, setMsgLitrosDiesel] = useState('');
    const [msgPostoDiesel, setMsgPostoDiesel] = useState('');
    const [msgMotoristaDiesel, setMsgMotoristaDiesel] = useState('');

    // Estados separados para Arla
    const [dataAtualArla, setDataAtualArla] = useState(getDataAtualISO());
    const [novaDataAtualArla, setNovaDataAtualArla] = useState(getDataAtualISO());
    const [valorLitrosArla, setValorLitrosArla] = useState('');
    const [novoValorLitrosArla, setNovoValorLitrosArla] = useState('');
    const [distanciaArla, setDistanciaArla] = useState(null);
    const [litrosCalculadoArla, setLitrosCalculadoArla] = useState('');
    const [novoLitrosCalculadoArla, setNovoLitrosCalculadoArla] = useState('');
    const [metasArla, setMetasArla] = useState({ meta1: '', meta2: '', meta3: '' });
    const [msgHodometroArla, setMsgHodometroArla] = useState('');
    const [msgLitrosArla, setMsgLitrosArla] = useState('');
    const [msgPostoArla, setMsgPostoArla] = useState('');
    const [msgMotoristaArla, setMsgMotoristaArla] = useState('');

    // Estado para tipo de abastecimento
    const [tipoAbastecimento, setTipoAbastecimento] = useState('Diesel'); // 'Diesel' ou 'Arla'

    // Novos estados para viagem e distância ao destino
    const [dadosViagem, setDadosViagem] = useState(null);
    const [distanciaDestino, setDistanciaDestino] = useState(null);

    // Estado para o modal de cálculo KM
    const [openModalCalculoKM, setOpenModalCalculoKM] = useState(false);

    const [tipoVeiculoApi, setTipoVeiculoApi] = useState('');
    const [modeloVeiculoApi, setModeloVeiculoApi] = useState('');
    const [metasApi, setMetasApi] = useState({});

    const [litrosReais, setLitrosReais] = useState('');

    // Estado para autocomplete de placas
    const [placasOptions, setPlacasOptions] = useState([]);
    const [loadingPlacas, setLoadingPlacas] = useState(false);

    // Estado para autocomplete de postos
    const [postosOptions, setPostosOptions] = useState([]);
    const [loadingPostos, setLoadingPostos] = useState(false);

        // Estado para autocomplete de motoristas
    const [motoristasOptions, setMotoristasOptions] = useState([]);
    const [loadingMotoristas, setLoadingMotoristas] = useState(false);

    // Estado para botão e modal do ticket
    const [showGerarTicket, setShowGerarTicket] = useState(false);
    const [openPreTicket, setOpenPreTicket] = useState(false);

    const [historicoBanco, setHistoricoBanco] = useState(null);

    useEffect(() => {
        const fetchPlacas = async () => {
            setLoadingPlacas(true);
            try {
                const resp = await axios.post(`${apiUrl}/abastecimento/autoCompletePlaca`);
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
        const fetchPostos = async () => {
            setLoadingPostos(true);
            try {
                const resp = await axios.post(`${apiUrl}/abastecimento/listaPostos`);
                setPostosOptions(resp.data.map(item => item.nm_posto));
            } catch {
                setPostosOptions([]);
            } finally {
                setLoadingPostos(false);
            }
        };
        fetchPlacas();
        fetchMotoristas();
        fetchPostos();
    }, []);

    // Cálculo de metas e litros para Diesel
    useEffect(() => {
        if (distanciaDiesel !== null) {
            // Prioriza metasApi, depois historicoBanco, depois historicoDiesel
            const meta1 = metasApi?.META1 ?? historicoBanco?.META1 ?? historicoDiesel?.META1;
            const meta2 = metasApi?.META2 ?? historicoBanco?.META2 ?? historicoDiesel?.META2;
            const meta3 = metasApi?.META3 ?? historicoBanco?.META3 ?? historicoDiesel?.META3;
            setMetasDiesel({
                meta1: meta1 ? (Number(distanciaDiesel) / Number(meta1)).toFixed(2) : '',
                meta2: meta2 ? (Number(distanciaDiesel) / Number(meta2)).toFixed(2) : '',
                meta3: meta3 ? (Number(distanciaDiesel) / Number(meta3)).toFixed(2) : ''
            });
            setLitrosCalculadoDiesel(meta3 ? (Number(distanciaDiesel) / Number(meta3)).toFixed(2) : '');
        } else {
            setMetasDiesel({ meta1: '', meta2: '', meta3: '' });
            setLitrosCalculadoDiesel('');
        }
    }, [distanciaDiesel, metasApi, historicoBanco, historicoDiesel]);

    // Cálculo de metas e litros para Arla
    useEffect(() => {
        if (distanciaArla !== null && historicoArla) {
            let meta1 = historicoArla.META1_ARLA;
            let meta2 = historicoArla.META2_ARLA;
            let meta3 = historicoArla.META3_ARLA;
            setMetasArla({
                meta1: meta1 ? (Number(distanciaArla) / Number(meta1)).toFixed(2) : '',
                meta2: meta2 ? (Number(distanciaArla) / Number(meta2)).toFixed(2) : '',
                meta3: meta3 ? (Number(distanciaArla) / Number(meta3)).toFixed(2) : ''
            });
            setLitrosCalculadoArla(meta3 ? (Number(distanciaArla) / Number(meta3)).toFixed(2) : '');
        } else {
            setMetasArla({ meta1: '', meta2: '', meta3: '' });
            setLitrosCalculadoArla('');
        }
    }, [distanciaArla, historicoArla]);

    // Exibe botão "Gerar Ticket" apenas se todos campos estiverem preenchidos e não houver erro
    useEffect(() => {
        if (tipoAbastecimento === 'Diesel') {
            setShowGerarTicket(
                !!dataAtualDiesel &&
                !!hodometroAtual &&
                !!posto &&
                !!valorLitrosDiesel &&
                !!litrosCalculadoDiesel &&
                !msgHodometroDiesel &&
                !msgLitrosDiesel &&
                !msgPostoDiesel &&
                !msgMotoristaDiesel
            );
        } else {
            setShowGerarTicket(
                !!dataAtualArla &&
                !!hodometroAtual &&
                !!posto &&
                !!valorLitrosArla &&
                !!litrosCalculadoArla &&
                !msgHodometroArla &&
                !msgLitrosArla &&
                !msgPostoArla &&
                !msgMotoristaArla
            );
        }
    }, [
        tipoAbastecimento,
        dataAtualDiesel, hodometroAtual, posto, valorLitrosDiesel, litrosCalculadoDiesel, msgHodometroDiesel, msgLitrosDiesel, msgPostoDiesel, msgMotoristaDiesel,
        dataAtualArla, valorLitrosArla, litrosCalculadoArla, msgHodometroArla, msgLitrosArla, msgPostoArla, msgMotoristaArla
    ]);

    const buscarHistorico = async () => {
        if (!placa.trim()) return;
        setLoading(true);
        setHistoricoDiesel(null);
        setHistoricoArla(null);
        setMsgHodometroDiesel('');
        setMsgLitrosDiesel('');
        setMsgPostoDiesel('');
        setMsgHodometroArla('');
        setMsgLitrosArla('');
        setMsgPostoArla('');
        setValorLitrosDiesel('');
        setValorLitrosArla('');
        setDadosViagem(null);
        setDistanciaDestino(null);

        try {
            // Chama a nova API para buscar tipo/modelo/metas do veículo
            const tipoResp = await axios.post(`${apiUrl}/abastecimento/checkVehicleType`, { placa: placa.trim().toUpperCase() });
            const tipoData = Array.isArray(tipoResp.data) ? tipoResp.data[0] : tipoResp.data;

            setTipoVeiculoApi(tipoData?.TIPO_VEICULO || '');
            setModeloVeiculoApi(tipoData?.MODELO_VEICULO || '');
            setMetasApi({
                META1: tipoData?.META1,
                META2: tipoData?.META2,
                META3: tipoData?.META3,
                META1_ARLA: tipoData?.META1_ARLA,
                META2_ARLA: tipoData?.META2_ARLA,
                META3_ARLA: tipoData?.META3_ARLA
            });

            // REST API para buscar histórico e viagem
            const historicoDieselResp = await axios.post(`${apiUrl}/abastecimento/listarHistoricoDiesel`, { placa: placa.trim().toUpperCase() });
            const historicoArlaResp = await axios.post(`${apiUrl}/abastecimento/listarHistoricoArla`, { placa: placa.trim().toUpperCase() });

            const historicoData = Array.isArray(historicoDieselResp.data) ? historicoDieselResp.data[0] : null;
            const historicoArlaData = Array.isArray(historicoArlaResp.data) ? historicoArlaResp.data[0] : null;

            setHistoricoDiesel(historicoData || null);
            setHistoricoArla(historicoArlaData || null);
            setDataAtualDiesel(getDataAtualISO());
            setDataAtualArla(getDataAtualISO());

            setDistanciaDestino(null);

            const hasAbastecimento = await axios.post(`${apiUrl}/abastecimento/checkAbastecimento`, { placa: placa.trim().toUpperCase(), tipoAbastecimento });
            if (hasAbastecimento.data && hasAbastecimento.data.length > 0) {
                setHistoricoBanco(hasAbastecimento.data[0]);
            } else {
                setHistoricoBanco('Sem dados');
            }
        } catch {
            setHistoricoDiesel(null);
            setHistoricoArla(null);
            setDadosViagem(null);
            setDistanciaDestino(null);
            setTipoVeiculoApi('');
            setModeloVeiculoApi('');
            setMetasApi({});
        } finally {
            setLoading(false);
        }
    };

    const handlePlacaChange = (event, newValue) => {
        if (newValue) {
            setPlaca(newValue.toUpperCase());
            setTimeout(() => {
                handleBuscarHistorico();
            }, 0);
        }
    };

    const handlePlacaInputChange = (event, newInputValue) => {
        setPlaca(newInputValue.toUpperCase());
    };

    const handlePlacaKeyDown = (e) => {
        if (e.key === 'Enter') {
            // Só busca se já houver uma placa selecionada
            if (placa && placasOptions.includes(placa)) {
                handleBuscarHistorico();
            }
        }
    };

    const handleMotoristaChange = (event, newValue) => {
        setMotorista(newValue ? newValue.toUpperCase() : '');
    };

    const handleMotoristaInputChange = (event, newInputValue) => {
        setMotorista(newInputValue.toUpperCase());
    };

    const handleBuscarHistorico = () => {
        buscarHistorico();
    };

    // Verificação Diesel
    const handleVerificarDiesel = () => {
        setMsgHodometroDiesel('');
        setMsgLitrosDiesel('');
        setMsgPostoDiesel('');
        setMsgMotoristaDiesel('');
        let erro = false;

        if (hodometroAtual === '') {
            setMsgHodometroDiesel('Preencha o hodômetro atual.');
            erro = true;
        }
        if (valorLitrosDiesel === '') {
            setMsgLitrosDiesel('Preencha o valor dos litros.');
            erro = true;
        }
        if (posto === '') {
            setMsgPostoDiesel('Preencha o posto de abastecimento.');
            erro = true;
        }
        if (motorista === '') {
            setMsgMotoristaDiesel('Preencha o nome do motorista.');
            erro = true;
        }
        if (!erro) {
            // Se existe registro no banco, usa ele como hodômetro anterior e valor do litro anterior
            if (
                historicoBanco &&
                historicoBanco !== 'Sem dados' &&
                historicoBanco.cd_hodometro_atual !== undefined &&
                historicoBanco.cd_hodometro_atual !== null
            ) {
                const distanciaCalc = Number(hodometroAtual) - Number(historicoBanco.cd_hodometro_atual);
                setDistanciaDiesel(isNaN(distanciaCalc) ? null : distanciaCalc);

                if (Number(hodometroAtual) <= Number(historicoBanco.cd_hodometro_atual)) {
                    setMsgHodometroDiesel('Valor de hodômetro inferior ao anterior');
                    erro = true;
                }

                // Validação do valor do litro
                if (
                    historicoBanco.cd_valor_litro !== undefined &&
                    historicoBanco.cd_valor_litro !== null
                ) {
                    if (Math.abs(Number(valorLitrosDiesel) - Number(historicoBanco.cd_valor_litro)) >= 0.50) {
                        setMsgLitrosDiesel('A diferença entre o valor do litro atual e o anterior é de pelo menos R$ 0,50');
                        erro = true;
                    }
                }
            } else if (hodometroAnterior !== '') {
                // Se não existe registro no banco, usa o hodômetro anterior digitado manualmente
                const distanciaCalc = Number(hodometroAtual) - Number(hodometroAnterior);
                setDistanciaDiesel(isNaN(distanciaCalc) ? null : distanciaCalc);

                if (Number(hodometroAtual) <= Number(hodometroAnterior)) {
                    setMsgHodometroDiesel('Valor de hodômetro inferior ao anterior');
                    erro = true;
                }

                // Validação do valor do litro usando o valor digitado manualmente
                if (
                    novoValorLitrosDiesel !== '' &&
                    !isNaN(Number(valorLitrosDiesel)) &&
                    !isNaN(Number(novoValorLitrosDiesel))
                ) {
                    if (Math.abs(Number(valorLitrosDiesel) - Number(novoValorLitrosDiesel)) >= 0.50) {
                        setMsgLitrosDiesel('A diferença entre o valor do litro atual e o anterior é de pelo menos R$ 0,50');
                        erro = true;
                    }
                }
            } else {
                setDistanciaDiesel(null);
            }
        }
    };

    // Verificação Arla
    const handleVerificarArla = () => {
        setMsgHodometroArla('');
        setMsgLitrosArla('');
        setMsgPostoArla('');
        setMsgMotoristaArla('');
        let erro = false;

        if (hodometroAtual === '') {
            setMsgHodometroArla('Preencha o hodômetro atual.');
            erro = true;
        }
        if (valorLitrosArla === '') {
            setMsgLitrosArla('Preencha o valor dos litros.');
            erro = true;
        }
        if (posto === '') {
            setMsgPostoArla('Preencha o posto de abastecimento.');
            erro = true;
        }
        if (motorista === '') {
            setMsgMotoristaArla('Preencha o nome do motorista.');
            erro = true;
        }
        if (!erro) {
            // Se existe registro no banco, usa ele como hodômetro anterior e valor do litro anterior
            if (
                historicoBanco &&
                historicoBanco !== 'Sem dados' &&
                historicoBanco.cd_hodometro_atual !== undefined &&
                historicoBanco.cd_hodometro_atual !== null
            ) {
                const distanciaCalc = Number(hodometroAtual) - Number(historicoBanco.cd_hodometro_atual);
                setDistanciaArla(isNaN(distanciaCalc) ? null : distanciaCalc);

                if (Number(hodometroAtual) <= Number(historicoBanco.cd_hodometro_atual)) {
                    setMsgHodometroArla('Valor de hodômetro inferior ao anterior');
                    erro = true;
                }

                // Validação do valor do litro
                if (
                    historicoBanco.cd_valor_litro !== undefined &&
                    historicoBanco.cd_valor_litro !== null
                ) {
                    if (Math.abs(Number(valorLitrosArla) - Number(historicoBanco.cd_valor_litro)) >= 0.50) {
                        setMsgLitrosArla('A diferença entre o valor do litro atual e o anterior é de pelo menos R$ 0,50');
                        erro = true;
                    }
                }
            } else if (hodometroAnterior !== '') {
                // Se não existe registro no banco, usa o hodômetro anterior digitado manualmente
                const distanciaCalc = Number(hodometroAtual) - Number(hodometroAnterior);
                setDistanciaArla(isNaN(distanciaCalc) ? null : distanciaCalc);

                if (Number(hodometroAtual) <= Number(hodometroAnterior)) {
                    setMsgHodometroArla('Valor de hodômetro inferior ao anterior');
                    erro = true;
                }

                // Validação do valor do litro usando o valor digitado manualmente
                if (
                    novoValorLitrosArla !== '' &&
                    !isNaN(Number(valorLitrosArla)) &&
                    !isNaN(Number(novoValorLitrosArla))
                ) {
                    if (Math.abs(Number(valorLitrosArla) - Number(novoValorLitrosArla)) >= 0.50) {
                        setMsgLitrosArla('A diferença entre o valor do litro atual e o anterior é de pelo menos R$ 0,50');
                        erro = true;
                    }
                }
            } else {
                setDistanciaArla(null);
            }
        }
    };

    const resetEstados = () => {
        setHistoricoDiesel(null);
        setNewHistoricoDiesel(null);
        setHistoricoArla(null);
        setNewHistoricoArla(null);
        setLoading(false);
        setHodometroAnterior('');
        setDataAtualDiesel(getDataAtualISO());
        setNovaDataAtualDiesel(getDataAtualISO());
        setValorLitrosDiesel('');
        setNovoValorLitrosDiesel('');
        setDistanciaDiesel(null);
        setLitrosCalculadoDiesel('');
        setNovoLitrosCalculadoDiesel('');
        setMetasDiesel({ meta1: '', meta2: '', meta3: '' });
        setMsgHodometroDiesel('');
        setMsgLitrosDiesel('');
        setMsgPostoDiesel('');
        setDataAtualArla(getDataAtualISO());
        setNovaDataAtualArla(getDataAtualISO());
        setValorLitrosArla('');
        setNovoValorLitrosArla('');
        setDistanciaArla(null);
        setLitrosCalculadoArla('');
        setNovoLitrosCalculadoArla('');
        setMetasArla({ meta1: '', meta2: '', meta3: '' });
        setMsgHodometroArla('');
        setMsgLitrosArla('');
        setMsgPostoArla('');
        setDadosViagem(null);
        setDistanciaDestino(null);
        setOpenModalCalculoKM(false);
        setShowGerarTicket(false);
        setOpenPreTicket(false);
        setHistoricoBanco(null);
    };

    // Use no onChange do tipoAbastecimento:
    const handleTipoAbastecimentoChange = (e) => {
        setTipoAbastecimento(e.target.checked ? 'Arla' : 'Diesel');
        resetEstados();
    };

    useEffect(() => {
        if (placa) {
            handleBuscarHistorico();
        }
        // eslint-disable-next-line
    }, [tipoAbastecimento]);

    return (
        <Box sx={{
            maxWidth: { xs: '100%', sm: 600, md: 1024 },
            margin: { xs: 0, md: '0 auto' },
            marginLeft: { xs: -3, md: 2 },
            p: { xs: 1, sm: 2, md: 3 },
            position: 'relative'
        }}>
            <Typography variant="h5" gutterBottom>
                Pré-Abastecimento
            </Typography>
            <Button
                variant="outlined"
                color="secondary"
                sx={{
                    position: { xs: 'static', md: 'absolute' },
                    top: { md: 16 },
                    right: { md: 16 },
                    zIndex: 2,
                    mb: { xs: 2, md: 0 }
                }}
                onClick={() => setOpenModalCalculoKM(true)}
            >
                Cálculo KM
            </Button>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    mb: 3,
                    gap: { xs: 2, sm: 0 }
                }}
            >
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
                            onKeyDown={handlePlacaKeyDown}
                        />
                    )}
                    sx={{ flex: 1, mr: { xs: 0, sm: 2 }, mb: { xs: 2, sm: 0 } }}
                    freeSolo
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={tipoAbastecimento === 'Arla'}
                            onChange={handleTipoAbastecimentoChange}
                            color="primary"
                        />
                    }
                    label="Arla"
                    sx={{ ml: { xs: 0, sm: 2 }, mb: { xs: 2, sm: 0 } }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleBuscarHistorico}
                    sx={{
                        height: { xs: 40, sm: 56 },
                        minWidth: { xs: '100%', sm: 100 },
                        ml: { xs: 0, sm: 2 }
                    }}
                >
                    Buscar
                </Button>
            </Box>

            <Paper sx={{ p: 2, mb: 3, minHeight: 100 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={24} />
                        <Typography>Buscando informações...</Typography>
                    </Box>
                ) : (
                    <>
                        {/* Diesel - histórico ou cadastro inicial */}
                        {tipoAbastecimento === 'Diesel' && (
                            historicoBanco && historicoBanco !== 'Sem dados' ? (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ mr: { xs: 0, md: 8 }, mb: { xs: 2, md: 0 } }}>
                                            <Typography sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Tipo Veículo:</strong> {tipoVeiculoApi}
                                            </Typography>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Data Abastecimento: </strong>
                                                <span>{historicoBanco.dt_create ? new Date(historicoBanco.dt_create).toLocaleDateString('pt-BR') : '-'}</span>
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Litros Abastecidos: </strong>
                                                <span>{historicoBanco.cd_litros ?? '-'}L</span>
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Valor Litros: </strong>
                                                <span>R$ {historicoBanco.cd_valor_litro ?? '-'}</span>
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Hodômetro: </strong>
                                                <span>{historicoBanco.cd_hodometro_atual ?? '-'}</span>
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Consumo Anterior: </strong>
                                                <span>{historicoBanco.cd_consumo_atual ?? '-'}</span>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        {distanciaDiesel !== null && (
                                            <Typography sx={{ mt: 1, mb: 3, textAlign: 'left' }}>
                                                <strong>Distância Percorrida:</strong> {distanciaDiesel}km
                                            </Typography>
                                        )}
                                        <Box sx={{ textAlign: 'left' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <Typography sx={{ border: '1px solid black', p: 0.5, minWidth: 120 }}>
                                                    <strong>Meta 3:</strong> {metasApi?.META3 ?? '-'}
                                                </Typography>
                                                {distanciaDiesel !== null && metasApi?.META3 ? (
                                                    <Typography sx={{ ml: 2 }}>
                                                        Litragem ideal: {litrosCalculadoDiesel}L
                                                    </Typography>
                                                ) : null}
                                            </Box>
                                        </Box>
                                    </Grid>
                                    {/* Inputs do abastecimento */}
                                    <Grid item xs={12} md={12}>
                                        <Divider sx={{ width: { xs: '100%', md: '150%' }, borderBottomWidth: 3, mb: 2 }} />
                                        <Box sx={{ mr: { xs: 0, md: 8 }, mb: { xs: 2, md: 0 } }}>
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
                                                        />
                                                    )}
                                                    sx={{ width: { xs: '100%', sm: '65%' }, mb: 2 }}
                                                    freeSolo
                                                    required
                                                />
                                                <Autocomplete
                                                    options={postosOptions}
                                                    loading={loadingPostos}
                                                    value={posto}
                                                    onChange={(event, newValue) => setPosto(newValue ? newValue.toUpperCase() : '')}
                                                    onInputChange={(event, newInputValue) => setPosto(newInputValue ? newInputValue.toUpperCase() : '')}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Posto"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    sx={{ width: { xs: '100%', sm: '65%' } }}
                                                    freeSolo
                                                />
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: 2,
                                                alignItems: { xs: 'stretch', sm: 'center' },
                                                mb: 2,
                                                mt: 2
                                            }}
                                        >
                                            <TextField
                                                label="Data Atual"
                                                type="datetime-local"
                                                value={dataAtualDiesel}
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ width: { xs: '100%', sm: '40%' }, mb: { xs: 2, sm: 0 } }}
                                                onChange={e => setDataAtualDiesel(e.target.value)}
                                                disabled
                                            />
                                            <TextField
                                                label="Hodômetro Atual"
                                                type="number"
                                                value={hodometroAtual}
                                                onChange={e => setHodometroAtual(e.target.value.replace(/\D/g, ''))}
                                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                sx={{ width: { xs: '100%', sm: '45%' }, mb: { xs: 2, sm: 0 } }}
                                                required
                                            />
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: 2,
                                                alignItems: { xs: 'stretch', sm: 'center' },
                                                mb: 2
                                            }}
                                        >
                                            <TextField
                                                label="Valor Diesel"
                                                type="number"
                                                value={valorLitrosDiesel}
                                                onChange={e => setValorLitrosDiesel(e.target.value.replace(',', '.'))}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                                required
                                            />
                                            <TextField
                                                label="Litros"
                                                type="number"
                                                value={litrosCalculadoDiesel}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                                disabled
                                            />
                                            <TextField
                                                label="Litros"
                                                type="number"
                                                value={litrosReais}
                                                onChange={e => setLitrosReais(e.target.value)}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                            />
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleVerificarDiesel}
                                                sx={{
                                                    width: { xs: '100%', sm: 'auto' },
                                                    height: { xs: 40, sm: '56px' },
                                                    minWidth: { xs: '100%', sm: 90 },
                                                    mt: { xs: 0, sm: 0 }
                                                }}
                                            >
                                                Verificar
                                            </Button>
                                        </Box>
                                        {(msgHodometroDiesel || msgLitrosDiesel || msgPostoDiesel || msgMotoristaDiesel) && (
                                            <Box sx={{ mt: 1 }}>
                                                {msgHodometroDiesel && (
                                                    <Typography color="error">{msgHodometroDiesel}</Typography>
                                                )}
                                                {msgLitrosDiesel && (
                                                    <Typography color="error">{msgLitrosDiesel}</Typography>
                                                )}
                                                {msgPostoDiesel && (
                                                    <Typography color="error">{msgPostoDiesel}</Typography>
                                                )}
                                                {msgMotoristaDiesel && (
                                                    <Typography color="error">{msgMotoristaDiesel}</Typography>
                                                )}
                                            </Box>
                                        )}
                                        {showGerarTicket && (
                                            <Button
                                                variant="contained"
                                                color="success"
                                                sx={{ mt: 2, width: { xs: '100%', sm: 'auto' } }}
                                                onClick={() => setOpenPreTicket(true)}
                                            >
                                                Gerar Ticket
                                            </Button>
                                        )}
                                    </Grid>
                                </Grid>
                            ) : (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{mr: 8}}>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <Typography sx={{ mb: 1, textAlign: 'left' }}>
                                                    <strong>Tipo Veículo:</strong> {tipoVeiculoApi}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <TextField
                                                    type="datetime-local"
                                                    value={novaDataAtualDiesel}
                                                    onChange={e => setNovaDataAtualDiesel(e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100%' }}
                                                    label="Data Abastecimento"
                                                />
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <TextField
                                                    type="number"
                                                    value={novoLitrosCalculadoDiesel}
                                                    onChange={e => setNovoLitrosCalculadoDiesel(e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100%', mt: 1 }}
                                                    label="Litros Abastecidos"
                                                />
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <TextField
                                                    type="number"
                                                    value={novoValorLitrosDiesel}
                                                    onChange={e => setNovoValorLitrosDiesel(e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100%', mt: 1 }}
                                                    label="Valor Litros"
                                                />
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <TextField
                                                    type="number"
                                                    value={hodometroAnterior}
                                                    onChange={e => setHodometroAnterior(e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100%', mt: 1 }}
                                                    label="Hodômetro"
                                                />
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <TextField
                                                    type="number"
                                                    value={newHistoricoDiesel}
                                                    onChange={e => setNewHistoricoDiesel(e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100%', mt: 1 }}
                                                    label="Consumo Anterior"
                                                />
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        {distanciaDiesel !== null && (
                                            <Typography sx={{ mt: 1, mb: 3, textAlign: 'left' }}>
                                                <strong>Distância Percorrida:</strong> {distanciaDiesel}km
                                            </Typography>
                                        )}
                                        <Box sx={{ textAlign: 'left' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <Typography sx={{ border: '1px solid black', p: 0.5, minWidth: 120 }}>
                                                    <strong>Meta 3:</strong> {metasApi?.META3 ?? '-'}
                                                </Typography>
                                                {distanciaDiesel !== null && metasApi?.META3 ? (
                                                    <Typography sx={{ ml: 2 }}>
                                                        Litragem ideal: {litrosCalculadoDiesel}L
                                                    </Typography>   
                                                ) : null}
                                            </Box>
                                        </Box>
                                    </Grid>
                                    {/* Inputs do abastecimento */}
                                    <Grid item xs={12} md={12}>
                                        <Divider sx={{ width: { xs: '100%', md: '150%' }, borderBottomWidth: 3, mb: 2 }} />
                                        <Box sx={{ mr: { xs: 0, md: 8 }, mb: { xs: 2, md: 0 } }}>
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
                                                        />
                                                    )}
                                                    sx={{ width: { xs: '100%', sm: '65%' }, mb: 2 }}
                                                    freeSolo
                                                    required
                                                />
                                                <Autocomplete
                                                    options={postosOptions}
                                                    loading={loadingPostos}
                                                    value={posto}
                                                    onChange={(event, newValue) => setPosto(newValue ? newValue.toUpperCase() : '')}
                                                    onInputChange={(event, newInputValue) => setPosto(newInputValue ? newInputValue.toUpperCase() : '')}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Posto"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    sx={{ width: { xs: '100%', sm: '65%' } }}
                                                    freeSolo
                                                />
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: 2,
                                                alignItems: { xs: 'stretch', sm: 'center' },
                                                mb: 2,
                                                mt: 2
                                            }}
                                        >
                                            <TextField
                                                label="Data Atual"
                                                type="datetime-local"
                                                value={dataAtualDiesel}
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ width: { xs: '100%', sm: '40%' }, mb: { xs: 2, sm: 0 } }}
                                                onChange={e => setDataAtualDiesel(e.target.value)}
                                                disabled
                                            />
                                            <TextField
                                                label="Hodômetro Atual"
                                                type="number"
                                                value={hodometroAtual}
                                                onChange={e => setHodometroAtual(e.target.value.replace(/\D/g, ''))}
                                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                sx={{ width: { xs: '100%', sm: '45%' }, mb: { xs: 2, sm: 0 } }}
                                                required
                                            />
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: 2,
                                                alignItems: { xs: 'stretch', sm: 'center' },
                                                mb: 2
                                            }}
                                        >
                                            <TextField
                                                label="Valor Diesel"
                                                type="number"
                                                value={valorLitrosDiesel}
                                                onChange={e => setValorLitrosDiesel(e.target.value.replace(',', '.'))}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                                required
                                            />
                                            <TextField
                                                label="Litros"
                                                type="number"
                                                value={litrosCalculadoDiesel}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                                disabled
                                            />
                                            <TextField
                                                label="Litros Reais"
                                                type="number"
                                                value={litrosReais}
                                                onChange={e => setLitrosReais(e.target.value)}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                            />
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleVerificarDiesel}
                                                sx={{
                                                    width: { xs: '100%', sm: 'auto' },
                                                    height: { xs: 40, sm: '56px' },
                                                    minWidth: { xs: '100%', sm: 90 },
                                                    mt: { xs: 0, sm: 0 }
                                                }}
                                            >
                                                Verificar
                                            </Button>
                                        </Box>
                                        {(msgHodometroDiesel || msgLitrosDiesel || msgPostoDiesel || msgMotoristaDiesel) && (
                                            <Box sx={{ mt: 1 }}>
                                                {msgHodometroDiesel && (
                                                    <Typography color="error">{msgHodometroDiesel}</Typography>
                                                )}
                                                {msgLitrosDiesel && (
                                                    <Typography color="error">{msgLitrosDiesel}</Typography>
                                                )}
                                                {msgPostoDiesel && (
                                                    <Typography color="error">{msgPostoDiesel}</Typography>
                                                )}
                                                {msgMotoristaDiesel && (
                                                    <Typography color="error">{msgMotoristaDiesel}</Typography>
                                                )}
                                            </Box>
                                        )}
                                        {showGerarTicket && (
                                            <Button
                                                variant="contained"
                                                color="success"
                                                sx={{ mt: 2, width: { xs: '100%', sm: 'auto' } }}
                                                onClick={() => setOpenPreTicket(true)}
                                            >
                                                Gerar Ticket
                                            </Button>
                                        )}
                                    </Grid>
                                </Grid>
                            )
                        )}

                        {/* Arla - histórico ou cadastro inicial */}
                        {tipoAbastecimento === 'Arla' && (
                            historicoBanco && historicoBanco !== 'Sem dados' ? (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{mr: 8}}>
                                            <Typography sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Tipo Veículo:</strong> {tipoVeiculoApi}
                                            </Typography>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Data Abastecimento: </strong>
                                                <span>{historicoBanco.dt_create ? new Date(historicoBanco.dt_create).toLocaleDateString('pt-BR') : '-'}</span>
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Litros Abastecidos: </strong>
                                                <span>{historicoBanco.cd_litros ?? '-'}L</span>
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Valor Litros: </strong>
                                                <span>R$ {historicoBanco.cd_valor_litro ?? '-'}</span>
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Hodômetro: </strong>
                                                <span>{historicoBanco.cd_hodometro_atual ?? '-'}</span>
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <strong>Consumo Anterior: </strong>
                                                <span>{historicoBanco.cd_consumo_atual ?? '-'}</span>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        {distanciaArla !== null && (
                                            <Typography sx={{ mt: 1, mb: 3, textAlign: 'left' }}>
                                                <strong>Distância Percorrida:</strong> {distanciaArla}km
                                            </Typography>
                                        )}
                                        <Box sx={{ textAlign: 'left' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <Typography sx={{ border: '1px solid black', p: 0.5, minWidth: 120 }}>
                                                    <strong>Meta 3:</strong> {metasApi?.META3_ARLA ?? '-'}
                                                </Typography>
                                                {distanciaArla !== null && metasApi?.META3_ARLA ? (
                                                    <Typography sx={{ ml: 2 }}>
                                                        Litragem ideal: {litrosCalculadoArla}L
                                                    </Typography>
                                                ) : null}
                                            </Box>
                                        </Box>
                                    </Grid>
                                    {/* Inputs do abastecimento */}
                                    <Grid item xs={12} md={12}>
                                        <Divider sx={{ width: { xs: '100%', md: '150%' }, borderBottomWidth: 3, mb: 2 }} />
                                        <Box sx={{ mr: { xs: 0, md: 8 }, mb: { xs: 2, md: 0 } }}>
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
                                                        />
                                                    )}
                                                    sx={{ width: { xs: '100%', sm: '65%' }, mb: 2 }}
                                                    freeSolo
                                                    required
                                                />
                                                <Autocomplete
                                                    options={postosOptions}
                                                    loading={loadingPostos}
                                                    value={posto}
                                                    onChange={(event, newValue) => setPosto(newValue ? newValue.toUpperCase() : '')}
                                                    onInputChange={(event, newInputValue) => setPosto(newInputValue ? newInputValue.toUpperCase() : '')}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Posto"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    sx={{ width: { xs: '100%', sm: '65%' } }}
                                                    freeSolo
                                                />
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: 2,
                                                alignItems: { xs: 'stretch', sm: 'center' },
                                                mb: 2,
                                                mt: 2
                                            }}
                                        >
                                            <TextField
                                                label="Data Atual"
                                                type="datetime-local"
                                                value={dataAtualArla}
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ width: { xs: '100%', sm: '40%' }, mb: { xs: 2, sm: 0 } }}
                                                onChange={e => setDataAtualArla(e.target.value)}
                                                disabled
                                            />
                                            <TextField
                                                label="Hodômetro Atual"
                                                type="number"
                                                value={hodometroAtual}
                                                onChange={e => setHodometroAtual(e.target.value.replace(/\D/g, ''))}
                                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                sx={{ width: { xs: '100%', sm: '45%' }, mb: { xs: 2, sm: 0 } }}
                                                required
                                            />
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: 2,
                                                alignItems: { xs: 'stretch', sm: 'center' },
                                                mb: 2
                                            }}
                                        >
                                            <TextField
                                                label="Valor Arla"
                                                type="number"
                                                value={valorLitrosArla}
                                                onChange={e => setValorLitrosArla(e.target.value.replace(',', '.'))}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                                required
                                            />
                                            <TextField
                                                label="Litros"
                                                type="number"
                                                value={litrosCalculadoArla}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                                disabled
                                            />
                                            <TextField
                                                label="Litros Reais"
                                                type="number"
                                                value={litrosReais}
                                                onChange={e => setLitrosReais(e.target.value)}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                            />
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleVerificarArla}
                                                sx={{
                                                    width: { xs: '100%', sm: 'auto' },
                                                    height: { xs: 40, sm: '56px' },
                                                    minWidth: { xs: '100%', sm: 90 },
                                                    mt: { xs: 0, sm: 0 }
                                                }}
                                            >
                                                Verificar
                                            </Button>
                                        </Box>
                                        {(msgHodometroArla || msgLitrosArla || msgPostoArla || msgMotoristaArla) && (
                                            <Box sx={{ mt: 1 }}>
                                                {msgHodometroArla && (
                                                    <Typography color="error">{msgHodometroArla}</Typography>
                                                )}
                                                {msgLitrosArla && (
                                                    <Typography color="error">{msgLitrosArla}</Typography>
                                                )}
                                                {msgPostoArla && (
                                                    <Typography color="error">{msgPostoArla}</Typography>
                                                )}
                                                {msgMotoristaArla && (
                                                    <Typography color="error">{msgMotoristaArla}</Typography>
                                                )}
                                            </Box>
                                        )}
                                        {showGerarTicket && (
                                            <Button
                                                variant="contained"
                                                color="success"
                                                sx={{ mt: 2, width: { xs: '100%', sm: 'auto' } }}
                                                onClick={() => setOpenPreTicket(true)}
                                            >
                                                Gerar Ticket
                                            </Button>
                                        )}
                                    </Grid>
                                </Grid>
                            ) : (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{mr: 8}}>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <Typography sx={{ mb: 1, textAlign: 'left' }}>
                                                    <strong>Tipo Veículo:</strong> {tipoVeiculoApi}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <TextField
                                                    type="datetime-local"
                                                    value={novaDataAtualArla}
                                                    onChange={e => setNovaDataAtualArla(e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100%' }}
                                                    label="Data Abastecimento"
                                                />
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <TextField
                                                    type="number"
                                                    value={novoLitrosCalculadoArla}
                                                    onChange={e => setNovoLitrosCalculadoArla(e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100%', mt: 1 }}
                                                    label="Litros Abastecidos"
                                                />
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <TextField
                                                    type="number"
                                                    value={novoValorLitrosArla}
                                                    onChange={e => setNovoValorLitrosArla(e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100%', mt: 1 }}
                                                    label="Valor Litros"
                                                />
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <TextField
                                                    type="number"
                                                    value={hodometroAnterior}
                                                    onChange={e => setHodometroAnterior(e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100%', mt: 1 }}
                                                    label="Hodômetro"
                                                />
                                            </Box>
                                            <Box sx={{ mb: 1, textAlign: 'left' }}>
                                                <TextField
                                                    type="number"
                                                    value={newHistoricoArla}
                                                    onChange={e => setNewHistoricoArla(e.target.value)}
                                                    size="small"
                                                    sx={{ width: '100%', mt: 1 }}
                                                    label="Consumo Anterior"
                                                />
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        {distanciaDiesel !== null && (
                                            <Typography sx={{ mt: 1, mb: 3, textAlign: 'left' }}>
                                                <strong>Distância Percorrida:</strong> {distanciaDiesel}km
                                            </Typography>
                                        )}
                                        <Box sx={{ textAlign: 'left' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <Typography sx={{ border: '1px solid black', p: 0.5, minWidth: 120 }}>
                                                    <strong>Meta 3:</strong> {metasApi?.META3_ARLA ?? '-'}
                                                </Typography>
                                                {distanciaArla !== null && metasApi?.META3_ARLA ? (
                                                    <Typography sx={{ ml: 2 }}>
                                                        Litragem ideal: {litrosCalculadoArla}L
                                                    </Typography>
                                                ) : null}
                                            </Box>
                                        </Box>
                                    </Grid>
                                    {/* Inputs do abastecimento */}
                                    <Grid item xs={12} md={12}>
                                        <Divider sx={{ width: { xs: '100%', md: '150%' }, borderBottomWidth: 3, mb: 2 }}/>
                                        <Box sx={{ mr: { xs: 0, md: 8 }, mb: { xs: 2, md: 0 } }}>
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
                                                        />
                                                    )}
                                                    sx={{ width: { xs: '100%', sm: '65%' }, mb: 2 }}
                                                    freeSolo
                                                    required
                                                />
                                                <Autocomplete
                                                    options={postosOptions}
                                                    loading={loadingPostos}
                                                    value={posto}
                                                    onChange={(event, newValue) => setPosto(newValue ? newValue.toUpperCase() : '')}
                                                    onInputChange={(event, newInputValue) => setPosto(newInputValue ? newInputValue.toUpperCase() : '')}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Posto"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    sx={{ width: { xs: '100%', sm: '65%' } }}
                                                    freeSolo
                                                />
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: 2,
                                                alignItems: { xs: 'stretch', sm: 'center' },
                                                mb: 2,
                                                mt: 2
                                            }}
                                        >
                                            <TextField
                                                label="Data Atual"
                                                type="datetime-local"
                                                value={dataAtualArla}
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ width: { xs: '100%', sm: '40%' }, mb: { xs: 2, sm: 0 } }}
                                                onChange={e => setDataAtualArla(e.target.value)}
                                                disabled
                                            />
                                            <TextField
                                                label="Hodômetro Atual"
                                                type="number"
                                                value={hodometroAtual}
                                                onChange={e => setHodometroAtual(e.target.value.replace(/\D/g, ''))}
                                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                sx={{ width: { xs: '100%', sm: '45%' }, mb: { xs: 2, sm: 0 } }}
                                                required
                                            />
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: 2,
                                                alignItems: { xs: 'stretch', sm: 'center' },
                                                mb: 2
                                            }}
                                        >
                                            <TextField
                                                label="Valor Arla"
                                                type="number"
                                                value={valorLitrosArla}
                                                onChange={e => setValorLitrosArla(e.target.value.replace(',', '.'))}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                                required
                                            />
                                            <TextField
                                                label="Litros"
                                                type="number"
                                                value={litrosCalculadoArla}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                                disabled
                                            />
                                            <TextField
                                                label="Litros Reais"
                                                type="number"
                                                value={litrosReais}
                                                onChange={e => setLitrosReais(e.target.value)}
                                                inputProps={{ step: '0.01' }}
                                                sx={{ width: { xs: '100%', sm: '25%' }, mb: { xs: 2, sm: 0 } }}
                                            />
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleVerificarArla}
                                                sx={{
                                                    width: { xs: '100%', sm: 'auto' },
                                                    height: { xs: 40, sm: '56px' },
                                                    minWidth: { xs: '100%', sm: 90 },
                                                    mt: { xs: 0, sm: 0 }
                                                }}
                                            >
                                                Verificar
                                            </Button>
                                        </Box>
                                        {(msgHodometroArla || msgLitrosArla || msgPostoArla || msgMotoristaArla) && (
                                            <Box sx={{ mt: 1 }}>
                                                {msgHodometroArla && (
                                                    <Typography color="error">{msgHodometroArla}</Typography>
                                                )}
                                                {msgLitrosArla && (
                                                    <Typography color="error">{msgLitrosArla}</Typography>
                                                )}
                                                {msgPostoArla && (
                                                    <Typography color="error">{msgPostoArla}</Typography>
                                                )}
                                                {msgMotoristaArla && (
                                                    <Typography color="error">{msgMotoristaArla}</Typography>
                                                )}
                                            </Box>
                                        )}
                                        {showGerarTicket && (
                                            <Button
                                                variant="contained"
                                                color="success"
                                                sx={{ mt: 2, width: { xs: '100%', sm: 'auto' } }}
                                                onClick={() => setOpenPreTicket(true)}
                                            >
                                                Gerar Ticket
                                            </Button>
                                        )}
                                    </Grid>
                                </Grid>
                            )
                        )}
                    </>
                )}
            </Paper>

            <ModalCalculoKM open={openModalCalculoKM} onClose={() => setOpenModalCalculoKM(false)} />
            <ModalPreTicket
                open={openPreTicket}
                onClose={() => setOpenPreTicket(false)}
                placa={placa}
                tipoVeiculo={tipoVeiculoApi}
                valorCombustivel={
                    tipoAbastecimento === 'Diesel'
                        ? valorLitrosDiesel
                        : valorLitrosArla
                }
                litrosCombustivel={
                    tipoAbastecimento === 'Diesel'
                        ? (litrosReais !== '' ? litrosReais : litrosCalculadoDiesel)
                        : (litrosReais !== '' ? litrosReais : litrosCalculadoArla)
                }
                valorTotalAbastecimento={
                    tipoAbastecimento === 'Diesel'
                        ? (
                            Number(valorLitrosDiesel) * Number(litrosReais !== '' ? litrosReais : litrosCalculadoDiesel) || 0
                        )
                        : (
                            Number(valorLitrosArla) * Number(litrosReais !== '' ? litrosReais : litrosCalculadoArla) || 0
                        )
                }
                litrosCalculados={
                    tipoAbastecimento === 'Diesel'
                        ? litrosCalculadoDiesel
                        : litrosCalculadoArla
                }
                litrosReais={
                    tipoAbastecimento === 'Diesel'
                        ? (litrosReais !== '' ? litrosReais : litrosCalculadoDiesel)
                        : (litrosReais !== '' ? litrosReais : litrosCalculadoArla)
                }
                nomePosto={posto}
                consumoAnterior={
                    tipoAbastecimento === 'Diesel'
                        ? (
                            historicoBanco && historicoBanco !== 'Sem dados'
                                ? (historicoBanco.cd_consumo_anterior ?? newHistoricoDiesel ?? '')
                                : (newHistoricoDiesel ?? '')
                        )
                        : (
                            historicoBanco && historicoBanco !== 'Sem dados'
                                ? (historicoBanco.cd_consumo_anterior ?? newHistoricoArla ?? '')
                                : (newHistoricoArla ?? '')
                        )
                }
                hodometroAnterior={
                    tipoAbastecimento === 'Diesel'
                        ? (
                            historicoBanco && historicoBanco !== 'Sem dados'
                                ? (historicoBanco.cd_hodometro_atual ?? hodometroAnterior ?? '')
                                : (hodometroAnterior ?? '')
                        )
                        : (
                            historicoBanco && historicoBanco !== 'Sem dados'
                                ? (historicoBanco.cd_hodometro_atual ?? hodometroAnterior ?? '')
                                : (hodometroAnterior ?? '')
                        )
                }
                hodometroAtual={hodometroAtual}
                distanciaDestino={
                    tipoAbastecimento === 'Diesel'
                        ? distanciaDiesel
                        : distanciaArla
                }
                tipoAbastecimento={tipoAbastecimento}
                motorista={motorista}
                metaDesejada={
                    tipoAbastecimento === 'Diesel'
                        ? metasApi.META3
                        : metasApi.META3_ARLA
                }
                metaReal={
                    tipoAbastecimento === 'Diesel'
                        ? (litrosReais !== '' ? (distanciaDiesel/litrosReais) : metasApi.META3)
                        : (litrosReais !== '' ? (distanciaArla/litrosReais) : metasApi.META3_ARLA)
                }
                historicoDiesel={historicoDiesel}
                historicoArla={historicoArla}
                setTipoAbastecimento={setTipoAbastecimento}
                handleTipoAbastecimentoChange={handleTipoAbastecimentoChange}
            />
        </Box>
    );
};

export default AprovacaoAbastecimento;