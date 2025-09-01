import React, { useState, useRef, useEffect } from 'react';
import './CadastroPoligono.css';
import { MapContainer, TileLayer, FeatureGroup, LayersControl, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

// Componente auxiliar para centralizar o mapa no polígono
function FitBoundsOnPolygon({ data }) {
    const map = useMap();
    useEffect(() => {
        if (data) {
            const geoJsonLayer = new window.L.GeoJSON(data);
            map.fitBounds(geoJsonLayer.getBounds(), { maxZoom: 16 });
        }
    }, [data, map]);
    return null;
}

const CadastroPoligono = () => {
    const [nome, setNome] = useState('');
    const [tipo, setTipo] = useState(''); // Adicione este estado
    const [geoJson, setGeoJson] = useState(null);
    const [polygonId, setPolygonId] = useState('');
    const [geoJsonLoaded, setGeoJsonLoaded] = useState(null);
    const [nomeLoaded, setNomeLoaded] = useState('');
    const [polygonsList, setPolygonsList] = useState([]);
    const [fitBoundsData, setFitBoundsData] = useState(null);
    const featureGroupRef = useRef();

    // Carrega todos os polígonos ao montar o componente
    useEffect(() => {
        const fetchPolygons = async () => {
            try {
                const response = await axios.get(`${apiUrl}/poligonos/listPolygons`);
                setPolygonsList(response.data);
            } catch (error) {
                setPolygonsList([]);
                alert('Erro ao listar os polígonos.');
            }
        };
        fetchPolygons();
    }, []);

    // Limpa o FeatureGroup
    const clearFeatureGroup = () => {
        const fg = featureGroupRef.current;
        if (fg && fg._layers) {
            Object.values(fg._layers).forEach(layer => {
                if (layer.remove) layer.remove();
            });
        }
    };

    // Atualiza nome e geoJson ao carregar um polígono
    const handleCarregarPoligono = async () => {
        if (!polygonId) {
            alert('Selecione um polígono.');
            return;
        }
        try {
            const response = await axios.post(`${apiUrl}/poligonos/showPolygon`, { id: polygonId });
            if (response.data.POLIGONO) {
                setGeoJsonLoaded(response.data.POLIGONO);
                setNomeLoaded(response.data.NOME);
                setNome(response.data.NOME);
                setTipo(response.data.TIPO);
                setGeoJson(response.data.POLIGONO);

                // Limpa o FeatureGroup e adiciona o polígono carregado
                setTimeout(() => {
                    clearFeatureGroup();
                    const fg = featureGroupRef.current;
                    if (fg && response.data.POLIGONO) {
                        const layer = window.L.geoJSON(response.data.POLIGONO);
                        layer.eachLayer(l => fg.addLayer(l));
                        setFitBoundsData(response.data.POLIGONO);
                    }
                }, 100);
            } else {
                setGeoJsonLoaded(null);
                setNomeLoaded('');
                setNome('');
                setTipo('');
                setGeoJson(null);
                clearFeatureGroup();
                setFitBoundsData(null);
                alert('Polígono não encontrado.');
            }
        } catch (error) {
            setGeoJsonLoaded(null);
            setNomeLoaded('');
            setNome('');
            setTipo('');
            setGeoJson(null);
            clearFeatureGroup();
            setFitBoundsData(null);
            alert(
                error.response?.data?.error ||
                'Erro ao carregar o polígono.'
            );
        }
    };

    // Atualiza o polígono selecionado
    const handleAtualizar = async () => {
        if (!polygonId || !nome || !geoJson || !tipo) {
            alert('Selecione um polígono, edite o nome e desenhe o polígono.');
            return;
        }
        try {
            const response = await axios.post(`${apiUrl}/poligonos/updatePolygon`, {
                id: polygonId,
                nome,
                tipo,
                geoJson
            });
            alert(response.data.message || 'Polígono atualizado com sucesso!');
            // Atualiza lista após edição
            const listResp = await axios.get(`${apiUrl}/poligonos/listPolygons`);
            setPolygonsList(listResp.data);
        } catch (error) {
            alert(
                error.response?.data?.error ||
                'Erro ao atualizar o polígono.'
            );
        }
    };

    // Deleta o polígono selecionado
    const handleDeletar = async () => {
        if (!polygonId) {
            alert('Selecione um polígono.');
            return;
        }
        if (!window.confirm('Tem certeza que deseja deletar este polígono?')) return;
        try {
            const response = await axios.post(`${apiUrl}/poligonos/deletePolygon`, { id: polygonId });
            alert(response.data.message || 'Polígono deletado com sucesso!');
            setPolygonId('');
            setGeoJsonLoaded(null);
            setNomeLoaded('');
            setNome('');
            setTipo('');
            setGeoJson(null);
            clearFeatureGroup();
            setFitBoundsData(null);
            // Atualiza lista após exclusão
            const listResp = await axios.get(`${apiUrl}/poligonos/listPolygons`);
            setPolygonsList(listResp.data);
        } catch (error) {
            alert(
                error.response?.data?.error ||
                'Erro ao deletar o polígono.'
            );
        }
    };

    // Ao desenhar ou editar, atualiza o geoJson
    const handleCreated = (e) => {
        const layer = e.layer;
        const geojson = layer.toGeoJSON();
        setGeoJson(geojson);
    };

    const handleEdited = (e) => {
        const layers = e.layers;
        layers.eachLayer(layer => {
            const geojson = layer.toGeoJSON();
            setGeoJson(geojson);
        });
    };

    const handleDeleted = () => {
        setGeoJson(null);
    };

    // Salva novo polígono
    const handleSalvar = async () => {
        if (!nome || !geoJson) {
            alert('Digite o nome e desenhe o polígono no mapa.');
            return;
        }
        try {
            const response = await axios.post(`${apiUrl}/poligonos/savePolygon`, {
                nome,
                tipo,
                geoJson
            });
            alert(response.data.message || 'Polígono salvo com sucesso!');
            setNome('');
            setTipo('');
            setGeoJson(null);
            clearFeatureGroup();
            setFitBoundsData(null);
            // Atualiza lista após salvar
            const listResp = await axios.get(`${apiUrl}/poligonos/listPolygons`);
            setPolygonsList(listResp.data);
        } catch (error) {
            alert(
                error.response?.data?.error ||
                'Erro ao salvar o polígono.'
            );
        }
    };

    return (
        <>
            <div className="dashboard-header" style={{ padding: '16px', paddingTop: '16px' }}>
                <h1>Cadastro, Edição e Exclusão de Polígonos</h1>
            </div>
            <div style={{ margin: 16 }}>
                <select
                    value={polygonId}
                    onChange={e => setPolygonId(e.target.value)}
                    style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', width: 220, marginRight: 8 }}
                >
                    <option value="">Selecione um polígono...</option>
                    {polygonsList.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                </select>
                <button
                    onClick={handleCarregarPoligono}
                    style={{ padding: 8, borderRadius: 4, background: '#388e3c', color: 'white', border: 'none', fontWeight: 'bold', marginRight: 8 }}
                >
                    Carregar
                </button>
                <button
                    onClick={handleAtualizar}
                    disabled={!polygonId}
                    style={{ padding: 8, borderRadius: 4, background: '#1976d2', color: 'white', border: 'none', fontWeight: 'bold', marginRight: 8 }}
                >
                    Atualizar
                </button>
                <button
                    onClick={handleDeletar}
                    disabled={!polygonId}
                    style={{ padding: 8, borderRadius: 4, background: '#d32f2f', color: 'white', border: 'none', fontWeight: 'bold' }}
                >
                    Deletar
                </button>
                {nomeLoaded && (
                    <span style={{ marginLeft: 16, fontWeight: 'bold' }}>Polígono carregado: {nomeLoaded}</span>
                )}
            </div>
            <div style={{ margin: 16 }}>
                <input
                    type="text"
                    placeholder="Nome do polígono"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', width: 300, marginBottom: 12 }}
                />
                <select
                    value={tipo}
                    onChange={e => setTipo(e.target.value)}
                    style={{ marginLeft: 12, padding: 8, borderRadius: 4, border: '1px solid #ccc', width: 120, marginBottom: 12 }}
                >
                    <option value="">Tipo</option>
                    <option value="Empresa">Empresa</option>
                    <option value="Setor">Setor</option>
                    <option value="Posto">Posto</option>
                </select>
                <button
                    onClick={handleSalvar}
                    style={{ marginLeft: 12, padding: 8, borderRadius: 4, background: '#388e3c', color: 'white', border: 'none', fontWeight: 'bold' }}
                >
                    Salvar novo
                </button>
            </div>
            <div style={{ height: 700, margin: 16 }}>
                <MapContainer center={[-23.55, -46.63]} zoom={12} style={{ height: '100%', width: '90%' }}>
                    <LayersControl position="bottomleft">
                        <LayersControl.BaseLayer checked name="Rua">
                            <TileLayer
                                attribution=''
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satélite">
                            <TileLayer
                                attribution=''
                                url="https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg"
                            />
                        </LayersControl.BaseLayer>
                        <FeatureGroup ref={featureGroupRef}>
                            <EditControl
                                position="topright"
                                onCreated={handleCreated}
                                onEdited={handleEdited}
                                onDeleted={handleDeleted}
                                draw={{
                                    rectangle: true,
                                    circle: true,
                                    marker: true,
                                    polyline: true,
                                    circlemarker: true,
                                    polygon: {
                                        allowIntersection: true,
                                        showArea: true,
                                        drawError: { color: '#e1e100', message: 'Polígono inválido!' },
                                        shapeOptions: { color: '#1976d2' }
                                    }
                                }}
                            />
                        </FeatureGroup>
                        {fitBoundsData && <FitBoundsOnPolygon data={fitBoundsData} />}
                    </LayersControl>
                </MapContainer>
            </div>
        </>
    );
};

export default CadastroPoligono;