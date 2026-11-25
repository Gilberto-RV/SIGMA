import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { COLORS, MIN_TOUCH_TARGET } from '../../core/constants/colors';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { useTheme } from '../../core/context/ThemeContext';

export default function FilterModal({ visible, filters, onClose, onApply }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const { theme } = useTheme();
  // El modal ocupa toda la pantalla en Android: los botones suben sobre la barra de navegación.
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      hasRamp: false,
      isAccessible: false,
      type: '',
    };
    setLocalFilters(resetFilters);
  };

  const FilterItem = ({ label, description, value, onValueChange }) => (
    <View style={styles.filterItem}>
      <View style={styles.filterInfo}>
        <Text style={styles.filterLabel}>{label}</Text>
        <Text style={styles.filterDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.gray[400], true: theme.primary }}
        thumbColor={value ? COLORS.white : COLORS.gray[100]}
        accessibilityLabel={label}
        accessibilityHint={description}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: insets.bottom + DIMENSIONS.spacing.lg }]}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">Filtros de búsqueda</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Cerrar filtros"
            >
              <X size={24} color={COLORS.gray[700]} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <FilterItem
              label="Con Rampa"
              description="Edificios que tienen rampa de acceso"
              value={localFilters.hasRamp}
              onValueChange={(value) => 
                setLocalFilters(prev => ({ ...prev, hasRamp: value }))
              }
            />

            <FilterItem
              label="Accesible"
              description="Edificios completamente accesibles"
              value={localFilters.isAccessible}
              onValueChange={(value) => 
                setLocalFilters(prev => ({ ...prev, isAccessible: value }))
              }
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: theme.primary }]}
              onPress={handleReset}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
            >
              <Text style={[styles.resetButtonText, { color: theme.primary }]}>Limpiar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: theme.primary }]}
              onPress={handleApply}
              accessibilityRole="button"
              accessibilityLabel="Aplicar filtros"
            >
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: DIMENSIONS.borderRadius.xl,
    borderTopRightRadius: DIMENSIONS.borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DIMENSIONS.spacing.lg,
    paddingVertical: DIMENSIONS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  title: {
    fontSize: DIMENSIONS.fontSize.lg,
    fontFamily: 'Roboto-Medium',
    color: COLORS.gray[800],
  },
  closeButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  content: {
    paddingHorizontal: DIMENSIONS.spacing.lg,
    paddingVertical: DIMENSIONS.spacing.md,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DIMENSIONS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  filterInfo: {
    flex: 1,
    marginRight: DIMENSIONS.spacing.md,
  },
  filterLabel: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Medium',
    color: COLORS.gray[800],
    marginBottom: DIMENSIONS.spacing.xs,
  },
  filterDescription: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
    color: COLORS.gray[600],
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: DIMENSIONS.spacing.lg,
    paddingTop: DIMENSIONS.spacing.md,
    gap: DIMENSIONS.spacing.md,
  },
  resetButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderRadius: DIMENSIONS.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Medium',
    color: COLORS.gray[700],
  },
  applyButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: COLORS.primary,
    borderRadius: DIMENSIONS.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Medium',
    color: COLORS.white,
  },
});