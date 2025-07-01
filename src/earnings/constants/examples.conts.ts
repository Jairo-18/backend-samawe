export const GET_INVENTORY_LOW = {
  productsLow: [
    {
      productId: 123,
      name: 'Coca Cola 1L',
      amount: 5,
    },
    {
      productId: 342,
      name: 'Margarita Pequeña',
      amount: 3,
    },
    {
      productId: 22,
      name: 'Arroz Carolina 500gm',
      amount: 1,
    },
    {
      productId: 333,
      name: 'Condones Today',
      amount: 5,
    },
  ],
};

export const STATE_TYPES = {
  MAINTENANCE: 'Mantenimiento',
  OCCUPIED: 'Ocupado',
  AVAILABLE: 'Disponible',
};

export const PRODUCT_STATUS = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

// Luego puedes usarlas en tu servicio:
export const exampleUsage = {
  state: STATE_TYPES.MAINTENANCE,
  status: PRODUCT_STATUS.ACTIVE,
};
