import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { ShopAppointmentsScreen } from '../screens/owner/ShopAppointmentsScreen';
import { ShopServicesScreen } from '../screens/owner/ShopServicesScreen';
import { ShopBarbersScreen } from '../screens/owner/ShopBarbersScreen';
import { SalesScreen } from '../screens/owner/SalesScreen';
import { InventoryScreen } from '../screens/owner/InventoryScreen';
import { ClientHistoryScreen } from '../screens/owner/ClientHistoryScreen';
import { ReportsScreen } from '../screens/owner/ReportsScreen';

export type OwnerStackParamList = {
  Dashboard: undefined;
  ShopAppointments: undefined;
  ShopServices: undefined;
  ShopBarbers: undefined;
  Sales: undefined;
  Inventory: undefined;
  ClientHistory: undefined;
  Reports: undefined;
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
      <Stack.Screen
        name="Sales"
        component={SalesScreen}
        options={{ title: 'Cobrar' }}
      />
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: 'Inventario' }}
      />
      <Stack.Screen
        name="ClientHistory"
        component={ClientHistoryScreen}
        options={{ title: 'Clientes' }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reportes' }}
      />
    </Stack.Navigator>
  );
}
