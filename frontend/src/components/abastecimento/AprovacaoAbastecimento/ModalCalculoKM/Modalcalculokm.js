import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button } from '@mui/material';

const style = {
position: 'absolute',
top: '50%',
left: '50%',
transform: 'translate(-50%, -50%)',
width: 350,
bgcolor: 'background.paper',
borderRadius: 2,
boxShadow: 24,
p: 4,
};

const ModalCalculoKM = ({ open, onClose }) => {
const [valor1, setValor1] = useState('');
const [valor2, setValor2] = useState('');
const [resultado, setResultado] = useState(null);

const calcular = () => {
    const num1 = parseFloat(valor1.replace(',', '.'));
    const num2 = parseFloat(valor2.replace(',', '.'));
    if (!isNaN(num1) && !isNaN(num2)) {
    setResultado(Math.abs(num1 - num2));
    } else {
    setResultado(null);
    }
};

const handleClose = () => {
    setValor1('');
    setValor2('');
    setResultado(null);
    onClose();
};

return (
    <Modal open={open} onClose={handleClose}>
    <Box sx={style}>
        <Typography variant="h6" mb={2}>Calcular Diferença de Distâncias</Typography>
        <TextField
        label="Distância 1 (km)"
        value={valor1}
        onChange={e => setValor1(e.target.value)}
        type="number"
        fullWidth
        sx={{ mb: 2 }}
        />
        <TextField
        label="Distância 2 (km)"
        value={valor2}
        onChange={e => setValor2(e.target.value)}
        type="number"
        fullWidth
        sx={{ mb: 2 }}
        />
        <Button variant="contained" color="primary" onClick={calcular} fullWidth>
        Calcular
        </Button>
        {resultado !== null && (
        <Typography mt={2} variant="subtitle1">
            Diferença: <strong>{resultado}km</strong>
        </Typography>
        )}
    </Box>
    </Modal>
);
};

export default ModalCalculoKM;