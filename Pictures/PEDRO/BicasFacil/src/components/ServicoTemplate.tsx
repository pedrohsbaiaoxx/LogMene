import React from 'react';

// Adicionando interface para tipar o objeto filters
interface Filters {
  rating: string;
  price: string;
  location: string;
  [key: string]: string; // Permitindo indexação por string
}

interface Filtro {
  nome: string;
  label: string;
}

const ServicoTemplate = () => {
  const [filters, setFilters] = React.useState<Filters>({
    rating: '',
    price: '',
    location: ''
  });

  const filtros: Filtro[] = [
    { nome: 'rating', label: 'Avaliação' },
    { nome: 'price', label: 'Preço' },
    { nome: 'location', label: 'Localização' }
  ];

  return (
    <div>
      {filtros.map((filtro) => (
        <div key={filtro.nome}>
          <label>{filtro.label}</label>
          <input
            type="text"
            value={filters[filtro.nome]}
            onChange={(e) => setFilters({ ...filters, [filtro.nome]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
};

export default ServicoTemplate; 