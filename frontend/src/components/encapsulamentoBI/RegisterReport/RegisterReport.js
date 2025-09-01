import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Box } from '@mui/material';

const apiUrl = process.env.REACT_APP_API_URL;

const RegisterReport = () => {
    const [nome, setNome] = useState('');
    const [codReport, setCodReport] = useState('');
    const [codGroup, setCodGroup] = useState('');
    const [codBi, setCodBi] = useState('');
    const navigate = useNavigate();

    const handleRegister = async () => {
        try {
            await axios.post(`${apiUrl}/auth/register-report`, { 
                nome, codReport, codGroup, codBi
            });
            navigate('/bi-selection');
        } catch (error) {
            alert('Erro no cadastro/atualização');
        }
    };

    return (
        <Box 
            className="register-container"
            sx={{
                maxWidth: '500px',
                padding: '24px',
                borderRadius: 2,
            }}
        >
            <h1>Cadastrar Relatório</h1>
            <TextField
                fullWidth
                label="Nome do Relatório"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                margin="normal"
                variant="outlined"
                sx={{
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
                label="Cód. Grupo"
                value={codGroup}
                onChange={(e) => setCodGroup(e.target.value)}
                margin="normal"
                variant="outlined"
                sx={{
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
                label="Cód. Relatório"
                value={codReport}
                onChange={(e) => setCodReport(e.target.value)}
                margin="normal"
                variant="outlined"
                sx={{
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
                label="Cód. BI"
                value={codBi}
                onChange={(e) => setCodBi(e.target.value)}
                margin="normal"
                variant="outlined"
                sx={{
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
            <Box 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginTop: '24px' 
                }}
            >
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/home')}
                    sx={{
                        backgroundColor: '#f37215',
                        '&:hover': { backgroundColor: '#e66c00' },
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
                        '&:hover': { backgroundColor: '#e66c00' },
                    }}
                >
                    Cadastrar
                </Button>
            </Box>
        </Box>
    );
};

export default RegisterReport;