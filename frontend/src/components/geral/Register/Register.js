import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
} from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';

const apiUrl = process.env.REACT_APP_API_URL;

const Register = () => {
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [codNucci, setCodNucci] = useState('');
  const [setor, setSetor] = useState('');
  const [cpf, setCPF] = useState('');
  const [email, setEmail] = useState('');
  const [ativo, setAtivo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [menusDisponiveis, setMenusDisponiveis] = useState([]);
  const [menusSelecionados, setMenusSelecionados] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const navigate = useNavigate();
  const { id } = useParams();

  const handleCPFChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    const formattedValue = value
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCPF(formattedValue);
  };

  // Buscar todos os menus disponíveis (com categoria)
  useEffect(() => {
    setLoadingMenus(true);
    axios
      .get(`${apiUrl}/auth/listMenus`)
      .then((res) => {
        setMenusDisponiveis(res.data); // [{ cd_menu, nm_menu, nm_categoria }]
        setLoadingMenus(false);
      })
      .catch(() => {
        setMenusDisponiveis([]);
        setLoadingMenus(false);
      });
  }, []);

  useEffect(() => {
    if (id) {
      fetchUserData(id);
    }
  }, [id]);

  const fetchUserData = async (userIdOrUsername) => {
    try {
      // Busca dados básicos do usuário
      const response = await axios.post(`${apiUrl}/auth/search`, { usuario: userIdOrUsername });
      const userData = response.data;
      setNome(userData.nm_nome || '');
      setEmail(userData.nm_email || '');
      setSetor(userData.nm_setor || '');
      setCodNucci(userData.cd_codnucci || '');
      setUserId(userData.cd_usuario);
      setUsuario(userData.nm_username || '');
      setCPF(userData.cd_cpf || '');
      setAtivo(userData.cd_ativo !== 0);
      setIsEditing(true);

      // Busca menus do usuário
      const menusUserRes = await axios.post(`${apiUrl}/auth/listMenusUser`, { usuario: userIdOrUsername });
      const menusUser = menusUserRes.data.menus || [];
      // menusUser: [{ cd_menu, nm_nome }]
      // Marcar no autocomplete os menus que ele já tem
      const selecionados = menusDisponiveis.filter(menuDisp =>
        menusUser.some(menuUser => menuUser.cd_menu === menuDisp.cd_menu)
      );
      setMenusSelecionados(selecionados);

      // Se o backend retornar setor atualizado, use:
      if (menusUserRes.data.setor) setSetor(menusUserRes.data.setor);

    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    }
  };

  const handleRegister = async () => {
    try {
      if (isEditing) {
        await axios.put(`${apiUrl}/auth/update/${userId}`, {
          nome,
          email,
          usuario,
          cpf,
          setor,
          codNucci,
          ativo
        });
        await axios.post(`${apiUrl}/auth/updateMenus/${userId}`, { menus: menusSelecionados.map(m => m.cd_menu) });
      } else {
        await axios.post(`${apiUrl}/auth/register`, {
          nome,
          email,
          usuario,
          cpf,
          setor,
          codNucci
        });
        await axios.post(`${apiUrl}/auth/updateMenus/${userId}`, { menus: menusSelecionados.map(m => m.cd_menu) });
      }
      setSnackbar({ open: true, message: 'Usuário salvo com sucesso!', severity: 'success' });
      setTimeout(() => navigate('/home'), 1200);
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro no cadastro/atualização', severity: 'error' });
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      fetchUserData(usuario);
    }
  };

  const handleBlur = () => {
    fetchUserData(usuario);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '35vw' }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <h1>{isEditing ? 'Editar Usuário' : 'Cadastrar Usuário'}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <TextField
          fullWidth
          label="Usuário"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          margin="normal"
          variant="outlined"
          sx={{
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
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
          <Switch
            checked={ativo}
            onChange={e => setAtivo(e.target.checked)}
            color="primary"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#f37215',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#f37215',
              },
            }}
          />
          <Typography variant="body2" sx={{ ml: 1 }}>
            Ativo
          </Typography>
        </div>
      </div>

      <TextField
        fullWidth
        label="Nome Completo"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        margin="normal"
        variant="outlined"
        sx={{
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
        fullWidth
        label="CPF"
        value={cpf}
        onChange={handleCPFChange}
        placeholder="CPF"
        margin="normal"
        variant="outlined"
        sx={{
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
        fullWidth
        label="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        margin="normal"
        variant="outlined"
        sx={{
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
        fullWidth
        label="Código Nucci (caso houver)"
        value={codNucci}
        onChange={(e) => setCodNucci(e.target.value)}
        margin="normal"
        variant="outlined"
        sx={{
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

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={[
            { nm_menu: '__selectAll__', nm_categoria: '' },
            ...menusDisponiveis,
          ]}
          groupBy={(option) => option.nm_categoria || 'Outros'}
          getOptionLabel={(option) =>
            option.nm_menu === '__selectAll__' ? 'Selecionar todos' : option.nm_menu
          }
          value={menusSelecionados}
          loading={loadingMenus}
          onChange={(event, newValue) => {
            if (newValue.some((v) => v.nm_menu === '__selectAll__')) {
              if (menusSelecionados.length === menusDisponiveis.length) {
                setMenusSelecionados([]);
              } else {
                setMenusSelecionados(menusDisponiveis);
              }
            } else {
              setMenusSelecionados(newValue);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Menus"
              placeholder="Selecione os menus"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingMenus ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
              sx={{
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
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) =>
              option.nm_menu !== '__selectAll__' ? (
                <Chip
                  variant="outlined"
                  label={option.nm_menu}
                  {...getTagProps({ index })}
                  sx={{ bgcolor: '#f3721510', color: '#f37215', borderColor: '#f37215' }}
                />
              ) : null
            )
          }
          renderOption={(props, option, { selected }) => {
            if (option.nm_menu === '__selectAll__') {
              return (
                <li {...props} key="select-all">
                  <Checkbox
                    checked={menusSelecionados.length === menusDisponiveis.length && menusDisponiveis.length > 0}
                    indeterminate={
                      menusSelecionados.length > 0 &&
                      menusSelecionados.length < menusDisponiveis.length
                    }
                  />
                  <ListItemText primary="Selecionar todos" />
                </li>
              );
            }
            return (
              <li {...props} key={option.nm_menu}>
                <Checkbox checked={selected} />
                <ListItemText primary={option.nm_menu} />
              </li>
            );
          }}
          filterOptions={(options, state) => {
            if (state.inputValue === '') return options;
            return options.filter(
              (option) =>
                option.nm_menu !== '__selectAll__' &&
                option.nm_menu.toLowerCase().includes(state.inputValue.toLowerCase())
            );
          }}
          sx={{ width: '100%' }}
        />
      </div>

      <FormControl fullWidth margin="normal" variant="outlined"
        sx={{
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
      >
        <InputLabel id="setor-label">Setor</InputLabel>
        <Select
          labelId="setor-label"
          value={setor}
          onChange={(e) => setSetor(e.target.value)}
          label="Setor"
        >
          <MenuItem value="" disabled>
            Selecione um setor
          </MenuItem>
          <MenuItem value="Administrador">Administrador</MenuItem>
          <MenuItem value="Desenvolvimento">Desenvolvimento</MenuItem>
          <MenuItem value="Operação">Operação</MenuItem>
          <MenuItem value="Manutenção">Manutenção</MenuItem>
          <MenuItem value="BI">BI</MenuItem>
          <MenuItem value="Monitoramento">Monitoramento</MenuItem>
        </Select>
      </FormControl>

      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          onClick={() => navigate('/home')}
          sx={{
            backgroundColor: '#f37215',
            color: '#fff',
            py: 1.2,
            borderRadius: 2,
            fontWeight: 'bold',
            mt: 1,
          }}
        >
          Voltar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleRegister}
          sx={{
            backgroundColor: '#f37215',
            color: '#fff',
            py: 1.2,
            borderRadius: 2,
            fontWeight: 'bold',
            mt: 1,
          }}
        >
          {isEditing ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </div>
  );
};

export default Register;