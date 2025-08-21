export const Colors = {
  // New Primary Color Palette
  primary: '#80D8C3',        // Main brand color - soft turquoise
  secondary: '#4DA8DA',      // Secondary blue
  accent: '#FFD66B',         // Golden yellow accent
  background: '#000000',     // Keep dark background
  surface: '#1A1A1A',       // Dark surface
  surfaceElevated: '#2A2A2A', // Elevated surface
  light: '#F5F5F5',         // Light color for contrasts
  
  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#6B7280',
  textDark: '#1A1A1A',      // Dark text for light backgrounds
  
  // Money Indicators (keeping red/green)
  success: '#10B981',       // Green for money in
  error: '#EF4444',         // Red for money out
  
  // Status Colors
  warning: '#FFD66B',       // Using accent color for warnings
  info: '#4DA8DA',          // Using secondary color for info
  
  // UI Elements
  border: '#2A2A2A',
  borderLight: '#374151',
  
  // Gradients
  gradientStart: '#80D8C3',  // Primary to secondary gradient
  gradientEnd: '#4DA8DA',
  gradientAccent: '#FFD66B', // Accent gradient
}

export const Typography = {
  fontFamily: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
    light: 'Poppins_300Light',
  },
  fontSizes: {
    display: 32,
    heading: 24,
    subheading: 20,
    body: 16,
    bodySmall: 14,
    caption: 12,
    tiny: 10,
  },
  lineHeights: {
    display: 40,
    heading: 32,
    subheading: 28,
    body: 24,
    bodySmall: 20,
    caption: 16,
  },
  fontWeights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
}