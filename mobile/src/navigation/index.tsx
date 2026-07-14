import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuthContext } from '../contexts/AuthContext';
import { registerForPushNotifications } from '../services/notifications';
import { logScreenView } from '../services/analytics';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ShopSelectorScreen } from '../screens/common/ShopSelectorScreen';
import { ClientNavigator } from './ClientNavigator';
import { BarberNavigator } from './BarberNavigator';
import { OwnerNavigator } from './OwnerNavigator';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
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

  // Register push token once authenticated.
  // Gated on !loading — must wait until useAuth's getDoc/setDoc has settled,
  // otherwise this can race the profile-creation write and try to update a
  // users/{uid} doc that doesn't exist yet ("No document to update").
  useEffect(() => {
    if (firebaseUser?.uid && !loading) {
      registerForPushNotifications(firebaseUser.uid).catch(console.error);
    }
  }, [firebaseUser?.uid, loading]);

  // While loading, show a dark placeholder (native splash covers it)
  if (loading) {
    return <View style={styles.placeholder} />;
  }

  // Determine which screens to show based on auth state
  const isSignedIn = !!firebaseUser;

  const activeMembership = isSignedIn
    ? memberships.find((m) => m.barbershopId === activeBarbershopId)
    : undefined;

  // Role logic: you only see the owner/barber panel if you HAVE an active barbershop.
  // No barbershop → client view, even if your role is owner/developer.
  const effectiveRole = !isSignedIn
    ? null
    : !activeBarbershopId
      ? 'client'
      : role === 'developer'
        ? 'owner'
        : activeMembership?.role ?? 'client';

  const needsShopSelector = isSignedIn && memberships.length > 0 && !activeBarbershopId;

  return (
    <NavigationContainer onStateChange={handleNavigationStateChange}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isSignedIn ? (
          // ── Auth screens ────────────────────────────────────────────
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        ) : needsShopSelector ? (
          // ── Needs to pick a barbershop ──────────────────────────────
          <Stack.Screen
            name="ShopSelector"
            component={ShopSelectorScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#0A0A0A' },
              headerShadowVisible: false,
              headerTintColor: '#FFFFFF',
              headerTitleStyle: { fontWeight: '700', color: '#FFFFFF' },
              title: 'Selecciona tu barbería',
            }}
          />
        ) : (
          // ── Main app based on role ─────────────────────────────────
          <>
            {effectiveRole === 'owner' && (
              <Stack.Screen name="Owner" component={OwnerNavigator} />
            )}
            {effectiveRole === 'barber' && (
              <Stack.Screen name="Barber" component={BarberNavigator} />
            )}
            {effectiveRole === 'client' && (
              <Stack.Screen name="Client" component={ClientNavigator} />
            )}
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
          </>
        )}
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
