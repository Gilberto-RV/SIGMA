export class Event {
  constructor({
    id,
    title,
    description,
    image,
    date,
    location = null,
    isActive = true,
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.image = image;
    this.date = date;
    this.location = location;
    this.isActive = isActive;
  }

  static fromJSON(json) {
    // Resolver la ubicación desde el edificio asignado en MongoDB o el campo location directo
    let locationName = 'Campus';
    if (json.building_assigned) {
      if (Array.isArray(json.building_assigned) && json.building_assigned.length > 0) {
        locationName = json.building_assigned[0].name || json.building_assigned[0];
      } else if (typeof json.building_assigned === 'object' && json.building_assigned.name) {
        locationName = json.building_assigned.name;
      } else if (typeof json.building_assigned === 'string') {
        locationName = json.building_assigned;
      }
    } else if (json.location) {
      locationName = json.location;
    }

    return new Event({
      id: json._id || json.id,
      title: json.title || 'Evento del Campus',
      description: json.description || 'Sin descripción',
      image: json.media || json.image || 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg',
      date: json.date_time ? new Date(json.date_time) : (json.date ? new Date(json.date) : new Date()),
      location: locationName,
      isActive: json.status ? (json.status !== 'cancelado') : (json.isActive ?? true),
    });
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      image: this.image,
      date: this.date.toISOString(),
      location: this.location,
      isActive: this.isActive,
    };
  }
}