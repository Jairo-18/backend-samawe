import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';

export function CreateRecipeDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Crear receta para un plato',
      description: 'Define qué ingredientes y en qué cantidad lleva un plato',
    }),
    ApiOkResponse({ description: 'Receta creada exitosamente' }),
  );
}

export function UpdateRecipeDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Actualizar receta completa de un plato',
      description: 'Reemplaza todos los ingredientes de la receta',
    }),
    ApiOkResponse({ description: 'Receta actualizada' }),
  );
}

export function UpdateRecipeIngredientDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Actualizar un ingrediente específico de una receta',
    }),
    ApiOkResponse({ description: 'Ingrediente de receta actualizado' }),
  );
}

export function FindByProductDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtener receta completa de un plato',
      description:
        'Devuelve todos los ingredientes con cantidades y costo total',
    }),
    ApiOkResponse({ description: 'Receta del plato' }),
  );
}

export function FindAllRecipesDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtener todas las recetas' }),
    ApiOkResponse({ description: 'Lista de recetas' }),
  );
}

export function CheckAvailabilityDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Verificar disponibilidad de ingredientes para un plato',
      description:
        'Verifica si hay stock suficiente para preparar N porciones de un plato',
    }),
    ApiOkResponse({
      description: 'Disponibilidad de ingredientes con detalles',
    }),
  );
}

export function DeleteByProductDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Eliminar receta completa de un plato',
    }),
    ApiOkResponse({ description: 'Receta eliminada' }),
  );
}

export function DeleteIngredientDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Eliminar un ingrediente específico de una receta',
    }),
    ApiOkResponse({ description: 'Ingrediente eliminado de la receta' }),
  );
}
