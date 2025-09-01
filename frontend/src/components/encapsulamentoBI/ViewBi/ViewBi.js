import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { PowerBIEmbed } from 'powerbi-client-react';
import { models } from 'powerbi-client';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import './ViewBi.css';

const apiUrl = process.env.REACT_APP_API_URL;

const ViewBi = () => {
  const { biId } = useParams();
  const [biData, setBiData] = useState(null);
  const [embedConfig, setEmbedConfig] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const reportContainerRef = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      setIsAuthorized(false);
      return;
    }

    const fetchBiDetailsAndToken = async () => {
      try {
        const biResponse = await axios.get(`${apiUrl}/bi/bi-catalog/${biId}`);
        setBiData(biResponse.data);

        const { nm_embed: reportId, nm_grupo: groupId } = biResponse.data;

        const tokenResponse = await axios.post(`${apiUrl}/bi/generate-embed-token`, {
          reportId,
          groupId,
        });

        const embedToken = tokenResponse.data.embedToken;

        setEmbedConfig({
          type: 'report',
          id: reportId,
          embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${groupId}`,
          accessToken: embedToken,
          tokenType: models.TokenType.Embed,
          settings: {
            panes: {
              bookmarks: { visible: false },
              fields: { expanded: false },
              filters: { expanded: false, visible: false },
              pageNavigation: { visible: true },
              selection: { visible: false },
              syncSlicers: { visible: false },
              visualizations: { expanded: false },
            },
            layoutType: models.LayoutType.Custom,
            zoomLevel: zoomLevel,
          },
        });
      } catch (error) {
        console.error('Erro ao buscar o BI e gerar token:', error);
      }
    };

    fetchBiDetailsAndToken();
  }, [biId, zoomLevel]);

  useEffect(() => {
    const onFullScreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
    };
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  const handleGoBack = () => {
    navigate('/listar-bi');
  };

  const handleZoomChange = (e) => {
    const zoom = parseFloat(e.target.value);
    setZoomLevel(zoom);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(2, +(prev + 0.1).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.5, +(prev - 0.1).toFixed(2)));
  };

  const handleFullScreen = () => {
    const elem = reportContainerRef.current;
    if (!elem) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      elem.requestFullscreen();
    }
  };

  if (!isAuthorized) {
    return <p>Usuário não autorizado</p>;
  }

  return (
    <div className="header-Content">
      <h1>Exibindo BI: {biData?.nm_nome || ''}</h1>
    <div className="controls">
      <div className="zoom-slider" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label htmlFor="zoom">Zoom:</label>
        <Button
          variant="outlined"
          size="small"
          onClick={handleZoomOut}
          sx={{ minWidth: 32, padding: 0, backgroundColor: '#ff0000', color: '#fff' }}
          title="Diminuir zoom"
        >
          <RemoveIcon />
        </Button>
        <input
          id="zoom"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={zoomLevel}
          onChange={handleZoomChange}
          style={{ width: 100 }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleZoomIn}
          sx={{ minWidth: 32, padding: 0, backgroundColor: '#008000', color: '#fff' }}
          title="Aumentar zoom"
        >
          <AddIcon />
        </Button>
        <span>{(zoomLevel * 100).toFixed(0)}%</span>
        <Button
          variant="contained"
          color="primary"
          onClick={handleFullScreen}
          sx={{
            backgroundColor: '#1976d2',
            minWidth: 40,
            padding: '6px 12px',
            fontWeight: 'bold',
            fontSize: 14,
            marginLeft: 2,
            '&:hover': { backgroundColor: '#115293' },
          }}
          title="Tela cheia"
        >
          ⛶
        </Button>
      </div>
      <Button
        variant="contained"
        color="primary"
        onClick={handleGoBack}
        sx={{
          backgroundColor: '#f37215',
          '&:hover': { backgroundColor: '#e66c00' },
        }}
      >
        Voltar
      </Button>
    </div>
      <div ref={reportContainerRef}>
        {embedConfig ? (
          <PowerBIEmbed
            embedConfig={embedConfig}
            cssClassName={`report-container${isFullscreen ? ' fullscreen' : ''}`}
            error={(error) => console.error('Erro ao carregar relatório:', error)}
            pageView={(event) => console.log('Evento de visualização:', event)}
          />
        ) : (
          <p>Carregando BI...</p>
        )}
      </div>
    </div>
  );
};

export default ViewBi;