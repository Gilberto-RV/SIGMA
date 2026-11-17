// jobs/batchProcessor.js
import cron from 'node-cron';
import * as batchService from '../services/batchProcessingService.js';

/**
 * Programar tareas de procesamiento por lotes
 * 
 * Horarios:
 * - Procesamiento diario: Todos los días a las 2:00 AM
 * - Limpieza semanal: Domingos a las 3:00 AM
 */

// Hora del campus (Apizaco, Tlaxcala). Antes estaba en America/Caracas.
const TIMEZONE = process.env.CRON_TIMEZONE || 'America/Mexico_City';

// node-cron 4: createTask crea la tarea sin iniciarla (equivale a `scheduled: false` de la v3);
// se inicia en startScheduledJobs() solo si ENABLE_BATCH_PROCESSING=true.

// Procesamiento diario a las 2:00 AM
const dailyProcessingJob = cron.createTask('0 2 * * *', async () => {
  console.log('⏰ Ejecutando procesamiento diario programado...');
  try {
    await batchService.runBatchProcessing();
    console.log('✅ Procesamiento diario completado exitosamente');
  } catch (error) {
    console.error('❌ Error en procesamiento diario programado:', error);
  }
}, { name: 'procesamiento-diario', timezone: TIMEZONE, noOverlap: true });

// Limpieza semanal los domingos a las 3:00 AM
const weeklyCleanupJob = cron.createTask('0 3 * * 0', async () => {
  console.log('⏰ Ejecutando limpieza semanal programada...');
  try {
    await batchService.cleanOldData(90);
    console.log('✅ Limpieza semanal completada exitosamente');
  } catch (error) {
    console.error('❌ Error en limpieza semanal programada:', error);
  }
}, { name: 'limpieza-semanal', timezone: TIMEZONE, noOverlap: true });

/**
 * Iniciar todos los trabajos programados
 */
export const startScheduledJobs = () => {
  dailyProcessingJob.start();
  weeklyCleanupJob.start();
  console.log('✅ Trabajos de procesamiento por lotes iniciados');
  console.log('   - Procesamiento diario: 2:00 AM');
  console.log('   - Limpieza semanal: Domingos 3:00 AM');
};

/**
 * Detener todos los trabajos programados
 */
export const stopScheduledJobs = () => {
  dailyProcessingJob.stop();
  weeklyCleanupJob.stop();
  console.log('⏸️ Trabajos de procesamiento por lotes detenidos');
};

// Exportar los trabajos individuales por si se necesitan controlar por separado
export { dailyProcessingJob, weeklyCleanupJob };

