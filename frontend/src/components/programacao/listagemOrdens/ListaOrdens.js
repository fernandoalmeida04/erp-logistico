import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar, faRoad, faLocationDot, faClock, faCrosshairs } from '@fortawesome/free-solid-svg-icons';
import { Box, Button } from '@mui/material';
import './ListaOrdens.css';

const apiUrl = process.env.REACT_APP_API_URL;

function formatDate(dateString) {
  const date = new Date(dateString);
  date.setUTCHours(date.getUTCHours() - 3);

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function calculateTimeDifference(collectTime) {
  const now = new Date();
  const collectDate = new Date(collectTime);
  collectDate.setUTCHours(collectDate.getUTCHours() - 3);

  const diffInMs = now - collectDate;
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const hours = Math.floor(diffInSeconds / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  const seconds = diffInSeconds % 60;

  const totalMinutes = hours * 60 + minutes;

  let color = '';
  if (totalMinutes > 0) {
    color = '#d40202'; // red
  } else if (totalMinutes < 0 && totalMinutes > -120) {
    color = '#fcb417'; // yellow
  } else if (totalMinutes <= -120) {
    color = '#207d30'; // green
  }

  let timeDisplay = `${hours}h ${minutes}m ${seconds}s`;
  if (hours > 24) {
    timeDisplay = '+ de 24H';
  }

  return { timeDisplay, color };
}

function ListaOrdens() {
  const [oc, setOc] = useState([]);
  const [param, setParam] = useState('');
  const [timeDifferences, setTimeDifferences] = useState([]);
  const navigate = useNavigate();

  const fetchOrdens = async () => {
    if (!param) return;
    try {
      const response = await fetch(`${apiUrl}/oc/novarota`, {
        method: 'POST',
        body: JSON.stringify({ param }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro na resposta do servidor');
      }

      const data = await response.json();
      setOc(data);
    } catch (error) {
      console.error('Erro ao buscar ordens:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (param) {
      fetchOrdens();
      const intervalId = setInterval(() => {
        if (isMounted) fetchOrdens();
      }, 60000);
      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    }
  }, [param]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeDifferences(
        oc.map((order) => calculateTimeDifference(order.dtcoleta_cot))
      );
    }, 1000);
    return () => clearInterval(intervalId);
  }, [oc]);

  const handleCardClick = (cod_col) => {
    navigate(`/coleta/${cod_col}`);
  };

  const handleGoBack = () => {
    navigate('/home');
  };

  const handleDropdownChange = (value) => {
    setParam(value);
  };

  // Nova etapa de seleção de operação (não modal)
  const renderOperacaoStep = () => (
    <Box
      sx={{
        width: '100%',
        maxWidth: 400,
        margin: '60px auto',
        bgcolor: 'background.paper',
        boxShadow: 3,
        p: 4,
        borderRadius: 2,
        textAlign: 'center',
      }}
    >
      <h2>Selecione a Operação</h2>
      <Button
        variant="contained"
        onClick={() => handleDropdownChange('psa')}
        sx={{
          backgroundColor: '#f37215',
          color: '#fff',
          py: 1.2,
          borderRadius: 2,
          fontWeight: 'bold',
          mt: 1,
          marginRight: 2,
        }}
      >
        PSA
      </Button>
      <Button
        variant="contained"
        onClick={() => handleDropdownChange('brose')}
        sx={{
          backgroundColor: '#f37215',
          color: '#fff',
          py: 1.2,
          borderRadius: 2,
          fontWeight: 'bold',
          mt: 1,
          marginRight: 2,
        }}
      >
        Brose
      </Button>
      <Button
        variant="contained"
        onClick={() => handleDropdownChange('stellantis')}
        sx={{
          backgroundColor: '#f37215',
          color: '#fff',
          py: 1.2,
          borderRadius: 2,
          fontWeight: 'bold',
          mt: 1,
          marginRight: 2,
        }}
      >
        Fiat
      </Button>
      <Button
        variant="contained"
        onClick={() => handleDropdownChange('outros')}
        sx={{
          backgroundColor: '#f37215',
          color: '#fff',
          py: 1.2,
          borderRadius: 2,
          fontWeight: 'bold',
          mt: 1,
        }}
      >
        Outros
      </Button>
      <Button
        variant="contained"
        color="primary"
        onClick={handleGoBack}
        sx={{ width: '100%', marginTop: '16px' }}
      >
        Voltar
      </Button>
    </Box>
  );

  return (
    <div className="order-container">
      {!param ? (
        renderOperacaoStep()
      ) : (
        <>
          <h1>Listagem de Ordens de Coleta</h1>
          <div className="card-container">
            {oc.map((oc, index) => {
              const { timeDisplay, color } = calculateTimeDifference(oc.dtcoleta_cot);

              return (
                <div
                  className="card"
                  key={index}
                  onClick={() => handleCardClick(oc.cod_col)}
                  style={{ backgroundColor: color }}
                >
                  <h2>Coleta #{oc.cod_col}</h2>
                  <h3>
                    <b>{oc.snome_emp.split('-')[0].trim()}</b>
                  </h3>
                  <label>
                    <FontAwesomeIcon icon={faCar} /> <b>Operação:</b> {oc.sdesc_colop}
                  </label>
                  <label>
                    <FontAwesomeIcon icon={faCar} /> <b>Veículo:</b> {oc.sdesc_ntcav}
                  </label>
                  <label>
                    <FontAwesomeIcon icon={faRoad} /> <b>Km Total:</b> 0 km
                  </label>
                  <label>
                    <FontAwesomeIcon icon={faRoad} /> <b>Rota:</b> {oc.snome_ctrtrf}
                  </label>
                  <label>
                    <FontAwesomeIcon icon={faLocationDot} /> <b>Ori/Dest:</b> {oc.sorigem_cidade_cot}/{oc.sorigem_uf_cot} - {oc.sdestino_cidade_cot}/{oc.sdestino_uf_cot}
                  </label>
                  <label>
                    <FontAwesomeIcon icon={faClock} /> <b>Data da Coleta:</b> {formatDate(oc.dtcoleta_cot)}
                  </label>
                  <label>
                    <FontAwesomeIcon icon={faCrosshairs} /> <b>Cotação:</b> #{oc.cod_cot} - {oc.ssigla_uni}
                  </label>
                </div>
              );
            })}
          </div>
          <Button
            variant="contained"
            onClick={() => handleGoBack()}
            sx={{
              backgroundColor: '#f37215',
              color: '#fff',
              py: 1.2,
              borderRadius: 2,
              fontWeight: 'bold',
              mt: 1,
              marginRight: 2,
            }}
          >
            CANCELAR
          </Button>
        </>
      )}
    </div>
  );
}

export default ListaOrdens;