import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Calendar, MapPin } from 'lucide-react-native';
import { DIMENSIONS } from '../../core/constants/dimensions';
import { useTheme } from '../../core/context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.78;

export default function EventsCarousel({ events, onRouteToEvent }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { theme } = useTheme();

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleScroll = (event) => {
    const slideSize = CARD_WIDTH + DIMENSIONS.spacing.md;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setActiveIndex(index);
  };

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.primary }]}>Eventos del Campus</Text>
      
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
        {events.map((event, index) => (
          <View key={event.id} style={styles.eventCard}>
            <Image source={{ uri: event.image }} style={styles.eventImage} />
            
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              
              <Text style={styles.eventDescription} numberOfLines={2}>
                {event.description}
              </Text>
              
              <View style={styles.eventDetails}>
                <View style={styles.eventDetail}>
                  <Calendar size={13} color={theme.primary} />
                  <Text style={styles.eventDetailText}>
                    {formatDate(event.date)}
                  </Text>
                </View>
                
                {event.location && (
                  <View style={styles.eventDetail}>
                    <MapPin size={13} color={theme.primary} />
                    <Text style={styles.eventDetailText}>
                      {event.location}
                    </Text>
                  </View>
                )}
              </View>

              {/* Botón de cómo llegar */}
              <TouchableOpacity
                style={[styles.routeButton, { backgroundColor: theme.primary }]}
                onPress={() => onRouteToEvent && onRouteToEvent(event.location)}
              >
                <MapPin size={13} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.routeButtonText}>¿Cómo llegar? 📍</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {events.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === activeIndex ? [styles.paginationDotActive, { backgroundColor: theme.primary }] : { backgroundColor: theme.gray[300] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: DIMENSIONS.spacing.xs,
  },
  title: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Bold',
    marginBottom: DIMENSIONS.spacing.sm,
    paddingHorizontal: DIMENSIONS.spacing.md,
  },
  scrollContainer: {
    paddingHorizontal: DIMENSIONS.spacing.md,
    paddingBottom: 8,
  },
  eventCard: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: DIMENSIONS.borderRadius.lg,
    marginRight: DIMENSIONS.spacing.md,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
    borderColor: '#f0f0f0',
    borderWidth: 1,
  },
  eventImage: {
    width: '100%',
    height: 95,
    resizeMode: 'cover',
  },
  eventContent: {
    padding: DIMENSIONS.spacing.md,
  },
  eventTitle: {
    fontSize: DIMENSIONS.fontSize.md,
    fontFamily: 'Roboto-Bold',
    color: '#333333',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#666666',
    marginBottom: DIMENSIONS.spacing.sm,
    lineHeight: 16,
  },
  eventDetails: {
    gap: DIMENSIONS.spacing.xs,
    marginBottom: DIMENSIONS.spacing.sm,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDetailText: {
    fontSize: 11,
    fontFamily: 'Roboto-Regular',
    color: '#777777',
    marginLeft: DIMENSIONS.spacing.xs,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: DIMENSIONS.borderRadius.md,
    elevation: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
  },
  routeButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Roboto-Bold',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: DIMENSIONS.spacing.xs,
    paddingBottom: DIMENSIONS.spacing.sm,
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