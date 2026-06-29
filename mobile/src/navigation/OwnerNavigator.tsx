import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { DashboardScreen } from '../screens/owner/DashboardScreen';
import { ShopAppointmentsScreen } from '../screens/owner/ShopAppointmentsScreen';
import { ShopServicesScreen } from '../screens/owner/ShopServicesScreen';
import { ShopBarbersScreen } from '../screens/owner/ShopBarbersScreen';
import { SalesScreen } from '../screens/owner/SalesScreen';
import { InventoryScreen } from '../screens/owner/InventoryScreen';
import { ClientHistoryScreen } from '../screens/owner/ClientHistoryScreen';
import { ClientDetailScreen } from '../screens/owner/ClientDetailScreen';
import { ReportsScreen } from '../screens/owner/ReportsScreen';
import { ReviewsScreen } from '../screens/owner/ReviewsScreen';
import { GalleryScreen } from '../screens/owner/GalleryScreen';
import { PromosScreen } from '../screens/owner/PromosScreen';
import { BarberEarningsScreen } from '../screens/owner/BarberEarningsScreen';
import { FinanceDashboardScreen } from '../screens/owner/FinanceDashboardScreen';
import { LoyaltySettingsScreen } from '../screens/owner/LoyaltySettingsScreen';
import { WaitlistScreen } from '../screens/owner/WaitlistScreen';
import { ShopSettingsScreen } from '../screens/owner/ShopSettingsScreen';
import { ProductOrdersScreen } from '../screens/owner/ProductOrdersScreen';
import { PaymentHistoryScreen } from '../screens/owner/PaymentHistoryScreen';
import { MessagesScreen } from '../screens/common/MessagesScreen';
import { NotificationSettingsScreen } from '../screens/common/NotificationSettingsScreen';

export type OwnerStackParamList = {
  Dashboard: undefined;
  ShopAppointments: undefined;
  ShopServices: undefined;
  ShopBarbers: undefined;
  Sales: undefined;
  Inventory: undefined;
  ClientHistory: undefined;
  ClientDetail: { clientId: string; clientName: string };
  Reports: undefined;
  Reviews: undefined;
  Gallery: undefined;
  Promos: undefined;
  BarberEarnings: { barberId: string; barberName: string };
  FinanceDashboard: undefined;
  LoyaltySettings: undefined;
  Waitlist: undefined;
  ProductOrders: undefined;
  PaymentHistory: undefined;
  ShopSettings: undefined;
  Messages: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
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
        name="ClientDetail"
        component={ClientDetailScreen}
        options={{ title: 'Detalle de cliente' }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reportes' }}
      />
      <Stack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ title: 'Valoraciones' }}
      />
      <Stack.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{ title: 'Galería' }}
      />
      <Stack.Screen
        name="Promos"
        component={PromosScreen}
        options={{ title: 'Promociones' }}
      />
      <Stack.Screen
        name="BarberEarnings"
        component={BarberEarningsScreen}
        options={({ route }) => ({
          title: route.params.barberName,
        })}
      />
      <Stack.Screen
        name="FinanceDashboard"
        component={FinanceDashboardScreen}
        options={{ title: 'Finanzas' }}
      />
      <Stack.Screen
        name="LoyaltySettings"
        component={LoyaltySettingsScreen}
        options={{ title: 'Fidelidad' }}
      />
      <Stack.Screen
        name="Waitlist"
        component={WaitlistScreen}
        options={{ title: 'Lista de espera' }}
      />
      <Stack.Screen
        name="ProductOrders"
        component={ProductOrdersScreen}
        options={{ title: 'Pedidos' }}
      />
      <Stack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{ title: 'Historial de Pagos' }}
      />
      <Stack.Screen
        name="ShopSettings"
        component={ShopSettingsScreen}
        options={{ title: 'Configuración' }}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Mensajes' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notificaciones' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Preferencias de notificación' }}
      />
    </Stack.Navigator>
  );
}
