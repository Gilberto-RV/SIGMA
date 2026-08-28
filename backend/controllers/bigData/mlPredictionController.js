// controllers/bigData/mlPredictionController.js
import * as mlService from '../../services/mlService.js';
import EventAnalytics from '../../models/BigData/EventAnalytics.js';
import BuildingAnalytics from '../../models/BigData/BuildingAnalytics.js';
import Event from '../../models/Event.js';
import Building from '../../models/Building.js';

/**
 * Obtener predicción de asistencia para un evento
 */
export const getAttendancePrediction = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Obtener datos del evento
    let event = null;
    try {
      event = await Event.findById(eventId);
    } catch (e) {
      event = await Event.findOne({ _id: eventId });
    }
    if (!event) {
      event = await Event.findOne({ title: new RegExp(eventId, 'i') });
    }

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    // Obtener analíticas del evento (fecha actual o más reciente)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let analytics = await EventAnalytics.findOne({
      eventId: event._id,
      date: today
    });

    if (!analytics) {
      analytics = await EventAnalytics.findOne({ eventId: event._id }).sort({ date: -1 });
    }

    // Preparar datos para predicción
    const eventDate = new Date(event.date_time || Date.now());
    const predictionData = {
      viewCount: analytics?.viewCount || Math.floor(Math.random() * 50) + 20,
      uniqueVisitors: analytics?.uniqueVisitors || Math.floor(Math.random() * 30) + 15,
      dayOfWeek: eventDate.getDay(),
      hour: eventDate.getHours(),
      category_count: event.category?.length || 1,
      popularityScore: analytics?.popularityScore || 50,
      date_time: eventDate.toISOString()
    };

    // Obtener predicción del ML Service
    const prediction = await mlService.predictEventAttendance(predictionData);

    // Actualizar el campo attendancePrediction en analytics si existe
    if (analytics) {
      analytics.attendancePrediction = prediction.prediction;
      await analytics.save().catch(() => {});
    }

    res.json({
      success: true,
      data: {
        eventId: event._id,
        eventTitle: event.title,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        modelType: prediction.model_type,
        features: prediction.features_used,
        eventData: predictionData
      }
    });
  } catch (error) {
    console.error('Error obteniendo predicción ML:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener predicción',
      error: error.message
    });
  }
};

/**
 * Obtener predicciones para múltiples eventos
 */
export const getBatchPredictions = async (req, res) => {
  try {
    const { eventIds } = req.body; // Array de IDs de eventos
    
    if (!Array.isArray(eventIds)) {
      return res.status(400).json({
        success: false,
        message: 'eventIds debe ser un array'
      });
    }

    const predictions = [];
    
    for (const eventId of eventIds) {
      try {
        let event = null;
        try {
          event = await Event.findById(eventId);
        } catch (e) {
          event = await Event.findOne({ _id: eventId });
        }
        if (!event) continue;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let analytics = await EventAnalytics.findOne({
          eventId: event._id,
          date: today
        });

        if (!analytics) {
          analytics = await EventAnalytics.findOne({ eventId: event._id }).sort({ date: -1 });
        }

        const eventDate = new Date(event.date_time || Date.now());
        const predictionData = {
          viewCount: analytics?.viewCount || 25,
          uniqueVisitors: analytics?.uniqueVisitors || 15,
          dayOfWeek: eventDate.getDay(),
          hour: eventDate.getHours(),
          category_count: event.category?.length || 1,
          popularityScore: analytics?.popularityScore || 50,
          date_time: eventDate.toISOString()
        };

        const prediction = await mlService.predictEventAttendance(predictionData);
        
        predictions.push({
          eventId: event._id,
          eventTitle: event.title,
          prediction: prediction.prediction,
          confidence: prediction.confidence
        });
      } catch (error) {
        console.error(`Error prediciendo evento ${eventId}:`, error);
      }
    }

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('Error en predicciones batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener predicciones',
      error: error.message
    });
  }
};

/**
 * Predecir demanda de movilidad para un edificio
 */
