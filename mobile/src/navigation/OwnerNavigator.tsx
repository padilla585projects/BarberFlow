import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthContext } from '../contexts/AuthContext';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { ShopSelectorScreen } from '../screens/common/ShopSelectorScreen';
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
import { ClientPaymentsScreen } from '../screens/owner/ClientPaymentsScreen';
import { CreateBarbershopScreen } from '../screens/owner/CreateBarbershopScreen';
import { MessagesScreen } from '../screens/common/MessagesScreen';
import { NotificationSettingsScreen } from '../screens/common/NotificationSettingsScreen';
import { BugReportScreen } from '../screens/common/BugReportScreen';

export type OwnerStackParamList = {
  Dashboard: undefined;
  CreateBarbershop: undefined;
  ShopAppointments: { initialFilter?: 'all' | 'pending' | 'today' } | undefined;
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
  ClientPayments: undefined;
  ShopSettings: undefined;
  Messages: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  ShopSelector: undefined;
  BugReport: undefined;
};

const Stack = createNativeStackNavigator<OwnerStackParamList>();

const BG   = '#0A0A0A';
const GOLD = '#C9A84C';
const TEXT  = '#FFFFFF';

/**
 * Small header button shown when the owner belongs to multiple barbershops.
 * Navigates to ShopSelectorScreen so they can switch context.
 */
function ShopSwitchButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={switchStyles.btn}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={switchStyles.icon}>⇄</Text>
    </TouchableOpacity>
  );
}

const switchStyles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1A1500',
    borderWidth: 1,
    borderColor: GOLD + '60',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  icon: {
    fontSize: 16,
    color: GOLD,
    fontWeight: '700',
  },
});

export function OwnerNavigator() {
  const { memberships } = useAuthContext();
  const hasMultipleShops = memberships.length > 1;

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
        options={({ navigation }) => ({
          headerShown: hasMultipleShops,
          title: '',
          headerRight: hasMultipleShops
            ? () => (
                <ShopSwitchButton
                  onPress={() => navigation.navigate('ShopSelector')}
                />
              )
            : undefined,
        })}
      />
      <Stack.Screen
        name="CreateBarbershop"
        component={CreateBarbershopScreen}
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
        name="ClientPayments"
        component={ClientPaymentsScreen}
        options={{ title: 'Cobros de clientes' }}
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
      <Stack.Screen
        name="ShopSelector"
        component={ShopSelectorScreen}
        options={{
          title: 'Cambiar barbería',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="BugReport"
        component={BugReportScreen}
        options={{ title: 'Reportar un problema' }}
      />
    </Stack.Navigator>
  );
}
