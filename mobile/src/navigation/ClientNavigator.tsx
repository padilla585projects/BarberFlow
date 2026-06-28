import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Image, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/client/HomeScreen';
import { BarbershopScreen } from '../screens/client/BarbershopScreen';
import { BookScreen } from '../screens/client/BookScreen';
import { MyAppointmentsScreen } from '../screens/client/MyAppointmentsScreen';
import { ReviewScreen } from '../screens/client/ReviewScreen';
import { LoyaltyScreen } from '../screens/client/LoyaltyScreen';
import { ProfileScreen } from '../screens/client/ProfileScreen';
import { auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export type ClientStackParamList = {
  Home: undefined;
  Barbershop: { barbershopId: string; name: string };
  Book: { barbershopId: string; barbershopName: string };
  MyAppointments: undefined;
  Review: { appointmentId: string; barberName: string; barbershopId: string; barberId: string };
  Loyalty: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<ClientStackParamList>();

const BG   = '#0A0A0A';
const GOLD = '#C9A84C';
const TEXT = '#FFFFFF';
const SURFACE = '#141414';

function ProfileAvatar({ onPress }: { onPress: () => void }) {
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [initials, setInitials] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Set initial values from auth
    setPhotoURL(user.photoURL);
    setInitials(
      (user.displayName || user.email || '?')
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    );

    // Listen for realtime updates to user doc
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data();
      if (data?.photoURL) setPhotoURL(data.photoURL);
      if (data?.displayName) {
        setInitials(
          data.displayName
            .split(' ')
            .filter(Boolean)
            .map((w: string) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2),
        );
      }
    });

    return unsub;
  }, []);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {photoURL ? (
        <Image source={{ uri: photoURL }} style={avatarStyles.image} />
      ) : (
        <View style={avatarStyles.fallback}>
          <Text style={avatarStyles.text}>{initials}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function ClientNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: BG },
        headerShadowVisible: false,
        headerTintColor: TEXT,
        headerTitleStyle: { fontWeight: '700', color: TEXT },
        contentStyle: { backgroundColor: BG },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'BarberFlow',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('MyAppointments')}
              style={headerStyles.btn}
            >
              <Text style={headerStyles.btnText}>Mis citas</Text>
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <ProfileAvatar onPress={() => navigation.navigate('Profile')} />
          ),
        })}
      />
      <Stack.Screen
        name="Barbershop"
        component={BarbershopScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
      <Stack.Screen
        name="Book"
        component={BookScreen}
        options={{ title: 'Reservar cita' }}
      />
      <Stack.Screen
        name="MyAppointments"
        component={MyAppointmentsScreen}
        options={{ title: 'Mis citas' }}
      />
      <Stack.Screen
        name="Review"
        component={ReviewScreen}
        options={{ title: 'Valorar' }}
      />
      <Stack.Screen
        name="Loyalty"
        component={LoyaltyScreen}
        options={{ title: 'Mis puntos' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Mi perfil' }}
      />
    </Stack.Navigator>
  );
}

const avatarStyles = StyleSheet.create({
  image: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  fallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
  },
});

const headerStyles = StyleSheet.create({
  btn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },
});
