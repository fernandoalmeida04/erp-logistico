import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Image, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import TelaInicial from '../TelaInicial/TelaInicial';
import { API_URL } from '@env';

export default function Login({ navigation }) {
    const [usuario, setUsuario] = useState('');
    const [nome, setNome] = useState('');
    const [senha, setSenha] = useState('');
    const [logado, setLogado] = useState(false);
    const [mostrarSenha, setMostrarSenha] = useState(false);

    const handleLogin = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, senha }),
            });

            if (!res.ok) {
                throw new Error('Login falhou 1');
            }

            const data = await res.json();
            setNome(data.nome);

            if (data.ativo === 0 || data.ativo === '0') {
                Alert.alert('Usuário inativo', 'Entre em contato com o administrador.');
                return;
            }

            navigation.replace('TelaInicial', { nome: data.nome });
        } catch (error) {
            console.log(error);
            Alert.alert('Erro', 'Login falhou 2');
        }
    };

    // if (logado) {
    //     return <TelaInicial nome={nome} />;
    // }

    return (
        <View style={styles.container}>
            <Image
                source={require('../../../assets/logo4.png')}
                style={{ width: 200, height: 80, marginBottom: 20 }}
                resizeMode="contain"
            />
            <Text style={{ fontSize: 28, marginBottom: 20 }}>FKS Mobile</Text>
            <TextInput
                style={styles.input}
                placeholder="Login"
                value={usuario}
                onChangeText={setUsuario}
                autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', width: 250 }}>
                <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Senha"
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={!mostrarSenha}
                />
                <TouchableOpacity
                    onPress={() => setMostrarSenha(!mostrarSenha)}
                    style={{
                        marginLeft: 8,
                        padding: 8,
                        backgroundColor: '#eee',
                        borderRadius: 5,
                    }}
                >
                    <Text style={{ color: '#f37215', fontWeight: 'bold' }}>
                        {mostrarSenha ? 'Ocultar' : 'Ver'}
                    </Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>LOGIN</Text>
            </TouchableOpacity>
            <StatusBar style="auto" />
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
    input: {
        width: 250,
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#f37215',
        paddingVertical: 10,
        paddingHorizontal: 40,
        borderRadius: 5,
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});