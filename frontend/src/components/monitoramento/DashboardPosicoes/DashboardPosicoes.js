import React, { useState, useEffect, useRef } from 'react';
import './DashboardPosicoes.css';
import {
    Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, TextField, IconButton, MenuItem, Select, FormControl, InputLabel, Modal, Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MapIcon from '@mui/icons-material/Map';
import AccessAlarmOutlinedIcon from '@mui/icons-material/AccessAlarmOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TableRowsIcon from '@mui/icons-material/TableRows';
import SaveIcon from '@mui/icons-material/Save';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import axios from 'axios';
import ExportarExcel from '../ExportarExcel/ExportarExcel';
import RelatorioPermanencia from '../RelatorioPermanencia/RelatorioPermanencia';
import ModalAtraso from './ModalAtraso/ModalAtraso';
import ModalCarroceria from './ModalCarroceria/ModalCarroceria';

// Leaflet
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import truckIconIda from './assets/truck-icon-ida.png'; // ajuste o caminho conforme sua estrutura
import truckIconVolta from './assets/truck-icon-volta.png';

const truckIconsIda = new L.Icon({
    iconUrl: truckIconIda,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});
const truckIconsVolta = new L.Icon({
    iconUrl: truckIconVolta,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const apiUrl = process.env.REACT_APP_API_URL;
const INTERVALO_ATUALIZACAO = 3 * 60; // 3 minutos em segundos

// Corrige o ícone padrão do Leaflet no React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const opcoesDirecao = ['Ida - São José dos Pinhais', 'Volta - São Bernardo do Campo'];

const DashboardPosicoes = () => {
    const [dados, setDados] = useState([]);
    const [contador, setContador] = useState(INTERVALO_ATUALIZACAO);
    const [foco, setFoco] = useState(null);
    const markerRefs = useRef({});

    // Filtros
    const [filtroPlaca, setFiltroPlaca] = useState('');
    const [filtroPosicao, setFiltroPosicao] = useState('');
    const [filtroDirecao, setFiltroDirecao] = useState('');
    const [filtroTipoVeiculo, setFiltroTipoVeiculo] = useState('');

    // Input para adicionar placa
    const [novaPlaca, setNovaPlaca] = useState('');
    const [loadingAdd, setLoadingAdd] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState('');
    const [mensagem, setMensagem] = useState('');

    const [openCarroceriaModal, setOpenCarroceriaModal] = useState(false);

    const [openAtrasoModal, setOpenAtrasoModal] = useState(false);
    const [placaAtraso, setPlacaAtraso] = useState('');
    const [tempoAtraso, setTempoAtraso] = useState('');

    // Modal de confirmação de exclusão
    const [openModal, setOpenModal] = useState(false);
    const [placaParaExcluir, setPlacaParaExcluir] = useState('');

    // Modal de timers
    const [openTimerModal, setOpenTimerModal] = useState(false);
    const [placaTimer, setPlacaTimer] = useState('');
    const [cva, setCVA] = useState('');
    const [ancChegadaPlanta, setAncChegadaPlanta] = useState('');
    const [ancChegadaGate, setAncChegadaGate] = useState('');
    const [ancSaidaPlanta, setAncSaidaPlanta] = useState('');
    const [sjpPrevisaoChegada, setSjpPrevisaoChegada] = useState('');
    const [sjpChegadaPlanta, setSjpChegadaPlanta] = useState('');
    const [sjpChegadaGate, setSjpChegadaGate] = useState('');
    const [sjpSaidaPlanta, setSjpSaidaPlanta] = useState('');
    const [qtdeRacks, setQtdeRacks] = useState('');
    const [statusAtendimento, setStatusAtendimento] = useState('');
    const [mensagemTimestamp, setMensagemTimestamp] = useState('');

    // Visualização: 'tabela' ou 'mapa'
    const [visualizacao, setVisualizacao] = useState('tabela');
    const [tipoVeiculo, setTipoVeiculo] = useState('');

    // Edição agregados
    const [edicoesAgregado, setEdicoesAgregado] = useState({});
    const [editandoPlaca, setEditandoPlaca] = useState(null);

    // Modal para lat/lng agregados
    const [openLatLngModal, setOpenLatLngModal] = useState(false);
    const [latLngInput, setLatLngInput] = useState('');
    const [motivoExclusao, setMotivoExclusao] = useState('');
    const [agregadoParaLatLng, setAgregadoParaLatLng] = useState(null);
    const [loadingLatLng, setLoadingLatLng] = useState(false);

    // Fullscreen do mapa
    const [mapFullScreen, setMapFullScreen] = useState(false);

    // Lista de placas no mapa: arrastável e minimizável
    const [listaVisivel, setListaVisivel] = useState(true);
    const [listaPos, setListaPos] = useState({ x: 24, y: 24 });
    const [dragging, setDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const listaRef = useRef(null);

    // Novo: menu flutuante de contagem por polígono
    const [menuPoligonosVisivel, setMenuPoligonosVisivel] = useState(true);
    const [menuPoligonosPos, setMenuPoligonosPos] = useState({ x: 220, y: 24 });
    const [draggingPoligonos, setDraggingPoligonos] = useState(false);
    const [dragOffsetPoligonos, setDragOffsetPoligonos] = useState({ x: 0, y: 0 });
    const menuPoligonosRef = useRef(null);

    // Ref do mapa para centralizar/focar
    const mapRef = useRef(null);

    // Atualização automática
    useEffect(() => {
        const fetchDados = async () => {
            try {
                const res = await axios.post(`${apiUrl}/posicoes/loadVehicles`);
                setDados(res.data.resultado || res.data);
            } catch (err) {
                setDados([]);
            }
        };
        fetchDados();
        const interval = setInterval(() => {
            fetchDados();
            setContador(INTERVALO_ATUALIZACAO);
        }, INTERVALO_ATUALIZACAO * 1000);

        const timer = setInterval(() => {
            setContador(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, []);

    // Mouse events para arrastar a lista de placas
    const handleMouseDown = (e) => {
        setDragging(true);
        const rect = listaRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        e.preventDefault();
    };

    // Função para abrir o modal de atraso
    const handleOpenAtrasoModal = (placa) => {
        setPlacaAtraso(placa);
        const row = dados.find(row => (row.nm_placa || row.placa) === placa);
        setTempoAtraso(row?.tempoAtrasoMinutos || 0);
        setOpenAtrasoModal(true);
    };

    // Função para fechar o modal de atraso
    const handleCloseAtrasoModal = () => {
        setOpenAtrasoModal(false);
        setTempoAtraso(0);
        setPlacaAtraso('');
    };

    const fetchDadosExcel = async () => {
        // Pegue as placas monitoradas atualmente e suas direções
        const placasDirecoes = dados.map(row => ({
            placa: row.nm_placa || row.placa,
            direcao: row.nm_direcao || row.direcao,
            cd_distancia: row.cd_distancia, // garanta que existe
            nm_poligono_atual: row.nm_poligono_atual,
            situacao: row.situacao
        })).filter(obj => obj.placa);

        try {
            const res = await axios.post(`${apiUrl}/placas/dadosExcel`, { placasDirecoes });
            return res.data;
        } catch (err) {
            alert('Erro ao buscar dados para exportação.');
            return [];
        }
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (dragging) {
                setListaPos({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            }
        };
        const handleMouseUp = () => setDragging(false);

        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, dragOffset]);

    // Mouse events para arrastar o menu de polígonos
    const handleMouseDownPoligonos = (e) => {
        setDraggingPoligonos(true);
        const rect = menuPoligonosRef.current.getBoundingClientRect();
        setDragOffsetPoligonos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        e.preventDefault();
    };

    function FocarMapa({ lat, lng, trigger, onDone }) {
        const map = useMap();
        useEffect(() => {
            if (lat && lng) {
                map.setView([Number(lat), Number(lng)], 25, { animate: true }); // <-- zoom maior aqui
                if (onDone) onDone();
            }
        }, [lat, lng, trigger, map]);
        return null;
    }

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (draggingPoligonos) {
                setMenuPoligonosPos({
                    x: e.clientX - dragOffsetPoligonos.x,
                    y: e.clientY - dragOffsetPoligonos.y
                });
            }
        };
        const handleMouseUp = () => setDraggingPoligonos(false);

        if (draggingPoligonos) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingPoligonos, dragOffsetPoligonos]);

    // Estilo dinâmico para lista flutuante
    const getListaStyle = () => ({
        position: 'fixed',
        left: listaPos.x,
        top: listaPos.y,
        zIndex: 1400,
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        padding: 12,
        minWidth: 180,
        maxHeight: 'max-content',
        overflowY: 'auto',
        fontSize: 10,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none'
    });

    // Estilo dinâmico para menu de polígonos
    const getMenuPoligonosStyle = () => ({
        position: 'fixed',
        left: menuPoligonosPos.x,
        top: menuPoligonosPos.y,
        zIndex: 1401,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        padding: 12,
        minWidth: 180,
        maxHeight: '60vh',
        overflowY: 'auto',
        fontSize: 16,
        cursor: draggingPoligonos ? 'grabbing' : 'grab',
        userSelect: 'none'
    });

    function toInputDateTimeLocal(utcDateString) {
        if (!utcDateString) return '';
        const d = new Date(utcDateString);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    // Filtros
    const opcoesPosicao = Array.from(new Set(dados.map(row => row.nm_poligono_atual || row.situacao))).filter(Boolean);

    // Suporte tanto para nm_placa quanto placa
    const dadosFiltrados = dados.filter(row => {
        const placa = row.nm_placa || row.placa;
        let tipoVeiculo = '';
        if (Number(row.cd_tipo_veiculo) === 0) tipoVeiculo = 'Frota';
        if (Number(row.cd_tipo_veiculo) === 1) tipoVeiculo = 'Agregado';
        return (
            (filtroPlaca === '' || placa?.toLowerCase().includes(filtroPlaca.toLowerCase())) &&
            (filtroPosicao === '' || (row.nm_poligono_atual || row.situacao) === filtroPosicao) &&
            (filtroDirecao === '' || (row.nm_direcao || row.direcao) === filtroDirecao) &&
            (filtroTipoVeiculo === '' || tipoVeiculo === filtroTipoVeiculo)
        );
    });

    // Placas atrasadas primeiro
    const atrasados = dadosFiltrados.filter(row => row.cd_atraso === 1);
    const naoAtrasados = dadosFiltrados.filter(row => row.cd_atraso !== 1);

    // Função para formatar datas
    const formatarData = (data) => {
        if (!data) return '';
        const d = new Date(data);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('pt-BR');
    };

    function add10HoursToDatetimeLocal(datetimeLocalStr) {
        if (!datetimeLocalStr) return '';
        const date = new Date(datetimeLocalStr);
        if (isNaN(date.getTime())) return '';
        date.setHours(date.getHours() + 7);
        // Retorna no formato yyyy-MM-ddTHH:mm
        return date.toISOString().slice(0, 16);
    }

    // Função para formatar contador em minutos e segundos
    const formatarTempo = (segundos) => {
        const min = Math.floor(segundos / 60);
        const sec = segundos % 60;
        return `${min}m ${sec < 10 ? '0' : ''}${sec}s`;
    };

    const POLIGONOS_MENU = ["Volkswagen SBC", 
                            "Volkswagen SJP", "Pátio FKS", 
                            "Doca Volkswagen SJP", 
                            "Pátio Volks SJP", 
                            "Doca Volkswagen SBC", 
                            "Pátio Volks SBC",
                            "Graal Petropen",
                            "Posto Tio Zico"];

    // Agrupa por polígono e conta veículos
    const poligonosCount = {};
    dadosFiltrados.forEach(row => {
        const poligono = row.nm_poligono_atual || row.situacao || 'Sem polígono';
        if (POLIGONOS_MENU.includes(poligono)) {
            poligonosCount[poligono] = (poligonosCount[poligono] || 0) + 1;
        }
    });

    // Abrir modal de confirmação de exclusão
    const handleOpenModal = (placa) => {
        setPlacaParaExcluir(placa);
        setOpenModal(true);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setOpenModal(false);
        setPlacaParaExcluir('');
    };

    // Abrir modal de timers
    const handleOpenTimerModal = async (placa) => {
        setPlacaTimer(placa);
        setOpenTimerModal(true);
        try {
            const res = await axios.post(`${apiUrl}/placas/listarTimestamps`, { placa: placa });
            const data = res.data && res.data[0] ? res.data[0] : {};

            setAncChegadaPlanta(data.dt_a_chegada_planta ? toInputDateTimeLocal(data.dt_a_chegada_planta) : '');
            setAncChegadaGate(data.dt_a_chegada_gate ? toInputDateTimeLocal(data.dt_a_chegada_gate) : '');
            setAncSaidaPlanta(data.dt_a_saida_planta ? toInputDateTimeLocal(data.dt_a_saida_planta) : '');
            setSjpPrevisaoChegada(data.dt_p_previsao_chegada ? toInputDateTimeLocal(data.dt_p_previsao_chegada) : '');
            setSjpChegadaPlanta(data.dt_p_chegada_planta ? toInputDateTimeLocal(data.dt_p_chegada_planta) : '');
            setSjpChegadaGate(data.dt_p_chegada_gate ? toInputDateTimeLocal(data.dt_p_chegada_gate) : '');
            setSjpSaidaPlanta(data.dt_p_saida_planta ? toInputDateTimeLocal(data.dt_p_saida_planta) : '');
            setStatusAtendimento(data.nm_atendimento_status ?? '');
            setQtdeRacks(data.cd_qtd_racks ?? '');
        } catch (err) {
            console.error('Erro ao abrir modal de timers:', err);
            // Limpa os campos em caso de erro
            setAncChegadaPlanta('');
            setAncChegadaGate('');
            setAncSaidaPlanta('');
            setSjpPrevisaoChegada('');
            setSjpChegadaPlanta('');
            setSjpChegadaGate('');
            setSjpSaidaPlanta('');
            setStatusAtendimento('');
            setQtdeRacks('');
            setMensagemTimestamp('');
        }
        try {
            const res = await axios.post(`${apiUrl}/placas/dadosExcel`, { placasDirecoes: [{ placa }] });
            setCVA(res.data[0].CVA || ''); // Supondo que a resposta tenha um campo cva
        } catch (err) {
            alert('Erro ao buscar dados para exportação.');
            return [];
        }
    };

    // Fechar modal de timers
    const handleCloseTimerModal = () => {
        setPlacaTimer('');
        setMensagemTimestamp('');
        setCVA('');
        setOpenTimerModal(false);
    };

    const handleClearTimerModal = async () => {
        try {
            await axios.post(`${apiUrl}/placas/limpaTimestamp`, { 
                placa: placaTimer
            });
        } catch (err) {
            console.error('Erro ao abrir modal de timers:', err);
        }
        // Limpa os campos em caso de erro
        setAncChegadaPlanta('');
        setAncChegadaGate('');
        setAncSaidaPlanta('');
        setSjpPrevisaoChegada('');
        setSjpChegadaPlanta('');
        setSjpChegadaGate('');
        setSjpSaidaPlanta('');
        setStatusAtendimento('');
        setQtdeRacks('');
        setMensagemTimestamp('Horários limpos');
    };

    //FKS1I61
    // Salvar modal de timers
    const handleSaveTimerModal = async () => {
        try {
            await axios.post(`${apiUrl}/placas/salvarTimestamp`, { 
                placa: placaTimer, 
                aChegadaPlanta: ancChegadaPlanta, 
                aChegadaGate: ancChegadaGate, 
                aSaidaPlanta: ancSaidaPlanta, 
                sPrevisaoChegada: sjpPrevisaoChegada, 
                sChegadaPlanta: sjpChegadaPlanta, 
                sChegadaGate: sjpChegadaGate, 
                sSaidaPlanta: sjpSaidaPlanta, 
                statusAtendimento: statusAtendimento,
                sQtdeRacks: qtdeRacks === '' ? null : Number(qtdeRacks) 
            });
        } catch (err) {
            console.error('Erro ao abrir modal de timers:', err);
        }
        setMensagemTimestamp('Horários salvos com sucesso');
    };

    // Adicionar placa
    const handleAddPlaca = async () => {
        if (!novaPlaca.trim()) {
            setMensagem('Digite uma placa.');
            return;
        }
        setLoadingAdd(true);
        setMensagem('');
        try {
            await axios.post(`${apiUrl}/placas/addPlaca`, { placa: novaPlaca.trim().toUpperCase(), tipoVeiculo: tipoVeiculo });
            setMensagem('Placa adicionada com sucesso!');
            setNovaPlaca('');
            await axios.post(`${apiUrl}/posicoes/frotas/monitoramento`);
            const res = await axios.post(`${apiUrl}/posicoes/loadVehicles`);
            setDados(res.data.resultado || res.data);
        } catch (err) {
            setMensagem('Erro ao adicionar placa.');
        }
        setLoadingAdd(false);
    };

    // Remover placa (após confirmação)
    const handleDeletePlaca = async () => {
        if (!placaParaExcluir) return;
        setLoadingDelete(placaParaExcluir);
        setMensagem('');
        try {
            const usuario = localStorage.getItem('user');
            await axios.post(`${apiUrl}/placas/deletePlaca`, { placa: placaParaExcluir });
            await axios.post(`${apiUrl}/placas/registerDelete`, { placa: placaParaExcluir, motivo: motivoExclusao, usuario });
            setMotivoExclusao('');
            setMensagem('Placa removida com sucesso!');
            await axios.post(`${apiUrl}/posicoes/frotas/monitoramento`);
            const res = await axios.post(`${apiUrl}/posicoes/loadVehicles`);
            setDados(res.data.resultado || res.data);
        } catch (err) {
            setMensagem('Erro ao remover placa.');
        }
        setLoadingDelete('');
        handleCloseModal();
    };

    // Adicionar placa ao apertar Enter
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleAddPlaca();
        }
    };

    // Edição de campos agregados
    const handleEditarAgregado = (placa, campo, valor) => {
        setEdicoesAgregado(prev => ({
            ...prev,
            [placa]: {
                ...prev[placa],
                [campo]: valor
            }
        }));
        setEditandoPlaca(placa);
    };

    // Salvar alterações do agregado
    const handleSalvarAgregado = async (placa) => {
        const edicao = edicoesAgregado[placa] || {};
        // Busca a linha original dos dados
        const row = dados.find(r => (r.nm_placa || r.placa) === placa);

        // Usa o valor editado se existir, senão o valor original
        const latitude = edicao.latitude ?? row?.nm_latitude ?? row?.latitude ?? '';
        const longitude = edicao.longitude ?? row?.nm_longitude ?? row?.longitude ?? '';
        const posicao = edicao.posicao ?? row?.nm_poligono_atual ?? row?.situacao ?? '';
        const direcao = edicao.direcao ?? row?.nm_direcao ?? row?.direcao ?? '';
        const distancia = edicao.distancia ?? row?.cd_distancia ?? row?.distancia ?? '';
        const saida = edicao.saida ?? (row?.dt_saida ? new Date(row.dt_saida).toISOString().slice(0, 16) : '');

        if (!posicao || !direcao || !saida) {
            alert('Preencha todos os campos!');
            return;
        }

        try {
            await axios.post(`${apiUrl}/posicoes/salvarAgregado`, {
                placa,
                tipoVeiculo: 1,
                posicao,
                direcao,
                saida,
                latitude,
                longitude,
                distancia
            });
            setEditandoPlaca(null);
            setEdicoesAgregado(prev => ({ ...prev, [placa]: undefined }));
            const res = await axios.post(`${apiUrl}/posicoes/loadVehicles`);
            setDados(res.data.resultado || res.data);
        } catch (err) {
            alert('Erro ao salvar agregado');
        }
    };

    // Modal lat/lng para agregados - agora usa string única
    const handleOpenLatLngModal = (placa) => {
        setAgregadoParaLatLng(placa);
        setLatLngInput('');
        setOpenLatLngModal(true);
    };

    const handleCloseLatLngModal = () => {
        setOpenLatLngModal(false);
        setAgregadoParaLatLng(null);
        setLatLngInput('');
    };

    const handleOpenCarroceriaModal = () => {
        setOpenCarroceriaModal(true);
    };

    const handleCloseCarroceriaModal = () => {
        setOpenCarroceriaModal(false);
    };

    const handleSalvarLatLng = async () => {
        // Espera formato: "-25.66804967025807, -49.169221078109096"
        const [lat, lng] = latLngInput.split(',').map(s => s.trim());
        if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
            alert('Digite latitude e longitude válidas no formato: -25.66804967025807, -49.169221078109096');
            return;
        }
        setLoadingLatLng(true);
        try {
            // Chame sua API para calcular o polígono
            const res = await axios.post(`${apiUrl}/posicoes/calcularPoligono`, {
                placa: agregadoParaLatLng,
                latitude: lat,
                longitude: lng
            });
            // Atualize a posição do agregado no estado de edição
            setEdicoesAgregado(prev => ({
                ...prev,
                [agregadoParaLatLng]: {
                    ...prev[agregadoParaLatLng],
                    posicao: res.data.posicao || 'Em Trânsito',
                    latitude: lat,
                    longitude: lng,
                    distancia: res.data.distancia || null
                }
            }));
            setEditandoPlaca(agregadoParaLatLng);
            handleCloseLatLngModal();
        } catch (err) {
            alert('Erro ao calcular polígono');
        }
        setLoadingLatLng(false);
    };

    // Centralização do mapa
    const center = [-23.5, -46.6];

    // Função para focar no veículo no mapa
    const focarNoVeiculo = (lat, lng) => {
        if (mapRef.current && lat && lng) {
            mapRef.current.setView([Number(lat), Number(lng)], 15, { animate: true });
        }
    };

    // Renderização da linha da tabela
    const renderLinha = (row, atrasado = false) => {
        const placa = row.nm_placa || row.placa;
        const isAgregado = Number(row.cd_tipo_veiculo) === 1;
        const edicao = edicoesAgregado[placa] || {};

        // Exibe posição + (distância) para agregados, igual frota
        const posicaoTexto = (() => {
            const pos = edicao.posicao ?? row.nm_poligono_atual ?? row.situacao ?? '';
            const dist = edicao.distancia
                ? ` (${edicao.distancia})`
                : row.distancia
                    ? ` (${row.distancia})`
                    : '';
            return `${pos}${dist}`;
        })();

        return (
            <TableRow
                key={placa}
                style={atrasado ? { backgroundColor: '#ffcdd2', fontWeight: 'bold' } : {}}
            >
                <TableCell>{placa}</TableCell>
                <TableCell>
                    {isAgregado ? (
                        <Select
                            variant="standard"
                            disableUnderline
                            value={edicao.direcao ?? row.nm_direcao ?? row.direcao ?? ''}
                            onChange={e => handleEditarAgregado(placa, 'direcao', e.target.value)}
                            size="small"
                            sx={{ minWidth: 90, background: 'none', boxShadow: 'none', border: 'none' }}
                        >
                            {opcoesDirecao.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </Select>
                    ) : (
                        row.nm_direcao || row.direcao
                    )}
                </TableCell>
                <TableCell>
                    {isAgregado ? (
                        <>
                            <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenLatLngModal(placa)}
                                title="Definir posição por latitude/longitude"
                                sx={{ verticalAlign: 'middle', marginRight: 1 }}
                            >
                                <MapIcon fontSize="small" />
                            </IconButton>
                            {posicaoTexto}
                            {row.cd_distancia !== null && row.cd_distancia !== undefined
                                ? ` (${row.cd_distancia}km)`
                                : row.distancia ? ` (${row.distancia})` : ''}
                        </>
                    ) : (
                        <>
                            <IconButton
                                size="small"
                                color="primary"
                                component="a"
                                href={`https://www.google.com/maps?q=${row.nm_latitude || row.latitude},${row.nm_longitude || row.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Ver no Google Maps"
                                sx={{ verticalAlign: 'middle', marginRight: 1 }}
                            >
                                <MapIcon fontSize="small" />
                            </IconButton>
                            {row.nm_poligono_atual || row.situacao}
                            {row.cd_distancia !== null && row.cd_distancia !== undefined
                                ? ` (${row.cd_distancia}km)`
                                : row.distancia ? ` (${row.distancia})` : ''}
                        </>
                    )}
                </TableCell>
                <TableCell>
                    {isAgregado ? (
                        <TextField
                            variant="standard"
                            type="datetime-local"
                            value={edicao.saida ?? (row.dt_saida ? toInputDateTimeLocal(row.dt_saida) : '')}
                            onChange={e => handleEditarAgregado(placa, 'saida', e.target.value)}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 90, background: 'none', boxShadow: 'none', border: 'none' }}
                        />
                    ) : (
                        formatarData(row.dt_saida || row.saida)
                    )}
                </TableCell>
                <TableCell>
                    {formatarData(row.dt_transitTime || row.transitTime)}
                </TableCell>
                {/* <TableCell>{row.cd_velocidade || '-'}</TableCell> */}
                <TableCell>
                    {row.dt_realTransit ? formatarData(row.dt_realTransit) : '-'}
                </TableCell>
                <TableCell>
                    {atrasado && (
                        <>
                            <WarningAmberIcon
                                sx={{ color: '#ff9800', verticalAlign: 'middle', marginRight: 1 }}
                                titleAccess={
                                    row.tempo_atraso
                                        ? `Possível atrasOO: veículo não percorreu 2km em 1 hora (${row.tempo_atraso})`
                                        : 'Possível atraso: veículo não percorreu 2km em 1 hora'
                                }
                                onClick={() => handleOpenAtrasoModal(placa)}
                            />
                        </>
                    )}
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenTimerModal(placa)}
                        disabled={loadingDelete === placa}
                        title="Editar placa"
                    >
                        <AccessAlarmOutlinedIcon />
                    </IconButton>
                    {isAgregado && editandoPlaca === placa && (
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSalvarAgregado(placa)}
                            title="Salvar alterações"
                        >
                            <SaveIcon />
                        </IconButton>
                    )}
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenModal(placa)}
                        disabled={loadingDelete === placa}
                        title="Remover placa"
                    >
                        <DeleteIcon />
                    </IconButton>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <div style={{ padding: 16, position: 'relative' }}>
        {!mapFullScreen && (
            <div style={{
                position: 'absolute',
                top: 16,
                right: mapFullScreen ? 80 : 32,
                fontWeight: 'bold',
                fontSize: 16,
                color: '#1976d2',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                zIndex: 1201
            }}>
                Atualização em: {formatarTempo(contador)}
                <Button
                    startIcon={visualizacao === 'tabela' ? <MapIcon /> : <TableRowsIcon />}
                    onClick={() => setVisualizacao(visualizacao === 'tabela' ? 'mapa' : 'tabela')}
                >
                    {visualizacao === 'tabela' ? '' : ''}
                </Button>
            </div>
        )}
            {/* Botão de fullscreen para o mapa */}
            {visualizacao === 'mapa' && (
                <IconButton
                    onClick={() => setMapFullScreen(f => !f)}
                    sx={{
                        position: 'absolute',
                        top: 68,
                        right: 24,
                        zIndex: 1300,
                        background: '#fff',
                        boxShadow: 2,
                        borderRadius: 2,
                    }}
                    title={mapFullScreen ? "Sair do modo tela cheia" : "Tela cheia"}
                >
                    {mapFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
            )}

            {/* Menu flutuante de contagem por polígono no fullscreen */}
            {visualizacao === 'mapa' && mapFullScreen && (
                menuPoligonosVisivel ? (
                    <div
                        ref={menuPoligonosRef}
                        style={getMenuPoligonosStyle()}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: 8,
                                gap: 8,
                                cursor: 'grab',
                                userSelect: 'none'
                            }}
                            onMouseDown={handleMouseDownPoligonos}
                        >
                            <b>Veículos por Posição</b>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={e => { e.stopPropagation(); setMenuPoligonosVisivel(false); }}
                                sx={{ minWidth: 32, padding: '2px 8px', fontSize: 12, marginLeft: 'auto' }}
                            >
                                -
                            </Button>
                        </div>
                        <div>
                            {Object.entries(poligonosCount).map(([nome, qtd]) => (
                                <div key={nome} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 500 }}>{nome}</span>
                                    <span style={{ marginLeft: 8, color: '#1976d2', fontSize: 15 }}>
                                        {qtd}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div
                        ref={menuPoligonosRef}
                        style={{
                            position: 'fixed',
                            left: menuPoligonosPos.x,
                            top: menuPoligonosPos.y,
                            zIndex: 1401,
                            background: 'rgba(255,255,255,0.8)',
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                            padding: '4px 12px',
                            fontSize: 16,
                            cursor: draggingPoligonos ? 'grabbing' : 'grab',
                            userSelect: 'none'
                        }}
                        onMouseDown={handleMouseDownPoligonos}
                    >
                        <span style={{ fontWeight: 500 }}>Veículos por Posição</span>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={e => { e.stopPropagation(); setMenuPoligonosVisivel(true); }}
                            sx={{ minWidth: 32, padding: '2px 8px', fontSize: 12, marginLeft: 8 }}
                        >
                            +
                        </Button>
                    </div>
                )
            )}

            {/* Lista de placas no fullscreen - arrastável e minimizável */}
            {visualizacao === 'mapa' && mapFullScreen && (
                listaVisivel ? (
                <div
                    ref={listaRef}
                    style={getListaStyle()}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: 8,
                            gap: 8,
                            cursor: 'grab',
                            userSelect: 'none'
                        }}
                        onMouseDown={handleMouseDown}
                    >
                        <b style={{ fontSize: 16 }}>Placas no mapa</b>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={e => { e.stopPropagation(); setListaVisivel(false); }}
                            sx={{ minWidth: 32, padding: '2px 8px', fontSize: 12, marginLeft: 'auto' }}
                        >
                            -
                        </Button>
                    </div>
                    <div>
                        {[...dadosFiltrados]
                            .sort((a, b) => {
                                // Pega a distância, priorizando cd_distancia, depois distancia, depois Infinity
                                const distA = a.cd_distancia !== null && a.cd_distancia !== undefined
                                    ? Number(a.cd_distancia)
                                    : (a.distancia !== undefined && a.distancia !== null && !isNaN(Number(a.distancia)) ? Number(a.distancia) : Infinity);
                                const distB = b.cd_distancia !== null && b.cd_distancia !== undefined
                                    ? Number(b.cd_distancia)
                                    : (b.distancia !== undefined && b.distancia !== null && !isNaN(Number(b.distancia)) ? Number(b.distancia) : Infinity);
                                return distA - distB;
                            })
                            .map(row => {
                                const placa = row.nm_placa || row.placa;
                                const direcao = (row.nm_direcao || row.direcao || '').toLowerCase();
                                const direcaoLabel = direcao.includes('volta') ? 'SJP>SBC' : 'SBC>SJP';
                                const iconUrl = direcao.includes('volta') ? truckIconVolta : truckIconIda;
                                let distancia = '';
                                if (row.cd_distancia !== null && row.cd_distancia !== undefined) {
                                    distancia = `${row.cd_distancia}km`;
                                } else if (row.distancia) {
                                    distancia = row.distancia;
                                }
                                // NOVO: define cor vermelha se estiver atrasado
                                const isAtrasado = row.cd_atraso === 1;

                                // NOVO: ao clicar, foca no veículo no mapa
                                const isAgregado = Number(row.cd_tipo_veiculo) === 1;
                                const edicao = edicoesAgregado[placa] || {};
                                const lat = isAgregado
                                    ? (edicao.latitude || row.nm_latitude || row.latitude)
                                    : (row.nm_latitude || row.latitude);
                                const lng = isAgregado
                                    ? (edicao.longitude || row.nm_longitude || row.longitude)
                                    : (row.nm_longitude || row.longitude);

                                return (
                                    <div
                                        key={placa}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginBottom: 4,
                                            cursor: 'pointer',
                                            background: isAtrasado ? '#ffeaea' : undefined
                                        }}
                                        onClick={() => {
                                            setFoco({ lat, lng, trigger: Date.now() });
                                            setTimeout(() => {
                                                if (markerRefs.current[placa]) {
                                                    markerRefs.current[placa].openPopup();
                                                }
                                            }, 400); // pequeno delay para garantir que o foco já ocorreu
                                        }}
                                    >
                                        <img
                                            src={iconUrl}
                                            alt={direcaoLabel}
                                            style={{ width: 22, height: 22, marginRight: 8 }}
                                        />
                                        <span
                                            style={{
                                                fontWeight: 500,
                                                color: isAtrasado ? '#d32f2f' : undefined
                                            }}
                                        >
                                            {placa}
                                        </span>
                                        <span style={{ marginLeft: 8, color: '#1976d2', fontSize: 10 }}>
                                            {direcaoLabel}
                                        </span>
                                        {distancia && (
                                            <span style={{ marginLeft: 8, color: '#888', fontSize: 10 }}>
                                                {distancia}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>
                ) : (
                    <div
                        ref={listaRef}
                        style={{
                            position: 'fixed',
                            left: listaPos.x,
                            top: listaPos.y,
                            zIndex: 1400,
                            background: 'rgba(255,255,255,0.8)',
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                            padding: '4px 12px',
                            fontSize: 12,
                            cursor: dragging ? 'grabbing' : 'grab',
                            userSelect: 'none'
                        }}
                        onMouseDown={handleMouseDown}
                    >
                        <span style={{ fontWeight: 500 }}>Placas no mapa</span>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={e => { e.stopPropagation(); setListaVisivel(true); }}
                            sx={{ minWidth: 32, padding: '2px 8px', fontSize: 12, marginLeft: 8 }}
                        >
                            +
                        </Button>
                    </div>
                )
            )}

            <div className="dashboard-header" style={{ paddingTop: '16px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <h1>Dashboard Posições</h1>
            </div>
            {/* Input para adicionar placa */}
            <div style={{ margin: '16px 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TextField
                    label="Adicionar placa"
                    value={novaPlaca}
                    onChange={e => setNovaPlaca(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    size="small"
                    disabled={loadingAdd}
                />
                <FormControl size="small" style={{ minWidth: 120 }}>
                    <InputLabel id="tipo-veiculo-label">Tipo</InputLabel>
                    <Select
                        labelId="tipo-veiculo-label"
                        id="tipo-veiculo"
                        value={tipoVeiculo || ''}
                        label="Tipo Veículo"
                        onChange={e => setTipoVeiculo(e.target.value)}
                    >
                        <MenuItem value="Frota">Frota</MenuItem>
                        <MenuItem value="Agregado">Agregado</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddPlaca}
                    disabled={loadingAdd}
                >
                    Adicionar
                </Button>
                {mensagem && (
                    <Typography variant="body2" color={mensagem.includes('sucesso') ? 'primary' : 'error'} sx={{ ml: 2 }}>
                        {mensagem}
                    </Typography>
                )}
            </div>
            {/* Filtros */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                <TextField
                    label="Filtrar por placa"
                    value={filtroPlaca}
                    onChange={e => setFiltroPlaca(e.target.value)}
                    size="small"
                />
                <FormControl size="small" style={{ minWidth: 150 }}>
                    <InputLabel>Filtrar por posição</InputLabel>
                    <Select
                        value={filtroPosicao}
                        label="Filtrar por posição"
                        onChange={e => setFiltroPosicao(e.target.value)}
                        sx={{ width: 200 }}
                    >
                        <MenuItem value="">Todas</MenuItem>
                        {opcoesPosicao.map(pos => (
                            <MenuItem key={pos} value={pos}>{pos}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" style={{ minWidth: 120 }}>
                    <InputLabel>Filtrar por direção</InputLabel>
                    <Select
                        value={filtroDirecao}
                        label="Filtrar por direção"
                        onChange={e => setFiltroDirecao(e.target.value)}
                        sx={{ width: 200 }}
                    >
                        <MenuItem value="">Todas</MenuItem>
                        {opcoesDirecao.map(dir => (
                            <MenuItem key={dir} value={dir}>{dir}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" style={{ minWidth: 120 }}>
                    <InputLabel>Tipo Veículo</InputLabel>
                    <Select
                        value={filtroTipoVeiculo}
                        label="Tipo Veículo"
                        onChange={e => setFiltroTipoVeiculo(e.target.value)}
                        sx={{ width: 150 }}
                    >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="Frota">Frota</MenuItem>
                        <MenuItem value="Agregado">Agregado</MenuItem>
                    </Select>
                </FormControl>
            </div>

            {visualizacao === 'tabela' ? (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>
                                    {`PLACA (${dadosFiltrados.length})`}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>DESTINO</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>POSIÇÃO</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>SAÍDA</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>TRANSIT TIME</TableCell>
                                {/* <TableCell sx={{ fontWeight: 'bold' }}>VELOCIDADE</TableCell> */}
                                <TableCell sx={{ fontWeight: 'bold' }}>CHEGADA REAL</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>AÇÕES</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {atrasados.map(row => renderLinha(row, true))}
                            {naoAtrasados.map(row => renderLinha(row, false))}
                            {dadosFiltrados.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        Nenhuma placa encontrada com os filtros selecionados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <Paper
                    style={{
                        height: mapFullScreen ? '100vh' : 600,
                        width: mapFullScreen ? '100vw' : '100%',
                        marginBottom: 24,
                        position: mapFullScreen ? 'fixed' : 'relative',
                        top: mapFullScreen ? 0 : undefined,
                        left: mapFullScreen ? 0 : undefined,
                        zIndex: mapFullScreen ? 1200 : 'auto'
                    }}
                >
                    <MapContainer
                        center={center}
                        zoom={6}
                        style={{ height: '100%', width: '100%' }}
                        whenCreated={mapInstance => { mapRef.current = mapInstance; }}
                    >
                        {foco && (
                            <FocarMapa
                                lat={foco.lat}
                                lng={foco.lng}
                                trigger={foco.trigger}
                                onDone={() => setFoco(null)}
                            />
                        )}
                        <LayersControl position="bottomleft">
                            <LayersControl.BaseLayer checked name="Rua">
                                <TileLayer
                                    attribution=""
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Satélite">
                                <TileLayer
                                    attribution=""
                                    url="https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg"
                                />
                            </LayersControl.BaseLayer>
                                {dadosFiltrados.map((row) => {
                                    // Permite agregados aparecerem no mapa usando latitude/longitude do estado de edição, se houver
                                    const placa = row.nm_placa || row.placa;
                                    const isAgregado = Number(row.cd_tipo_veiculo) === 1;
                                    const edicao = edicoesAgregado[placa] || {};

                                    // Para agregados, prioriza latitude/longitude do estado de edição, depois do row
                                    const lat = isAgregado
                                        ? (edicao.latitude || row.nm_latitude || row.latitude)
                                        : (row.nm_latitude || row.latitude);
                                    const lng = isAgregado
                                        ? (edicao.longitude || row.nm_longitude || row.longitude)
                                        : (row.nm_longitude || row.longitude);

                                    // Corrigido: compara exatamente o valor da direção
                                    const direcaoRaw = (edicao.direcao ?? row.nm_direcao ?? row.direcao ?? '');
                                    const isVolta = direcaoRaw.trim().toLowerCase().startsWith('volta');
                                    const icon = isVolta ? truckIconsVolta : truckIconsIda;

                                    return (
                                        lat && lng && (
                                            <Marker
                                                key={placa}
                                                position={[Number(lat), Number(lng)]}
                                                icon={icon}
                                                ref={el => { if (el) markerRefs.current[placa] = el; }}
                                            >
                                                <Popup>
                                                    <b>{placa}</b><br />
                                                    {edicao.posicao ?? row.nm_poligono_atual ?? row.situacao ?? ''}<br />
                                                    {row.cd_distancia !== null && row.cd_distancia !== undefined
                                                        ? `${row.cd_distancia} km`
                                                        : row.distancia ? row.distancia : ''}<br />
                                                    Direção: {direcaoRaw}<br />
                                                    Saída: {formatarData(row.dt_saida || row.saida)}
                                                </Popup>
                                            </Marker>
                                        )
                                    );
                                })}
                        </LayersControl>
                    </MapContainer>
                </Paper>
            )}

            {/* Modal para latitude/longitude dos agregados */}
            <Modal
                open={openLatLngModal}
                onClose={handleCloseLatLngModal}
                aria-labelledby="modal-latlng"
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        boxShadow: 24,
                        p: 4,
                        minWidth: 320,
                        textAlign: 'center'
                    }}
                >
                    <Typography id="modal-latlng" variant="h6" sx={{ mb: 2 }}>
                        Definir Latitude/Longitude
                    </Typography>
                    <TextField
                        label="Latitude, Longitude"
                        placeholder="-25.66804967025807, -49.169221078109096"
                        value={latLngInput}
                        onChange={e => setLatLngInput(e.target.value)}
                        sx={{ mb: 3, width: '100%' }}
                    />
                    <div>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSalvarLatLng}
                            disabled={loadingLatLng}
                            sx={{ mr: 2 }}
                        >
                            OK
                        </Button>
                        <Button variant="outlined" onClick={handleCloseLatLngModal}>
                            Cancelar
                        </Button>
                    </div>
                </Box>
            </Modal>

            {/* Modal de confirmação de exclusão */}
            <Modal
                open={openModal}
                onClose={handleCloseModal}
                aria-labelledby="modal-confirm-delete"
                aria-describedby="modal-confirm-delete-desc"
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        boxShadow: 24,
                        p: 4,
                        minWidth: 300,
                        textAlign: 'center'
                    }}
                >
                    <Typography id="modal-confirm-delete" variant="h6" sx={{ mb: 2 }}>
                        Confirmar exclusão
                    </Typography>
                    <Typography id="modal-confirm-delete-desc" sx={{ mb: 3 }}>
                        Tem certeza que deseja remover a placa <b>{placaParaExcluir}</b>?
                    </Typography>
                    <TextField
                        label="Motivo da Exclusão"
                        placeholder="Ex: Placa inválida, veículo desativado..."
                        helperText="Digite o motivo da exclusão"
                        value={motivoExclusao}
                        onChange={e => setMotivoExclusao(e.target.value)}
                        sx={{ mb: 3, width: '100%' }}
                    />
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeletePlaca}
                        disabled={loadingDelete === placaParaExcluir}
                        sx={{ mr: 2 }}
                    >
                        Ok
                    </Button>
                    <Button variant="outlined" onClick={handleCloseModal}>
                        Cancelar
                    </Button>
                </Box>
            </Modal>

            {/* Modal de inserção de timers */}
            <Modal
                open={openTimerModal}
                onClose={handleCloseTimerModal}
                aria-labelledby="modal-change-timer"
                aria-describedby="modal-change-timer-desc"
            >
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 4,
                    minWidth: 300,
                    textAlign: 'left',
                    width: '40%'
                }}
            >
                <Typography id="modal-change-timer" variant="h5" sx={{ mb: 2 }}>
                    <b>{placaTimer}</b> (CVA {cva})
                </Typography>
                {mensagemTimestamp && (
                    <Typography variant="body2" color={mensagemTimestamp.includes('sucesso') ? 'primary' : 'error'} sx={{ ml: 2 }}>
                        {mensagemTimestamp}
                    </Typography>
                )}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 4,
                        mb: 3,
                        mt: 1,
                        alignItems: 'flex-start'
                    }}
                >
                    {/* Esquerda: Planta VW Anchieta */}
                    <Box sx={{ flex: 1 }}>
                        <Typography id="modal-change-timer" variant="h7" sx={{ mb: 2 }}>
                            Planta VW Anchieta
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                label="Chegada Planta"
                                value={ancChegadaPlanta}
                                type="datetime-local"
                                onChange={e => setAncChegadaPlanta(e.target.value)}
                                sx={{ width: '100%' }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Chegada Gate"
                                value={ancChegadaGate}
                                type="datetime-local"
                                onChange={e => setAncChegadaGate(e.target.value)}
                                sx={{ width: '100%' }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Saída Planta"
                                value={ancSaidaPlanta}
                                type="datetime-local"
                                onChange={e => {
                                    setAncSaidaPlanta(e.target.value);
                                    // Preenche automaticamente Previsão Chegada SJP com +10h
                                    if (e.target.value) {
                                        setSjpPrevisaoChegada(add10HoursToDatetimeLocal(e.target.value));
                                    } else {
                                        setSjpPrevisaoChegada('');
                                    }
                                }}
                                sx={{ width: '100%' }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Status Atendimento"
                                value={statusAtendimento}
                                onChange={e => setStatusAtendimento(e.target.value)}
                                sx={{ width: '100%' }}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                    </Box>
                    {/* Direita: Planta VW São José dos Pinhais */}
                    <Box sx={{ flex: 1 }}>
                        <Typography id="modal-change-timer" variant="h7" sx={{ mb: 2 }}>
                            Planta VW São José dos Pinhais
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                label="Previsão Chegada"
                                value={sjpPrevisaoChegada}
                                type="datetime-local"
                                onChange={e => setSjpPrevisaoChegada(e.target.value)}
                                sx={{ width: '100%' }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Chegada Planta"
                                value={sjpChegadaPlanta}
                                type="datetime-local"
                                onChange={e => setSjpChegadaPlanta(e.target.value)}
                                sx={{ width: '100%' }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Chegada Gate"
                                value={sjpChegadaGate}
                                type="datetime-local"
                                onChange={e => setSjpChegadaGate(e.target.value)}
                                sx={{ width: '100%' }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Saída Planta"
                                value={sjpSaidaPlanta}
                                type="datetime-local"
                                onChange={e => setSjpSaidaPlanta(e.target.value)}
                                sx={{ width: '100%' }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Qtde Racks"
                                value={qtdeRacks}
                                onChange={e => setQtdeRacks(e.target.value)}
                                sx={{ width: '100%' }}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveTimerModal}
                    sx={{ mr: 2 }}
                >
                    Ok
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleClearTimerModal}
                    sx={{ mr: 2 }}
                >
                    Limpar
                </Button>
                <Button variant="outlined" color="error" onClick={handleCloseTimerModal}>
                    Cancelar
                </Button>
            </Box>
            </Modal>
            <ModalAtraso
                open={openAtrasoModal}
                onClose={handleCloseAtrasoModal}
                placa={placaAtraso}
                tempoAtraso={tempoAtraso}
            />
            <ModalCarroceria
                open={openCarroceriaModal}
                onClose={handleCloseCarroceriaModal}
            />
            <div name="actionButtons" style={{ marginTop: 6 }}>
                <ExportarExcel fetchDados={fetchDadosExcel} nomeArquivo="dados_monitorados.xlsx" />
                <RelatorioPermanencia />
                <Button
                    variant="contained"
                    color="primary"
                    sx={{ ml: 2, mb: 2, mt: 2 }}
                    onClick={() => setOpenCarroceriaModal(true)}
                >
                    Carrocerias
                </Button>
            </div>
        </div>
    );
};

export default DashboardPosicoes;