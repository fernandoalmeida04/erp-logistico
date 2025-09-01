import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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

const RegisterMenu = () => {
    const [nmMenu, setNmMenu] = useState('');
    const [nmCategoria, setNmCategoria] = useState('');
    const [nmUrl, setNmUrl] = useState('');
    const [loading, setLoading] = useState(false); // Novo estado para loading
    const navigate = useNavigate();

    const handleRegister = async () => {
        setLoading(true);
        const userName = localStorage.getItem('user');
        try {
                await axios.post(`${apiUrl}/auth/registerMenu`, {
                    nmMenu, nmCategoria, nmUrl, userName
                });
            alert('Menu cadastrado com sucesso');
        } catch (error) {
            alert('Erro no cadastro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '75vw' }}>
            <h1>Registrar Menu</h1>

            <TextField
                fullWidth
                label="Menu"
                value={nmMenu}
                onChange={(e) => setNmMenu(e.target.value)}
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

            <TextField
                fullWidth
                label="Categoria"
                value={nmCategoria}
                onChange={(e) => setNmCategoria(e.target.value)}
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

            <TextField
                fullWidth
                label="URL"
                value={nmUrl}
                onChange={(e) => setNmUrl(e.target.value)}
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
                        ? ('Cadastrando...')
                        : ('Cadastrar')}
                </Button>
            </div>
        </div>
    );
};

export default RegisterMenu;