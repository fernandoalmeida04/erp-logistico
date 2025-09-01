import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
} from '@mui/material';

const apiUrl = process.env.REACT_APP_API_URL;

const BiSelection = () => {
  const navigate = useNavigate();
  const [biList, setBiList] = useState([]);
  const [selectedBi, setSelectedBi] = useState('');
  const [user, setUser] = useState('');
  const [userSector, setUserSector] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedUser = localStorage.getItem('user');
    if (loggedUser) {
      setUser(loggedUser);
      axios
        .post(`${apiUrl}/bi/available-bi`, { usuario: loggedUser })
        .then((response) => {
          setBiList(response.data.bis);
          setUserSector(response.data.setor);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Erro ao buscar os BIs:', error);
          setLoading(false);
        });
    }
  }, []);

  const handleSelectionChange = (event) => {
    setSelectedBi(event.target.value);
  };

  const handleViewBi = () => {
    if (selectedBi) {
      navigate(`/view-bi/${selectedBi}`);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: '500px',
        padding: '24px',
        borderRadius: 2,
      }}
    >
      <h1>Seleção de BI</h1>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'start', marginTop: '24px' }}>
          <CircularProgress />
        </Box>
      ) : biList.length > 0 ? (
        <>
          <FormControl fullWidth margin="normal">
            <InputLabel id="bi-select-label">Selecione um BI</InputLabel>
            <Select
              labelId="bi-select-label"
              value={selectedBi}
              onChange={handleSelectionChange}
              variant="outlined"
            >
              <MenuItem value="" disabled>
                Selecione um BI
              </MenuItem>
              {biList.map((bi) => (
                <MenuItem key={bi.cd_id} value={bi.cd_id}>
                  {bi.nm_nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleViewBi}
            disabled={!selectedBi}
            sx={{
              backgroundColor: '#f37215',
              '&:hover': { backgroundColor: '#e66c00' },
              marginTop: '16px',
            }}
          >
            Visualizar
          </Button>
        </>
      ) : (
        <Typography textAlign="center" color="textSecondary">
          Nenhum BI disponível.
        </Typography>
      )}
    </Box>
  );
};

export default BiSelection;