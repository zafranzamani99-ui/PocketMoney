import { Dimensions } from 'react-native'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export const isTablet = screenWidth >= 768
export const isLargeTablet = screenWidth >= 1024
export const isPhone = screenWidth < 768

// Responsive spacing
export const responsiveSpacing = {
  xs: isTablet ? 6 : 4,
  sm: isTablet ? 12 : 8,
  md: isTablet ? 20 : 16,
  lg: isTablet ? 32 : 24,
  xl: isTablet ? 48 : 32,
  xxl: isTablet ? 64 : 48,
}

// Responsive font sizes
export const responsiveFontSizes = {
  caption: isTablet ? 14 : 12,
  bodySmall: isTablet ? 16 : 14,
  body: isTablet ? 18 : 16,
  subheading: isTablet ? 22 : 18,
  heading: isTablet ? 28 : 24,
  display: isTablet ? 36 : 32,
}

// Responsive dimensions
export const responsiveDimensions = {
  tabBarHeight: isTablet ? 120 : 95,
  buttonHeight: isTablet ? 56 : 48,
  inputHeight: isTablet ? 52 : 44,
  iconSize: isTablet ? 28 : 24,
  borderRadius: isTablet ? 12 : 8,
}

// Layout helpers
export const getResponsiveWidth = (phoneWidth: number, tabletWidth?: number) => {
  return isTablet ? (tabletWidth || phoneWidth * 1.2) : phoneWidth
}

export const getResponsivePadding = (phonePadding: number, tabletPadding?: number) => {
  return isTablet ? (tabletPadding || phonePadding * 1.5) : phonePadding
}

// Container max width for large screens
export const maxContainerWidth = 1200