import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthContext } from '../contexts/AuthContext';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { ShopSelectorScreen } from '../screens/common/ShopSelectorScreen';
import { AgendaScreen } from '../screens/barber/AgendaScreen';
import { BarberStatsScreen } from '../screens/barber/BarberStatsScreen';
import { BarberScheduleScreen } from '../screens/barber/BarberScheduleScreen';
import { ScheduleTemplatesScreen } from '../screens/barber/ScheduleTemplatesScreen';
import { PortfolioScreen } from '../screens/barber/PortfolioScreen';
import { BarberReportsScreen } from '../screens/barber/BarberReportsScreen';
import { MessagesScreen } from '../screens/common/MessagesScreen';
import { NotificationSettingsScreen } from '../screens/common/NotificationSettingsScreen';
import { BugReportScreen } from '../screens/common/BugReportScreen';

export type BarberStackParamList = {
  Agenda: undefined;
  Stats: undefined;
  Reports: undefined;
  Schedule: undefined;
  ScheduleTemplates: undefined;
  Portfolio: undefined;
  Messages: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  ShopSelector: undefined;
  BugReport: undefined;
};

const Stack = createNativeStackNavigator<BarberStackParamList>();

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

export function BarberNavigator() {
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
          // AgendaScreen manages its own header; only inject the switch button
          // via a minimal header when the barber has multiple shops.
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
        name="Stats"
        component={BarberStatsScreen}
        options={{ title: 'Estadísticas' }}
      />
      <Stack.Screen
        name="Reports"
        component={BarberReportsScreen}
        options={{ title: 'Mis reportes' }}
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
