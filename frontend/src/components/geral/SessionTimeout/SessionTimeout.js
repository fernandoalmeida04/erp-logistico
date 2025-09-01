import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas

// Lista de usuários que NÃO expiram a sessão
const USUARIOS_ISENTOS = ['tv_bi', 'tv_patio']; // adicione aqui os logins das TVs

export default function SessionTimeout() {
const navigate = useNavigate();

useEffect(() => {
    const user = localStorage.getItem('user');
    // Se for usuário isento, não faz nada
    if (USUARIOS_ISENTOS.includes(user) || (user && user.startsWith('tv_'))) {
    return;
    }

    if (!localStorage.getItem('loginTime')) {
    localStorage.setItem('loginTime', Date.now());
    }

    const checkSession = () => {
    const loginTime = parseInt(localStorage.getItem('loginTime'), 10);
    if (isNaN(loginTime)) return;
    const now = Date.now();
    if (now - loginTime > SESSION_DURATION_MS) {
        localStorage.removeItem('token');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('user');
        localStorage.removeItem('nome');
        localStorage.removeItem('setor');
        alert('Por favor entre novamente!');
        navigate('/'); // Redireciona para login
    }
    };

    const interval = setInterval(checkSession, 30000);
    checkSession();

    return () => clearInterval(interval);
}, [navigate]);

return null;
}