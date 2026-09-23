export interface MenuPublicDishItem {
  productId: number;
  name: Record<string, string>;
  priceSale: number;
  images: { productImageId: number; imageUrl: string; publicId: string }[];
}

/**
 * Listado público de un menú: solo lo que un visitante necesita ver —
 * nombre/descripción del menú y sus platillos con foto y precio. Deja fuera
 * `recipeId`, ingredientes y `priceBuy`: son datos de costo interno.
 */
export interface MenuPublicListItem {
  menuId: number;
  name: Record<string, string>;
  description?: Record<string, string>;
  dishes: MenuPublicDishItem[];
}
