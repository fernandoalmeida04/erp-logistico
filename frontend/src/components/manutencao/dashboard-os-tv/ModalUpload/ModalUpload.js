import React, { useState, useRef } from 'react';
import './ModalUpload.css';
import { Button, Typography, Box, TextField, IconButton, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const apiUrl = process.env.REACT_APP_API_URL;

const ModalUpload = ( ) => {
    const [fileOS, setFileOS] = useState(null); // Estado para o arquivo Excel OS
    const [fileChecklist, setFileChecklist] = useState(null); // Estado para o arquivo Excel Checklist
    const [isProcessing, setIsProcessing] = useState(false); // Estado para controlar o carregamento

    // Refs para os campos de upload
    const fileOSInputRef = useRef(null);
    const fileChecklistInputRef = useRef(null);

    // Função para lidar com o upload de arquivos
    const handleFileChange = (e, setFile) => {
        setFile(e.target.files[0]); // Define o arquivo selecionado no estado
    };

    // Função para remover o arquivo selecionado
    const handleRemoveFile = (setFile, inputRef) => {
        setFile(null); // Remove o arquivo do estado
        if (inputRef.current) {
            inputRef.current.value = ''; // Reseta o valor do campo de upload
        }
    };

    // Verifica se ambos os arquivos foram carregados
    const isProcessButtonEnabled = fileOS && fileChecklist && !isProcessing;

    const handleProcess = async () => {
        setIsProcessing(true); // Ativa o estado de carregamento
        try {
            // Cria um FormData para enviar os arquivos
            const formData = new FormData();
            formData.append('file1', fileOS);
            formData.append('file2', fileChecklist);

            // Envia os arquivos para o backend
            const response = await fetch(`${apiUrl}/excelFiles/compare-files`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Erro ao processar os arquivos.');
            }

            const result = await response.json();
            console.log('Resultado do backend:', result);

            alert('Banco de dados atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao enviar os arquivos:', error);
            alert('Erro ao processar os arquivos. Tente novamente.');
        } finally {
            setIsProcessing(false); // Desativa o estado de carregamento
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                padding: 3,
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0)',
                width: '400px',
                margin: '0 auto',
            }}
        >
            <Typography variant="h5" gutterBottom>
                Atualizar Dashboard
            </Typography>

            {/* Campo para upload do Excel OS */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" gutterBottom>
                        Excel OS:
                    </Typography>
                    <TextField
                        inputRef={fileOSInputRef} // Associa o ref ao campo de upload
                        type="file"
                        inputProps={{ accept: '.xlsx, .xls' }} // Aceita apenas arquivos Excel
                        onChange={(e) => handleFileChange(e, setFileOS)}
                        fullWidth
                    />
                </Box>
                {fileOS && (
                    <IconButton
                        onClick={() => handleRemoveFile(setFileOS, fileOSInputRef)}
                        color="error"
                    >
                        <CloseIcon />
                    </IconButton>
                )}
            </Box>

            {/* Campo para upload do Excel Checklist */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" gutterBottom>
                        Excel Checklist:
                    </Typography>
                    <TextField
                        inputRef={fileChecklistInputRef} // Associa o ref ao campo de upload
                        type="file"
                        inputProps={{ accept: '.xlsx, .xls' }} // Aceita apenas arquivos Excel
                        onChange={(e) => handleFileChange(e, setFileChecklist)}
                        fullWidth
                    />
                </Box>
                {fileChecklist && (
                    <IconButton
                        onClick={() => handleRemoveFile(setFileChecklist, fileChecklistInputRef)}
                        color="error"
                    >
                        <CloseIcon />
                    </IconButton>
                )}
            </Box>

            {/* Botão Processar */}
            <Button
                variant="contained"
                color="primary"
                onClick={handleProcess}
                disabled={!isProcessButtonEnabled} // Fica desabilitado até que ambos os arquivos sejam carregados ou enquanto está processando
                startIcon={isProcessing && <CircularProgress size={20} />} // Ícone de carregamento
            >
                {isProcessing ? 'EM ANDAMENTO' : 'Processar'}
            </Button>
        </Box>
    );
};

export default ModalUpload;