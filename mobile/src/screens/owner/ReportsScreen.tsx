import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Share,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import app from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

type Period = 'week' | 'month';

export function ReportsScreen() {
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');

  const handleExport = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);

      // Get barbershopId
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const barbershopId = userDoc.data()?.barbershopId;
      if (!barbershopId) {
        Alert.alert('Error', 'No se encontró tu barbería');
        return;
      }

      // Call Cloud Function
      const functions = getFunctions(app, 'europe-west1');
      const generate = httpsCallable<
        { barbershopId: string; period: Period },
        { base64: string; filename: string }
      >(functions, 'generateReport');

      const result = await generate({ barbershopId, period: selectedPeriod });
      const { base64, filename } = result.data;

      // Save to device
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share
      await Share.share({
        url: fileUri,
        title: filename,
        message: `Reporte ${selectedPeriod === 'week' ? 'semanal' : 'mensual'} de BarberFlow`,
      });
    } catch (err: any) {
      console.error('[ReportsScreen] Error:', err);
      Alert.alert('Error', err.message ?? 'No se pudo generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Exportar reporte</Text>
      <Text style={styles.sub}>
        Genera un archivo Excel con las citas y ventas de tu barbería
      </Text>

      {/* Period selector */}
      <Text style={styles.sectionLabel}>Periodo</Text>
      <View style={styles.periodRow}>
        <TouchableOpacity
          style={[styles.periodBtn, selectedPeriod === 'week' && styles.periodBtnActive]}
          onPress={() => setSelectedPeriod('week')}
          activeOpacity={0.8}
        >
          <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>
            Última semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodBtn, selectedPeriod === 'month' && styles.periodBtnActive]}
          onPress={() => setSelectedPeriod('month')}
          activeOpacity={0.8}
        >
          <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>
            Último mes
          </Text>
        </TouchableOpacity>
      </View>

      {/* What's included */}
      <Text style={styles.sectionLabel}>Incluye</Text>
      <View style={styles.includesCard}>
        <IncludeRow emoji="📋" text="Todas las citas (fecha, cliente, barbero, estado, precio)" />
        <IncludeRow emoji="💰" text="Todas las ventas (fecha, barbero, artículos, total)" />
        <IncludeRow emoji="📊" text="Formato Excel (.xlsx) con 2 hojas" />
      </View>

      {/* Export button */}
      <TouchableOpacity
        style={[styles.exportBtn, loading && styles.btnDisabled]}
        onPress={handleExport}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.exportBtnText}>
            Generar reporte {selectedPeriod === 'week' ? 'semanal' : 'mensual'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function IncludeRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={includeStyles.row}>
      <Text style={includeStyles.emoji}>{emoji}</Text>
      <Text style={includeStyles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 24, gap: 24 },
  heading: { fontSize: 26, fontWeight: '800', color: TEXT },
  sub: { fontSize: 14, color: MUTED, lineHeight: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  periodRow: { flexDirection: 'row', gap: 10 },
  periodBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    alignItems: 'center',
  },
  periodBtnActive: { borderColor: GOLD, backgroundColor: GOLD },
  periodText: { fontSize: 15, fontWeight: '600', color: TEXT },
  periodTextActive: { color: '#000' },
  includesCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  exportBtn: {
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
  btnDisabled: { opacity: 0.5 },
  exportBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});

const includeStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 20 },
  text: { flex: 1, fontSize: 14, color: TEXT, lineHeight: 20 },
});
