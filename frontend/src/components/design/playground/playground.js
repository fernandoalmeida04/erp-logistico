import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Switch } from '@mui/material';

const Playground = () => {
    const [text, setText] = useState('');
    const [checked, setChecked] = useState(false);

    return (
        <Box sx={{ p: 4, maxWidth: 400, margin: '0 auto', bgcolor: '#fafafa', borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h5" gutterBottom>
                Playground de Componentes
            </Typography>
        </Box>
    );
};

export default Playground;