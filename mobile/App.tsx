import React, { useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { RootNavigator } from './src/navigation';
import { CartProvider } from './src/contexts/CartContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Keep native splash visible until auth state resolves
SplashScreen.preventAutoHideAsync();

export default function App() {
  const onReady = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <CartProvider>
          <RootNavigator onReady={onReady} />
        </CartProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
