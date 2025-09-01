import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff, Key } from '@mui/icons-material';

const apiUrl = process.env.REACT_APP_API_URL;

function RedefinirSenha() {
    const [searchParams] = useSearchParams();
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [mensagem, setMensagem] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const token = searchParams.get('token');
    const email = searchParams.get('email'); // Captura o e-mail da URL

    const handleTogglePassword = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!novaSenha || !confirmarSenha) {
            setMensagem('Preencha todos os campos.');
            return;
        }
        if (novaSenha !== confirmarSenha) {
            setMensagem('As senhas não coincidem.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/auth/changePassword`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, novaSenha, email }), // Envia o e-mail junto
            });
            if (res.ok) {
                setMensagem('Senha redefinida com sucesso! Você pode fazer login.');
                setTimeout(() => navigate('/'), 2000);
            } else {
                const data = await res.json();
                setMensagem(data.error || 'Erro ao redefinir senha.');
            }
        } catch {
            setMensagem('Erro ao redefinir senha.');
        }
        setLoading(false);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
            }}
        >
            <Box
                sx={{
                    background: '#fff',
                    p: 4,
                    minWidth: 200,
                }}
            >
                <Typography variant="h5" mb={2}>Redefinir Senha</Typography>
                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Nova Senha"
                        type={showPassword ? 'text' : 'password'}
                        margin="normal"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Key />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={handleTogglePassword}>
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Confirmar nova senha"
                        type={showPassword ? 'text' : 'password'}
                        margin="normal"
                        value={confirmarSenha}
                        onChange={e => setConfirmarSenha(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Key />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={handleTogglePassword}>
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 2 }}
                        disabled={loading}
                    >
                        {loading ? 'Redefinindo...' : 'Redefinir Senha'}
                    </Button>
                </form>
                {mensagem && (
                    <Typography color={mensagem.includes('sucesso') ? 'primary' : 'error'} mt={2}>
                        {mensagem}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}

export default RedefinirSenha;