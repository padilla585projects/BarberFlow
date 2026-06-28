import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'Barbershop'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

export function BarbershopScreen({ route, navigation }: Props) {
  const { barbershopId, name } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
      </View>

      {/* Book CTA */}
      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() => navigation.navigate('Book', { barbershopId, barbershopName: name })}
        activeOpacity={0.85}
      >
        <Text style={styles.bookBtnText}>Reservar cita</Text>
      </TouchableOpacity>

      {/* Placeholder sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Servicios</Text>
        <Text style={styles.placeholder}>Los servicios disponibles se mostrarán aquí</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Horario</Text>
        <Text style={styles.placeholder}>Lunes – Viernes: 09:00 – 20:00</Text>
        <Text style={styles.placeholder}>Sábado: 09:00 – 18:00</Text>
        <Text style={styles.placeholder}>Domingo: Cerrado</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 24, gap: 24 },
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
  name: { fontSize: 24, fontWeight: '800', color: TEXT },
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
  section: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 4 },
  placeholder: { fontSize: 14, color: MUTED },
});
