import React, { useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox } from 'react-native';
import { RootNavigator } from './src/navigation';
import { CartProvider } from './src/contexts/CartContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initSentry, wrapWithSentry } from './src/services/sentry';
import { UpdateBanner } from './src/components/UpdateBanner';

// Initialize Sentry crash reporting
initSentry();

// Suppress non-critical warnings that would show the LogBox bar to the user
LogBox.ignoreLogs([
  '[analytics] failed to log event',
  'Sentry DSN not configured',
  'FirebaseError: Missing or insufficient permissions',
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

// Keep native splash visible until auth state resolves
SplashScreen.preventAutoHideAsync();

function App() {
  const onReady = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <CartProvider>
          <RootNavigator onReady={onReady} />
          {/* OTA update banner — appears when a new version is ready */}
          <UpdateBanner />
        </CartProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default wrapWithSentry(App);
