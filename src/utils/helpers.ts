/**
 * @file Funciones de utilidad genéricas para el frontend.
 */

/**
 * Busca el nombre de un elemento en una lista por su ID.
 * @param {Array<any>} lista - La lista de elementos donde buscar.
 * @param {any} id - El ID del elemento a buscar.
 * @returns {string} El nombre del elemento o un string indicando el ID si no se encuentra.
 */
export const getNombreById = (lista: any[], id: any): string => {
  if (!id || !lista || lista.length === 0) return '';
  const item = lista.find(i => i.id == id); // Usar '==' para comparar string con number si es necesario
  return item ? item.nombre : `ID: ${id}`;
};