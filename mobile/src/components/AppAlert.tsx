import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

// Themed drop-in replacement for React Native's `Alert.alert`.
// Same call signature — `Alert.alert(title, message, buttons, options)` —
// but rendered as a themed modal matching the app's dark/gold look instead
// of the plain OS dialog. Mount <AlertProvider /> once near the app root
// (see App.tsx); every screen just imports `{ Alert }` from here instead
// of from 'react-native'.

const BG = '#0A0A0A';
const SURFACE = '#141414';
const GOLD = '#C9A84C';
const TEXT = '#FFFFFF';
const MUTED = '#888888';
const BORDER = '#282828';
const RED = '#EF4444';

export interface AppAlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AppAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface AlertState {
  visible: boolean;
  title?: string;
  message?: string;
  buttons: AppAlertButton[];
  cancelable: boolean;
  onDismiss?: () => void;
}

const INITIAL_STATE: AlertState = { visible: false, buttons: [], cancelable: false };

let showAlertImpl:
  | ((title?: string, message?: string, buttons?: AppAlertButton[], options?: AppAlertOptions) => void)
  | null = null;

/** Same shape as React Native's `Alert`, backed by the themed modal below. */
export const Alert = {
  alert(
    title?: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions,
  ) {
    if (showAlertImpl) {
      showAlertImpl(title, message, buttons, options);
    } else {
      // Provider not mounted yet (e.g. called before first render) — fail
      // loud in dev instead of silently swallowing the alert.
      console.warn('[AppAlert] AlertProvider is not mounted:', title, message);
    }
  },
};

export function AlertProvider() {
  const [state, setState] = useState<AlertState>(INITIAL_STATE);

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  useEffect(() => {
    showAlertImpl = (title, message, buttons, options) => {
      const finalButtons =
        buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' as const }];
      setState({
        visible: true,
        title,
        message,
        buttons: finalButtons,
        cancelable: options?.cancelable ?? false,
        onDismiss: options?.onDismiss,
      });
    };
    return () => {
      showAlertImpl = null;
    };
  }, []);

  const handleButtonPress = (btn: AppAlertButton) => {
    hide();
    if (btn.onPress) setTimeout(btn.onPress, 50);
  };

  const handleBackdropPress = () => {
    if (!state.cancelable) return;
    hide();
    if (state.onDismiss) setTimeout(state.onDismiss, 50);
  };

  if (!state.visible) return null;

  const stacked = state.buttons.length > 2;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={state.visible}
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
        <Pressable style={styles.card} onPress={() => {}}>
          {!!state.title && <Text style={styles.title}>{state.title}</Text>}
          {!!state.message && <Text style={styles.message}>{state.message}</Text>}
          <View style={stacked ? styles.buttonsColumn : styles.buttonsRow}>
            {state.buttons.map((btn, i) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              return (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.button,
                    stacked ? styles.buttonFull : styles.buttonFlex,
                    isDestructive && styles.buttonDestructive,
                    isCancel && styles.buttonCancel,
                    !isCancel && !isDestructive && styles.buttonPrimary,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleButtonPress(btn)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isDestructive && styles.buttonTextDestructive,
                      isCancel && styles.buttonTextCancel,
                      !isCancel && !isDestructive && styles.buttonTextPrimary,
                    ]}
                    numberOfLines={1}
                  >
                    {btn.text || 'OK'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonsColumn: {
    flexDirection: 'column-reverse',
    gap: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFlex: { flex: 1 },
  buttonFull: { width: '100%' },
  buttonPressed: { opacity: 0.8 },
  buttonPrimary: {
    backgroundColor: GOLD,
  },
  buttonDestructive: {
    backgroundColor: RED,
  },
  buttonCancel: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextPrimary: { color: BG },
  buttonTextDestructive: { color: TEXT },
  buttonTextCancel: { color: MUTED },
});
