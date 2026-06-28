import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AgendaScreen } from '../screens/barber/AgendaScreen';
import { BarberStatsScreen } from '../screens/barber/BarberStatsScreen';
import { BarberScheduleScreen } from '../screens/barber/BarberScheduleScreen';

export type BarberStackParamList = {
  Agenda: undefined;
  Stats: undefined;
  Schedule: undefined;
};

const Stack = createNativeStackNavigator<BarberStackParamList>();

const BG   = '#0A0A0A';
const GOLD = '#C9A84C';
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
        options={({ navigation }) => ({
          title: 'Mi agenda',
          headerShown: false,
          // We add nav to stats via the AgendaScreen header
        })}
      />
      <Stack.Screen
        name="Stats"
        component={BarberStatsScreen}
        options={{ title: 'Estadísticas' }}
      />
      <Stack.Screen
        name="Schedule"
        component={BarberScheduleScreen}
        options={{ title: 'Mi horario' }}
      />
    </Stack.Navigator>
  );
}
