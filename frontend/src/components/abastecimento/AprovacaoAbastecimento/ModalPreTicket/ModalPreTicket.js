import React, { useState } from 'react';
import { Modal, Box, Typography, Button, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import axios from 'axios';

// Estilo responsivo para o modal
const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '90vw', sm: 400 },
    minWidth: { xs: '90vw', sm: 320 },
    maxWidth: { xs: '95vw', sm: 400 },
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: { xs: 2, sm: 4 },
};

const ModalPreTicket = ({
    open,
    onClose,
    placa,
    tipoVeiculo,
    valorCombustivel,
    litrosCombustivel,
    valorTotalAbastecimento,
    litrosCalculados,
    litrosReais,
    nomePosto,
    consumoAnterior,
    hodometroAnterior,
    hodometroAtual,
    distanciaDestino,
    motorista,
    metaDesejada,
    metaReal,
    tipoAbastecimento,
    setTipoAbastecimento,
    handleTipoAbastecimentoChange
}) => {
    const [openPergunta, setOpenPergunta] = useState(false);
    const [observacao, setObservacao] = useState('');

    const handleAprovar = async () => {
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/abastecimento/savePreticketAbastecimento`, {
                codTicketNucci: placa + '-' + Date.now(),
                placa,
                tipoVeiculo,
                tipoAbastecimento,
                posto: nomePosto,
                qtdeLitros: litrosCombustivel,
                valorLitro: valorCombustivel,
                valorTotal: valorTotalAbastecimento,
                consumoAnterior,
                litrosCalculados,
                litrosReais,
                motorista,
                metaReal,
                observacao,
                hodometroAnterior,
                hodometroAtual,
                distancia: distanciaDestino,
                usuario: localStorage.getItem('user') || 'sistema'
            });
        } catch (error) {
            console.error('Erro ao salvar pré-ticket:', error);
        }
        setOpenPergunta(true);
    };

    const handlePerguntaSim = () => {
        if (handleTipoAbastecimentoChange) {
            handleTipoAbastecimentoChange({ target: { checked: tipoAbastecimento === 'Diesel' } });
        } else if (setTipoAbastecimento) {
            setTipoAbastecimento(tipoAbastecimento === 'Diesel' ? 'Arla' : 'Diesel');
        }
        setOpenPergunta(false);
        onClose();
    };

    const handlePerguntaNao = () => {
        setOpenPergunta(false);
        onClose();
        window.location.reload();
    };

    return (
        <>
            <Modal open={open} onClose={onClose}>
                <Box sx={style}>
                    <Typography variant="h6" mb={2} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                        Dados do Pré-Ticket
                    </Typography>
                    <Divider sx={{ mb: 2, width: '100%' }} />
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Placa:</strong> {placa}</Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Motorista:</strong> {motorista}</Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Tipo de Veículo:</strong> {tipoVeiculo}</Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Tipo de Abastecimento:</strong> {tipoAbastecimento}</Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Posto:</strong> {nomePosto}</Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Litros a abastecer:</strong> {litrosCombustivel}L</Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Valor do litro:</strong> R$ {valorCombustivel}</Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                        <strong>Valor Total do Abastecimento:</strong> R$ {valorTotalAbastecimento !== undefined && valorTotalAbastecimento !== null ? Number(valorTotalAbastecimento).toFixed(2) : ''}
                    </Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                        <strong>Consumo Anterior:</strong> {consumoAnterior !== undefined && consumoAnterior !== null ? Number(consumoAnterior).toFixed(2) : ''}
                    </Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Consumo Desejado:</strong> {metaDesejada}</Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                        <strong>Consumo Real:</strong> {metaReal !== undefined && metaReal !== null ? Number(metaReal).toFixed(2) : ''}
                    </Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Hodômetro Atual:</strong> {hodometroAtual}</Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Hodômetro Anterior:</strong> {hodometroAnterior}</Typography>
                    <Typography sx={{ textAlign: 'start', fontSize: { xs: '0.95rem', sm: '1rem' } }}><strong>Distância Percorrida:</strong> {distanciaDestino}km</Typography>
                    <TextField
                        label="Observação"
                        type="text"
                        value={observacao}
                        onChange={e => setObservacao(e.target.value)}
                        sx={{ width: '100%', mt: 2 }}
                        required
                    />

                    <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        sx={{ mt: { xs: 2, sm: 3 } }}
                        onClick={handleAprovar}
                    >
                        Aprovar
                    </Button>
                </Box>
            </Modal>
            <Dialog open={openPergunta} onClose={handlePerguntaNao} fullWidth maxWidth="xs">
                <DialogTitle>
                    {tipoAbastecimento === 'Diesel'
                        ? 'Há Abastecimento Arla?'
                        : 'Há Abastecimento Diesel?'}
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                        Clique em "Sim" para adicionar o abastecimento de {tipoAbastecimento === 'Diesel' ? 'Arla' : 'Diesel'}.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handlePerguntaSim} color="primary">
                        Sim
                    </Button>
                    <Button onClick={handlePerguntaNao} color="secondary">
                        Não
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ModalPreTicket;