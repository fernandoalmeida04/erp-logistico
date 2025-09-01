import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './sidebar.css';
import logo4 from '../../../assets/Logo-Alt.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretUp } from '@fortawesome/free-solid-svg-icons';
import { Box, Button, Grid, TextField, Typography, InputAdornment, IconButton } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import packageJson from '../../../../package.json';

const apiUrl = process.env.REACT_APP_API_URL;

const Sidebar = ({ isOpen, setIsOpen }) => {
    const [menus, setMenus] = useState([]);
    const [dropdowns, setDropdowns] = useState({});
    const [loading, setLoading] = useState(true);
    const version = packageJson.version;
    const buildDate = process.env.REACT_APP_BUILD_DATE || 'Data não disponível';
    const location = useLocation();

      // Estados para status dos bancos e backend
      const [statusLocal, setStatusLocal] = useState(null); // null, true, false
      const [statusExt, setStatusExt] = useState(null);
      const [statusBackend, setStatusBackend] = useState(null);

    //   useEffect(() => {
    //     // Função para checar status dos serviços
    //     const checkStatus = () => {
    //       fetch(`${apiUrl}/auth/health`)
    //         .then(res => setStatusBackend(res.ok))
    //         .catch(() => setStatusBackend(false));
    //       fetch(`${apiUrl}/auth/health/local`)
    //         .then(res => setStatusLocal(res.ok))
    //         .catch(() => setStatusLocal(false));
    //       fetch(`${apiUrl}/auth/health/ext`)
    //         .then(res => setStatusExt(res.ok))
    //         .catch(() => setStatusExt(false));
    //     };
    
    //     checkStatus(); // Checa ao montar
    
    //     const interval = setInterval(checkStatus, 15000); // Checa a cada 15 segundos
    
    //     return () => clearInterval(interval); // Limpa ao desmontar
    //   }, []);

    useEffect(() => {
        const fetchMenus = async () => {
            setLoading(true);
            try {
                const user = localStorage.getItem('user');
                const response = await fetch(`${apiUrl}/auth/listMenusUser`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario: user }),
                });
                const data = await response.json();
                // Agrupa menus por categoria
                const grouped = {};
                (data.menus || []).forEach(menu => {
                    if (!grouped[menu.nm_categoria]) grouped[menu.nm_categoria] = [];
                    grouped[menu.nm_categoria].push(menu);
                });
                setMenus(grouped);

                // Inicializa dropdowns abertos para todas as categorias
                const initialDropdowns = {};
                Object.keys(grouped).forEach(cat => {
                    initialDropdowns[cat] = false;
                });
                setDropdowns(initialDropdowns);
            } catch (err) {
                setMenus({});
            }
            setLoading(false);
        };
        fetchMenus();
    }, []);

    const toggleDropdown = (categoria) => {
        setDropdowns((prev) => ({
            ...prev,
            [categoria]: !prev[categoria],
        }));
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <button
                className="toggle-button"
                onClick={() => setIsOpen((prev) => !prev)}
            >
                {isOpen ? '<' : '>'}
            </button>
            {isOpen && (
                <>
                    <Link to="/home">
                        <img
                            src={logo4}
                            alt="Logo da empresa"
                            style={{ maxWidth: '120px', marginBottom: '12px' }}
                        />
                    </Link>
                    {loading ? (
                        <div style={{ color: '#fff', margin: '16px' }}>Carregando menus...</div>
                    ) : (
                        Object.keys(menus).map((categoria) => (
                            <div key={categoria} name={categoria}>
                                <h2
                                    className="titulo-lateral"
                                    onClick={() => toggleDropdown(categoria)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span className="highlight">|</span> {categoria}{' '}
                                    {dropdowns[categoria] ? (
                                        <FontAwesomeIcon icon={faCaretUp} />
                                    ) : (
                                        <FontAwesomeIcon icon={faCaretDown} />
                                    )}
                                </h2>
                                {dropdowns[categoria] && (
                                    <ul>
                                        {menus[categoria].map((menu) => (
                                            <li key={menu.cd_menu}>
                                                <Link
                                                    to={menu.nm_url || '/'}
                                                    className={
                                                        location.pathname === (menu.nm_url || '/')
                                                            ? 'active'
                                                            : ''
                                                    }
                                                >
                                                    {menu.nm_nome}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))
                    )}
                <footer
                    className="custom-footer"
                    style={{ marginTop: 'auto', padding: '15px', textAlign: 'center' }}
                >
                    <Box sx={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 2,
                        zIndex: 999,
                        flexDirection: 'row',
                        background: 'transparent',
                        mb: 1
                    }}>
                        <Tooltip
                            title={
                                <span>
                                    Servidor - {statusBackend === null
                                        ? 'Verificando...'
                                        : statusBackend
                                        ? 'Funcionando normalmente'
                                        : 'Não está em funcionamento'}
                                </span>
                            }
                            arrow
                        >
                            <FiberManualRecordIcon sx={{ color: statusBackend === null ? '#bdbdbd' : statusBackend ? 'green' : 'red', fontSize: 18, cursor: 'pointer' }} />
                        </Tooltip>
                        <Tooltip
                            title={
                                <span>
                                    Banco de Dados - {statusLocal === null
                                        ? 'Verificando...'
                                        : statusLocal
                                        ? 'Funcionando normalmente'
                                        : 'Não está em funcionamento'}
                                </span>
                            }
                            arrow
                        >
                            <FiberManualRecordIcon sx={{ color: statusLocal === null ? '#bdbdbd' : statusLocal ? 'green' : 'red', fontSize: 18, cursor: 'pointer' }} />
                        </Tooltip>
                        <Tooltip
                            title={
                                <span>
                                    Nucci - {statusExt === null
                                        ? 'Verificando...'
                                        : statusExt
                                        ? 'Funcionando normalmente'
                                        : 'Não está em funcionamento'}
                                </span>
                            }
                            arrow
                        >
                            <FiberManualRecordIcon sx={{ color: statusExt === null ? '#bdbdbd' : statusExt ? 'green' : 'red', fontSize: 18, cursor: 'pointer' }} />
                        </Tooltip>
                    </Box>
                    <span>
                        v{version} - {buildDate}
                    </span>
                </footer>
                </>
            )}
        </div>
    );
};

export default Sidebar;