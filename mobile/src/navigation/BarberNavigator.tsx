import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthContext } from '../contexts/AuthContext';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { ShopSelectorScreen } from '../screens/common/ShopSelectorScreen';
import { BarberHomeScreen } from '../screens/barber/BarberHomeScreen';
import { AgendaScreen } from '../screens/barber/AgendaScreen';
import { PaymentsScreen } from '../screens/barber/PaymentsScreen';
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
import { useUnreadCount } from '../screens/common/NotificationsScreen';

export type BarberStackParamList = {
  Home: undefined;
  Agenda: undefined;
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
    height: 60,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: '#282828',
    paddingTop: 4,
    paddingBottom: 8,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
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
    </Stack.Navigator>
  );
}

// Tab Bar Icon Component
function TabBarIcon({ icon, label, isFocused }: { icon: string; label: string; isFocused: boolean }) {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[
        styles.tabIcon,
        { color: isFocused ? GOLD : '#666666' }
      ]}>
        {icon}
      </Text>
      <Text style={[
        styles.tabLabel,
        { color: isFocused ? GOLD : '#666666' }
      ]}>
        {label}
      </Text>
    </View>
  );
}

export function BarberNavigator() {
  const unreadCount = useUnreadCount();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: '#666666',
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="🏠" label="Home" isFocused={focused} />
          ),
          tabBarLabel: 'Home',
        }}
      />

      <Tab.Screen
        name="AgendaTab"
        component={AgendaTabStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="📅" label="Agenda" isFocused={focused} />
          ),
          tabBarLabel: 'Agenda',
        }}
      />

      <Tab.Screen
        name="StatsTab"
        component={StatsTabStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="📊" label="Stats" isFocused={focused} />
          ),
          tabBarLabel: 'Stats',
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileTabStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="👤" label="Perfil" isFocused={focused} />
          ),
          tabBarLabel: 'Perfil',
        }}
      />

      <Tab.Screen
        name="MoreTab"
        component={MoreTabStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="⚙️" label="Más" isFocused={focused} />
          ),
          tabBarLabel: 'Más',
        }}
      />
    </Tab.Navigator>
  );
}
