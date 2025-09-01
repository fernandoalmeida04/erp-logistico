import React from 'react';
import * as XLSX from 'xlsx-js-style';
import { Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const ExportarExcel = ({ fetchDados, nomeArquivo = "dados.xlsx" }) => {
    // Função para formatar data no padrão dd/MM/yyyy
    function formatarDataBR(dataISO) {
        if (!dataISO) return '';
        const d = new Date(dataISO);
        if (isNaN(d)) return '';
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const ano = d.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }
    
    const exportar = async () => {
        let dados = [];
        if (fetchDados) {
            dados = await fetchDados();
        }
        if (!dados || dados.length === 0) {
            alert('Nenhum dado para exportar.');
            return;
        }

        // Polígonos de chegada
        const poligonosSJP = ["Volkswagen SJP", "Pátio Volks SJP", "Doca Volkswagen SJP"];
        const poligonosSBC = ["Volkswagen SBC", "Pátio Volks SBC", "Doca Volkswagen SBC"];

        // Função para localização em trânsito VW PINHAIS
        function localizacaoPinhais(km) {
            if (km >= 1 && km <= 16) return "São Bernardo do Campo-SP";
            if (km >= 17 && km <= 35) return "São Paulo-SP";
            if (km >= 26 && km <= 73) return "Itapecerica da Serra-SP";
            if (km >= 74 && km <= 89) return "São Lourenço da Serra-SP";
            if (km >= 90 && km <= 116) return "Juquitiba-SP";
            if (km >= 117 && km <= 171) return "Miracatu-SP";
            if (km >= 172 && km <= 201) return "Juquiá-SP";
            if (km >= 202 && km <= 231) return "Registro-SP";
            if (km >= 232 && km <= 264) return "Jacupiranga-SP";
            if (km >= 265 && km <= 301) return "Cajati-SP";
            if (km >= 302 && km <= 331) return "Barra do Turvo-PR";
            if (km >= 332 && km <= 385) return "Campina Grande do Sul-PR";
            if (km >= 386 && km <= 406) return "Quatro Barras-PR";
            if (km >= 407 && km <= 426) return "Piraquara-PR";
            if (km >= 427 && km <= 446) return "São José dos Pinhais-PR";
            return "";
        }

        // Função para localização em trânsito VW ANCHIETA
        function localizacaoSBC(km) {
            if (km >= 1 && km <= 25) return "São José dos Pinhais-PR";
            if (km >= 26 && km <= 45) return "Piraquara-PR";
            if (km >= 46 && km <= 66) return "Quatro Barras-PR";
            if (km >= 67 && km <= 120) return "Campina Grande do Sul-PR";
            if (km >= 121 && km <= 150) return "Barra do Turvo-SP";
            if (km >= 151 && km <= 187) return "Cajati-SP";
            if (km >= 188 && km <= 220) return "Jacupiranga-SP";
            if (km >= 221 && km <= 250) return "Registro-SP";
            if (km >= 251 && km <= 280) return "Juquiá-SP";
            if (km >= 281 && km <= 335) return "Miracatu-SP";
            if (km >= 336 && km <= 362) return "Juquitiba-SP";
            if (km >= 363 && km <= 378) return "São Lourenço da Serra-SP";
            if (km >= 379 && km <= 416) return "Itapecerica da Serra-SP";
            if (km >= 417 && km <= 435) return "São Paulo-SP";
            if (km >= 436 && km <= 446) return "São Bernardo do Campo-SP";
            return "";
        }

        // Monta os dados para o Excel na ordem solicitada, incluindo a coluna DATA
        const dadosFiltrados = dados.map(({ rn, DATA_CRIADO, DATA_COLETA, DIRECAO_ORIGINAL, CVA, JANELA, VIAGEM, CARRETA, CAVALO, MOTORISTA, SOLICITACAO, 
            ACHEGADAPLANTA, ACHEGADAGATE, ASAIDAPLANTA, PPREVISAOCHEGADA, PCHEGADAPLANTA, PCHEGADAGATE, PSAIDAPLANTA, QTDRACK, STATUSATENDIMENTO, ...rest }) => {
            let SENTIDO = '';
            if (DIRECAO_ORIGINAL === 'Ida - São José dos Pinhais') SENTIDO = 'VW PINHAIS';
            else if (DIRECAO_ORIGINAL === 'Volta - São Bernardo do Campo') SENTIDO = 'VW ANCHIETA';

            // Remove cd_distancia e nm_poligono_atual do rest
            const { cd_distancia, nm_poligono_atual, ...restSemDistanciaPoligono } = rest;

            const POLIGONO = nm_poligono_atual || rest.situacao || '';
            const DISTANCIA = cd_distancia !== undefined && cd_distancia !== null ? Number(cd_distancia) : null;

            // TRÂNSITO LOCALIZAÇÃO
            let TRANSITO_LOCALIZACAO = '';
            if (SENTIDO === 'VW PINHAIS') {
                if (poligonosSJP.map(p => p.toLowerCase()).includes(POLIGONO.trim().toLowerCase())) {
                    TRANSITO_LOCALIZACAO = POLIGONO;
                } else if (POLIGONO.trim().toLowerCase() === 'pátio fks') {
                    TRANSITO_LOCALIZACAO = "São Bernardo do Campo-SP";
                } else if (POLIGONO.trim().toLowerCase() === 'graal petropen') {
                    TRANSITO_LOCALIZACAO = "Registro-SP";
                } else if (POLIGONO.toLowerCase().includes('trânsito') && DISTANCIA !== null) {
                    TRANSITO_LOCALIZACAO = localizacaoPinhais(DISTANCIA);
                }
            } else if (SENTIDO === 'VW ANCHIETA') {
                if (poligonosSBC.map(p => p.toLowerCase()).includes(POLIGONO.trim().toLowerCase())) {
                    TRANSITO_LOCALIZACAO = POLIGONO;
                } else if (POLIGONO.trim().toLowerCase() === 'pátio fks') {
                    TRANSITO_LOCALIZACAO = "São Bernardo do Campo-SP";
                } else if (POLIGONO.trim().toLowerCase() === 'graal petropen') {
                    TRANSITO_LOCALIZACAO = "Registro-SP";
                } else if (POLIGONO.toLowerCase().includes('trânsito') && DISTANCIA !== null) {
                    TRANSITO_LOCALIZACAO = localizacaoSBC(DISTANCIA);
                }
            }

            // KM PENDENTE (mantém sua lógica)
            let KM_PENDENTE = '';
            if (SENTIDO === 'VW PINHAIS') {
                if (poligonosSJP.map(p => p.toLowerCase()).includes(POLIGONO.trim().toLowerCase())) {
                    KM_PENDENTE = 0;
                } else if (
                    (POLIGONO.toLowerCase().includes('trânsito') || POLIGONO.toLowerCase() === 'graal petropen' || POLIGONO.toLowerCase() === 'pátio fks') 
                    && DISTANCIA !== null
                ) {
                    KM_PENDENTE = 446 - DISTANCIA;
                }
            } else if (SENTIDO === 'VW ANCHIETA') {
                if (poligonosSBC.map(p => p.toLowerCase()).includes(POLIGONO.trim().toLowerCase())) {
                    KM_PENDENTE = 0;
                } else if ((POLIGONO.toLowerCase().includes('trânsito') || POLIGONO.toLowerCase() === 'graal petropen' || POLIGONO.toLowerCase() === 'pátio fks') && DISTANCIA !== null) {
                    KM_PENDENTE = DISTANCIA;
                }
            }

            // Se STATUSATENDIMENTO for "FINALIZADO", força TRANSITO_LOCALIZACAO para "FINALIZADO"
            if (
                ((STATUSATENDIMENTO || '').toUpperCase() === 'FINALIZADO') || 
                ((STATUSATENDIMENTO || '').toUpperCase() === 'FINALIZADO ')) {
                TRANSITO_LOCALIZACAO = 'FINALIZADO';
            }

            if (KM_PENDENTE !== '' && !isNaN(KM_PENDENTE)) {
                KM_PENDENTE = Math.max(0, Math.round(KM_PENDENTE));
            } else if (KM_PENDENTE === '') {
                KM_PENDENTE = '';
            }

            // --- AJUSTE QTDRACK: garantir que 0 seja exportado como 0 ---
            let qtdeRacksExport = '';
            if (QTDRACK !== undefined && QTDRACK !== null && QTDRACK !== '') {
                qtdeRacksExport = Number(QTDRACK);
            } else {
                qtdeRacksExport = '';
            }

            // Ordem das colunas conforme solicitado, com DATA em primeiro e preenchendo os campos de timestamps
            return {
                DATA: formatarDataBR(DATA_COLETA),
                SENTIDO,
                JANELA,
                SOLICITACAO,
                CVA,
                VIAGEM,
                CARRETA,
                CAVALO,
                MOTORISTA,
                'ATENDIMENTO\nSTATUS': STATUSATENDIMENTO || '',
                'CHEGADA PLANTA ANCHIETA': ACHEGADAPLANTA || '',
                'CHEGADA GATE ANCHIETA': ACHEGADAGATE || '',
                'SAÍDA PLANTA ANCHIETA': ASAIDAPLANTA || '',
                'PREVISÃO CHEGADA SJP': PPREVISAOCHEGADA || '',
                'CHEGADA PLANTA SJP': PCHEGADAPLANTA || '',
                'CHEGADA GATE SJP': PCHEGADAGATE || '',
                'SAÍDA PLANTA SJP': PSAIDAPLANTA || '',
                'QTDE RACKS SJP': qtdeRacksExport,
                'TRÂNSITO\nLOCALIZAÇÃO': TRANSITO_LOCALIZACAO,
                'KM\nPENDENTE': KM_PENDENTE,
                'OBSERVAÇÕES': ''
            };
        });

        // Cabeçalhos das linhas 2 e 3 na ordem solicitada, com DATA em primeiro
        const headerRow2 = [
            'DATA', // A
            'SENTIDO', // B
            'JANELA', // C
            'SOLICITAÇÃO', // D
            'CVA', // E
            'VIAGEM', // F
            'CARRETA', // G
            'CAVALO', // H
            'MOTORISTA', // I
            'ATENDIMENTO\nSTATUS', // J (quebra de linha)
            'PLANTA VW ANCHIETA', '', '', // K-M (mesclado)
            'PLANTA VW SÃO JOSÉ DOS PINHAIS', '', '', '', '', // N-R (mesclado)
            'TRÂNSITO\nLOCALIZAÇÃO', // S (quebra de linha)
            'KM\nPENDENTE', // T (quebra de linha)
            'OBSERVAÇÕES' // U
        ];

        const headerRow3 = [
            '', '', '', '', '', '', '', '', '', '', // A-J
            'CHEGADA\nPLANTA', // K
            'CHEGADA\nGATE',   // L
            'SAÍDA\nPLANTA',   // M
            'PREVISÃO\nCHEGADA', // N
            'CHEGADA\nPLANTA',   // O
            'CHEGADA\nGATE',     // P
            'SAÍDA\nPLANTA',     // Q
            'QTDE\nRACKS',       // R
            '', '', '', // S-U
        ];

        // Ordena os dados pela coluna DATA (do menor para o maior)
        dadosFiltrados.sort((a, b) => {
            const dataA = a.DATA ? a.DATA.split('/').reverse().join('-') : '';
            const dataB = b.DATA ? b.DATA.split('/').reverse().join('-') : '';
            return new Date(dataA) - new Date(dataB);
        });

        // Cria a planilha
        const ws = XLSX.utils.aoa_to_sheet([
            ['TRANSPORTE DE CARROCERIAS VIRTUS (Transportadora FKS)'],
            headerRow2,
            headerRow3
        ]);

        // Mescla as células conforme solicitado
        ws['!merges'] = [
            // Mescla título principal (A1:U1) - 21 colunas
            { s: { r: 0, c: 0 }, e: { r: 0, c: 20 } },
            // Mescla colunas K2-M2 (PLANTA VW ANCHIETA)
            { s: { r: 1, c: 10 }, e: { r: 1, c: 12 } },
            // Mescla colunas N2-R2 (PLANTA VW SÃO JOSÉ DOS PINHAIS)
            { s: { r: 1, c: 13 }, e: { r: 1, c: 17 } },
            // Mescla cabeçalhos simples (A2:A3 até J2:J3, S2:S3, T2:T3, U2:U3)
            { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }, // DATA
            { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }, // SENTIDO
            { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } }, // JANELA
            { s: { r: 1, c: 3 }, e: { r: 2, c: 3 } }, // SOLICITAÇÃO
            { s: { r: 1, c: 4 }, e: { r: 2, c: 4 } }, // CVA
            { s: { r: 1, c: 5 }, e: { r: 2, c: 5 } }, // VIAGEM
            { s: { r: 1, c: 6 }, e: { r: 2, c: 6 } }, // CARRETA
            { s: { r: 1, c: 7 }, e: { r: 2, c: 7 } }, // CAVALO
            { s: { r: 1, c: 8 }, e: { r: 2, c: 8 } }, // MOTORISTA
            { s: { r: 1, c: 9 }, e: { r: 2, c: 9 } }, // ATENDIMENTO STATUS
            { s: { r: 1, c: 18 }, e: { r: 2, c: 18 } }, // TRÂNSITO LOCALIZAÇÃO
            { s: { r: 1, c: 19 }, e: { r: 2, c: 19 } }, // KM PENDENTE
            { s: { r: 1, c: 20 }, e: { r: 2, c: 20 } }, // OBSERVAÇÕES
        ];

        // Adiciona os dados a partir da linha 4
        XLSX.utils.sheet_add_json(ws, dadosFiltrados, { origin: 'A4', skipHeader: true });

        // Centraliza e deixa negrito o texto da célula mesclada (A1)
        ws['A1'].s = {
            alignment: { horizontal: "center", vertical: "center" },
            font: { bold: true, sz: 11 }
        };

        // Definição das cores para cada coluna (agora com DATA na frente)
        const headerFills = [
            { fgColor: { rgb: "BFBFBF" } }, // DATA - branco
            { fgColor: { rgb: "BFBFBF" } }, // SENTIDO - verde claro
            { fgColor: { rgb: "BFBFBF" } }, // JANELA - amarelo
            { fgColor: { rgb: "BFBFBF" } }, // SOLICITAÇÃO - amarelo
            { fgColor: { rgb: "BFBFBF" } }, // CVA - azul claro
            { fgColor: { rgb: "BFBFBF" } }, // VIAGEM - cinza
            { fgColor: { rgb: "BFBFBF" } }, // CARRETA - azul claro
            { fgColor: { rgb: "BFBFBF" } }, // CAVALO - azul claro
            { fgColor: { rgb: "BFBFBF" } }, // MOTORISTA - azul claro
            { fgColor: { rgb: "BFBFBF" } }, // ATENDIMENTO STATUS - cinza
            { fgColor: { rgb: "BFBFBF" } }, // CHEGADA PLANTA ANCHIETA
            { fgColor: { rgb: "BFBFBF" } }, // CHEGADA GATE ANCHIETA
            { fgColor: { rgb: "BFBFBF" } }, // SAÍDA PLANTA ANCHIETA
            { fgColor: { rgb: "BFBFBF" } }, // PREVISÃO CHEGADA SJP
            { fgColor: { rgb: "BFBFBF" } }, // CHEGADA PLANTA SJP
            { fgColor: { rgb: "BFBFBF" } }, // CHEGADA GATE SJP
            { fgColor: { rgb: "BFBFBF" } }, // SAÍDA PLANTA SJP
            { fgColor: { rgb: "BFBFBF" } }, // QTDE RACKS SJP
            { fgColor: { rgb: "BFBFBF" } }, // TRÂNSITO LOCALIZAÇÃO
            { fgColor: { rgb: "BFBFBF" } }, // KM PENDENTE
            { fgColor: { rgb: "BFBFBF" } }, // OBSERVAÇÕES
        ];

        const headerFont = { bold: true };
        const headerAlign = { horizontal: "center", vertical: "center", wrapText: true };

        // Linha 2 (A2:U2)
        for (let c = 0; c <= 20; c++) {
            const cell = XLSX.utils.encode_cell({ r: 1, c });
            if (ws[cell]) {
                ws[cell].s = ws[cell].s || {};
                ws[cell].s.fill = headerFills[c];
                ws[cell].s.font = headerFont;
                ws[cell].s.alignment = headerAlign;
            }
        }
        // Linha 3 (A3:U3) - repete as cores das colunas
        for (let c = 0; c <= 20; c++) {
            const cell = XLSX.utils.encode_cell({ r: 2, c });
            if (ws[cell]) {
                ws[cell].s = ws[cell].s || {};
                ws[cell].s.fill = headerFills[c];
                ws[cell].s.font = headerFont;
                ws[cell].s.alignment = headerAlign;
            }
        }

        // Aplica bordas em todas as células preenchidas
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cell_address]) continue;
                ws[cell_address].s = ws[cell_address].s || {};
                ws[cell_address].s.border = {
                    top:    { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left:   { style: "thin", color: { rgb: "000000" } },
                    right:  { style: "thin", color: { rgb: "000000" } }
                };
            }
        }

        for (let R = 3; R <= range.e.r; ++R) {
            for (let C = 10; C <= 17; ++C) {
                const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[cell_address]) {
                    ws[cell_address].s = ws[cell_address].s || {};
                    ws[cell_address].s.alignment = { ...ws[cell_address].s.alignment, horizontal: "center", vertical: "center", wrapText: true };
                }
            }
        }

        // Ajusta a largura das colunas para expandir e não cortar os dados
        ws['!cols'] = [
            { wch: 12 },  // DATA
            { wch: 14 },  // SENTIDO
            { wch: 10 },  // JANELA
            { wch: 18 },  // SOLICITAÇÃO
            { wch: 12 },  // CVA
            { wch: 14 },  // VIAGEM
            { wch: 14 },  // CARRETA
            { wch: 14 },  // CAVALO
            { wch: 38 },  // MOTORISTA
            { wch: 14 },  // ATENDIMENTO STATUS
            { wch: 9 },  // CHEGADA PLANTA ANCHIETA
            { wch: 9 },  // CHEGADA GATE ANCHIETA
            { wch: 9 },  // SAÍDA PLANTA ANCHIETA
            { wch: 9 },  // PREVISÃO CHEGADA SJP
            { wch: 9 },  // CHEGADA PLANTA SJP
            { wch: 9 },  // CHEGADA GATE SJP
            { wch: 9 },  // SAÍDA PLANTA SJP
            { wch: 9 },  // QTD RACKS SJP
            { wch: 28 },  // TRANSITO LOCALIZACAO
            { wch: 10 },  // KM PENDENTE
            { wch: 32 },  // OBSERVAÇÕES
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Dados");
        XLSX.writeFile(wb, nomeArquivo);
    };

    return (
        <Button
            variant="outlined"
            color="success"
            startIcon={<DownloadIcon />}
            onClick={exportar}
        >
            Excel
        </Button>
    );
};

export default ExportarExcel;