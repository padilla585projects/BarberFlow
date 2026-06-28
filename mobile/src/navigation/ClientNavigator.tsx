import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/client/HomeScreen';
import { BarbershopScreen } from '../screens/client/BarbershopScreen';
import { BookScreen } from '../screens/client/BookScreen';
import { MyAppointmentsScreen } from '../screens/client/MyAppointmentsScreen';
import { signOut } from '../services/auth';

export type ClientStackParamList = {
  Home: undefined;
  Barbershop: { barbershopId: string; name: string };
  Book: { barbershopId: string; barbershopName: string };
  MyAppointments: undefined;
};

const Stack = createNativeStackNavigator<ClientStackParamList>();

// ── Theme (matches web-admin dark palette) ────────────────────────────────────
const BG   = '#0A0A0A';
const GOLD = '#C9A84C';
const TEXT = '#FFFFFF';

export function ClientNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: BG },
        headerShadowVisible: false,
        headerTintColor: TEXT,
        headerTitleStyle: { fontWeight: '700', color: TEXT },
        contentStyle: { backgroundColor: BG },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'BarberFlow',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('MyAppointments')}
              style={headerStyles.btn}
            >
              <Text style={headerStyles.btnText}>📅 Mis citas</Text>
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <TouchableOpacity
              onPress={signOut}
              style={headerStyles.btn}
            >
              <Text style={headerStyles.logoutText}>Salir</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Barbershop"
        component={BarbershopScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
      <Stack.Screen
        name="Book"
        component={BookScreen}
        options={{ title: 'Reservar cita' }}
      />
      <Stack.Screen
        name="MyAppointments"
        component={MyAppointmentsScreen}
        options={{ title: 'Mis citas' }}
      />
    </Stack.Navigator>
  );
}

const headerStyles = StyleSheet.create({
  btn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
