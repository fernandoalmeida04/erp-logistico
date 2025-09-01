import React, { useState } from 'react';
import './ModalNovaEntrada.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

const ModalNovaEntrada = () => {
    const [formData, setFormData] = useState({
        placa1: '',
        placa2: '',
        placa3: '',
        motorista: '',
        vehicle: '',
    });

    const [successMessage, setSuccessMessage] = useState(''); // Estado para a mensagem de sucesso
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const fetchVehicleDetails = async () => {
        try {
            const response = await fetch(`${apiUrl}/vehicleDetails/vehicleDetails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    placa: formData.placa1,
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar o veículo.');
            }

            const data = await response.json();

            if (data.length > 0) {
                setFormData({
                    ...formData,
                    placa2: data[0].splacacarreta_mot,
                    placa3: data[0].splacacarreta2_mot,
                    motorista: data[0].snome_mot,
                });
            } else {
                alert('Nenhum veículo encontrado para a placa informada.');
            }
        } catch (error) {
            console.error('Erro ao buscar os detalhes do veículo:', error);
            alert('Erro ao buscar os detalhes do veículo.');
        }
    };

    const handleKeyDown = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita o comportamento padrão do Enter
            await fetchVehicleDetails();
        }
    };

    const handleBlur = async () => {
        await fetchVehicleDetails();
    };

    const handleRegister = async () => {
        try {
            await axios.post(`${apiUrl}/entrada/register-entrance`, {
                placa1: formData.placa1,
                placa2: formData.placa2,
                placa3: formData.placa3,
                motorista: formData.motorista,
            });
    
            // Exibe a mensagem de sucesso
            setSuccessMessage('Entrada realizada com sucesso');
    
            // Limpa o formulário
            setFormData({
                placa1: '',
                placa2: '',
                placa3: '',
                motorista: '',
            });
    
            // Aguarda 2 segundos antes de recarregar a página
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            alert('Erro no cadastro/atualização');
        }
    };
    

    return (
        <div className="modal-nova-entrada">
            <h1>Nova Entrada</h1>
            {successMessage && <p className="success-message">{successMessage}</p>} {/* Mensagem de sucesso */}
            <form>
                <div className="form-group">
                    <div>
                        <label htmlFor="placa1">Placa Cavalo:</label>
                        <input
                            type="text"
                            id="placa1"
                            name="placa1"
                            value={formData.placa1}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            onBlur={handleBlur}
                            placeholder="Digite a placa"
                            className="input-placa"
                        />
                    </div>
                    <div>
                        <label htmlFor="placa2">Placa Carreta:</label>
                        <input
                            type="text"
                            id="placa2"
                            name="placa2"
                            value={formData.placa2}
                            onChange={handleChange}
                            placeholder=""
                            readOnly
                            className="input-disabled input-placa"
                        />
                    </div>
                    <div>
                        <label htmlFor="placa3">Placa Carreta 2:</label>
                        <input
                            type="text"
                            id="placa3"
                            name="placa3"
                            value={formData.placa3}
                            onChange={handleChange}
                            placeholder=""
                            readOnly
                            className="input-disabled input-placa"
                        />
                    </div>
                </div>
                <div className="form-group">
                    <div>
                        <label htmlFor="motorista">Motorista:</label>
                        <input
                            type="text"
                            id="motorista"
                            name="motorista"
                            value={formData.motorista}
                            onChange={handleChange}
                            placeholder=""
                            className="input-placa2"
                        />
                    </div>
                </div>
                <button type="button" className="submit-button" onClick={handleRegister}>
                    Salvar
                </button>
            </form>
        </div>
    );
};

export default ModalNovaEntrada;