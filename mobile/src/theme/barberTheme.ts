export const BARBER_COLORS = {
  primary: '#C9A84C',
  dark: '#0A0A0A',
  surface: '#1A1A1A',
  success: '#00DD00',
  pending: '#FFD700',
  warning: '#FF6600',
  error: '#FF4444',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textTertiary: '#888888',
  bgPrimary: '#0A0A0A',
  bgSecondary: '#141414',
};

export const BARBER_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BARBER_TYPOGRAPHY = {
  h1: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  h3: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
};

export const useBarberTheme = () => ({
  colors: BARBER_COLORS,
  spacing: BARBER_SPACING,
  typography: BARBER_TYPOGRAPHY,
});
