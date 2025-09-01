import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { API_URL } from '@env';
import io from 'socket.io-client';
import * as Location from 'expo-location';

const socket = io('http://192.168.82.170:3003'); // ajuste para seu backend

export default function SolicitarAbastecimento({ navigation, route }) {
    const nome = route?.params?.nome;
    const [solicitacaoId, setSolicitacaoId] = useState(null);
    const [litros, setLitros] = useState(null);
    const [situacao, setSituacao] = useState('Pendente');
    const [fadeAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        const solicitar = async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    alert('Permissão de localização negada');
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                const latitude = location.coords.latitude;
                const longitude = location.coords.longitude;

                const litrosAleatorio = Math.floor(Math.random() * 300) + 1;
                setLitros(litrosAleatorio);

                const res = await fetch(`${API_URL}/abastecimento/solicitar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario: nome,
                        placa: 'ABC123',
                        latitude,
                        longitude,
                        litros: litrosAleatorio,
                        situacao: 'Pendente'
                    }),
                });

                if (!res.ok) throw new Error('Erro ao solicitar abastecimento');

                const data = await res.json();
                // Salva o id como string para garantir comparação correta
                setSolicitacaoId(String(data.cd_solicitacao || data.solicitacaoId));
                setSituacao('Pendente');
            } catch (error) {
                setSolicitacaoId('Erro');
            }
        };

        solicitar();

        Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0.2, duration: 500, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            ])
        ).start();
    }, []);

useEffect(() => {
    const handleLiberada = (data) => {
        console.log('Evento recebido:', data, 'Meu solicitacaoId:', solicitacaoId);
        if (String(data.cd_solicitacao) === String(solicitacaoId)) {
            setSituacao('Liberado');
        }
    };

    socket.on('solicitacaoLiberada', handleLiberada);

    return () => {
        socket.off('solicitacaoLiberada', handleLiberada);
    };
}, [solicitacaoId]);

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>
                {solicitacaoId && solicitacaoId !== 'Erro'
                    ? `Solicitação Nº ${solicitacaoId} criada, ${litros} litros liberados`
                    : solicitacaoId === 'Erro'
                        ? 'Erro ao solicitar abastecimento'
                        : 'Enviando solicitação...'}
            </Text>
            {situacao === 'Pendente' ? (
                <Animated.Text style={[styles.aguardando, { opacity: fadeAnim }]}>
                    AGUARDANDO LIBERAÇÃO GESTOR
                </Animated.Text>
            ) : (
                <Animated.Text style={[styles.aprovado, { opacity: fadeAnim }]}>
                    ABASTECIMENTO APROVADO PELO GESTOR!
                </Animated.Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titulo: {
        fontSize: 24,
        marginBottom: 30,
        textAlign: 'center',
    },
    aguardando: {
        color: 'red',
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
        textShadowColor: '#ff0000',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    aprovado: {
        color: 'green',
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
        textShadowColor: '#00ff00',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
});