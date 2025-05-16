export const GET_ALL_EXCURSIONS_EXAMPLE = {
  excursions: [
    {
      excursionId: 1,
      code: 501,
      name: 'Tour Lago Azul',
      description: 'Excursión al Lago Azul con guía turística',
      amountPerson: 10,
      priceBuy: 3000.0,
      priceSale: 4500.0,
      categoryType: { categoryTypeId: 2, name: 'Aventura' },
      stateType: { stateTypeId: 1, name: 'Disponible' },
      createdAt: '2025-03-10T09:30:00.000Z',
      updatedAt: '2025-03-10T09:30:00.000Z',
    },
    {
      excursionId: 2,
      code: 502,
      name: 'Ruta Montañosa',
      description: 'Caminata guiada por la montaña con vista panorámica',
      amountPerson: 6,
      priceBuy: 2000.0,
      priceSale: 3200.0,
      categoryType: { categoryTypeId: 3, name: 'Ecológica' },
      stateType: { stateTypeId: 2, name: 'En mantenimiento' },
      createdAt: '2025-03-12T14:00:00.000Z',
      updatedAt: '2025-03-12T14:00:00.000Z',
    },
  ],
};

export const GET_EXCURSION_EXAMPLE = {
  excursionId: 1,
  code: 501,
  name: 'Tour Lago Azul',
  description: 'Excursión al Lago Azul con guía turística',
  amountPerson: 10,
  priceBuy: 3000.0,
  priceSale: 4500.0,
  categoryType: { categoryTypeId: 2, name: 'Aventura' },
  stateType: { stateTypeId: 1, name: 'Disponible' },
  createdAt: '2025-03-10T09:30:00.000Z',
  updatedAt: '2025-03-10T09:30:00.000Z',
};
