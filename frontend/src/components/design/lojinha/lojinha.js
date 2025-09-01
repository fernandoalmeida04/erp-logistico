import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    CircularProgress,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Snackbar,
    IconButton
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Define cor primária customizada
const PRIMARY_COLOR = '#f37215';
const SECONDARY_COLOR = '#0073e6ff';

const components = [
    {
        name: 'Botão',
        code: `<Button variant="contained" sx={{ bgcolor: '${PRIMARY_COLOR}', color: '#fff', '&:hover': { bgcolor: '#d65e00' } }}>Botão Padrão</Button>`,
        element: <Button variant="contained" sx={{ bgcolor: PRIMARY_COLOR, color: '#fff', '&:hover': { bgcolor: '#d65e00' } }}>Botão Padrão</Button>
    },
    {
        name: 'Botão Secundário',
        code: `<Button variant="outlined" sx={{ color: '${SECONDARY_COLOR}', borderColor: '${SECONDARY_COLOR}', '&:hover': { bgcolor: '${SECONDARY_COLOR}11', borderColor: '${SECONDARY_COLOR}' } }}>Botão Secundário</Button>`,
        element: <Button variant="outlined" sx={{ color: SECONDARY_COLOR, borderColor: SECONDARY_COLOR, '&:hover': { bgcolor: `${SECONDARY_COLOR}11`, borderColor: SECONDARY_COLOR } }}>Botão Secundário</Button>
    },
    {
        name: 'Input',
        code: `<TextField label="Nome" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '${PRIMARY_COLOR}' }, '&.Mui-focused fieldset': { borderColor: '${PRIMARY_COLOR}' } } }} />`,
        element: <TextField label="Nome" variant="outlined"
            sx={{
                '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: PRIMARY_COLOR },
                    '&.Mui-focused fieldset': { borderColor: PRIMARY_COLOR }
                }
            }}
        />
    },
    {
        name: 'Barra de Progresso Linear',
        code: `<LinearProgress variant="determinate" value={60} sx={{ width: 200, bgcolor: '#ffe5d0', '& .MuiLinearProgress-bar': { bgcolor: '${PRIMARY_COLOR}' } }} />`,
        element: <LinearProgress variant="determinate" value={60} sx={{ width: 200, bgcolor: '#ffe5d0', '& .MuiLinearProgress-bar': { bgcolor: PRIMARY_COLOR } }} />
    },
    {
        name: 'Spin de Carregamento',
        code: `<CircularProgress sx={{ color: '${PRIMARY_COLOR}' }} />`,
        element: <CircularProgress sx={{ color: PRIMARY_COLOR }} />
    },
    {
        name: 'Tabela Simples',
        code:
`<TableContainer component={Paper} sx={{ maxWidth: 400 }}>
  <Table size="small">
    <TableHead>
      <TableRow sx={{ bgcolor: '${PRIMARY_COLOR}22' }}>
        <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
        <TableCell sx={{ fontWeight: 'bold' }}>Idade</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        <TableCell>Ana</TableCell>
        <TableCell>28</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>João</TableCell>
        <TableCell>35</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</TableContainer>`,
        element: (
            <TableContainer component={Paper} sx={{ maxWidth: 400 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: `${PRIMARY_COLOR}22` }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Idade</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>Ana</TableCell>
                            <TableCell>28</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>João</TableCell>
                            <TableCell>35</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        )
    },
    {
        name: 'Typography',
        code: `<Typography variant="h6">Título Exemplo</Typography>`,
        element: <Typography variant="h6">Título Exemplo</Typography>
    }
];

const Lojinha = () => {
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [copiedName, setCopiedName] = useState('');

    const handleCopy = (code, name) => {
        navigator.clipboard.writeText(code);
        setCopiedName(name);
        setSnackbarOpen(true);
    };

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ color: PRIMARY_COLOR }}>
                Lojinha de Componentes
            </Typography>
            <Typography variant="body1" gutterBottom sx={{ textAlign: 'left'}}>
                Exemplos dos principais componentes do sistema. Clique no ícone para copiar o código!
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {components.map((comp, idx) => (
                    <Paper key={idx} elevation={3} sx={{ p: 3, minWidth: 280, maxWidth: 420 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold">{comp.name}</Typography>
                            <IconButton
                                size="small"
                                onClick={() => handleCopy(comp.code, comp.name)}
                                title="Copiar código"
                            >
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Box sx={{ mb: 2 }}>{comp.element}</Box>
                        <Box sx={{
                            bgcolor: '#f5f5f5',
                            borderRadius: 1,
                            p: 1,
                            fontSize: 13,
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}>
                            {comp.code}
                        </Box>
                    </Paper>
                ))}
            </Box>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={2000}
                onClose={() => setSnackbarOpen(false)}
                message={`Código do componente "${copiedName}" copiado!`}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
};

export default Lojinha;