export const getMobilityPrediction = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { date } = req.query; // Fecha opcional (YYYY-MM-DD)
    
    // Obtener datos del edificio
    let building = await Building.findById(buildingId);
    if (!building) {
      building = await Building.findOne({ $or: [{ _id: buildingId }, { id: buildingId }, { geo_id: buildingId }] });
    }
    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Edificio no encontrado'
      });
    }

    // Obtener analíticas del edificio
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    let analytics = await BuildingAnalytics.findOne({
      buildingId: building._id,
      date: targetDate
    });

    if (!analytics) {
      analytics = await BuildingAnalytics.findOne({ buildingId: building._id }).sort({ date: -1 });
    }

    // Contar eventos en ese edificio ese día
    const eventsCount = await Event.countDocuments({
      building_assigned: building._id,
      date_time: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).catch(() => 0);

    // Obtener peak hours
    const peakHours = analytics?.peakHours || [];
    const maxPeakHour = peakHours.length > 0 
      ? peakHours.reduce((max, ph) => (ph.count || 0) > (max.count || 0) ? ph : max, peakHours[0]).hour 
      : targetDate.getHours() || 12;

    // Preparar datos para predicción
    const predictionData = {
      viewCount: analytics?.viewCount || 50,
      uniqueVisitors: analytics?.uniqueVisitors || 30,
      dayOfWeek: targetDate.getDay(),
      hour: targetDate.getHours() || 12,
      peakHour: maxPeakHour,
      eventsCount: eventsCount,
      averageViewDuration: analytics?.averageViewDuration || 120,
      date_time: targetDate.toISOString()
    };

    // Obtener predicción del ML Service
    const prediction = await mlService.predictMobilityDemand(predictionData);

    res.json({
      success: true,
      data: {
        buildingId: building._id,
        buildingName: building.name,
        date: targetDate.toISOString(),
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        modelType: prediction.model_type,
        features: prediction.features_used,
        buildingData: predictionData
      }
    });
  } catch (error) {
    console.error('Error obteniendo predicción de movilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener predicción de movilidad',
      error: error.message
    });
  }
};

/**
 * Predecir nivel de saturación para un edificio o evento
 */
export const getSaturationPrediction = async (req, res) => {
  try {
    const { type, id } = req.params; // type: 'building' o 'event', id: buildingId o eventId
    const { date } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    if (type === 'building') {
      let building = await Building.findById(id);
      if (!building) {
        building = await Building.findOne({ $or: [{ _id: id }, { id: id }, { geo_id: id }] });
      }
      if (!building) {
        return res.status(404).json({
          success: false,
          message: 'Edificio no encontrado'
        });
      }

      let analytics = await BuildingAnalytics.findOne({
        buildingId: building._id,
        date: targetDate
      });

      if (!analytics) {
        analytics = await BuildingAnalytics.findOne({ buildingId: building._id }).sort({ date: -1 });
      }

      const peakHours = analytics?.peakHours || [];
      const totalPeakVisits = peakHours.reduce((sum, ph) => sum + (ph.count || 0), 0);

      const predictionData = {
        viewCount: analytics?.viewCount || 50,
        uniqueVisitors: analytics?.uniqueVisitors || 30,
        dayOfWeek: targetDate.getDay(),
        hour: targetDate.getHours() || 12,
        peakVisits: totalPeakVisits || 20,
        averageViewDuration: analytics?.averageViewDuration || 120,
        popularityScore: 0,
        type: 0, // Edificio
        date_time: targetDate.toISOString()
      };

      const prediction = await mlService.predictSaturation(predictionData);

      res.json({
        success: true,
        data: {
          buildingId: building._id,
          buildingName: building.name,
          date: targetDate.toISOString(),
          saturationLevel: prediction.saturationLevel,
          saturationLabel: prediction.saturationLabel,
          confidence: prediction.confidence,
          modelType: prediction.model_type,
          features: prediction.features_used,
          buildingData: predictionData
        }
      });
    } else if (type === 'event') {
      let event = null;
      try {
        event = await Event.findById(id);
      } catch (e) {
        event = await Event.findOne({ _id: id });
      }
      if (!event) {
        event = await Event.findOne({ title: new RegExp(id, 'i') });
      }
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      let analytics = await EventAnalytics.findOne({
        eventId: event._id,
        date: targetDate
      });

      if (!analytics) {
        analytics = await EventAnalytics.findOne({ eventId: event._id }).sort({ date: -1 });
      }

      const eventDate = new Date(event.date_time || Date.now());
      const predictionData = {
        viewCount: analytics?.viewCount || 30,
        uniqueVisitors: analytics?.uniqueVisitors || 20,
        dayOfWeek: eventDate.getDay(),
        hour: eventDate.getHours() || 12,
        peakVisits: 0,
        averageViewDuration: 0,
        popularityScore: analytics?.popularityScore || 50,
        type: 1, // Evento
        date_time: eventDate.toISOString()
      };

      const prediction = await mlService.predictSaturation(predictionData);

      res.json({
        success: true,
        data: {
          eventId: event._id,
          eventTitle: event.title,
          date: targetDate.toISOString(),
          saturationLevel: prediction.saturationLevel,
          saturationLabel: prediction.saturationLabel,
          confidence: prediction.confidence,
          modelType: prediction.model_type,
          features: prediction.features_used,
          eventData: predictionData
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Tipo debe ser "building" o "event"'
      });
    }
  } catch (error) {
    console.error('Error obteniendo predicción de saturación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener predicción de saturación',
      error: error.message
    });
  }
};

/**
 * Verificar estado del ML Service
 */
export const checkMLServiceStatus = async (req, res) => {
  try {
    const status = await mlService.checkMLServiceHealth();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verificando ML Service',
      error: error.message
    });
  }
};

