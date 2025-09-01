import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import Sidebar from './components/geral/sidebar/sidebar';
import SessionTimeout from './components/geral/SessionTimeout/SessionTimeout';

import Dashboard from './components/manutencao/dashboard/dashboard';
import DashboardOS from './components/manutencao/dashboard-os/dashboard-os';
import DashboardOSTV from './components/manutencao/dashboard-os-tv/dashboard-os-tv';
import CadastroChecklist from './components/manutencao/CadastroChecklist/CadastroChecklist';
import ChecklistDesktop from './components/manutencao/ChecklistDesktop/ChecklistDesktop';

import AprovacaoAbastecimento from './components/abastecimento/AprovacaoAbastecimento/AprovacaoAbastecimento';

import ChecklistEntrada from './components/seguranca/ChecklistEntrada/ChecklistEntrada';
import DashboardEntradas from './components/seguranca/DashboardEntradas/DashboardEntradas';

import DashboardPosicoes from './components/monitoramento/DashboardPosicoes/DashboardPosicoes';
import LocalizarProximos from './components/monitoramento/LocalizarProximos/LocalizarProximos';
import CadastroPoligono from './components/monitoramento/CadastroPoligono/CadastroPoligono';

import Login from './components/geral/Login/Login';
import Home from './components/geral/telaInicial/telaInicial';
import Register from './components/geral/Register/Register';
import RedefinirSenha from './components/geral/RedefinirSenha/RedefinirSenha';
import CadastroMenu from './components/geral/CadastroMenu/CadastroMenu';

import AtualizeBI from './components/encapsulamentoBI/cadastrarRegistro/cadastrarRegistro';
import RegisterBI from './components/encapsulamentoBI/RegisterReport/RegisterReport';
import ListBi from './components/encapsulamentoBI/BiSelection/BiSelection';
import ViewBi from './components/encapsulamentoBI/ViewBi/ViewBi';

import ViewOrder from './components/programacao/listagemOrdens/ListaOrdens';
import OC from './components/programacao/ordemColeta/ordemColeta';

import Lojinha from './components/design/lojinha/lojinha';
import Playground from './components/design/playground/playground';

import SolicitacaoAbastecimento from './components/abastecimento/SolicitacaoAbastecimento/SolicitacaoAbastecimento';

const apiUrl = process.env.REACT_APP_API_URL;

// Contexto e hook para menus permitidos
export const AllowedMenusContext = createContext([]);
export const useAllowedMenus = () => useContext(AllowedMenusContext);

// ProtectedRoute que verifica permissão pelo banco (menus permitidos) e respeita a ordem do banco
const ProtectedRoute = ({ children }) => {
    const allowedMenus = useAllowedMenus();
    const location = useLocation();
    const currentPath = location.pathname;

    // Permite acesso se o path está na lista de menus permitidos
    // Respeita a ordem do banco de dados (menus já vêm ordenados)
    const hasAccess = allowedMenus.some(menu => menu.nm_url === currentPath);

    if (!hasAccess) {
        return (
            <div style={{ padding: 32, color: '#f37215', fontWeight: 'bold', fontSize: 22 }}>
                Acesso negado: você não tem permissão para acessar esta página.
            </div>
        );
    }

    return children;
};

const App = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [allowedMenus, setAllowedMenus] = useState([]);
    const location = useLocation();

    const isLoginPage = location.pathname === '/' || location.pathname === '/dashboard-os-tv';

    // Busca menus permitidos do usuário ao iniciar o app
    useEffect(() => {
        const fetchMenus = async () => {
            try {
                const user = localStorage.getItem('user');
                const response = await fetch(`${apiUrl}/auth/listMenusUser`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario: user }),
                });
                const data = await response.json();
                setAllowedMenus(data.menus || []);
            } catch (err) {
                setAllowedMenus([]);
            }
        };
        fetchMenus();
    }, [location.pathname]);

    return (
        <AllowedMenusContext.Provider value={allowedMenus}>
            <div style={{ display: 'flex', marginLeft: isLoginPage ? '0px' : '80px' }}>
                {/* <SessionTimeout /> */}
                {!isLoginPage && (
                    <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                )}
                <div
                    style={{
                        marginLeft: isLoginPage ? '0px' : isSidebarOpen ? '210px' : '0px',
                        transition: 'margin-left 0.3s ease',
                        width: '100%',
                    }}
                >
                    <Routes>
                        <Route path="/" element={<Login />} />
                        <Route path="/home" element={<Home />} />
                        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                        <Route path="/menus" element={<CadastroMenu />} />

                        <Route path="/dashboard-entrada" element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        } />

                        <Route path="/entrada" element={
                            <ProtectedRoute>
                                <ChecklistEntrada />
                            </ProtectedRoute>
                        } />

                        <Route path="/lojinha" element={
                            <ProtectedRoute>
                                <Lojinha />
                            </ProtectedRoute>
                        } />

                        <Route path="/playground" element={
                            <ProtectedRoute>
                                <Playground />
                            </ProtectedRoute>
                        } />

                        <Route path="/dash-entradas" element={
                            <ProtectedRoute>
                                <DashboardEntradas />
                            </ProtectedRoute>
                        } />

                        <Route path="/dashboard-os" element={
                            <ProtectedRoute>
                                <DashboardOS />
                            </ProtectedRoute>
                        } />

                        <Route path="/etapa-checklist" element={
                            <ProtectedRoute>
                                <CadastroChecklist />
                            </ProtectedRoute>
                        } />

                        <Route path="/checklist-desk" element={
                            <ProtectedRoute>
                                <ChecklistDesktop />
                            </ProtectedRoute>
                        } />

                        <Route path="/dashboard-os-tv" element={<DashboardOSTV />} />

                        <Route path="/dashboard-posicoes" element={
                            <ProtectedRoute>
                                <DashboardPosicoes />
                            </ProtectedRoute>
                        } />

                        <Route path="/localizar-proximos" element={
                            <ProtectedRoute>
                                <LocalizarProximos />
                            </ProtectedRoute>
                        } />

                        <Route path="/poligonos" element={
                            <ProtectedRoute>
                                <CadastroPoligono />
                            </ProtectedRoute>
                        } />

                        <Route path="/registrar" element={
                            <ProtectedRoute>
                                <Register />
                            </ProtectedRoute>
                        } />

                        <Route path="/atualizar-bi" element={
                            <ProtectedRoute>
                                <AtualizeBI />
                            </ProtectedRoute>
                        } />

                        <Route path="/registrar-bi" element={
                            <ProtectedRoute>
                                <RegisterBI />
                            </ProtectedRoute>
                        } />

                        <Route path="/listar-bi" element={
                            <ProtectedRoute>
                                <ListBi />
                            </ProtectedRoute>
                        } />

                        <Route path="/view-bi/:biId" element={<ViewBi />} />

                        <Route path="/coleta/programar" element={
                            <ProtectedRoute>
                                <ViewOrder />
                            </ProtectedRoute>
                        } />
                        <Route path="/coleta/:cod_col" element={<OC />} />

                        <Route path="/abastecimentos" element={
                            <ProtectedRoute>
                                <SolicitacaoAbastecimento />
                            </ProtectedRoute>
                        } />

                        <Route path="/aprovacao-abastecimento" element={
                            <ProtectedRoute>
                                <AprovacaoAbastecimento />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </div>
            </div>
        </AllowedMenusContext.Provider>
    );
};

const AppWrapper = () => (
    <Router>
        <App />
    </Router>
);

export default AppWrapper;