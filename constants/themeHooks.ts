import { useTheme } from '../contexts/ThemeContext'

// Hook to get current theme colors
export const useThemeColors = () => {
  const { colors } = useTheme()
  return colors
}

// Export typography and spacing (theme-independent)
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