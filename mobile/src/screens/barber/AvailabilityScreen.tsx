import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '../../contexts/AuthContext';
import { auth, db } from '../../services/firebase';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';

export function AvailabilityScreen() {
  const { activeBarbershopId, firebaseUser, profile } = useAuthContext();
  const insets = useSafeAreaInsets();
  const barberId = firebaseUser?.uid;

  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Listen to user availability status
  useEffect(() => {
    if (!barberId) return;

    const userDocRef = doc(db, 'users', barberId);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsAvailable(docSnap.data().available ?? false);
        setLastUpdated(new Date());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [barberId]);

  const handleToggleAvailability = async (value: boolean) => {
    if (!barberId) return;

    setUpdating(true);
    try {
      const userDocRef = doc(db, 'users', barberId);
      await updateDoc(userDocRef, {
        available: value,
        availabilityUpdatedAt: new Date(),
      });

      Alert.alert(
        'Éxito',
        value
          ? 'Ahora estás disponible para nuevas citas'
          : 'Has desactivado tu disponibilidad'
      );
    } catch (error) {
      Alert.alert('Error', 'No pudimos actualizar tu disponibilidad. Intenta de nuevo.');
      console.error('Error updating availability:', error);
    } finally {
      setUpdating(false);
    }
  };

  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'hace unos segundos';
    if (diffMins < 60) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Status Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Mi Disponibilidad</Text>

        {/* Toggle Section */}
        <View style={styles.toggleSection}>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Estado</Text>
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              disabled={updating}
              trackColor={{ false: '#444444', true: GOLD + '60' }}
              thumbColor={isAvailable ? GOLD : '#666666'}
              style={styles.switch}
            />
          </View>

          {/* Big Status Text */}
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              {isAvailable ? '✓ Disponible' : '✗ No disponible'}
            </Text>
            <Text style={styles.statusSubtext}>
              {isAvailable
                ? 'Disponible para nuevas citas'
                : 'Los clientes no pueden reservarte ahora'}
            </Text>
          </View>
        </View>

        {/* Last Updated */}
        {lastUpdated && (
          <View style={styles.timestampBox}>
            <Text style={styles.timestampLabel}>Última actualización:</Text>
            <Text style={styles.timestamp}>
              {formatLastUpdated(lastUpdated)}
            </Text>
          </View>
        )}
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 Cómo funciona</Text>
        <Text style={styles.infoText}>
          • Cuando activas tu disponibilidad, los clientes pueden reservarte
        </Text>
        <Text style={styles.infoText}>
          • Cuando la desactivas, aparecerás como "No disponible"
        </Text>
        <Text style={styles.infoText}>
          • Los cambios se reflejan en tiempo real
        </Text>
      </View>

      {updating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={GOLD} />
          <Text style={styles.loadingText}>Actualizando...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#282828',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 24,
  },
  toggleSection: {
    marginBottom: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT,
  },
  switch: {
    transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }],
  },
  statusBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: GOLD + '40',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 28,
    fontWeight: '700',
    color: GOLD,
    marginBottom: 8,
  },
  statusSubtext: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
  },
  timestampBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  timestampLabel: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: TEXT,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
    marginBottom: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    color: TEXT,
    marginTop: 12,
    fontSize: 12,
  },
});
