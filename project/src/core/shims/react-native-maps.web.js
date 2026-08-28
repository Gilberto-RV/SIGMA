import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = React.forwardRef(({ children, style, ...props }, ref) => {
  return (
    <View style={[styles.container, style]} ref={ref} {...props}>
      <View style={styles.placeholder}>
        <Text style={styles.text}>🗺️ Mapa disponible en app móvil (Android / iOS)</Text>
      </View>
      {children}
    </View>
  );
});

export const Marker = ({ children, ...props }) => <View {...props}>{children}</View>;
export const Polyline = () => null;
export const Polygon = () => null;
export const Callout = ({ children, ...props }) => <View {...props}>{children}</View>;
export const Circle = () => null;
export const Overlay = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    position: 'relative',
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    zIndex: 1,
  },
  text: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MapView;
