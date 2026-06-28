import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { ShopAppointmentsScreen } from '../screens/owner/ShopAppointmentsScreen';
import { ShopServicesScreen } from '../screens/owner/ShopServicesScreen';
import { ShopBarbersScreen } from '../screens/owner/ShopBarbersScreen';

export type OwnerStackParamList = {
  Dashboard: undefined;
  ShopAppointments: undefined;
  ShopServices: undefined;
  ShopBarbers: undefined;
};

const Stack = createNativeStackNavigator<OwnerStackParamList>();

const BG   = '#0A0A0A';
const TEXT  = '#FFFFFF';

export function OwnerNavigator() {
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
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ShopAppointments"
        component={ShopAppointmentsScreen}
        options={{ title: 'Citas' }}
      />
      <Stack.Screen
        name="ShopServices"
        component={ShopServicesScreen}
        options={{ title: 'Servicios' }}
      />
      <Stack.Screen
        name="ShopBarbers"
        component={ShopBarbersScreen}
        options={{ title: 'Barberos' }}
      />
    </Stack.Navigator>
  );
}
