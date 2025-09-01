import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Button,
    TextField,
    Typography,
    Checkbox,
    FormControlLabel,
    Grid,
    Paper
} from '@mui/material';

const apiUrl = process.env.REACT_APP_API_URL;

const Register = () => {
    const [nome, setNome] = useState('');
    const [usuario, setUsuario] = useState('');
    const [codNucci, setCodNucci] = useState('');
    const [setor, setSetor] = useState('');
    const [biList, setBiList] = useState([]);
    const [selectedBIs, setSelectedBIs] = useState([]);
    const [cpf, setCPF] = useState('');
    const [email, setEmail] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(false); // Novo estado para loading
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        fetchBIList();
        if (id) {
            fetchUserData(id);
        }
    }, [id]);
    
    const fetchBIList = async () => {
        try {
            const response = await axios.get(`${apiUrl}/bi/bi-catalog`);
            setBiList(response.data); // Populate biList with all available BIs
        } catch (error) {
            console.error('Erro ao buscar os BIs:', error);
        }
    };

    const fetchAvailableBIs = (usuario) => {
        axios.post(`${apiUrl}/bi/available-bi`, { usuario: usuario })
            .then(response => {
                const availableBIs = response.data.bis;
                const selectedBIs = availableBIs.map(bi => bi.cd_id); // Get the IDs of the checked BIs
                setSelectedBIs(selectedBIs); // Update the selectedBIs state
                setSetor(response.data.setor); // Update the setor state
            })
            .catch(error => {
                console.error('Erro ao buscar os BIs:', error);
            });
    };

    const fetchUserData = async (userId) => {
        try {
            const response = await axios.post(`${apiUrl}/auth/search`, { usuario: userId });
            const userData = response.data;
            setNome(userData.nm_nome || '');
            setEmail(userData.nm_email || '');
            setSetor(userData.nm_setor || '');
            setCodNucci(userData.cd_codnucci || '');
            setUserId(userData.cd_usuario);
            setUsuario(userData.nm_username || '');
            setCPF(userData.cd_cpf || '');
            setIsEditing(true);

            fetchAvailableBIs(userData.nm_username); // Pass the usuario value
        } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
        }
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            if (isEditing) {
                await axios.put(`${apiUrl}/auth/updateBi/${userId}`, {
                    nome, email, usuario, cpf, setor, codNucci, bIs: selectedBIs,
                });
            } else {
                await axios.post(`${apiUrl}/auth/register`, {
                    nome, email, usuario, cpf, setor, codNucci, bIs: selectedBIs,
                });
            }
            alert('Usuário atualizado com sucesso');
            navigate('/atualizar-bi');
        } catch (error) {
            alert('Erro no cadastro/atualização');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxChange = (bi) => {
        setSelectedBIs((prevSelectedBIs) =>
            prevSelectedBIs.includes(bi)
                ? prevSelectedBIs.filter((b) => b !== bi)
                : [...prevSelectedBIs, bi]
        );
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            fetchUserData(usuario);
        }
    };

    const handleBlur = () => {
        fetchUserData(usuario);
    };

    return (
        <div style={{ padding: '24px', maxWidth: '75vw' }}>
            <h1>Habilitar BI por usuário</h1>

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
                    width: '20vw',
                    '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                            borderColor: '#f37215', // Cor do outline quando focado
                        },
                    },
                    '& .MuiInputLabel-root': {
                        '&.Mui-focused': {
                            color: '#f37215', // Cor do label quando focado
                        },
                    },
                }}
            />

            <div className="bi-list" style={{ marginTop: '24px' }}>
                <Typography variant="h6" gutterBottom>
                    BIs Disponíveis
                </Typography>
                <Paper
                    elevation={3}
                    sx={{
                        maxHeight: '55vh', // Altura máxima da lista
                        overflow: 'auto', // Adiciona rolagem quando necessário
                        boxShadow: 'none'
                    }}
                >
                    <Grid container spacing={0} sx={{ marginLeft: '8px' }}>
                        {biList.map((bi) => (
                            <Grid item xs={12} sm={6} md={4} key={bi.cd_id}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={selectedBIs.includes(bi.cd_id)}
                                            onChange={() => handleCheckboxChange(bi.cd_id)}
                                            color="primary"
                                        />
                                    }
                                    label={`${bi.cd_bi} - ${bi.nm_nome}`}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            </div>

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
                    disabled={loading}
                    sx={{
                        backgroundColor: '#f37215',
                        color: '#fff',
                        py: 1.2,
                        borderRadius: 2,
                        fontWeight: 'bold',
                        mt: 1,
                    }}
                >
                    {loading
                        ? (isEditing ? 'Atualizando...' : 'Cadastrando...')
                        : (isEditing ? 'Atualizar' : 'Cadastrar')}
                </Button>
            </div>
        </div>
    );
};

export default Register;