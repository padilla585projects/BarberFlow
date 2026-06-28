import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';
import type { Barbershop, OpeningHours } from '../../types';

type Props = NativeStackScreenProps<ClientStackParamList, 'Barbershop'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const DAY_LABELS: Record<keyof OpeningHours, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const DAY_ORDER: (keyof OpeningHours)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export function BarbershopScreen({ route, navigation }: Props) {
  const { barbershopId, name } = route.params;
  const [shop, setShop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'barbershops', barbershopId));
        if (snap.exists()) {
          setShop({ id: snap.id, ...snap.data() } as Barbershop);
        }
      } catch (err) {
        console.error('Error fetching barbershop:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [barbershopId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  const displayName = shop?.name ?? name;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
      </View>

      {/* Address & phone */}
      {shop && (
        <View style={styles.section}>
          {!!shop.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dirección</Text>
              <Text style={styles.infoValue}>{shop.address}</Text>
            </View>
          )}
          {!!shop.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{shop.phone}</Text>
            </View>
          )}
        </View>
      )}

      {/* Book CTA */}
      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() => navigation.navigate('Book', { barbershopId, barbershopName: displayName })}
        activeOpacity={0.85}
      >
        <Text style={styles.bookBtnText}>Reservar cita</Text>
      </TouchableOpacity>

      {/* Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Servicios</Text>
        {shop?.services && shop.services.length > 0 ? (
          shop.services.map((svc) => (
            <View key={svc.id} style={styles.serviceRow}>
              <Text style={styles.serviceName}>{svc.name}</Text>
              <View style={styles.serviceMeta}>
                <Text style={styles.serviceDuration}>{svc.duration} min</Text>
                <Text style={styles.servicePrice}>{svc.price} €</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.placeholder}>No hay servicios disponibles</Text>
        )}
      </View>

      {/* Opening hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Horario</Text>
        {shop?.openingHours ? (
          DAY_ORDER.map((day) => {
            const hours = shop.openingHours[day];
            return (
              <View key={day} style={styles.hoursRow}>
                <Text style={styles.dayName}>{DAY_LABELS[day]}</Text>
                <Text style={styles.dayHours}>
                  {hours?.open ? `${hours.from} – ${hours.to}` : 'Cerrado'}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.placeholder}>Horario no disponible</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 24, gap: 24 },
  centered: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },

  avatarWrap: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: GOLD, fontSize: 36, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', color: TEXT_C },

  section: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT_C, marginBottom: 4 },
  placeholder: { fontSize: 14, color: MUTED },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 14, fontWeight: '600', color: MUTED },
  infoValue: { fontSize: 14, color: TEXT_C, flexShrink: 1, textAlign: 'right' },

  bookBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  serviceName: { fontSize: 14, fontWeight: '600', color: TEXT_C, flex: 1 },
  serviceMeta: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  serviceDuration: { fontSize: 13, color: MUTED },
  servicePrice: { fontSize: 14, fontWeight: '700', color: GOLD, minWidth: 50, textAlign: 'right' },

  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayName: { fontSize: 14, fontWeight: '600', color: TEXT_C },
  dayHours: { fontSize: 14, color: MUTED },
});
