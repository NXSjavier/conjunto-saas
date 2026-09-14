import React from 'react';
import { Modal } from '../ui/Modal';

const PRIVACY = {
  title: 'Política de Privacidad',
  updated: 'Última actualización: 2026',
  sections: [
    {
      h: '1. Responsable del tratamiento',
      p: 'Residex (en adelante "la Plataforma") es responsable del tratamiento de los datos personales de sus usuarios, de conformidad con la Ley Orgánica de Protección de Datos Personales del Ecuador (LOPDP) y su Reglamento.',
    },
    {
      h: '2. Datos que tratamos',
      p: 'Tratamos: nombre, correo electrónico, teléfono, número de apartamento y fotografía de rostro (opcional, para verificación de identidad en el control de acceso). También registramos la actividad de uso (inicios de sesión, accesos) para seguridad y soporte.',
    },
    {
      h: '3. Finalidad y base legal',
      p: 'Tratamos tus datos para: (i) gestionar tu cuenta y el acceso al conjunto residencial; (ii) registrar visitantes y control de acceso; (iii) notificarte incidencias, reservas y comunicados; (iv) cumplir obligaciones de seguridad. La base legal es tu consentimiento y la ejecución del servicio contratado por la administración de tu conjunto.',
    },
    {
      h: '4. Derechos del titular',
      p: 'Puedes ejercer en cualquier momento los derechos de acceso, rectificación, eliminación, oposición, limitación y portabilidad de tus datos, contactando al administrador de tu conjunto o a privacidad@residex.app.',
    },
    {
      h: '5. Conservación y seguridad',
      p: 'Conservamos tus datos mientras tu cuenta esté activa y por el tiempo legal exigido. Aplicamos medidas técnicas (cifrado en tránsito, control de acceso por rol y aislamiento por conjunto) para proteger tu información.',
    },
    {
      h: '6. Comunicaciones y cambios',
      p: 'No compartimos tus datos con terceros salvo obligación legal o proveedores que operan el servicio bajo contrato. Cualquier cambio a esta política será notificado en la Plataforma.',
    },
  ],
};

const TERMS = {
  title: 'Términos y Condiciones',
  updated: 'Última actualización: 2026',
  sections: [
    {
      h: '1. Aceptación',
      p: 'Al usar Residex aceptas estos términos. Si no estás de acuerdo, no utilices la Plataforma. El acceso es proporcionado por la administración de tu conjunto residencial.',
    },
    {
      h: '2. Uso permitido',
      p: 'La Plataforma es para la gestión interna del conjunto: control de acceso, visitas, reservas, comunicados e incidencias. Está prohibido usar la información de otros residentes para fines distintos a los del servicio.',
    },
    {
      h: '3. Cuentas y responsabilidades',
      p: 'Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad bajo tu cuenta. Notifica de inmediato al administrador ante cualquier uso no autorizado.',
    },
    {
      h: '4. Veracidad de la información',
      p: 'Debes proporcionar información veraz y actualizada. El administrador puede suspender cuentas que incumplan estas condiciones o que afecten la seguridad del conjunto.',
    },
    {
      h: '5. Disponibilidad y limitación',
      p: 'Hacemos esfuerzos razonables por mantener el servicio disponible, pero no garantizamos disponibilidad ininterrumpida. No nos hacemos responsables por daños indirectos derivados del uso del servicio, en la medida permitida por la ley ecuatoriana.',
    },
    {
      h: '6. Modificaciones y contacto',
      p: 'Podemos actualizar estos términos; la versión vigente se publicará en la Plataforma. Para dudas escríbenos a soporte@residex.app.',
    },
  ],
};

export function LegalModal({ type, onClose }) {
  const data = type === 'privacy' ? PRIVACY : TERMS;
  return (
    <Modal isOpen={!!type} onClose={onClose} title={data.title} maxWidth="2xl">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-sm text-slate-300">
        <p className="text-[11px] text-slate-500">{data.updated}</p>
        {data.sections.map((s) => (
          <div key={s.h}>
            <h3 className="text-sm font-bold text-white">{s.h}</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">{s.p}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
