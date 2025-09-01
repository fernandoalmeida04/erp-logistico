import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from './components/geral/login/Login';
import TelaInicial from './components/geral/TelaInicial/TelaInicial';
import Hubopcoes from './components/geral/HubOpcoes/Hubopcoes';
import DefinirPlaca from './components/geral/InicioViagem/DefinirPlacas/DefinirPlaca';
import DefinirOrigem from './components/geral/InicioViagem/DefinirOrigem/DefinirOrigem';
import DefinirDestino from './components/geral/InicioViagem/DefinirDestino/DefinirDestino';
import SolicitarAbastecimento from './components/abastecimento/SolicitarAbastecimento/SolicitarAbastecimento';

const Stack = createStackNavigator();
const ViagemStack = createStackNavigator();

function IniciarViagemStack() {
  return (
    <ViagemStack.Navigator screenOptions={{ headerShown: false }}>
      <ViagemStack.Screen name="DefinirPlaca" component={DefinirPlaca} />
      <ViagemStack.Screen name="DefinirOrigem" component={DefinirOrigem} />
      <ViagemStack.Screen name="DefinirDestino" component={DefinirDestino} />
      {/* Adicione outras telas do fluxo de viagem aqui */}
    </ViagemStack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="TelaInicial" component={TelaInicial} />
        <Stack.Screen name="IniciarViagem" component={IniciarViagemStack} />
        <Stack.Screen name="Hubopcoes" component={Hubopcoes} />
        <Stack.Screen name="SolicitarAbastecimento" component={SolicitarAbastecimento} />
        {/* Adicione outros stacks ou telas principais aqui */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}