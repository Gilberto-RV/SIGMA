import { useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, Keyboard, ScrollView } from 'react-native';
import { Search, SlidersHorizontal, X, MapPin, SearchX } from 'lucide-react-native';
import FilterModal from './FilterModal';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { MIN_TOUCH_TARGET } from '../../core/constants/colors';
import { useTheme } from '../../core/context/ThemeContext';

const MAX_RESULTS = 6;

/** Divide `text` en [antes, coincidencia, después] para resaltar lo que el usuario escribió. */
function splitMatch(text, query) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || index < 0) return [text, '', ''];
  return [text.slice(0, index), text.slice(index, index + query.length), text.slice(index + query.length)];
}

/**
 * Barra de búsqueda con lista de resultados (tarea U1 del plan).
 * Antes cada letra escrita trazaba una ruta al primer edificio que coincidiera; ahora escribir
 * solo filtra y la ruta se calcula al elegir un resultado (o al pulsar "buscar" en el teclado).
 *
 * @param {object} props
 * @param {(query: string, filters: object) => void} props.onSearch Texto actual (filtra los pines del mapa).
 * @param {{ id: string, name: string, description?: string }[]} [props.results] Coincidencias a mostrar.
 * @param {(item: object) => void} [props.onSelectResult] Se llama al elegir un resultado.
 */
export default function SearchBar({ onSearch, results = [], onSelectResult }) {
  const { theme } = useTheme();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    hasRamp: false,
    isAccessible: false,
    type: '',
  });

  const handleSearch = (searchQuery = query) => {
    onSearch(searchQuery, filters);
  };

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
    handleSearch();
  };

  const clearSearch = () => {
    setQuery('');
    handleSearch('');
    inputRef.current?.focus();
  };

  const selectResult = (item) => {
    setQuery(item.name);
    handleSearch(item.name);
    setIsFocused(false);
    Keyboard.dismiss();
    onSelectResult?.(item);
  };

  const trimmed = query.trim();
  const visibleResults = results.slice(0, MAX_RESULTS);
  const showDropdown = isFocused && trimmed.length > 0;
  const filtersActive = filters.hasRamp || filters.isAccessible || Boolean(filters.type);

  return (
    <>
      <View style={styles.container}>
        <View
          style={[
            styles.searchContainer,
            { borderColor: isFocused ? theme.primary : 'transparent' },
          ]}
        >
          <Search size={20} color={theme.gray[700]} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text }]}
            placeholder="Buscar edificio o servicio"
            placeholderTextColor={theme.gray[600]}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              handleSearch(text);
            }}
            onFocus={() => setIsFocused(true)}
            // En web el blur llega antes que el clic: se espera un poco para no ocultar la lista
            // antes de que se registre la selección.
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (visibleResults.length > 0) selectResult(visibleResults[0]);
            }}
            accessibilityLabel="Buscar edificio o servicio"
            accessibilityHint="Escribe y elige un resultado para trazar la ruta"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={clearSearch}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Borrar búsqueda"
            >
              <X size={20} color={theme.gray[700]} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
          accessibilityRole="button"
          accessibilityLabel={filtersActive ? 'Filtros de búsqueda (activos)' : 'Filtros de búsqueda'}
        >
          <SlidersHorizontal size={20} color={theme.primary} />
          {filtersActive && <View style={[styles.filterDot, { backgroundColor: theme.secondary }]} />}
        </TouchableOpacity>
      </View>

      {showDropdown && (
        <View style={styles.dropdown} accessibilityRole="list">
          {visibleResults.length > 0 ? (
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.resultsScroll}>
              {visibleResults.map((item, index) => {
                const [before, match, after] = splitMatch(item.name, trimmed);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.resultItem, index > 0 && { borderTopColor: theme.gray[200], borderTopWidth: 1 }]}
                    onPress={() => selectResult(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}. Trazar ruta`}
                  >
                    <View style={[styles.resultIcon, { backgroundColor: theme.primarySoft || '#e8f1fa' }]}>
                      <MapPin size={18} color={theme.primary} />
                    </View>
                    <View style={styles.resultText}>
                      <Text style={[styles.resultName, { color: theme.text }]} numberOfLines={1}>
                        {before}
                        <Text style={[styles.resultMatch, { color: theme.primary }]}>{match}</Text>
                        {after}
                      </Text>
                      {item.description ? (
                        <Text style={[styles.resultDescription, { color: theme.gray[700] }]} numberOfLines={1}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyState} accessibilityLiveRegion="polite">
              <SearchX size={22} color={theme.gray[700]} />
              <View style={styles.emptyText}>
                <Text style={[styles.resultName, { color: theme.text }]}>Sin resultados para “{trimmed}”</Text>
                <Text style={[styles.resultDescription, { color: theme.gray[700] }]}>
                  Prueba con el nombre o la letra del edificio.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      <FilterModal
        visible={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onApply={handleFilterApply}
      />
    </>
  );
}

const shadow = {
  elevation: 4,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 6,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: DIMENSIONS.borderRadius.lg,
    borderWidth: 1.5,
    paddingLeft: DIMENSIONS.spacing.md,
    marginRight: DIMENSIONS.spacing.sm,
    minHeight: 52,
    ...shadow,
  },
  searchIcon: {
    marginRight: DIMENSIONS.spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Regular',
  },
  iconButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: DIMENSIONS.borderRadius.lg,
    ...shadow,
  },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  dropdown: {
    marginTop: DIMENSIONS.spacing.sm,
    marginRight: 52 + DIMENSIONS.spacing.sm,
    backgroundColor: '#ffffff',
    borderRadius: DIMENSIONS.borderRadius.lg,
    overflow: 'hidden',
    ...shadow,
  },
  resultsScroll: {
    maxHeight: 6 * 60,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: DIMENSIONS.spacing.md,
    paddingVertical: DIMENSIONS.spacing.sm,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DIMENSIONS.spacing.md,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Regular',
  },
  resultMatch: {
    fontFamily: 'Roboto-Bold',
  },
  resultDescription: {
    fontSize: DIMENSIONS.fontSize.sm,
    fontFamily: 'Roboto-Regular',
    marginTop: 2,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DIMENSIONS.spacing.md,
  },
  emptyText: {
    flex: 1,
    marginLeft: DIMENSIONS.spacing.md,
  },
});
