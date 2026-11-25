import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { useTheme } from '../../core/context/ThemeContext';

/**
 * Botón de acción con altura mínima de 52 dp, estado de carga y semántica de accesibilidad.
 * variant: 'primary' (relleno), 'outline' (borde) o 'danger-text' (texto rojo sin relleno,
 * para acciones destructivas que no deben competir con la acción principal).
 */
export default function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  color,
  icon: Icon,
  style,
  accessibilityHint,
}) {
  const { theme } = useTheme();
  const tint = color || theme.primary;
  const isDisabled = disabled || loading;

  const containerStyle =
    variant === 'outline'
      ? { backgroundColor: '#ffffff', borderColor: tint, borderWidth: 1.5 }
      : variant === 'danger-text'
        ? { backgroundColor: 'transparent' }
        : { backgroundColor: tint };
  const textColor = variant === 'primary' ? '#ffffff' : variant === 'danger-text' ? theme.error : tint;

  return (
    <TouchableOpacity
      style={[styles.button, containerStyle, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={18} color={textColor} style={styles.icon} /> : null}
          <Text style={[styles.text, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: DIMENSIONS.borderRadius.lg,
    paddingHorizontal: DIMENSIONS.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: DIMENSIONS.spacing.sm,
  },
  text: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Medium',
  },
});
