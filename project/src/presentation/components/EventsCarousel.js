import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Calendar, MapPin, Navigation } from 'lucide-react-native';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { MIN_TOUCH_TARGET } from '../../core/constants/colors';
import { useTheme } from '../../core/context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.82;
// Con más eventos que esto, los puntos de paginación ya no caben: se muestra "3 de 19".
const MAX_DOTS = 7;

/**
 * Carrusel de eventos en tarjetas compactas (imagen a la izquierda). La tarjeta anterior medía
 * ~260 dp de alto y, junto con los atajos, el panel tapaba más de la mitad del mapa.
 */
export default function EventsCarousel({ events, onRouteToEvent }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { theme } = useTheme();

  const formatDate = (date) => {
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleScroll = (event) => {
    const slideSize = CARD_WIDTH + DIMENSIONS.spacing.md;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setActiveIndex(Math.max(0, Math.min(index, events.length - 1)));
  };

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.primary }]} accessibilityRole="header">Eventos del campus</Text>
        {events.length > MAX_DOTS ? (
          <Text style={[styles.counter, { color: theme.gray[700] }]}>
            {activeIndex + 1} de {events.length}
          </Text>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + DIMENSIONS.spacing.md}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {events.map((event) => (
          <View key={event.id} style={[styles.eventCard, { borderColor: theme.gray[200] }]}>
            <Image source={{ uri: event.image }} style={styles.eventImage} accessibilityIgnoresInvertColors />

            <View style={styles.eventContent}>
              <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
                {event.title}
              </Text>

              <View style={styles.eventDetail}>
                <Calendar size={14} color={theme.primary} />
                <Text style={styles.eventDetailText} numberOfLines={1}>
                  {formatDate(event.date)}
                </Text>
              </View>

              {event.location ? (
                <View style={styles.eventDetail}>
                  <MapPin size={14} color={theme.primary} />
                  <Text style={styles.eventDetailText} numberOfLines={1}>
                    {event.location}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.routeButton}
                onPress={() => onRouteToEvent && onRouteToEvent(event.location)}
                accessibilityRole="button"
                accessibilityLabel={`Cómo llegar a ${event.title}`}
              >
                <Navigation size={16} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.routeButtonText, { color: theme.primary }]}>Cómo llegar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {events.length <= MAX_DOTS ? (
        <View style={styles.pagination}>
          {events.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeIndex
                  ? [styles.paginationDotActive, { backgroundColor: theme.primary }]
                  : { backgroundColor: theme.gray[300] },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: DIMENSIONS.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: DIMENSIONS.spacing.md,
    marginBottom: DIMENSIONS.spacing.sm,
  },
  title: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Bold',
  },
  counter: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
  },
  scrollContainer: {
    paddingHorizontal: DIMENSIONS.spacing.md,
    paddingBottom: 4,
  },
  eventCard: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: DIMENSIONS.borderRadius.lg,
    marginRight: DIMENSIONS.spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eventImage: {
    width: 96,
    alignSelf: 'stretch',
    resizeMode: 'cover',
  },
  eventContent: {
    flex: 1,
    paddingHorizontal: DIMENSIONS.spacing.md,
    paddingTop: DIMENSIONS.spacing.sm,
  },
  eventTitle: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Bold',
    marginBottom: 4,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventDetailText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#616161',
    marginLeft: DIMENSIONS.spacing.xs,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: MIN_TOUCH_TARGET,
    paddingRight: DIMENSIONS.spacing.sm,
  },
  routeButtonText: {
    fontSize: 14,
    fontFamily: 'Roboto-Bold',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: DIMENSIONS.spacing.xs,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  paginationDotActive: {
    width: 14,
  },
});
