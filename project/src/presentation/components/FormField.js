import { forwardRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { MIN_TOUCH_TARGET } from '../../core/constants/colors';
import { useTheme } from '../../core/context/ThemeContext';

/**
 * Campo de formulario con etiqueta visible (WCAG 3.3.2): el placeholder desaparece al escribir,
 * así que no puede ser la única indicación de qué va en el campo.
 * Con `secureTextEntry`, agrega un botón para mostrar u ocultar la contraseña.
 */
const FormField = forwardRef(function FormField(
  { label, hint, secureTextEntry = false, style, editable = true, ...inputProps },
  ref
) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: theme.gray[800] }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          { borderColor: focused ? theme.primary : theme.gray[400], backgroundColor: editable ? '#ffffff' : theme.gray[100] },
          focused && styles.inputRowFocused,
        ]}
      >
        <TextInput
          ref={ref}
          {...inputProps}
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.gray[600]}
          secureTextEntry={hidden}
          editable={editable}
          accessibilityLabel={label}
          accessibilityHint={hint}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidden((value) => !value)}
            style={styles.eyeButton}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            {hidden ? <Eye size={20} color={theme.gray[700]} /> : <EyeOff size={20} color={theme.gray[700]} />}
          </TouchableOpacity>
        )}
      </View>
      {hint ? <Text style={[styles.hint, { color: theme.gray[700] }]}>{hint}</Text> : null}
    </View>
  );
});

export default FormField;

const styles = StyleSheet.create({
  container: {
    marginBottom: DIMENSIONS.spacing.md,
  },
  label: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Medium',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: DIMENSIONS.borderRadius.lg,
    minHeight: 52,
  },
  inputRowFocused: {
    borderWidth: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: DIMENSIONS.spacing.md,
    paddingVertical: 12,
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Regular',
  },
  eyeButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  hint: {
    fontSize: DIMENSIONS.fontSize.xs,
    fontFamily: 'Roboto-Regular',
    marginTop: 4,
  },
});
