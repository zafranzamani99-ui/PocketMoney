// Advanced Line Chart Component for PocketMoney Analytics
// Supports revenue trends, performance metrics, and predictive analytics

import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, { 
  Path, 
  Circle, 
  Line, 
  Text as SvgText, 
  Defs, 
  LinearGradient, 
  Stop 
} from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

export interface DataPoint {
  date: string;
  value: number;
  label?: string;
  predicted?: boolean;
}

interface LineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  gradientColors?: [string, string];
  showGradient?: boolean;
  showPoints?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  animated?: boolean;
  strokeWidth?: number;
  predictiveData?: DataPoint[];
  formatValue?: (value: number) => string;
  formatDate?: (date: string) => string;
  onPointPress?: (point: DataPoint, index: number) => void;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = screenWidth - 40,
  height = 200,
  color,
  gradientColors,
  showGradient = true,
  showPoints = true,
  showGrid = true,
  showLabels = true,
  animated = true,
  strokeWidth = 2,
  predictiveData = [],
  formatValue = (value) => `RM${value.toLocaleString()}`,
  formatDate = (date) => new Date(date).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' }),
  onPointPress
}) => {
  const { colors } = useTheme();
  
  const chartColor = color || colors.primary;
  const textColor = colors.text;
  const gridColor = colors.border;
  
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  // Combine actual and predictive data for scaling
  const allData = [...data, ...predictiveData];
  const values = allData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  
  // Create scale functions
  const xScale = (index: number) => (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => chartHeight - ((value - minValue) / valueRange) * chartHeight;
  
  // Generate path for main data line
  const generatePath = (dataPoints: DataPoint[], startIndex = 0) => {
    if (dataPoints.length === 0) return '';
    
    let path = `M ${xScale(startIndex)} ${yScale(dataPoints[0].value)}`;
    
    for (let i = 1; i < dataPoints.length; i++) {
      const x = xScale(startIndex + i);
      const y = yScale(dataPoints[i].value);
      path += ` L ${x} ${y}`;
    }
    
    return path;
  };
  
  // Generate gradient path for fill
  const generateGradientPath = () => {
    if (data.length === 0) return '';
    
    let path = `M ${xScale(0)} ${yScale(data[0].value)}`;
    
    for (let i = 1; i < data.length; i++) {
      const x = xScale(i);
      const y = yScale(data[i].value);
      path += ` L ${x} ${y}`;
    }
    
    // Close the path for gradient fill
    path += ` L ${xScale(data.length - 1)} ${chartHeight}`;
    path += ` L ${xScale(0)} ${chartHeight}`;
    path += ' Z';
    
    return path;
  };
  
  const mainPath = generatePath(data);
  const predictivePath = predictiveData.length > 0 
    ? generatePath(predictiveData, data.length - 1) 
    : '';
  const gradientPath = generateGradientPath();
  
  // Grid lines
  const gridLines = [];
  if (showGrid) {
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (chartHeight / 4) * i;
      const value = maxValue - ((maxValue - minValue) / 4) * i;
      
      gridLines.push(
        <Line
          key={`h-grid-${i}`}
          x1={0}
          y1={y}
          x2={chartWidth}
          y2={y}
          stroke={gridColor}
          strokeWidth={0.5}
          strokeDasharray="2,2"
        />
      );
      
      if (showLabels) {
        gridLines.push(
          <SvgText
            key={`h-label-${i}`}
            x={-10}
            y={y + 4}
            fontSize="10"
            fill={textColor}
            textAnchor="end"
          >
            {formatValue(value)}
          </SvgText>
        );
      }
    }
    
    // Vertical grid lines
    const labelInterval = Math.max(1, Math.floor(data.length / 5));
    for (let i = 0; i < data.length; i += labelInterval) {
      const x = xScale(i);
      
      gridLines.push(
        <Line
          key={`v-grid-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={chartHeight}
          stroke={gridColor}
          strokeWidth={0.5}
          strokeDasharray="2,2"
        />
      );
      
      if (showLabels && data[i]) {
        gridLines.push(
          <SvgText
            key={`v-label-${i}`}
            x={x}
            y={chartHeight + 20}
            fontSize="10"
            fill={textColor}
            textAnchor="middle"
          >
            {formatDate(data[i].date)}
          </SvgText>
        );
      }
    }
  }
  
  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop 
              offset="0%" 
              stopColor={gradientColors?.[0] || chartColor} 
              stopOpacity="0.8" 
            />
            <Stop 
              offset="100%" 
              stopColor={gradientColors?.[1] || chartColor} 
              stopOpacity="0.1" 
            />
          </LinearGradient>
          
          <LinearGradient id="predictiveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.warning} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={colors.warning} stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        
        <View style={{ transform: [{ translateX: padding }, { translateY: padding }] }}>
          {/* Grid */}
          {gridLines}
          
          {/* Gradient fill */}
          {showGradient && gradientPath && (
            <Path
              d={gradientPath}
              fill="url(#gradient)"
            />
          )}
          
          {/* Main data line */}
          {mainPath && (
            <Path
              d={mainPath}
              stroke={chartColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Predictive data line */}
          {predictivePath && (
            <Path
              d={predictivePath}
              stroke={colors.warning}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray="5,5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Data points */}
          {showPoints && data.map((point, index) => (
            <Circle
              key={`point-${index}`}
              cx={xScale(index)}
              cy={yScale(point.value)}
              r="4"
              fill={chartColor}
              stroke={colors.background}
              strokeWidth="2"
              onPress={() => onPointPress?.(point, index)}
            />
          ))}
          
          {/* Predictive data points */}
          {showPoints && predictiveData.map((point, index) => (
            <Circle
              key={`predictive-point-${index}`}
              cx={xScale(data.length - 1 + index)}
              cy={yScale(point.value)}
              r="3"
              fill={colors.warning}
              stroke={colors.background}
              strokeWidth="2"
              strokeDasharray="2,2"
              onPress={() => onPointPress?.(point, data.length + index)}
            />
          ))}
        </View>
      </Svg>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: chartColor }]} />
          <Text style={[styles.legendText, { color: textColor }]}>Actual Data</Text>
        </View>
        
        {predictiveData.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { 
              backgroundColor: colors.warning,
              borderStyle: 'dashed',
              borderWidth: 1,
              borderColor: colors.warning
            }]} />
            <Text style={[styles.legendText, { color: textColor }]}>Predicted</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
});