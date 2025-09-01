import React, { useState, useEffect } from 'react';
import './Login.css';
import telalogin from '../../../assets/telalogin.png';
import logo4 from '../../../assets/Logo-Simples.png';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Grid, Link, TextField, Typography, InputAdornment, IconButton } from '@mui/material';
import { AccountCircle, Visibility, VisibilityOff, Key } from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const apiUrl = process.env.REACT_APP_API_URL;

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  // Estados para status dos bancos e backend
  const [statusLocal, setStatusLocal] = useState(null); // null, true, false
  const [statusExt, setStatusExt] = useState(null);
  const [statusBackend, setStatusBackend] = useState(null);

  useEffect(() => {
    // Função para checar status dos serviços
    const checkStatus = () => {
      fetch(`${apiUrl}/auth/health`)
        .then(res => setStatusBackend(res.ok))
        .catch(() => setStatusBackend(false));
      fetch(`${apiUrl}/auth/health/local`)
        .then(res => setStatusLocal(res.ok))
        .catch(() => setStatusLocal(false));
      fetch(`${apiUrl}/auth/health/ext`)
        .then(res => setStatusExt(res.ok))
        .catch(() => setStatusExt(false));
    };

    checkStatus(); // Checa ao montar

    const interval = setInterval(checkStatus, 15000); // Checa a cada 15 segundos

    return () => clearInterval(interval); // Limpa ao desmontar
  }, []);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: username, senha: password }),
      });

      if (!res.ok) {
        throw new Error('Login falhou');
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', username);
      localStorage.setItem('nome', data.nome);
      localStorage.setItem('setor', data.setor);
      localStorage.removeItem('loginTime');
      localStorage.setItem('loginTime', Date.now());

      if(data.ativo === 0 || data.ativo === '0') {
        alert('Usuário inativo. Entre em contato com o administrador.');
        return;
      }
      
      if (data.primeiroLogin === 1) {
        setIsForgotPasswordModalOpen(true);
      } else {
        navigate('/home');
      }
    } catch (error) {
      alert('Login falhou');
    }
  };

  // NOVO: Envia e-mail de recuperação
  const handleSendRecoveryEmail = async () => {
    if (!recoveryEmail) {
      alert('Digite seu e-mail.');
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch(`${apiUrl}/auth/send-recovery-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      if (res.ok) {
        alert('Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.');
        setIsForgotPasswordModalOpen(false);
        setRecoveryEmail('');
      } else {
        alert('Erro ao enviar e-mail de recuperação.');
      }
    } catch (error) {
      alert('Erro ao enviar e-mail de recuperação.');
    }
    setIsSending(false);
  };

  return (
    <>
      <Grid
        container
        sx={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
        }}
      >
        {/* Login Form Side */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            px: 4,
            backgroundColor: '#fff',
            height: '410px',
            minHeight: '410px'
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <img
              src={logo4}
              alt="Logo da empresa"
              style={{ maxWidth: '160px', marginBottom: '12px' }}
            />

            <TextField
              fullWidth
              label="Usuário"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
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

            <Box display="flex" justifyContent="space-between" alignItems="center" my={2}>
              <Link
                href="#"
                variant="body2"
                onClick={() => setIsForgotPasswordModalOpen(true)}
              >
                Primeiro Acesso / Perdi minha Senha
              </Link>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleLogin}
              sx={{
                backgroundColor: '#f37215',
                color: '#fff',
                py: 1.2,
                borderRadius: 2,
                fontWeight: 'bold',
                mt: 1,
              }}
            >
              LOGIN
            </Button>
          </Box>
        </Grid>

        {/* Image Side */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#f5f5f5',
            height: '410px',
            minHeight: '410px'
          }}
        >
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <img
              src={telalogin}
              alt="Tela de login"
              style={{ height: '100%', maxHeight: '410px', width: 'auto' }}
            />
          </Box>
        </Grid>
      </Grid>

      {/* Bolinhas de status dos bancos e backend */}
      <Box sx={{ position: 'fixed', bottom: 12, left: 0, width: '100%', display: 'flex', justifyContent: 'center', gap: 2, zIndex: 999 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip
            title={
              statusBackend === null
                ? 'Verificando...'
                : statusBackend
                ? 'Funcionando normalmente'
                : 'Não está em funcionamento'
            }
            arrow
          >
            <FiberManualRecordIcon sx={{ color: statusBackend === null ? '#bdbdbd' : statusBackend ? 'green' : 'red', fontSize: 18, cursor: 'pointer' }} />
          </Tooltip>
          <Typography sx={{ fontSize: 12 }}>Servidor</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip
            title={
              statusLocal === null
                ? 'Verificando...'
                : statusLocal
                ? 'Funcionando normalmente'
                : 'Não está em funcionamento'
            }
            arrow
          >
            <FiberManualRecordIcon sx={{ color: statusLocal === null ? '#bdbdbd' : statusLocal ? 'green' : 'red', fontSize: 18, cursor: 'pointer' }} />
          </Tooltip>
          <Typography sx={{ fontSize: 12 }}>Banco de Dados</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip
            title={
              statusExt === null
                ? 'Verificando...'
                : statusExt
                ? 'Funcionando normalmente'
                : 'Não está em funcionamento'
            }
            arrow
          >
            <FiberManualRecordIcon sx={{ color: statusExt === null ? '#bdbdbd' : statusExt ? 'green' : 'red', fontSize: 18, cursor: 'pointer' }} />
          </Tooltip>
          <Typography sx={{ fontSize: 12 }}>Nucci</Typography>
        </Box>
      </Box>

      {/* Modal para recuperação de conta */}
      {isForgotPasswordModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Mudança de Senha</h3>
            <span style={{fontSize: '14px'}}>Para continuar, informe o e-mail cadastrado para receber o link de recuperação.</span>
            <br />
            <span style={{fontSize: '10px', color: '#616161'}}>*Se você não possui e-mail cadastrado, entre em contato com o administrador.</span>
            <TextField
              fullWidth
              label="E-mail cadastrado"
              margin="normal"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              type="email"
              sx={{ mb: 2 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="text"
                onClick={handleSendRecoveryEmail}
                disabled={isSending}
                sx={{ backgroundColor: '#f37215', color: '#fff', py: 1, borderRadius: 1, padding: '14px 17px', fontSize: '12px', marginRight: '8px' }}
              >
                {isSending ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
              <Button
                variant="text"
                onClick={() => setIsForgotPasswordModalOpen(false)}
                sx={{ backgroundColor: '#f37215', color: '#fff', py: 1, borderRadius: 1, padding: '14px 17px', fontSize: '12px'}}
              >
                Cancelar
              </Button>
            </div>
            <br />
          </div>
        </div>
      )}
    </>
  );
}

export default Login;