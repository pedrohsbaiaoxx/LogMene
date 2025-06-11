import React from 'react';
import { ChevronRight, Phone, Clock, MapPin, ArrowRight, Building } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Service {
  icon: string;
  name: string;
  description: string;
}

// Definindo o objeto Icons com os ícones
const Icons: Record<string, LucideIcon> = {
  'paint-roller': Building,
  wrench: Building,
  'hard-hat': Building,
  'hand-sparkles': Building,
  'user-nurse': Building,
  building: Building,
  help: Building
};

// ... existing code ...

// Atualizando a linha que acessa Icons[service.icon]
const IconComponent = (service: Service) => Icons[service.icon] || Icons.building;

const PublicServices = () => {
  const services: Service[] = [
    {
      icon: 'building',
      name: 'Serviço 1',
      description: 'Descrição do serviço 1'
    },
    // ... outros serviços
  ];

  return (
    <div>
      {services.map((service) => (
        <div key={service.name}>
          <Building className="h-6 w-6" />
          <h3>{service.name}</h3>
          <p>{service.description}</p>
        </div>
      ))}
    </div>
  );
};

export default PublicServices; 