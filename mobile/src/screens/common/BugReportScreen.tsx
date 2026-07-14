import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Alert } from '../../components/AppAlert';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT_C  = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

const CATEGORIES = ['Error/Crash', 'UI/Diseño', 'Funcionalidad', 'Otro'] as const;
type Category = (typeof CATEGORIES)[number];

type Props = NativeStackScreenProps<any>;

export function BugReportScreen({ navigation }: Props) {
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState<Category>('Error/Crash');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Campo requerido', 'Por favor, añade un título al reporte.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Campo requerido', 'Por favor, describe el problema.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para reportar un problema.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'bugReports'), {
        title: title.trim(),
        description: description.trim(),
        category,
        userId: user.uid,
        userEmail: user.email,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        createdAt: serverTimestamp(),
        status: 'open',
      });

      Alert.alert(
        'Reporte enviado',
        'Gracias por tu reporte. Lo revisaremos lo antes posible.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      console.error('[BugReportScreen] Error submitting report:', err);
      Alert.alert('Error', 'No se pudo enviar el reporte. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <Text style={styles.label}>Título</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Resumen breve del problema"
        placeholderTextColor={MUTED}
        maxLength={100}
      />

      {/* Category */}
      <Text style={styles.label}>Categoría</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
            onPress={() => setCategory(cat)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <Text style={styles.label}>Descripción</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe el problema con detalle: qué hacías, qué esperabas y qué ocurrió"
        placeholderTextColor={MUTED}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        maxLength={2000}
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={BG} />
        ) : (
          <Text style={styles.submitBtnText}>Enviar reporte</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 40 },

  label: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
  },

  input: {
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_C,
  },

  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryChipActive: {
    backgroundColor: GOLD + '20',
    borderColor: GOLD,
  },
  categoryText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: GOLD,
  },

  submitBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: BG, fontSize: 15, fontWeight: '700' },
});
