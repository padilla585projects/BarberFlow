import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthContext } from '../contexts/AuthContext';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { ShopSelectorScreen } from '../screens/common/ShopSelectorScreen';
import { BarberHomeScreen } from '../screens/barber/BarberHomeScreen';
import { AgendaScreen } from '../screens/barber/AgendaScreen';
import { PaymentsScreen } from '../screens/barber/PaymentsScreen';
import { WalkInScreen } from '../screens/barber/WalkInScreen';
import { BarberStatsScreen } from '../screens/barber/BarberStatsScreen';
import { BarberScheduleScreen } from '../screens/barber/BarberScheduleScreen';
import { ScheduleTemplatesScreen } from '../screens/barber/ScheduleTemplatesScreen';
import { PortfolioScreen } from '../screens/barber/PortfolioScreen';
import { BeforeAfterScreen } from '../screens/barber/BeforeAfterScreen';
import { BarberReportsScreen } from '../screens/barber/BarberReportsScreen';
import { MessagesScreen } from '../screens/common/MessagesScreen';
import { NotificationSettingsScreen } from '../screens/common/NotificationSettingsScreen';
import { BugReportScreen } from '../screens/common/BugReportScreen';
import { BarberProfileScreen } from '../screens/barber/BarberProfileScreen';
import { ReviewsScreen } from '../screens/barber/ReviewsScreen';
import { FrequentClientsScreen } from '../screens/barber/FrequentClientsScreen';
import { AvailabilityScreen } from '../screens/barber/AvailabilityScreen';
import { BarberCommissionSettingsScreen } from '../screens/barber/BarberCommissionSettingsScreen';
import { useUnreadCount } from '../screens/common/NotificationsScreen';

export type BarberStackParamList = {
  Home: undefined;
  Agenda: undefined;
  WalkIn: undefined;
  Payments: undefined;
  Stats: undefined;
  Reports: undefined;
  Schedule: undefined;
  ScheduleTemplates: undefined;
  Portfolio: undefined;
  BeforeAfter: undefined;
  Messages: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  ShopSelector: undefined;
  BugReport: undefined;
  Availability: undefined;
  Profile: undefined;
  Reviews: undefined;
  FrequentClients: undefined;
  CommissionSettings: undefined;
};

const Stack = createNativeStackNavigator<BarberStackParamList>();
const Tab = createBottomTabNavigator();

const BG   = '#0A0A0A';
const GOLD = '#C9A84C';
const TEXT  = '#FFFFFF';

