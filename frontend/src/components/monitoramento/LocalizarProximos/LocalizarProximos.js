import React, { useState } from 'react';
import './LocalizarProximos.css';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

const LocalizarProximos = () => {
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [veiculos, setVeiculos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');

    const buscarProximos = async () => {
        setErro('');
        setVeiculos([]);
        setLoading(true);
        try {
            const response = await axios.post(`${apiUrl}/posicoes/distanciaReferencia`, {
                latitude: Number(latitude),
                longitude: Number(longitude)
            });
            setVeiculos(response.data);
        } catch (err) {
            setErro('Erro ao buscar veículos próximos.');
        }
        setLoading(false);
    };

    return (
        <>
            <div className="dashboard-header" style={{ padding: '16px', paddingTop: '16px' }}>
                <h1>Veículos Próximos</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', width: '10%' }}
                />
                <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', width: '10%' }}
                />
                <button
                    onClick={buscarProximos}
                    disabled={!latitude || !longitude || loading}
                    style={{ padding: 8, borderRadius: 4, background: '#1976d2', color: 'white', border: 'none', fontWeight: 'bold' }}
                >
                    {loading ? 'Buscando...' : 'Buscar'}
                </button>
            </div>
            {erro && <div style={{ color: 'red', marginBottom: 8 }}>{erro}</div>}
            {veiculos.length > 0 && (
                <table style={{ width: '98%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>Placa</th>
                            <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>Latitude</th>
                            <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>Longitude</th>
                            <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>Distância (km)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {veiculos.slice(0, 10).map((v) => (
                            <tr key={v.placa}>
                                <td style={{ padding: 8 }}>{v.placa}</td>
                                <td style={{ padding: 8 }}>{v.latitude}</td>
                                <td style={{ padding: 8 }}>{v.longitude}</td>
                                <td style={{ padding: 8 }}>{v.distancia}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </>
    );
};

export default LocalizarProximos;