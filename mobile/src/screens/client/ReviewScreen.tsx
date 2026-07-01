import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';

type Props = NativeStackScreenProps<ClientStackParamList, 'Review'>;

const BG      = '#0A0A0A';
const SURFACE = '#141414';
const GOLD    = '#C9A84C';
const TEXT    = '#FFFFFF';
const MUTED   = '#888888';
const BORDER  = '#282828';

export function ReviewScreen({ route, navigation }: Props) {
  const { appointmentId, barberName, barbershopId, barberId } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Valoración requerida', 'Por favor selecciona al menos una estrella.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSubmitting(true);
    try {
      // Write review document
      await addDoc(collection(db, 'barbershops', barbershopId, 'reviews'), {
        clientId: user.uid,
        clientName: user.displayName ?? user.email ?? 'Cliente',
        barberId,
        barberName,
        appointmentId,
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });

      // Mark appointment as reviewed
      await updateDoc(doc(db, 'appointments', appointmentId), {
        reviewed: true,
      });

      // Rating aggregation is handled by the onReviewCreatedPush Cloud Function

      setSubmitted(true);
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      console.error('[ReviewScreen] Error:', err);
      Alert.alert('Error', 'No se pudo enviar la valoración. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>¡Gracias por tu valoración!</Text>
        <Text style={styles.successSub}>Tu opinión ayuda a mejorar el servicio</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Barber info */}
        <View style={styles.barberCard}>
          <Text style={styles.barberEmoji}>💈</Text>
          <Text style={styles.barberName}>{barberName}</Text>
          <Text style={styles.barberSub}>¿Cómo fue tu experiencia?</Text>
        </View>

        {/* Star rating */}
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.7}
              style={styles.starBtn}
            >
              <Text style={styles.starIcon}>{star <= rating ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>
          {rating === 0
            ? 'Toca una estrella'
            : rating === 1
              ? 'Malo'
              : rating === 2
                ? 'Regular'
                : rating === 3
                  ? 'Bueno'
                  : rating === 4
                    ? 'Muy bueno'
                    : 'Excelente'}
        </Text>

        {/* Comment */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Escribe un comentario (opcional)"
            placeholderTextColor={MUTED}
            multiline
            maxLength={500}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={BG} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Enviar valoración</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
    gap: 12,
    padding: 32,
  },
  content: { padding: 20, gap: 24 },
  barberCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  barberEmoji: { fontSize: 40 },
  barberName: { fontSize: 20, fontWeight: '800', color: TEXT },
  barberSub: { fontSize: 14, color: MUTED },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  starBtn: { padding: 4 },
  starIcon: { fontSize: 40 },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: GOLD,
  },
  inputWrapper: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  textInput: {
    color: TEXT,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: BG,
    fontSize: 16,
    fontWeight: '800',
  },
  successEmoji: { fontSize: 56 },
  successTitle: { fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center' },
  successSub: { fontSize: 14, color: MUTED, textAlign: 'center' },
});
