import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input.jsx';
import { Button } from '../common/Button.jsx';
import { BuildingUseCases } from '../../../application/usecases/BuildingUseCases.js';
import { Upload } from 'lucide-react';
import Swal from 'sweetalert2';

const buildingUseCases = new BuildingUseCases();

const ALL_SERVICES_CATALOG = [
  { id: 'AUL', name: 'Aula' },
  { id: 'LAB', name: 'Laboratorio' },
  { id: 'BIB', name: 'Biblioteca' },
  { id: 'AUD', name: 'Auditorio' },
  { id: 'GIM', name: 'Gimnasio' },
  { id: 'OFI', name: 'Oficina' }
];

const ALL_CAREERS_CATALOG = [
  { id: 'CAR-TIC', name: 'Information and Communication Technologies' },
  { id: 'CAR-MEC', name: 'Mecatrónica' }
];

const checkboxGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '12px',
  backgroundColor: 'var(--color-gray-50)',
  border: '1px solid var(--color-gray-200)',
  borderRadius: 'var(--border-radius-md)',
  padding: '16px',
  marginTop: '8px',
  maxHeight: '180px',
  overflowY: 'auto'
};

export function BuildingForm({ building, allServices = [], allCareers = [], onSave, onCancel }) {
  const [loading, setLoading] = useState(false); 
  const [imagePreview, setImagePreview] = useState(building?.media || null);

  // Obtener todos los servicios únicos combinando el catálogo estático y los de las props
  const getCombinedServices = () => {
    const servicesMap = new Map();
    ALL_SERVICES_CATALOG.forEach(s => servicesMap.set(s.id, s.name));
    
    if (Array.isArray(allServices)) {
      allServices.forEach(s => {
        const id = s._id || s.id;
        const name = s.name;
        if (id && name) {
          servicesMap.set(id, name);
        }
      });
    }
    
    return Array.from(servicesMap.entries()).map(([id, name]) => ({ id, name }));
  };

  // Obtener todas las carreras únicas combinando el catálogo estático y las de las props
  const getCombinedCareers = () => {
    const careersMap = new Map();
    ALL_CAREERS_CATALOG.forEach(c => careersMap.set(c.id, c.name));
    
    if (Array.isArray(allCareers)) {
      allCareers.forEach(c => {
        const id = c._id || c.id;
        const name = c.name;
        if (id && name) {
          careersMap.set(id, name);
        }
      });
    }
    
    return Array.from(careersMap.entries()).map(([id, name]) => ({ id, name }));
  };

  const getFormattedDefaultValues = () => {
    if (!building) {
      return {
        name: '',
        description: '',
        accessibility: false,
        floors: 1,
        availability: true,
        student_frequency: '',
        services: [],
        careers: [],
        bathrooms: {
          floor_1: false,
          floor_2: false,
          floor_3: false,
          floor_4: false,
          floor_5: false
        },
        entrances: '',
      };
    }

    let activeServices = [];
    if (Array.isArray(building.services)) {
      activeServices = building.services.map(s => typeof s === 'object' ? (s._id || s.id || '') : s).filter(Boolean);
    }

    let activeCareers = [];
    if (Array.isArray(building.careers)) {
      activeCareers = building.careers.map(c => typeof c === 'object' ? (c._id || c.id || '') : c).filter(Boolean);
    }

    let formattedEntrances = '';
    if (Array.isArray(building.entrances)) {
      formattedEntrances = building.entrances.map(e => typeof e === 'object' ? (e.description || e.entrance_id || '') : e).filter(Boolean).join(', ');
    } else if (typeof building.entrances === 'string') {
      formattedEntrances = building.entrances;
    }

    return {
      ...building,
      services: activeServices,
      careers: activeCareers,
      entrances: formattedEntrances,
      bathrooms: building.bathrooms || {
        floor_1: false,
        floor_2: false,
        floor_3: false,
        floor_4: false,
        floor_5: false
      }
    };
  };

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: getFormattedDefaultValues()
  });

  const floorsCount = Number(watch('floors', building?.floors || 1)) || 1;

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Mapear de vuelta a objeto de baños, asegurando que todos los pisos válidos se representen
      const bathroomsObj = {
        floor_1: false,
        floor_2: false,
        floor_3: false,
        floor_4: false,
        floor_5: false
      };
      
      if (data.bathrooms && typeof data.bathrooms === 'object') {
        Object.keys(data.bathrooms).forEach(key => {
          if (key.startsWith('floor_')) {
            bathroomsObj[key] = !!data.bathrooms[key];
          }
        });
      }

      // Mapear de vuelta a array de entradas (evitando propagación de campos internos de Mongoose)
      const entrancesNames = data.entrances ? data.entrances.split(',').map(e => e.trim()) : [];
      const entrancesData = entrancesNames.map(name => {
        const found = building?.entrances?.find(e => e.description === name || e.entrance_id === name);
        return {
          entrance_id: found ? found.entrance_id : `ENT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          description: name,
          location_hint: found ? found.location_hint : 'Entrada'
        };
      });

      // Mapear materias para que cumplan estrictamente con el esquema Mongoose
      const subjectsList = building?.subjects || building?.subject || [];
      const subjectsData = subjectsList.map(s => ({
        name: s.name,
        id_subjects: s.id_subjects?._id || s.id_subjects || s.id_subject || null,
        floor: Number(s.floor)
      }));

      // Payload estricto para evitar mandar campos incompatibles, _id o id virtuales que Mongoose rechaza con 400
      const formData = {
        geo_id: building?.geo_id || data.geo_id || '',
        name: data.name,
        description: data.description,
        accessibility: !!data.accessibility,
        floors: Number(data.floors),
        availability: !!data.availability,
        student_frequency: data.student_frequency || 'medium',
        id_services: data.services || [],
        id_careers: data.careers || [],
        bathrooms: bathroomsObj,
        entrances: entrancesData,
        subjects: subjectsData,
        media: building?.media || data.media || ''
      };

      const buildingId = building?._id || building?.id;
      await buildingUseCases.updateBuilding(buildingId, formData);

      const imageFile = document.querySelector('input[type="file"]')?.files[0];
      if (imageFile) {
        await buildingUseCases.uploadImage(buildingId, imageFile);
      }

      Swal.fire('Éxito', 'Edificio actualizado correctamente', 'success');
      onSave();
    } catch (error) {
      console.error('Error updating building:', error);
      Swal.fire('Error', 'No se pudo actualizar el edificio', 'error');
    } finally {
      setLoading(false);
    }
  };

  const servicesList = getCombinedServices();
  const careersList = getCombinedCareers();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="building-form">
      <div className="form-row">
        <Input
          label="Nombre del edificio"
          error={errors.name?.message}
          {...register('name', { required: 'El nombre es obligatorio' })}
        />
      </div>

      <div className="form-row">
        <label className="form-label">Descripción</label>
        <textarea
          className="form-textarea"
          rows={3}
          {...register('description')}
        />
      </div>

      <div className="form-row">
        <div className="image-upload">
          <label className="form-label">Imagen del edificio</label>
          <div className="image-preview">
            {imagePreview ? (
              <img src={imagePreview} alt="Vista previa" />
            ) : (
              <div className="image-placeholder">
                <Upload size={32} />
                <p>Seleccionar imagen</p>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="file-input"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-col">
          <Input
            label="Número de pisos"
            type="number"
            min="1"
            error={errors.floors?.message}
            {...register('floors', {
              required: 'El número de pisos es obligatorio',
              min: { value: 1, message: 'Debe tener al menos 1 piso' }
            })}
          />
        </div>

        <div className="form-col">
          <Input
            label="Frecuencia de estudiantes"
            placeholder="Ej: Alta, Media, Baja"
            {...register('student_frequency')}
          />
        </div>
      </div>

      <div className="form-row">
        <label className="checkbox-label">
          <input type="checkbox" {...register('accessibility')} />
          Edificio accesible
        </label>
      </div>

      <div className="form-row">
        <label className="checkbox-label">
          <input type="checkbox" {...register('availability')} />
          Edificio disponible
        </label>
      </div>

      {/* ✅ Selección interactiva de Servicios */}
      <div className="form-row form-col" style={{ marginBottom: '24px' }}>
        <label className="form-label">Servicios disponibles</label>
        <div style={checkboxGridStyle}>
          {servicesList.map(s => (
            <label key={s.id} className="checkbox-label">
              <input
                type="checkbox"
                value={s.id}
                {...register('services')}
              />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      {/* ✅ Selección interactiva de Baños por Piso dinámicos */}
      <div className="form-row form-col" style={{ marginBottom: '24px' }}>
        <label className="form-label">Baños disponibles (por piso)</label>
        <div style={checkboxGridStyle}>
          {Array.from({ length: floorsCount }, (_, i) => {
            const floorNum = i + 1;
            return (
              <label key={floorNum} className="checkbox-label">
                <input
                  type="checkbox"
                  {...register(`bathrooms.floor_${floorNum}`)}
                />
                Planta {floorNum}
              </label>
            );
          })}
        </div>
      </div>

      {/* ✅ Selección interactiva de Carreras */}
      <div className="form-row form-col" style={{ marginBottom: '24px' }}>
        <label className="form-label">Carreras que usan el edificio</label>
        <div style={checkboxGridStyle}>
          {careersList.map(c => (
            <label key={c.id} className="checkbox-label">
              <input
                type="checkbox"
                value={c.id}
                {...register('careers')}
              />
              {c.name}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <Input
          label="Entradas principales"
          placeholder="Separadas por comas: Entrada norte, Entrada sur"
          {...register('entrances')}
        />
      </div>

      <div className="form-actions">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
