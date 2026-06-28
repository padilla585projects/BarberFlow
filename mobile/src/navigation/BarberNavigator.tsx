import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AgendaScreen } from '../screens/barber/AgendaScreen';

export type BarberStackParamList = {
  Agenda: undefined;
};

const Stack = createNativeStackNavigator<BarberStackParamList>();

const BG   = '#0A0A0A';
const TEXT  = '#FFFFFF';

export function BarberNavigator() {
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
        name="Agenda"
        component={AgendaScreen}
        options={{ title: 'Mi agenda', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
