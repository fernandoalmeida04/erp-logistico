import React, { useState } from 'react';
import './ModalDelete.css';

const ModalDelete = () => {
    const [formData, setFormData] = useState({
        placa: '',
        age: '',
        vehicle: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form Data:', formData);
        // Aqui você pode adicionar a lógica para salvar os dados
    };

    return (
        <div className="modal-nova-entrada">
            <form onSubmit={handleSubmit}>
                <label>Confirmar saída do veículo?</label>
                <button type="submit" className="submit-button" style={{ marginRight: '10px' }}>
                    Sim
                </button>
                <button type="submit" className="submit-button">
                    Não
                </button>
            </form>
        </div>
    );
};

export default ModalDelete;