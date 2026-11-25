import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { useTheme } from '../../core/context/ThemeContext';

/**
 * Selector de una opción entre pocas (2–4), con semántica de radio para lectores de pantalla.
 * Reemplaza al Picker nativo en el registro: en Android (nueva arquitectura) el
 * RNCAndroidDialogPicker cerraba la app con SIGABRT al desmontarse la pantalla.
 *
 * @param {{ label: string, options: { value: string, label: string, icon?: any }[], value: string,
 *   onChange: (value: string) => void, disabled?: boolean }} props
 */
export default function SegmentedControl({ label, options, value, onChange, disabled = false }) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: theme.gray[800] }]}>{label}</Text> : null}
      <View style={[styles.track, { borderColor: theme.gray[400] }]} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          const Icon = option.icon;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.segment, selected && { backgroundColor: theme.primary }]}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected, disabled }}
            >
              {Icon ? <Icon size={18} color={selected ? '#ffffff' : theme.primary} style={styles.icon} /> : null}
              <Text style={[styles.segmentText, { color: selected ? '#ffffff' : theme.primary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: DIMENSIONS.spacing.md,
  },
  label: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Medium',
    marginBottom: 6,
  },
  track: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: DIMENSIONS.borderRadius.lg,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DIMENSIONS.borderRadius.md,
  },
  icon: {
    marginRight: 6,
  },
  segmentText: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Medium',
  },
});
