import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { Service } from '../../types';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function ShopServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(30);
  const [nameFocused, setNameFocused] = useState(false);
  const [priceFocused, setPriceFocused] = useState(false);

  const { activeBarbershopId } = useAuthContext();

  useEffect(() => {
    if (!activeBarbershopId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'barbershops', activeBarbershopId),
      (snap) => {
        if (snap.exists()) {
          setServices(snap.data().services ?? []);
        }
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [activeBarbershopId]);

  const openAddModal = () => {
    setEditingService(null);
    setName('');
    setPrice('');
    setDuration(30);
    setModalVisible(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setPrice(service.price.toString());
    setDuration(service.duration);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingService(null);
  };

  const handleSave = async () => {
    if (!activeBarbershopId) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'El nombre del servicio es obligatorio.');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Error', 'Introduce un precio valido.');
      return;
    }

    setSaving(true);

    try {
      let updated: Service[];

      if (editingService) {
        // Update existing service
        updated = services.map((s) =>
          s.id === editingService.id
            ? { ...s, name: trimmedName, price: parsedPrice, duration }
            : s,
        );
      } else {
        // Add new service
        const newService: Service = {
          id: generateId(),
          name: trimmedName,
          price: parsedPrice,
          duration,
        };
        updated = [...services, newService];
      }

      await updateDoc(doc(db, 'barbershops', activeBarbershopId), {
        services: updated,
      });

      setServices(updated);
      closeModal();
    } catch (err) {
      console.error('[ShopServicesScreen] Error saving service:', err);
      Alert.alert('Error', 'No se pudo guardar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (service: Service) => {
    Alert.alert(
      'Eliminar servicio',
      `¿Seguro que quieres eliminar "${service.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!activeBarbershopId) return;

            try {
              const updated = services.filter((s) => s.id !== service.id);
              await updateDoc(doc(db, 'barbershops', activeBarbershopId), {
                services: updated,
              });
              setServices(updated);
            } catch (err) {
              console.error('[ShopServicesScreen] Error deleting service:', err);
              Alert.alert('Error', 'No se pudo eliminar el servicio.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Servicios</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Nuevo</Text>
          </TouchableOpacity>
        </View>

        {services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay servicios registrados.</Text>
            <Text style={styles.emptySubtext}>
              Pulsa "+ Nuevo" para crear el primero.
            </Text>
          </View>
        ) : (
          services.map((service) => (
            <View key={service.id} style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <View style={styles.serviceDetails}>
                  <Text style={styles.serviceDetail}>
                    {service.duration} min
                  </Text>
                  <Text style={styles.serviceDot}>{'·'}</Text>
                  <Text style={styles.servicePrice}>
                    {service.price.toFixed(2)} {'€'}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(service)}
                >
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(service)}
                >
                  <Text style={styles.deleteButtonText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingService ? 'Editar servicio' : 'Nuevo servicio'}
            </Text>

            {/* Name */}
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={[
                styles.input,
                nameFocused && styles.inputFocused,
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Ej. Corte de pelo"
              placeholderTextColor={MUTED}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />

            {/* Price */}
            <Text style={styles.label}>Precio ({'€'})</Text>
            <TextInput
              style={[
                styles.input,
                priceFocused && styles.inputFocused,
              ]}
              value={price}
              onChangeText={setPrice}
              placeholder="Ej. 15.00"
              placeholderTextColor={MUTED}
              keyboardType="decimal-pad"
              onFocus={() => setPriceFocused(true)}
              onBlur={() => setPriceFocused(false)}
            />

            {/* Duration */}
            <Text style={styles.label}>Duracion (min)</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationChip,
                    duration === d && styles.durationChipActive,
                  ]}
                  onPress={() => setDuration(d)}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      duration === d && styles.durationChipTextActive,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={BG} />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT,
  },
  addButton: {
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: BG,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: MUTED,
    fontSize: 16,
    marginBottom: 6,
  },
  emptySubtext: {
    color: MUTED,
    fontSize: 13,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  cardContent: {
    marginBottom: 12,
  },
  serviceName: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDetail: {
    color: MUTED,
    fontSize: 14,
  },
  serviceDot: {
    color: MUTED,
    marginHorizontal: 8,
    fontSize: 14,
  },
  servicePrice: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editButton: {
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editButtonText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  deleteButtonText: {
    color: '#FF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontSize: 15,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: GOLD,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  durationChip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: BG,
  },
  durationChipActive: {
    borderColor: GOLD,
    backgroundColor: GOLD,
  },
  durationChipText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
  },
  durationChipTextActive: {
    color: BG,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: BG,
    fontSize: 15,
    fontWeight: '700',
  },
});
