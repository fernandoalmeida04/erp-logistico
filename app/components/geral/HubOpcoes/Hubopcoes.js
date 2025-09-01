import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import DefinirPlaca from '../InicioViagem/DefinirPlacas/DefinirPlaca';
import { API_URL } from '@env';

export default function TelaInicial({ navigation, route }) {
    const [usuario, setUsuario] = useState('');
    const nome = route?.params?.nome;

    useEffect(() => {
        if (nome) {
            const primeiroNome = nome.split(' ')[0];
            setUsuario(primeiroNome);
        }
    }, []);

    const handleBotao1 = () => {
        navigation.navigate('SolicitarAbastecimento', { nome: usuario });
    };

    return (
        <View style={styles.container}>
            {/* <Text style={{ fontSize: 20, marginTop: 50 }}>
                Login realizado, bem vindo {usuario ? usuario.charAt(0).toUpperCase() + usuario.slice(1) : 'Usuário'}!
            </Text> */}

            <View style={styles.buttonsRow}>
                <TouchableOpacity style={styles.menuButton1} onPress={handleBotao1}>
                    <Text style={styles.menuButtonText1}>Solicitar Abastecimento</Text>
                </TouchableOpacity>
            </View>

            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 300,
        marginTop: 90,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 300,
        marginTop: 30,
    },
    menuButton1: {
        flex: 1,
        backgroundColor: '#4456DB',
        marginHorizontal: 10,
        paddingVertical: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuButtonText1: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});