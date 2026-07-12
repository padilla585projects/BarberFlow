import { Alert } from 'react-native';
import { signOut as firebaseSignOut } from '../services/auth';

/**
 * Hook que proporciona la lógica de logout con confirmación.
 * Muestra un alert de confirmación antes de cerrar sesión.
 */
export function useLogout() {
  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: firebaseSignOut },
      ]
    );
  };

  return { handleLogout };
}
