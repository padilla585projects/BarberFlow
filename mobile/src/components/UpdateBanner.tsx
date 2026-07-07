import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import * as Updates from 'expo-updates';

const GOLD      = '#C9A84C';
const BG_BANNER = '#1A1500';
const TEXT_C    = '#FFFFFF';

/**
 * UpdateBanner — shown when a new OTA update has been downloaded and is
 * ready to apply. The user taps the banner to reload the app instantly.
 *
 * Only active in non-dev builds (expo-updates is a no-op in Expo Go / dev).
 */
export function UpdateBanner() {
  const [isPending, setIsPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // useRef so Animated.Value is NOT recreated on every render
  const slideAnim = useRef(new Animated.Value(-120)).current;

  const { isUpdatePending } = Updates.useUpdates();

  // When update is downloaded and ready, slide the banner in
  useEffect(() => {
    if (isUpdatePending && !isPending) {
      setIsPending(true);
    }
  }, [isUpdatePending]);

  // Animate in when isPending flips to true
  useEffect(() => {
    if (isPending) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    }
  }, [isPending]);

  // On mount: proactively check + download any pending update
  useEffect(() => {
    if (__DEV__) return; // expo-updates is disabled in Expo Go / dev mode

    const checkAndFetch = async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          // isUpdatePending will flip via useUpdates() once download finishes
        }
      } catch {
        // Network errors must never block the user
      }
    };

    checkAndFetch();
  }, []);

  const handleReload = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      setIsPending(false);
    }
  };

  if (!isPending || dismissed) return null;

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
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <Text style={styles.closeBtnText}>✕</Text>
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
    elevation: 8,
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
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    gap: 12,
  },
  emoji: { fontSize: 22 },
  textWrap: { flex: 1 },
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
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '700',
  },
});
