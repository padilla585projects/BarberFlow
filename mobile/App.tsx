import React, { useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation';
import { CartProvider } from './src/contexts/CartContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initSentry, wrapWithSentry } from './src/services/sentry';
import { UpdateBanner } from './src/components/UpdateBanner';
import { AlertProvider } from './src/components/AppAlert';

// Suppress non-critical warnings BEFORE any module initialization
// (LogBox must register patterns before initSentry() fires its warning)
LogBox.ignoreLogs([
  '[analytics] failed to log event',
  'Sentry DSN not configured',
  'FirebaseError: Missing or insufficient permissions',
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

// Initialize Sentry crash reporting (after LogBox patterns are registered)
initSentry();

// Keep native splash visible until auth state resolves
SplashScreen.preventAutoHideAsync();

function App() {
  const onReady = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      {/* La app es oscura de arriba abajo y el tema pone statusBarColor
          transparente, así que los iconos de la barra tienen que ser claros.
          Solo lo declaraban Login, Register y WorkWithUs: en el resto de
          pantallas la barra volvía al valor del sistema, y en un móvil con
          tema claro salían iconos oscuros sobre fondo negro. */}
      <StatusBar style="light" />
      <SafeAreaProvider>
        <CartProvider>
          <RootNavigator onReady={onReady} />
          {/* OTA update banner — appears when a new version is ready */}
          <UpdateBanner />
          {/* Themed replacement for native Alert.alert dialogs */}
          <AlertProvider />
        </CartProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default wrapWithSentry(App);
