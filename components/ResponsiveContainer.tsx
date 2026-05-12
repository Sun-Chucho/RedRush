import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  padding?: number;
  style?: any;
}

/**
 * Responsive Container for Web and Mobile
 * Automatically adjusts layout based on screen size
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 1200,
  padding = 16,
  style,
}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 1024;

  const containerWidth = isWeb && isLargeScreen ? Math.min(width - padding * 2, maxWidth) : width;

  return (
    <View style={[
      styles.container,
      {
        width: containerWidth,
        paddingHorizontal: isWeb ? padding : 0,
        marginHorizontal: isWeb ? 'auto' : 0,
      },
      style,
    ]}>
      {children}
    </View>
  );
};

/**
 * Grid Layout for responsive display
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  style?: any;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = 1,
  gap = 12,
  style,
}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  let gridColumns = 1;
  if (isWeb) {
    if (width > 1024) gridColumns = Math.min(columns, 4);
    else if (width > 768) gridColumns = Math.min(columns, 3);
    else if (width > 480) gridColumns = Math.min(columns, 2);
  }

  const itemWidth = (width - gap * (gridColumns - 1)) / gridColumns;

  return (
    <View style={[
      styles.grid,
      {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
      },
      style,
    ]}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement<{ style?: any }>(child)) return child;
        return React.cloneElement(child, {
          style: [
            child.props.style,
            {
              width: isWeb ? itemWidth : '100%',
              marginRight: gridColumns > 1 && !isWeb ? 0 : undefined,
            },
          ],
        });
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    alignItems: 'flex-start',
  },
});

export default ResponsiveContainer;
