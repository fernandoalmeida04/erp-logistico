import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

export default function DefinirPlaca({ navigation }) {
    const [cavalo, setCavalo] = useState('');
    const [carreta, setCarreta] = useState('');

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>Digite o cavalo e a carreta</Text>
            <TextInput
                style={styles.input}
                value={cavalo}
                onChangeText={setCavalo}
                placeholder="Placa do cavalo"
                autoCapitalize="characters"
                maxLength={7}
            />
            <TextInput
                style={styles.input}
                value={carreta}
                onChangeText={setCarreta}
                placeholder="Placa da carreta"
                autoCapitalize="characters"
                maxLength={7}
            />
            <Button
                title="Avançar"
                onPress={() => navigation.navigate('DefinirOrigem', { placaCavalo: cavalo, placaCarreta: carreta })}
                disabled={!cavalo || !carreta}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: '#fff',
        justifyContent: 'center',
    },
    titulo: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 18,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        fontSize: 18,
        marginBottom: 18,
        textAlign: 'center',
    },
});