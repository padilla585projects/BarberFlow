import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useLogout';
import { db } from '../../services/firebase';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

export function BarberProfileScreen() {
  const { firebaseUser, profile } = useAuthContext();
  const { handleLogout } = useLogout();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [barberData, setBarberData] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!firebaseUser?.uid) return;
      try {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBarberData(docSnap.data());
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [firebaseUser?.uid]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Mi Perfil</Text>

        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.displayName || firebaseUser?.displayName)?.charAt(0)?.toUpperCase() || 'B'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile?.displayName || firebaseUser?.displayName || 'Barbero'}</Text>
            <Text style={styles.email}>{firebaseUser?.email}</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.statRow}>
          <Text style={styles.label}>Clientes totales</Text>
          <Text style={styles.value}>{barberData?.totalClients || 0}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.label}>Citas completadas</Text>
          <Text style={styles.value}>{barberData?.totalAppointments || 0}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.label}>Calificación promedio</Text>
          <Text style={styles.value}>
            {barberData?.averageRating?.toFixed(1) || '0.0'} ⭐
          </Text>
        </View>

        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Editar Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.dangerBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: GOLD + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: GOLD,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  email: {
    fontSize: 12,
    color: MUTED,
  },
  separator: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  label: {
    fontSize: 14,
    color: MUTED,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: GOLD,
  },
  editButton: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: BG,
  },
  dangerBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
  },
});
