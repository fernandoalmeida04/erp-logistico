import './ordemColeta.css';

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Importa o hook useNavigate
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation, faTruck, faMapPin} from '@fortawesome/free-solid-svg-icons';

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';

const apiUrl = process.env.REACT_APP_API_URL;

// Função para formatar a data
function formatDate(dateString) {
  const date = new Date(dateString);

  // Subtrair 3 horas
  date.setUTCHours(date.getUTCHours() - 3);

  // Extrair partes da data em UTC
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Janeiro é 0
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Função para calcular a distância usando a fórmula de Haversine
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = R * c; // Distância em km
  return distancia;
}

function OrdemColeta() {
  const { cod_col } = useParams();
  const [oc, setOc] = useState(cod_col || '');
  const [idRastCliente, setIdRastCliente] = useState('');
  const [idAgrupamento, setIdAgrupamento] = useState('');
  const [ultimaOC, setUltimaOC] = useState('');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [tipoVeiculo, setTipoVeiculo] = useState('');
  const [janelaColeta, setJanelaColeta] = useState('');
  const [janelaEntrega, setJanelaEntrega] = useState('');
  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [rota, setRota] = useState('');
  const [tomadorCnpj, setTomadorCnpj] = useState('');
  const [pagadorNome, setPagadorNome] = useState('');
  const [veiculosProximos, setVeiculosProximos] = useState([]); // estado para armazenar os veículos mais próximos
  const [ocAdjacentes, setOcAdjacentes] = useState([]); // estado para armazenar as OC's adjacentes
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [vehicOper, setVehicOper] = useState('');
  const [vehicRoute, setVehicRoute] = useState('');
  const [vehicOrigin, setVehicOrigin] = useState('');
  const [vehicDest, setVehicDest] = useState('');
  const [vehicCPF, setVehicCPF] = useState('');
  const [motorista, setMotorista] = useState('');
  const [placa1, setPlaca1] = useState('');
  const [placa2, setPlaca2] = useState('');
  const [placa3, setPlaca3] = useState('');
  const [codUsr, setCodUsr] = useState('');
  const [tipoPesquisa, setTipoPesquisa] = useState('nome');
  const [nomeUsu, setNomeUsu] = useState('');
  const [veiculosDispo, setveiculosDispo] = useState('');
  const [placaPesquisa, setPlacaPesquisa] = useState('');
  const [showPopup, setShowPopup] = useState('');
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [bloquearRowClick, setBloquearRowClick] = useState(false);
  const navigate = useNavigate();
;
  function Popup({ show, onClose, ocAdjacentes }) {
    if (!show || ocAdjacentes.length === 0) return null; // Verifica se o popup deve ser exibido e se ocAdjacentes não está vazio
    const today = new Date();
    const todayDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    const renderOcAdjacentesText = () => {
      return ocAdjacentes.map((item, index) => {
        
        const googleMapsLink = `https://www.google.com/maps?q=${item.DESTINO_LATITUDE},${item.DESTINO_LONGITUDE}`;
        return `
🏭 *Fornecedor:* ${item.ORIGEM}
📍 *Origem:* ${item.ORIGEM_CIDADE}/${item.ORIGEM_UF} 
🕒 *Horário de Coleta:* ${new Date(item.COLETA_PLANEJADA).toLocaleString()}
📦 *Data de Entrega:* ${new Date(item.ENTREGA_PLANEJADA).toLocaleString()}
🎯 *Destino:* ${item.DESTINO}
📍 *Local de Entrega:* ${item.DESTINO_CIDADE}/${item.DESTINO_UF}
🌍 *Link:* ${googleMapsLink}
        `;
      }).join('\n');
    };
  
    const textToCopy = `🚚 *SOLICITAÇÃO DE FRETE* 🚚\n
📅 *Data:* ${todayDate}
🚛 *Cavalo:* ${placa1}
🚛 *Carreta:* ${placa2}
👨‍✈ *Motorista:* ${motorista}
*Necessário epi's*\n
${renderOcAdjacentesText()}
*Retorno:*
Necessidade de Retorno com Embalagens: SIM 
Local para Deixar o Veículo Após o Frete: 
Check-list para o Motorista:
Verificar se o carro está carregado.
Confirmar se há cintas disponíveis.
Como está retirando o veiculo.
Se possui bens materiais de outro motorista.\n
🔔 *Aviso Importante:* 
Por favor, esteja ciente de que os motoristas devem sempre estar preparados para a possibilidade de retorno durante o percurso. Além disso, é fundamental que respondam prontamente ao time de monitoramento em todas as comunicações relacionadas a esta coleta. A colaboração e prontidão são essenciais para garantir uma operação eficiente e segura`;
  
    const handleCopy = () => {
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Texto copiado para a área de transferência!");
      });
    };
  
    if (!show) return null;
  
    return (
      <div className="overlay">
        <div className="popup">
          <pre className="content">
            {textToCopy}
          </pre>
          <button className="button" onClick={handleCopy}>Copiar</button>
          <button className="button" onClick={onClose}>Fechar</button>
        </div>
      </div>
    );
  } 

  const handleRowClick = (index, oc) => {
    if (bloquearRowClick) {
      console.log('Clique bloqueado, aguardando finalização de outra ação.');
      setBloquearRowClick(false); // Libera para os próximos cliques
      return; // Ignora este clique
    }

    setSelectedRowIndex(index);
    setVehicOper('');
    setVehicRoute('');
    setVehicOrigin('');
    setVehicDest('');
    setPlaca1('');
    setPlaca2('');
    setVehicCPF('');
    setPlaca3('');
    setMotorista('');
    fetch(`${apiUrl}/programarColeta/dados-oc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ oc })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Erro na resposta do servidor');
      }
      return response.json();
    })
    .then(data => {
      if (data.length > 0) {
        setVehicOper(data[0].OPERACAO);
        setVehicRoute(data[0].ROTA);
        setVehicOrigin(data[0].ORIGEM);
        setVehicDest(data[0].DESTINO);
        setPlaca1(data[0].PLACA1);
        setPlaca2(data[0].PLACA2);
        setPlaca3(data[0].PLACA3);
        setMotorista(data[0].MOTORISTA);
        setVehicCPF(data[0].MOTORISTA_CPF);
      }
    })
  };

    // Snackbar para feedback visual
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handlePlacaPesquisa = async () => {
    setBloquearRowClick(true); // Bloqueia o clique na linha após a pesquisa
    setPlaca1('');
    setPlaca2('');
    setVehicCPF('');
    setPlaca3('');
    setMotorista('');
    setLoading(true);
    setError('');
  
      try {
        const response = await fetch(`${apiUrl}/programarColeta/checkManual`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tipoPesquisa: tipoPesquisa,        // Envia o tipo de pesquisa (CPF, Nome, Placa)
            valorPesquisa: placaPesquisa,
          }),
        });
    
        if (!response.ok) {
          throw new Error('Erro ao buscar o veículo.');
        }
    
        const data = await response.json();
    
        if (data.length > 0) {;
          setVeiculosProximos([data[0]]); // Atualiza a tabela com o veículo encontrado
          // Chama handleRowClick passando o índice e o OC encontrado
          //handleRowClick(0, data[0].ORDEM_COLETA);
          
          setPlaca1(data[0].PLACA1);
          if(data[0].TIPO_VEICULO === 'TRUCK') {
            setPlaca2(data[0].PLACA1);
          }
          else {
            setPlaca2(data[0].PLACA2);
          }
          setPlaca3(data[0].PLACA3);
          setVehicCPF(data[0].MOTORISTA_CPF);
          setMotorista(data[0].MOTORISTA);
        } else {
          setError('Veículo não encontrado.');
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    const storedCodUsr = localStorage.getItem('codUsr');
    const storedUser = localStorage.getItem('user');
    if (storedCodUsr) {
      setCodUsr(storedCodUsr);  // Atualiza a variável codUsr com o valor do localStorage
    }
    if (storedUser) {
      setNomeUsu(storedUser);
    }
  }, []);

  const handleGoBack = () => {
    navigate('/coleta/programar'); // Redireciona para o componente /App
  };

  function converterFormatoData(janelaColeta) {
    // Separar a data e a hora
    const [data, hora] = janelaColeta.split(' ');
  
    // Separar dia, mês e ano
    const [dia, mes, ano] = data.split('/');
  
    // Retornar no formato desejado: 'YYYY-MM-DD HH:MM:SS'
    return `${ano}-${mes}-${dia} ${hora}`;
  }

// Função que executa a sequência de chamadas para as rotas checkType e checkAll
async function checkAndHandleOcs(oc, idRastCliente) {
  try {
    // Primeira chamada: checkType
    const responseCheckType = await fetch(`${apiUrl}/specificCases/checkType`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oc })
    });
    
    const resultCheckType = await responseCheckType.json();
    const type = resultCheckType[0]?.nroundtrip_col; // Extrai o valor 0 ou 1

    if (type !== undefined) {
      // Segunda chamada: checkAll, usando o valor obtido de type e idRastCliente
      const responseCheckAll = await fetch(`${apiUrl}/specificCases/checkAll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: type, ativacao: idRastCliente, oc: oc })
      });
      
      const ocsFinais = await responseCheckAll.json();
      const ocsArray = ocsFinais.map(item => item.cod_col);
      
      console.log("Resultado final das OCs:", ocsArray);

      // Retorne ou processe `ocsArray` conforme necessário
      return ocsArray;
    } else {
      console.error("Erro: tipo de coleta não encontrado.");
    }
  } catch (error) {
    console.error("Erro ao executar as chamadas para as rotas backend:", error);
  }
}

  const handleExtendedProgram = async (oc) => {
    if(tomadorCnpj === '16701716003414' ||
      tomadorCnpj === '16701716000156' ||
      tomadorCnpj === '16701716003686' ||
      tomadorCnpj === '16701716002957' ||
      tomadorCnpj === '16701716003171' ||
      tomadorCnpj === '16701716001713' ||
      tomadorCnpj === '16701716003333'
    ){
      const ocsFinais = await checkAndHandleOcs(oc, idRastCliente);

      await handleProgram(ocsFinais);
      setShowPopup(true);
    } else {
      try {
        const response = await fetch(`${apiUrl}/programarColeta/checkContract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ codCol: oc }),
        });
    
        const data = await response.json();
    
        if (data.status === 'OK') {
          console.log('programando ida');
          await handleProgram(ocAdjacentes);
          console.log('programando volta');
          await handleProgram([data.data]);
          
          setShowPopup(true);
  
        } else if (data.status === 'NO_RESULT') {
          console.log('programando SÓ ida');
          await handleProgram(ocAdjacentes);
  
          setShowPopup(true);
  
        } else {
          throw new Error('Erro ao consultar a cotação');
        }
      } catch (error) {
        console.error('Erro:', error.message);
      }
    }
  };

  const handleProgram = async (ocs) => {
    if (isButtonDisabled) return; // Previne múltiplos cliques
    setIsButtonDisabled(true);
    let retornoAPI = '';
    let numContrato = '';
    try {
      console.log('placa1:', placa1 + ' placa2:', placa2 + ' placa3:', placa3);
      // Requisição ao proxy-tms
      await fetch(`${apiUrl}/programarColeta/proxy-tms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          NucciTMS: {
            Contrato: {
              CPFMotorista: vehicCPF,
              PlacaVeiculo: placa1,
              PlacaCarreta1: placa2,
              PlacaCarreta2: placa3,
              PlacaCarreta3: null,
              ValorTotal: 0,
              ValorAdiantamento: 0,
              ValorPedagio: 0,
              Coletas: ocs.map((ocAdj) => ({
                ColetaID: ocAdj.ORDEM_COLETA || ocAdj, // ColetaID ajustado
              })),
              Planejamento: true,
              DataPrevisaoSaida: converterFormatoData(janelaColeta),
              UsuarioID: codUsr,
              TipoPagamento: 1,
              RecebedorPagamentoAdiantamento: 0,
              RecebedorPagamentoSaldoFinal: 0,
            },
          },
        }),
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Erro na resposta do servidor TMS');
        }
        return response.json();
      })
      .then((data) => {
        console.log('Requisição TMS realizada com sucesso:', data);
        retornoAPI = data;
        numContrato = data.Contrato.ContratoID;
      })
      .catch((error) => {
        console.error('Erro na requisição TMS:', error.message);
      });
  
      // Processamento adicional baseado no retorno do proxy-tms
      if (retornoAPI.Status === 'OK') {
        for (const ocAdj of ocs) {
          const responseOc = await fetch(`${apiUrl}/programarColeta/dados-oc`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ oc: ocAdj.ORDEM_COLETA || ocAdj }),
          });
  
          if (!responseOc.ok) {
            throw new Error(`Erro na resposta do servidor para OC: ${ocAdj.ORDEM_COLETA || ocAdj}`);
          }
  
          const dataOc = await responseOc.json();
  
          if (dataOc.length > 0) {
            const ocData = dataOc[0];
  
            if (ocData.ORDEM_COLETA == null || isNaN(ocData.ORDEM_COLETA)) {
              throw new Error(`'ordemColeta' inválido ou ausente para OC: ${ocAdj.ORDEM_COLETA}`);
            }
  
            // Programar OC
            await fetch(`${apiUrl}/programacao/programar/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                oc: String(ocData.ORDEM_COLETA), // Converte para string
                motorista: ocData.MOTORISTA || motorista,
                placa1: ocData.PLACA1 || placa1,
                placa2: ocData.PLACA2 || placa2,
                placa3: ocData.PLACA3 || placa3,
                observacao: 'Contrato criado a partir da aplicação web',
                cp: ocData.COLETAS || janelaColeta,
                ep: ocData.ENTREGAS || janelaEntrega,
                usuario: nomeUsu,
                contrato: numContrato
              }),
            });
  
            console.log(`OC ${ocData.ORDEM_COLETA} programada com sucesso`);
          } else {
            console.log(`Nenhum dado encontrado para OC: ${ocAdj.ORDEM_COLETA}`);
          }
        }
  
        alert("Contrato número " + numContrato + " criado!");
        openContrato(numContrato);
      } else if (retornoAPI.Status === 'ERROR') {
        alert("Erro ao criar o contrato: " + retornoAPI.ErroID);
      }
    } catch (error) {
      console.error('Erro:', error.message);
      setError('Erro: ' + error.message);
    } finally {
      setIsButtonDisabled(false); // Habilita o botão ao final do processo
    }
  };

  const openContrato = (numContrato) => {
    window.open(`https://fks.nuccierp.com.br/php/contrato/n_view_contrato.php?cod_ctrt=${numContrato}`, '_blank');
  }

  useEffect(() => {
    if (oc) {
      handleButtonClick({ key: 'Enter' }); // Simula o Enter ao carregar a página
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oc]);

  const handleButtonClick = async (e) => {
    if (e.key === 'Enter') {
      setError(''); // Resetando mensagem de erro
      setLoading(true); // Definindo o estado de carregamento como verdadeiro
      
      try {
        // Primeira chamada para a rota dados-oc
        const responseOc = await fetch(`${apiUrl}/programarColeta/dados-oc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ oc }) // Enviando oc no corpo da requisição
        });
  
        if (!responseOc.ok) {
          throw new Error('Erro na resposta do servidor');
        }
  
        const dataOc = await responseOc.json();
  
        if (dataOc.length > 0 && dataOc[0].STATUS !== 'Cancelamento') {
          setTomadorCnpj(dataOc[0].TOMADOR_CNPJ);
          setPagadorNome(dataOc[0].PAGADOR);
          setIdRastCliente(dataOc[0].ID_RAST_CLIENTE); // Armazenando o ID_RAST_CLIENTE
          setIdAgrupamento(dataOc[0].ID_AGRUPAMENTO);
          setUltimaOC(dataOc[0].ULT_OC + " - " + formatDate(dataOc[0].ENTREGA_PLANEJADA));
          setOrigem(dataOc[0].ORIGEM);
          setDestino(dataOc[0].DESTINO);
          setTipoVeiculo(dataOc[0].TIPO_VEICULO);
          setJanelaColeta(formatDate(dataOc[0].COLETA_PLANEJADA));
          setJanelaEntrega(formatDate(dataOc[0].ENTREGA_PLANEJADA));
          setCep(dataOc[0].ORIGEM_CEP);
          setCidade(dataOc[0].ORIGEM_CIDADE);
          setEstado(dataOc[0].ORIGEM_UF);
          setRota(dataOc[0].ROTA);
  
          // Segunda chamada para a rota oc-adjacentes
          const responseAdjacentes = await fetch(`${apiUrl}/programarColeta/oc-adjacentes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              idRastCliente: dataOc[0].ID_RAST_CLIENTE,
              idAgrupamento: dataOc[0].ID_AGRUPAMENTO,
              tomadorCnpj: dataOc[0].TOMADOR_CNPJ,
              oc: oc
            })
          });

          if (!responseAdjacentes.ok) {
            throw new Error('Erro na resposta do servidor');
          }
  
          const dataAdjacentes = await responseAdjacentes.json();
          setOcAdjacentes(dataAdjacentes); // Armazenando os dados das OC's adjacentes
          //console.log(ocAdjacentes) 
          const hasInvalidStatus = dataAdjacentes.some(item => item.STATUS !== 'Pedido de Coleta');
          const hasJaboatao = dataAdjacentes.some(item =>
            item.ORIGEM_CIDADE === 'JABOATAO DOS GUARARAPES' || item.DESTINO_CIDADE === 'JABOATAO DOS GUARARAPES'
          );

          const tomadorCnpjs = dataOc[0].TOMADOR_CNPJ;
          
          if (hasInvalidStatus && !hasJaboatao && tomadorCnpjs !== '16701716003414' && tomadorCnpjs !== '16701716000156' && tomadorCnpjs !== '16701716003686'
            && tomadorCnpjs !== '16701716002957' && tomadorCnpjs !== '16701716003171' && tomadorCnpjs !== '16701716001713' && tomadorCnpjs !== '16701716003333'
          ) {
            alert("Não é possível realizar essa programação. O status de uma ou mais coletas está diferente de pedido de coleta!");
            setIsButtonDisabled(true);
          }

          // Subtrair 3 horas dos horários
          const coletaSolicitadaDate = new Date(dataAdjacentes[0].PRIM_COLETA);
          coletaSolicitadaDate.setHours(coletaSolicitadaDate.getHours() - 3);
      
          const saidaColetaDate = new Date(dataAdjacentes[0].ULTIMA_ENTREGA);
          saidaColetaDate.setHours(saidaColetaDate.getHours() - 3);
  
          const veiculosDisponiveis = await fetch(`${apiUrl}/programarColeta/available-vehicles`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              oc: oc
            })
          });

          const dataDisponiveis = await veiculosDisponiveis.json();
          setveiculosDispo(dataDisponiveis);

          // Terceira chamada para a rota veiculos
          const responseVeiculos = await fetch(`${apiUrl}/programarColeta/veiculos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ordemColeta: oc,
              coletaSolicitada: coletaSolicitadaDate.toISOString(), // Converter de volta para string no formato ISO
              saidaColeta: saidaColetaDate.toISOString(), // Converter de volta para string no formato ISO
              pagador: dataOc[0].PAGADOR, // Usar o valor de pagador diretamente do dataOc
              tipoVeiculo: dataAdjacentes[0].TIPO_VEICULO_COT
            })
          });
  
          if (!responseVeiculos.ok) {
            throw new Error('Erro na resposta do servidor');
          }
          const dataVeiculos = await responseVeiculos.json();
          setVeiculosProximos(dataVeiculos.veiculosFormatados || []);

          if (dataVeiculos.veiculosFormatados && dataVeiculos.veiculosFormatados.length > 0) {
            handleRowClick(0, dataVeiculos.veiculosFormatados[0].ORDEM_COLETA);
          }

        } else {
          alert("Ordem de Coleta Cancelada!");
          window.location.reload();
          throw new Error('Nenhum dado encontrado');
        }
  
      } catch (error) {
        setError('Erro: ' + error.message);
      } finally {
        setLoading(false); // Definindo o estado de carregamento como falso
      }
    }
  }; 

  return (
    <>
      <Box sx={{ minHeight: '100vh', p: 2, pl: 0 }}>
        <Popup
          show={showPopup}
          onClose={() => {
            setShowPopup(false);
            setTimeout(() => {
              navigate('/coleta/programar');
            }, 1000);
          }}
          ocAdjacentes={ocAdjacentes}
        />
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2}>
                <Typography variant="subtitle2" gutterBottom>Ordem de Coleta</Typography>
                <TextField
                  value={oc}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="subtitle2" gutterBottom>Id Rast. Cliente</Typography>
                <TextField
                  value={idRastCliente}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>Última OC - Entrega</Typography>
                <TextField
                  value={ultimaOC}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Tooltip
                  title={
                    veiculosDispo.length > 0 ? (
                      <Box>
                        <Typography fontWeight="bold">Veículos Permitidos:</Typography>
                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                          {veiculosDispo.map((veiculo, idx) => (
                            <li key={idx}>{veiculo.sdesc_ntcav}</li>
                          ))}
                        </ul>
                      </Box>
                    ) : ''
                  }
                  arrow
                  placement="top"
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
                    <FontAwesomeIcon icon={faCircleExclamation} style={{ color: "#009e20", fontSize: 24 }} />
                    <Typography variant="caption" sx={{ ml: 1 }}>Veículos Permitidos</Typography>
                  </Box>
                </Tooltip>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {/* OC Adjacentes Table */}
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ordem de Coleta</TableCell>
                <TableCell>Origem</TableCell>
                <TableCell>Cidade - UF</TableCell>
                <TableCell>Destino</TableCell>
                <TableCell>Cidade - UF</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Horário Coleta</TableCell>
                <TableCell>Horário Entrega</TableCell>
                <TableCell>Tipo Veículo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ocAdjacentes.map((ocoleta, index) => (
                <TableRow
                  key={index}
                  sx={{
                    backgroundColor:
                      String(ocoleta.ORDEM_COLETA) === String(oc) &&
                        (
                          tomadorCnpj === '16701716003414' ||
                          tomadorCnpj === '16701716000156' ||
                          tomadorCnpj === '16701716003686' ||
                          tomadorCnpj === '16701716002957' ||
                          tomadorCnpj === '16701716003171' ||
                          tomadorCnpj === '16701716001713' ||
                          tomadorCnpj === '16701716003333'
                        )
                        ? '#e3f2fd'
                        : undefined
                  }}
                >
                  <TableCell>{ocoleta.ORDEM_COLETA}</TableCell>
                  <TableCell>{ocoleta.ORIGEM}</TableCell>
                  <TableCell>{ocoleta.ORIGEM_CIDADE} - {ocoleta.ORIGEM_UF}</TableCell>
                  <TableCell>{ocoleta.DESTINO}</TableCell>
                  <TableCell>{ocoleta.DESTINO_CIDADE} - {ocoleta.DESTINO_UF}</TableCell>
                  <TableCell>{ocoleta.STATUS}</TableCell>
                  <TableCell>{formatDate(ocoleta.COLETA_PLANEJADA)}</TableCell>
                  <TableCell>{formatDate(ocoleta.ENTREGA_PLANEJADA)}</TableCell>
                  <TableCell>{ocoleta.TIPO_VEICULO_COT}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pesquisa Manual */}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'center' }}>
            <CircularProgress size={28} sx={{ mr: 2 }} />
            <Typography>Carregando...</Typography>
          </Box>
        )}
        {localStorage.getItem('permissao') === 'admin' && (
          <Card sx={{ mb: 3, p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Typography variant="subtitle2">Pesquisa Manual</Typography>
              </Grid>
              <Grid item>
                <FormControl size="small">
                  <InputLabel id="tipoPesquisa-label">Tipo</InputLabel>
                  <Select
                    labelId="tipoPesquisa-label"
                    id="tipoPesquisa"
                    value={tipoPesquisa}
                    label="Tipo"
                    onChange={(e) => setTipoPesquisa(e.target.value)}
                  >
                    <MenuItem value="nome">Nome</MenuItem>
                    <MenuItem value="placa">Placa</MenuItem>
                    <MenuItem value="cpf">CPF</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <TextField
                  id="placa"
                  size="small"
                  value={placaPesquisa}
                  onChange={(e) => setPlacaPesquisa(e.target.value)}
                  placeholder={`Digite o(a) ${tipoPesquisa}`}
                />
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  onClick={handlePlacaPesquisa}
                  disabled={loading || !placaPesquisa}
                >
                  {loading ? 'Não Disponível' : 'Pesquisar'}
                </Button>
              </Grid>
            </Grid>
          </Card>
        )}

        {/* Veículos Próximos Table */}
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Última Coleta</TableCell>
                <TableCell>Horário Entrega</TableCell>
                <TableCell>Disp.</TableCell>
                <TableCell>Placa1</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell>Tipo Veículo</TableCell>
                <TableCell>Placa2</TableCell>
                <TableCell>Tipo Carreta</TableCell>
                <TableCell>Placa3</TableCell>
                <TableCell>Motorista</TableCell>
                <TableCell>Cidade - UF</TableCell>
                <TableCell>Distância</TableCell>
                <TableCell>Tempo</TableCell>
                <TableCell>Tempo (ETA-ETD)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {veiculosProximos.map((veiculo, index) => (
                <TableRow
                  key={index}
                  hover
                  selected={selectedRowIndex === index}
                  onClick={() => handleRowClick(index, veiculo.ORDEM_COLETA)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: selectedRowIndex === index ? '#e3f2fd' : undefined
                  }}
                >
                  <TableCell>{veiculo.ORDEM_COLETA}</TableCell>
                  <TableCell>{veiculo.ENTREGA ? formatDate(veiculo.ENTREGA) : ''}</TableCell>
                  <TableCell>
                    <Tooltip
                      title={
                        <Box>
                          <a
                            href={`https://www.google.com/maps?q=${veiculo.REALLAT},${veiculo.REALLONG}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#1976d2', textDecoration: 'none' }}
                          >
                            <FontAwesomeIcon icon={faMapPin} style={{ color: "#1976d2" }} /> Localização
                          </a>
                          <br />
                          {veiculo.STATUS === 30 && calcularDistancia(veiculo.EXPECTLAT, veiculo.EXPECTLONG, veiculo.REALLAT, veiculo.REALLONG) >= 5 && (
                            <strong style={{ color: 'red' }}>VEÍCULO EM LUGAR INESPERADO!</strong>
                          )}
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <span>
                        {veiculo.STATUS === 30 ? (
                          calcularDistancia(veiculo.EXPECTLAT, veiculo.EXPECTLONG, veiculo.REALLAT, veiculo.REALLONG) >= 5 ? (
                            <FontAwesomeIcon icon={faTruck} beat style={{ color: "#f40606" }} />
                          ) : (
                            <FontAwesomeIcon icon={faTruck} style={{ color: "#27bd06" }} />
                          )
                        ) : (
                          <FontAwesomeIcon icon={faTruck} style={{ color: "#f79b11" }} />
                        )}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{veiculo.PLACA1}</TableCell>
                  <TableCell>{veiculo.MODELO}</TableCell>
                  <TableCell>{veiculo.TIPO_VEICULO}</TableCell>
                  <TableCell>{veiculo.PLACA2}</TableCell>
                  <TableCell>{veiculo.TIPO_CARRETA}</TableCell>
                  <TableCell>{veiculo.PLACA3}</TableCell>
                  <TableCell>{veiculo.MOTORISTA}</TableCell>
                  <TableCell>{veiculo.DESTINO_CIDADE} - {veiculo.DESTINO_UF}</TableCell>
                  <TableCell>{veiculo.DISTANCIA}</TableCell>
                  <TableCell>{veiculo.TEMPO2}</TableCell>
                  <TableCell>{veiculo.TEMPO1}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Infos Coleta */}
        <Card sx={{ mb: 3, p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Operação"
                value={vehicOper}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
                sx={{ mb: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Rota"
                value={vehicRoute}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
                sx={{ mb: 1 }}
              />
            </Grid>
            {localStorage.getItem('permissao') === 'admin' && (
              <Grid item xs={12} md={3}>
                <TextField
                  label="Motorista"
                  value={motorista}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
              </Grid>
            )}
            <Grid item xs={12} md={3}>
              <TextField
                label="Origem"
                value={vehicOrigin}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
                sx={{ mb: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Destino"
                value={vehicDest}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
                sx={{ mb: 1 }}
              />
            </Grid>
          </Grid>
        </Card>

        {/* Botões de ação */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleExtendedProgram(oc)}
            disabled={isButtonDisabled}
            sx={{ minWidth: 140 }}
          >
            {isButtonDisabled ? 'Processando...' : 'Programar'}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleGoBack}
            sx={{ mt: { xs: 2, md: 0 } }}
          >
            Voltar
          </Button>
        </Box>

        {/* Legenda */}
        <Card sx={{ p: 2, bgcolor: '#f9fbe7' }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Legenda:
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Chip
              icon={<FontAwesomeIcon icon={faTruck} style={{ color: "#27bd06" }} />}
              label="Veículo Disponível e Livre"
              sx={{ bgcolor: '#e8f5e9', color: '#388e3c', fontWeight: 'bold' }}
            />
            <Chip
              icon={<FontAwesomeIcon icon={faTruck} beat style={{ color: "#f40606" }} />}
              label="Veículo Disponível e Livre mas com Posição Incorreta"
              sx={{ bgcolor: '#ffebee', color: '#d32f2f', fontWeight: 'bold' }}
            />
            <Chip
              icon={<FontAwesomeIcon icon={faTruck} style={{ color: "#f79b11" }} />}
              label="Veículo Disponível e Em viagem"
              sx={{ bgcolor: '#fffde7', color: '#fbc02d', fontWeight: 'bold' }}
            />
          </Box>
        </Card>
      </Box>
    </>
  );
}

export default OrdemColeta;