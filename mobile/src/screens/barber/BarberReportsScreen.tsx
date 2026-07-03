import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { auth, db } from '../../services/firebase';
import app from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';
const GREEN   = '#10B981';
const BLUE    = '#3B82F6';

interface ServiceBreakdown {
  name: string;
  count: number;
  revenue: number;
}

interface ProductBreakdown {
  name: string;
  quantity: number;
  revenue: number;
}

interface BarberReport {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  serviceRevenue: number;
  productRevenue: number;
  totalRevenue: number;
  services: ServiceBreakdown[];
  products: ProductBreakdown[];
}

type Period = 'today' | 'week' | 'month';

export function BarberReportsScreen() {
  const { activeBarbershopId } = useAuthContext();
  const user = auth.currentUser;
  const [report, setReport] = useState<BarberReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');

  const fetchReport = useCallback(async () => {
    if (!user || !activeBarbershopId) return;

    try {
      const now = new Date();
      const start = new Date(now);
      if (selectedPeriod === 'today') {
        // start stays as today
      } else if (selectedPeriod === 'week') {
        start.setDate(start.getDate() - 7);
      } else {
        start.setDate(start.getDate() - 30);
      }
      start.setHours(0, 0, 0, 0);

      // Fetch appointments
      const apptSnap = await getDocs(query(
        collection(db, 'appointments'),
        where('barberId', '==', user.uid),
        where('barbershopId', '==', activeBarbershopId),
        where('date', '>=', start),
      ));

      // Fetch sales
      const salesSnap = await getDocs(query(
        collection(db, 'sales'),
        where('barberId', '==', user.uid),
        where('barbershopId', '==', activeBarbershopId),
        where('date', '>=', start),
      ));

      // Process appointments
      let completed = 0, cancelled = 0, noShow = 0;
      let serviceRevenue = 0;
      const serviceMap = new Map<string, ServiceBreakdown>();

      apptSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'completed') {
          completed++;
          serviceRevenue += data.totalPrice ?? 0;
          // Break down by service
          const services = data.services ?? [];
          services.forEach((s: { name: string; price: number }) => {
            const existing = serviceMap.get(s.name);
            if (existing) {
              existing.count++;
              existing.revenue += s.price ?? 0;
            } else {
              serviceMap.set(s.name, { name: s.name, count: 1, revenue: s.price ?? 0 });
            }
          });
        } else if (data.status === 'cancelled') {
          cancelled++;
        } else if (data.status === 'no_show') {
          noShow++;
        }
      });

      // Process sales for products
      let productRevenue = 0;
      const productMap = new Map<string, ProductBreakdown>();

      salesSnap.docs.forEach((d) => {
        const data = d.data();
        const items = data.items ?? [];
        items.forEach((item: { type: string; name: string; price: number; quantity: number }) => {
          if (item.type === 'product') {
            const total = (item.price ?? 0) * (item.quantity ?? 1);
            productRevenue += total;
            const existing = productMap.get(item.name);
            if (existing) {
              existing.quantity += item.quantity ?? 1;
              existing.revenue += total;
            } else {
              productMap.set(item.name, {
                name: item.name,
                quantity: item.quantity ?? 1,
                revenue: total,
              });
            }
          }
        });
      });

      const services = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count);
      const products = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);

      setReport({
        totalAppointments: apptSnap.size,
        completed,
        cancelled,
        noShow,
        serviceRevenue,
        productRevenue,
        totalRevenue: serviceRevenue + productRevenue,
        services,
        products,
      });
    } catch (err) {
      console.error('[BarberReportsScreen] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, activeBarbershopId, selectedPeriod]);

  useEffect(() => {
    setLoading(true);
    fetchReport();
  }, [fetchReport]);

  const handleExport = async () => {
    if (!activeBarbershopId || !user) {
      Alert.alert('Error', 'No se encontró tu barbería');
      return;
    }

    try {
      setExporting(true);
      const functions = getFunctions(app, 'europe-west1');
      const generate = httpsCallable<
        { barbershopId: string; period: Period; barberId: string },
        { base64: string; filename: string }
      >(functions, 'generateBarberReport');

      const result = await generate({
        barbershopId: activeBarbershopId,
        period: selectedPeriod,
        barberId: user.uid,
      });
      const { base64, filename } = result.data;

      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Share.share({
        url: fileUri,
        title: filename,
      });
    } catch (err) {
      console.error('[BarberReportsScreen] Export error:', err);
      Alert.alert('Error', 'No se pudo generar el reporte. Inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: MUTED, fontSize: 15 }}>No se pudieron cargar los datos</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchReport(); }}
          tintColor={GOLD}
        />
      }
    >
      {/* Period selector */}
      <View style={styles.periodRow}>
        <TouchableOpacity
          style={[styles.periodBtn, selectedPeriod === 'today' && styles.periodActive]}
          onPress={() => setSelectedPeriod('today')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'today' && styles.periodTextActive]}>
            Hoy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodBtn, selectedPeriod === 'week' && styles.periodActive]}
          onPress={() => setSelectedPeriod('week')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>
            Última semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodBtn, selectedPeriod === 'month' && styles.periodActive]}
          onPress={() => setSelectedPeriod('month')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>
            Último mes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Revenue card */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>Mis ingresos totales</Text>
        <Text style={styles.revenueValue}>{report.totalRevenue.toFixed(2)} €</Text>
        <View style={styles.revenueSplit}>
          <View style={styles.revenueHalf}>
            <Text style={styles.revenueSplitValue}>{report.serviceRevenue.toFixed(2)} €</Text>
            <Text style={styles.revenueSplitLabel}>Servicios</Text>
          </View>
          <View style={styles.revenueDivider} />
          <View style={styles.revenueHalf}>
            <Text style={styles.revenueSplitValue}>{report.productRevenue.toFixed(2)} €</Text>
            <Text style={styles.revenueSplitLabel}>Productos</Text>
          </View>
        </View>
      </View>

      {/* Appointments summary */}
      <Text style={styles.sectionTitle}>Citas</Text>
      <View style={styles.statsRow}>
        <StatCard label="Total" value={report.totalAppointments} color={GOLD} />
        <StatCard label="Completadas" value={report.completed} color={GREEN} />
        <StatCard label="Canceladas" value={report.cancelled} color="#EF4444" />
        <StatCard label="No show" value={report.noShow} color="#DC2626" />
      </View>

      {/* Services breakdown */}
      <Text style={styles.sectionTitle}>Mis servicios</Text>
      {report.services.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Sin servicios en este periodo</Text>
        </View>
      ) : (
        <View style={styles.breakdownCard}>
          {report.services.map((s, i) => (
            <View key={s.name} style={[styles.breakdownRow, i > 0 && styles.breakdownBorder]}>
              <View style={styles.breakdownInfo}>
                <Text style={styles.breakdownName}>{s.name}</Text>
                <Text style={styles.breakdownCount}>×{s.count}</Text>
              </View>
              <Text style={styles.breakdownRevenue}>{s.revenue.toFixed(2)} €</Text>
            </View>
          ))}
        </View>
      )}

      {/* Products breakdown */}
      <Text style={styles.sectionTitle}>Productos vendidos</Text>
      {report.products.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Sin ventas de productos en este periodo</Text>
        </View>
      ) : (
        <View style={styles.breakdownCard}>
          {report.products.map((p, i) => (
            <View key={p.name} style={[styles.breakdownRow, i > 0 && styles.breakdownBorder]}>
              <View style={styles.breakdownInfo}>
                <Text style={styles.breakdownName}>{p.name}</Text>
                <Text style={styles.breakdownCount}>×{p.quantity}</Text>
              </View>
              <Text style={styles.breakdownRevenue}>{p.revenue.toFixed(2)} €</Text>
            </View>
          ))}
        </View>
      )}

      {/* Export button */}
      <TouchableOpacity
        style={[styles.exportBtn, exporting && styles.exportDisabled]}
        onPress={handleExport}
        disabled={exporting}
        activeOpacity={0.85}
      >
        {exporting ? (
          <ActivityIndicator color={BG} />
        ) : (
          <>
            <Text style={styles.exportIcon}>📊</Text>
            <Text style={styles.exportText}>Descargar mi reporte Excel</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoEmoji}>💡</Text>
        <Text style={styles.infoText}>
          El Excel incluye: resumen de ingresos, desglose de cada servicio realizado, productos vendidos y lista de citas con detalles.
        </Text>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[cardStyles.card, { borderTopColor: color }]}>
      <Text style={[cardStyles.value, { color }]}>{value}</Text>
      <Text style={cardStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  periodActive: { borderColor: GOLD, backgroundColor: '#1A1500' },
  periodText: { fontSize: 13, fontWeight: '600', color: MUTED },
  periodTextActive: { color: GOLD },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT_C, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8 },
  revenueCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  revenueLabel: { fontSize: 13, color: MUTED, fontWeight: '600' },
  revenueValue: { fontSize: 34, fontWeight: '800', color: GOLD },
  revenueSplit: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: BG,
    borderRadius: 10,
    paddingVertical: 12,
  },
  revenueHalf: { flex: 1, alignItems: 'center', gap: 4 },
  revenueDivider: { width: 1, height: 32, backgroundColor: BORDER },
  revenueSplitValue: { fontSize: 18, fontWeight: '800', color: TEXT_C },
  revenueSplitLabel: { fontSize: 11, fontWeight: '600', color: MUTED },
  breakdownCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  breakdownBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  breakdownInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  breakdownName: { fontSize: 15, fontWeight: '600', color: TEXT_C },
  breakdownCount: { fontSize: 13, fontWeight: '700', color: GOLD },
  breakdownRevenue: { fontSize: 15, fontWeight: '800', color: GREEN },
  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: MUTED },
  exportBtn: {
    flexDirection: 'row',
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  exportDisabled: { opacity: 0.6 },
  exportIcon: { fontSize: 20 },
  exportText: { fontSize: 16, fontWeight: '800', color: BG },
  infoCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoEmoji: { fontSize: 20 },
  infoText: { flex: 1, fontSize: 13, color: MUTED, lineHeight: 19 },
});

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 3,
  },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 10, color: MUTED, fontWeight: '600', textAlign: 'center' },
});
