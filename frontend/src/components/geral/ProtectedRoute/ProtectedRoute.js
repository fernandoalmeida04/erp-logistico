import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';

const ProtectedRoute = ({ allowedSectors, children }) => {
    const setor = localStorage.getItem('setor'); // Obtém o setor do usuário do localStorage
    const location = useLocation();

    // Verifica se o setor do usuário está na lista de setores permitidos
    if (!allowedSectors.includes(setor)) {
        return (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>Você não tem autorização para ver essa página</h1>
                <Link to="/home">
                    <button
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        Voltar para Home
                    </button>
                </Link>
            </div>
        );
    }

    // Renderiza o componente filho se o setor for permitido
    return children;
};

export default ProtectedRoute;