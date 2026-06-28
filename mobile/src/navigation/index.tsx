import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { registerForPushNotifications } from '../services/notifications';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ClientNavigator } from './ClientNavigator';
import { BarberNavigator } from './BarberNavigator';
import { OwnerNavigator } from './OwnerNavigator';

export type RootStackParamList = {
  Login: undefined;
  Client: undefined;
  Barber: undefined;
  Owner: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  onReady?: () => void;
}

export function RootNavigator({ onReady }: RootNavigatorProps) {
  const { firebaseUser, role, loading } = useAuth();

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

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!firebaseUser ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : role === 'barber' ? (
          <Stack.Screen name="Barber" component={BarberNavigator} />
        ) : role === 'owner' || role === 'developer' ? (
          <Stack.Screen name="Owner" component={OwnerNavigator} />
        ) : (
          <Stack.Screen name="Client" component={ClientNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  // Dark placeholder behind the native splash — no white flash
  placeholder: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
});
