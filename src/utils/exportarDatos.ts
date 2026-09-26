/**
 * @file Exportar cualquier listado a CSV (se abre directo en Excel/Sheets)
 * -- sin depender de una librería de .xlsx nueva: un CSV bien armado (BOM
 * UTF-8 + comillas donde hace falta) ya cubre el caso real ("quiero
 * llevarle esto a mi contador"), y evita sumarle peso al bundle del
 * frontend por un formato que Excel abre exactamente igual.
 */

function celdaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  // Se envuelve en comillas si el valor trae coma, comilla o salto de línea
  // -- el criterio estándar de CSV para que esos caracteres no rompan las
  // columnas al abrirlo en Excel.
  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export interface ColumnaExport<T> {
  /** Encabezado que ve el usuario en la primera fila del CSV. */
  label: string;
  /** Extrae el valor de la fila -- puede ser una key directa o una función para valores derivados/formateados. */
  value: keyof T | ((fila: T) => string | number | null | undefined);
}

/**
 * Genera un CSV a partir de `filas` + `columnas` y dispara la descarga en
 * el navegador. `nombreArchivo` sin extensión (se le agrega `.csv`).
 */
export function exportarCSV<T>(filas: T[], columnas: ColumnaExport<T>[], nombreArchivo: string): void {
  const encabezado = columnas.map((c) => celdaCsv(c.label)).join(',');
  const lineas = filas.map((fila) =>
    columnas
      .map((c) => celdaCsv(typeof c.value === 'function' ? c.value(fila) : fila[c.value]))
      .join(','),
  );
  const contenido = [encabezado, ...lineas].join('\r\n');

  // BOM UTF-8 al inicio -- sin esto, Excel en Windows (el caso más común
  // para este sistema) interpreta tildes/ñ como caracteres corruptos al
  // abrir el CSV directo con doble clic.
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nombreArchivo}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