/**
 * Small header button shown when the barber belongs to multiple barbershops.
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: '#282828',
    // height + padding are set dynamically via insets in BarberNavigator
  },
  tabIcon: {
    fontSize: 22,
    lineHeight: 26,      // explicit lineHeight evita desajuste de emojis en Android
    includeFontPadding: false,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
});

// Home Tab Stack
function HomeTabStack() {
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
        name="Home"
        component={BarberHomeScreen}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notificaciones' }}
      />
      <Stack.Screen
        name="ShopSelector"
        component={ShopSelectorScreen}
        options={{
          title: 'Cambiar barbería',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}

// Agenda Tab Stack
function AgendaTabStack() {
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
        name="Agenda"
        component={AgendaScreen}
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
        name="WalkIn"
        component={WalkInScreen}
        options={{ title: 'Cita sin reserva' }}
      />
      <Stack.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{ title: 'Pagos' }}
      />
      <Stack.Screen
        name="ShopSelector"
        component={ShopSelectorScreen}
        options={{
          title: 'Cambiar barbería',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}

// Stats Tab Stack
function StatsTabStack() {
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
        name="Stats"
        component={BarberStatsScreen}
        options={{ title: 'Estadísticas' }}
      />
      <Stack.Screen
        name="Reports"
        component={BarberReportsScreen}
        options={{ title: 'Mis reportes' }}
      />
    </Stack.Navigator>
  );
}

// Profile Tab Stack
function ProfileTabStack() {
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
        name="Profile"
        component={BarberProfileScreen}
        options={{ title: 'Mi Perfil' }}
      />
    </Stack.Navigator>
  );
}

// More Tab Stack
function MoreTabStack() {
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
        name="Availability"
        component={AvailabilityScreen}
        options={{ title: 'Disponibilidad' }}
      />
      <Stack.Screen
        name="Schedule"
        component={BarberScheduleScreen}
        options={{ title: 'Mi horario' }}
      />
      <Stack.Screen
        name="ScheduleTemplates"
        component={ScheduleTemplatesScreen}
        options={{ title: 'Plantillas de horario' }}
      />
      <Stack.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={{ title: 'Mi Portfolio' }}
      />
      <Stack.Screen
        name="BeforeAfter"
        component={BeforeAfterScreen}
        options={{ title: 'Antes / Después' }}
      />
      <Stack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ title: 'Mis Reseñas' }}
      />
      <Stack.Screen
        name="FrequentClients"
        component={FrequentClientsScreen}
        options={{ title: 'Clientes Frecuentes' }}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Mensajes' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Preferencias de notificación' }}
      />
      <Stack.Screen
        name="BugReport"
        component={BugReportScreen}
        options={{ title: 'Reportar un problema' }}
      />
      <Stack.Screen
        name="CommissionSettings"
        component={BarberCommissionSettingsScreen}
        options={{ title: 'Configurar Comisión' }}
      />
    </Stack.Navigator>
  );
}

// Tab Bar Icon Component
//
// OJO — por qué esto NO era un simple problema de justifyContent:
// @react-navigation/bottom-tabs envuelve lo que devuelve `tabBarIcon` dentro
// de una cajita de tamaño FIJO (31x28dp) posicionada con `position: absolute`
// (ver TabBarIcon.js de la librería). Como aquí adentro metíamos ícono +
// etiqueta + gap (~40dp de alto), el contenido se desbordaba hacia abajo de
// esa cajita de 28dp — el ancla real siempre quedaba arriba del todo, sin
// importar qué justifyContent/alignItems pusiéramos en nuestros propios
// contenedores. Por eso ningún centrado nuestro cambiaba nada visualmente.
//
// Fix: dejar que `tabBarIcon` renderice SOLO el ícono (cabe bien en esa
// cajita de 28dp) y usar el mecanismo nativo de etiqueta de la librería
// (`tabBarShowLabel: true` + `tabBarLabel`) para el texto de abajo — ese sí
// se apila y centra correctamente porque no vive dentro de la cajita fija.
function TabBarIconOnly({ icon, isFocused }: { icon: string; isFocused: boolean }) {
  return (
    <Text style={[styles.tabIcon, { color: isFocused ? GOLD : '#666666' }]}>
      {icon}
    </Text>
  );
}

export function BarberNavigator() {
  const unreadCount = useUnreadCount();
  const insets = useSafeAreaInsets();

  // Altura total = contenido + safe area bottom (para no invadir la barra
  // de navegación por software del dispositivo).
  const tabBarHeight = 52 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: insets.bottom,
          },
        ],
        tabBarItemStyle: {
          flex: 1,
        },
        // Dejamos que la librería dibuje la etiqueta (ver comentario en
        // TabBarIconOnly de arriba sobre por qué NO metemos el label dentro
        // del slot del ícono).
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: '#666666',
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabStack}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIconOnly icon="🏠" isFocused={focused} />,
          tabBarLabel: 'Home',
        }}
      />

      <Tab.Screen
        name="AgendaTab"
        component={AgendaTabStack}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIconOnly icon="📅" isFocused={focused} />,
          tabBarLabel: 'Agenda',
        }}
      />

      <Tab.Screen
        name="StatsTab"
        component={StatsTabStack}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIconOnly icon="📊" isFocused={focused} />,
          tabBarLabel: 'Stats',
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileTabStack}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIconOnly icon="👤" isFocused={focused} />,
          tabBarLabel: 'Perfil',
        }}
      />

      <Tab.Screen
        name="MoreTab"
        component={MoreTabStack}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIconOnly icon="⚙️" isFocused={focused} />,
          tabBarLabel: 'Más',
        }}
      />
    </Tab.Navigator>
  );
}
