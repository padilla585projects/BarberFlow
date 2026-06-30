import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuthContext } from '../contexts/AuthContext';
import { registerForPushNotifications } from '../services/notifications';
import { logScreenView } from '../services/analytics';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ShopSelectorScreen } from '../screens/common/ShopSelectorScreen';
import { ClientNavigator } from './ClientNavigator';
import { BarberNavigator } from './BarberNavigator';
import { OwnerNavigator } from './OwnerNavigator';

export type RootStackParamList = {
  Login: undefined;
  Client: undefined;
  Barber: undefined;
  Owner: undefined;
  ShopSelector: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  onReady?: () => void;
}

/** Walk the navigation state tree to find the currently active route name. */
function getActiveRouteName(state: NavigationState | undefined): string | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index];
  // Recurse into nested navigators
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name;
}

function RootNavigatorInner({ onReady }: RootNavigatorProps) {
  const { firebaseUser, role, activeBarbershopId, memberships, loading } = useAuthContext();
  const currentScreenRef = useRef<string | undefined>(undefined);

  const handleNavigationStateChange = useCallback(
    (state: NavigationState | undefined) => {
      const screenName = getActiveRouteName(state);
      if (screenName && screenName !== currentScreenRef.current) {
        currentScreenRef.current = screenName;
        logScreenView(screenName);
      }
    },
    [],
  );

  // Once auth resolves → hide the native splash screen
  useEffect(() => {
    if (!loading && onReady) {
      onReady();
    }
  }, [loading, onReady]);

  // Register push token once authenticated
  useEffect(() => {
    if (firebaseUser?.uid) {
      registerForPushNotifications(firebaseUser.uid).catch(console.error);
    }
  }, [firebaseUser?.uid]);

  // While loading, show a dark placeholder (native splash covers it)
  if (loading) {
    return <View style={styles.placeholder} />;
  }

  // Determine which navigator to show based on active membership
  const activeMembership = memberships.find(
    (m) => m.barbershopId === activeBarbershopId,
  );

  const getInitialScreen = (): keyof RootStackParamList => {
    if (!firebaseUser) return 'Login';

    // Developer always goes to Owner panel
    if (role === 'developer') return 'Owner';

    // User has memberships but none is selected → show shop selector
    if (memberships.length > 0 && !activeBarbershopId) return 'ShopSelector';

    // Route based on active membership's role
    if (activeMembership?.role === 'owner') return 'Owner';
    if (activeMembership?.role === 'barber') return 'Barber';

    // No memberships or active membership not found → client
    return 'Client';
  };

  const initialScreen = getInitialScreen();

  return (
    <NavigationContainer onStateChange={handleNavigationStateChange}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'fade' }}
        initialRouteName={initialScreen}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Client" component={ClientNavigator} />
        <Stack.Screen name="Barber" component={BarberNavigator} />
        <Stack.Screen name="Owner" component={OwnerNavigator} />
        <Stack.Screen
          name="ShopSelector"
          component={ShopSelectorScreen}
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A0A' },
            headerShadowVisible: false,
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', color: '#FFFFFF' },
            title: 'Cambiar barbería',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function RootNavigator({ onReady }: RootNavigatorProps) {
  return (
    <AuthProvider>
      <RootNavigatorInner onReady={onReady} />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  // Dark placeholder behind the native splash — no white flash
  placeholder: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
});
