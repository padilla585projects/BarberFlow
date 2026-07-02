import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import * as Updates from 'expo-updates';

const GOLD   = '#C9A84C';
const BG_BANNER = '#1A1500';
const TEXT_C = '#FFFFFF';

/**
 * UpdateBanner — shown when a new OTA update has been downloaded and is
 * ready to apply. The user taps the banner to reload the app instantly.
 *
 * Only active in non-dev builds (expo-updates is a no-op in Expo Go / dev).
 */
export function UpdateBanner() {
  const [isPending, setIsPending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const slideAnim = new Animated.Value(-80);

  // Listen for update state via useUpdates hook
  const { isUpdatePending } = Updates.useUpdates();

  // When update is pending (downloaded), animate the banner in
  useEffect(() => {
    if (isUpdatePending && !isPending) {
      setIsPending(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    }
  }, [isUpdatePending]);

  // On mount: check for update in the background (non-blocking)
  useEffect(() => {
    if (__DEV__) return; // expo-updates is disabled in development

    const checkAndFetch = async () => {
      try {
        setIsChecking(true);
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          // isUpdatePending will become true via useUpdates() once download completes
        }
      } catch {
        // Silently ignore — network errors should never block the user
      } finally {
        setIsChecking(false);
      }
    };

    checkAndFetch();
  }, []);

  const handleReload = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // If reload fails, dismiss the banner gracefully
      setIsPending(false);
    }
  };

  if (!isPending) return null;

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.content}>
        <Text style={styles.emoji}>✨</Text>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Actualización disponible</Text>
          <Text style={styles.subtitle}>Nueva versión lista para instalar</Text>
        </View>
        <TouchableOpacity
          style={styles.btn}
          onPress={handleReload}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: BG_BANNER,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    // Android shadow
    elevation: 8,
    // iOS shadow
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 44 : 54, // below status bar
    gap: 12,
  },
  emoji: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: TEXT_C,
    fontSize: 12,
    opacity: 0.7,
    marginTop: 1,
  },
  btn: {
    backgroundColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  btnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
});
