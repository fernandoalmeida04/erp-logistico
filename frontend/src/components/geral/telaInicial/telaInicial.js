import React, { useEffect, useState } from 'react';
import './telaInicial.css';

const Home = () => {
    const [nome, setNome] = useState('');

    useEffect(() => {
        // Obtém o valor de 'nome' do localStorage
        const nomeUsuario = localStorage.getItem('nome');
        if (nomeUsuario) {
            // Pega apenas o primeiro nome
            const primeiroNome = nomeUsuario.split(' ')[0];
            setNome(primeiroNome);
        }
    }, []);

    return (
        <>
            <h1>Olá, {nome ? nome.charAt(0).toUpperCase() + nome.slice(1) : 'Usuário'}</h1>
        </>
    );
};

export default Home;