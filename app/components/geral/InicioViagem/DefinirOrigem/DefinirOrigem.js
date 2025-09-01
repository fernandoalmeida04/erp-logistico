import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Button, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export default function DefinirOrigem({ navigation }) {
    const [region, setRegion] = useState({
        latitude: -23.55052,
        longitude: -46.633308,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });
    const [marker, setMarker] = useState(null);
    const [address, setAddress] = useState('');
    const mapRef = useRef(null);

    // Pega localização atual ao abrir o componente
    React.useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let location = await Location.getCurrentPositionAsync({});
            setRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        })();
    }, []);

    // Atualiza endereço ao mover marker
    const handleMapPress = async (e) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setMarker({ latitude, longitude });
        // Busca endereço reverso
        let [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (result) {
            setAddress(
                `${result.street || ''}, ${result.name || ''} - ${result.city || ''} - ${result.region || ''}`
            );
        }
    };

    // Atualiza marker ao digitar endereço
    const handleAddressChange = async (text) => {
        setAddress(text);
        if (text.length > 5) {
            try {
                let results = await Location.geocodeAsync(text);
                if (results && results.length > 0) {
                    const { latitude, longitude } = results[0];
                    setMarker({ latitude, longitude });
                    setRegion({
                        ...region,
                        latitude,
                        longitude,
                    });
                    if (mapRef.current) {
                        mapRef.current.animateToRegion({
                            latitude,
                            longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        });
                    }
                }
            } catch (e) {
                // endereço não encontrado
            }
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>Escolha a origem</Text>
            <TextInput
                style={styles.input}
                placeholder="Digite o endereço da origem"
                value={address}
                onChangeText={handleAddressChange}
            />
            <MapView
                ref={mapRef}
                style={styles.map}
                region={region}
                onPress={handleMapPress}
            >
                {marker && <Marker coordinate={marker} />}
            </MapView>
            <Button
                title="Confirmar origem"
                onPress={() => navigation.navigate('DefinirDestino', { origem: address, coordenadas: marker })}
                disabled={!marker || !address}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 8, paddingTop: 50 },
    titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 8,
        marginHorizontal: 8,
    },
    map: {
        flex: 1,
        borderRadius: 12,
        margin: 8,
        minHeight: 100,
        maxHeight: 400,
    },
});