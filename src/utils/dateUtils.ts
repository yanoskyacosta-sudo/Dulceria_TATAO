/**
 * Date utility functions for Dulcería TATAO.
 * All internal dates are formatted as YYYY-MM-DD for standard ISO comparison.
 * Display dates are ALWAYS dd/mm/aaaa.
 */

export function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Returns the Sunday of the week for a given date.
 * Week starts on Sunday (day 0).
 */
export function getSundayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = date.getDate() - day;
  return new Date(date.getFullYear(), date.getMonth(), diff, 12, 0, 0);
}

/**
 * Returns the Monday of the week cycle (Sunday to Monday cycle).
 */
export function getMondayOfCycle(sunday: Date): Date {
  const monday = new Date(sunday);
  monday.setDate(sunday.getDate() + 8); // Domingo a lunes
  return monday;
}

/**
 * Default range for initial load:
 * Desde = Domingo de la semana actual
 * Hasta = Hoy (o Lunes de la semana si hoy es domingo/lunes)
 */
export function getDefaultDateRange(): { desde: string; hasta: string } {
  const today = new Date();
  const sunday = getSundayOfWeek(today);
  return {
    desde: toISODate(sunday),
    hasta: toISODate(today),
  };
}

export type QuickDatePreset = 'Hoy' | 'Semana' | 'Todo' | 'Restablecer';

export function getQuickRange(preset: QuickDatePreset, fechaInicioNegocio = '2026-09-21'): { desde: string; hasta: string } {
  const today = new Date();
  const todayStr = toISODate(today);

  switch (preset) {
    case 'Hoy':
      return { desde: todayStr, hasta: todayStr };

    case 'Semana': {
      const sunday = getSundayOfWeek(today);
      const monday = getMondayOfCycle(sunday);
      return { desde: toISODate(sunday), hasta: toISODate(monday) };
    }

    case 'Todo': {
      return { desde: fechaInicioNegocio, hasta: todayStr };
    }

    case 'Restablecer':
    default:
      return getDefaultDateRange();
  }
}
