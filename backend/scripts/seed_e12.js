import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Building from '../models/Building.js';
import Career from '../models/Career.js';
import Service from '../models/Service.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Buscar el edificio E-12
    const building = await Building.findById('E-12');
    if (!building) {
      console.log('❌ Edificio E-12 no encontrado en la base de datos.');
      return;
    }
    
    console.log(`🏢 Edificio actual: ${building.name} (${building._id})`);
    
    // Vincular carreras: TIC (CAR-TIC) y Mecatrónica (CAR-MEC)
    building.id_careers = ['CAR-TIC', 'CAR-MEC'];
    
    // Vincular servicios principales del edificio: Aulas (AUL) y Laboratorios (LAB)
    building.id_services = ['AUL', 'LAB'];
    
    // Cargar asignaturas y espacios académicos correspondientes
    building.subjects = [
      {
        name: 'Laboratorio de Telecomunicaciones y Redes',
        id_subjects: 'LAB',
        floor: 1
      },
      {
        name: 'Aula de Programación Orientada a Objetos',
        id_subjects: 'AUL',
        floor: 1
      },
      {
        name: 'Laboratorio de Robótica y Automatización',
        id_subjects: 'LAB',
        floor: 2
      },
      {
        name: 'Aula de Inteligencia Artificial',
        id_subjects: 'AUL',
        floor: 2
      }
    ];
    
    building.last_updated = new Date();
    await building.save();
    
    console.log('🎉 ¡Edificio E-12 (Edificio L) poblado exitosamente con materias, carreras y servicios!');
    
    // Consultar de nuevo con populate para verificar
    const updatedBuilding = await Building.findById('E-12')
      .populate('id_services')
      .populate('id_careers')
      .populate('subjects.id_subjects');
      
    console.log('\n==================================================');
    console.log(`🏢 EDIFICIO: ${updatedBuilding.id} - ${updatedBuilding.name}`);
    console.log('==================================================');
    console.log('💼 CARRERAS VINCULADAS:');
    updatedBuilding.id_careers.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.name} (${c._id})`);
    });
    console.log('\n📚 ASIGNATURAS / ESPACIOS ACADÉMICOS:');
    updatedBuilding.subjects.forEach((s, i) => {
      console.log(`   - ${s.name} (Piso ${s.floor}) | Servicio: ${s.id_subjects?.name || 'N/A'}`);
    });
    console.log('==================================================\n');
    
  } catch (err) {
    console.error('❌ Error en el sembrado:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

run();
