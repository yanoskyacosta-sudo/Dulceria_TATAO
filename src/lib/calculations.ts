import { Producto, MetaConfig, VentaVale, ProduccionLote, GastoItem, CajaConfig, RepartoSemanal, JustificacionDiferencia } from '../types';

/**
 * Formats a numeric amount according to locale es-CU with thousands separator and two decimal places.
 * NEVER shows currency symbols or letters (no CUP, no $, no USD, no EUR).
 * Example: 3233190 -> 3,233,190.00
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '0.00';
  }
  return new Intl.NumberFormat('es-CU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Formats an ISO date string (YYYY-MM-DD or full ISO) as dd/mm/aaaa.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

/**
 * Obtains the price of a product on a specific date based on its price history.
 * If range has desde <= fecha and (hasta === null or hasta >= fecha).
 */
export function getPrecioVigente(producto: Producto, fecha: string): number {
  if (!producto.historicoPrecios || producto.historicoPrecios.length === 0) {
    return producto.precioVigente || 0;
  }
  const match = producto.historicoPrecios.find((h) => {
    const matchesDesde = h.desde <= fecha;
    const matchesHasta = h.hasta === null || h.hasta >= fecha;
    return matchesDesde && matchesHasta;
  });
  if (match) {
    return match.precio;
  }
  return producto.precioVigente || 0;
}

/**
 * Obtains the unit profit for a product on a specific date.
 * Masas = 0.
 * Otherwise takes the latest valid entry with desde <= fecha.
 */
export function getGananciaUnidad(productoNombre: string, fecha: string, meta: MetaConfig): number {
  if (productoNombre === 'Masas') return 0;
  if (!meta.gananciaPorUnidad) return 0;

  const validEntries = meta.gananciaPorUnidad
    .filter((g) => g.producto.toLowerCase() === productoNombre.toLowerCase() && g.desde <= fecha)
    .sort((a, b) => b.desde.localeCompare(a.desde));

  if (validEntries.length > 0) {
    return validEntries[0].valor;
  }
  return 0;
}

/**
 * Worker payment per sweet for a given product.
 */
export function getPagoPorDulce(productoNombre: string, meta: MetaConfig): number {
  if (!meta.pagoPorDulceTrabajador) return 0;
  return meta.pagoPorDulceTrabajador[productoNombre] || 0;
}

/**
 * Weekly profit sharing calculation according to the rules:
 * De la ganancia semanal se descuenta el Fondo del negocio (fondoPct, 30%);
 * Del resto se descuenta el Administrador (administradorPct, 20%);
 * Lo que queda se divide a partes iguales entre los dueños (Tatao y Carlos).
 */
export function calculateReparto(
  ganancia: number,
  fondoPct = 0.3,
  adminPct = 0.2,
  numDuenos = 2
) {
  const fondo = ganancia * fondoPct;
  const queda = ganancia - fondo;
  const administrador = queda * adminPct;
  const paraDuenos = queda - administrador;
  const cadaDueno = numDuenos > 0 ? paraDuenos / numDuenos : 0;

  return {
    ganancia,
    fondo,
    queda,
    administrador,
    paraDuenos,
    cadaDueno,
  };
}

export interface ProductSummary {
  producto: string;
  producido: number;
  vendido: number;
  ingresos: number;
  salarios: number;
  materiales: number;
  ganancia: number;
  margen: number; // ganancia / ingresos
  diferencia: number; // producido - vendido
}

/**
 * Calculates the product summary for the Dashboard across filtered sales and production.
 */
export function calculateProductSummary(
  ventasFiltradas: VentaVale[],
  produccionFiltrada: ProduccionLote[],
  meta: MetaConfig,
  productosList: Producto[]
): { items: ProductSummary[]; total: ProductSummary } {
  // Aggregate sales by product
  const salesByProduct: Record<string, { vendido: number; ingresos: number; ganancia: number }> = {};
  ventasFiltradas.forEach((v) => {
    v.lineas.forEach((line) => {
      const p = line.producto;
      if (!salesByProduct[p]) {
        salesByProduct[p] = { vendido: 0, ingresos: 0, ganancia: 0 };
      }
      salesByProduct[p].vendido += line.cantidad;
      salesByProduct[p].ingresos += line.importe;
      const gananciaUnit = getGananciaUnidad(p, v.fecha, meta);
      salesByProduct[p].ganancia += line.cantidad * gananciaUnit;
    });
  });

  // Aggregate production by product
  const prodByProduct: Record<string, { producido: number; salarios: number }> = {};
  produccionFiltrada.forEach((p) => {
    const prodName = p.producto;
    if (!prodByProduct[prodName]) {
      prodByProduct[prodName] = { producido: 0, salarios: 0 };
    }
    prodByProduct[prodName].producido += p.cantidad;
    const pago = getPagoPorDulce(prodName, meta);
    prodByProduct[prodName].salarios += p.cantidad * pago;
  });

  const allNames = Array.from(
    new Set([
      ...productosList.map((p) => p.nombre),
      ...Object.keys(salesByProduct),
      ...Object.keys(prodByProduct),
    ])
  ).sort();

  const items: ProductSummary[] = allNames
    .map((nombre) => {
      const s = salesByProduct[nombre] || { vendido: 0, ingresos: 0, ganancia: 0 };
      const pr = prodByProduct[nombre] || { producido: 0, salarios: 0 };

      // Materiales (costo implícito) = Ingresos − Salarios − Ganancia
      // Exclusivo para Masas: fijar en 0 por ahora hasta implementar menú de Recetas
      let materiales = s.ingresos - pr.salarios - s.ganancia;
      if (nombre === 'Masas') {
        materiales = 0;
      }
      const margen = s.ingresos > 0 ? s.ganancia / s.ingresos : 0;
      const diferencia = pr.producido - s.vendido;

      return {
        producto: nombre,
        producido: pr.producido,
        vendido: s.vendido,
        ingresos: s.ingresos,
        salarios: pr.salarios,
        materiales,
        ganancia: s.ganancia,
        margen,
        diferencia,
      };
    })
    .filter((item) => item.producido > 0 || item.vendido > 0);

  const totalProducido = items.reduce((acc, i) => acc + i.producido, 0);
  const totalVendido = items.reduce((acc, i) => acc + i.vendido, 0);
  const totalIngresos = items.reduce((acc, i) => acc + i.ingresos, 0);
  const totalSalarios = items.reduce((acc, i) => acc + i.salarios, 0);
  const totalGanancia = items.reduce((acc, i) => acc + i.ganancia, 0);
  const totalMateriales = items.reduce((acc, i) => acc + i.materiales, 0);
  const totalMargen = totalIngresos > 0 ? totalGanancia / totalIngresos : 0;
  const totalDiferencia = totalProducido - totalVendido;

  const total: ProductSummary = {
    producto: 'TOTAL',
    producido: totalProducido,
    vendido: totalVendido,
    ingresos: totalIngresos,
    salarios: totalSalarios,
    materiales: totalMateriales,
    ganancia: totalGanancia,
    margen: totalMargen,
    diferencia: totalDiferencia,
  };

  return { items, total };
}

export interface DailyOperationDetail {
  fecha: string;
  diaNombre: string;
  unidProducidas: number;
  unidVendidas: number;
  ingresos: number;
  salarios: number;
  materiales: number;
  ganancia: number;
  margen: number;
  gananciaAcumulada: number;
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Calculates the Daily Operation Detail table for Dashboard.
 */
export function calculateDailyOperations(
  ventasFiltradas: VentaVale[],
  produccionFiltrada: ProduccionLote[],
  meta: MetaConfig
): DailyOperationDetail[] {
  const datesSet = new Set<string>();
  ventasFiltradas.forEach((v) => datesSet.add(v.fecha));
  produccionFiltrada.forEach((p) => datesSet.add(p.fecha));

  const sortedDates = Array.from(datesSet).sort();

  let acumulada = 0;
  const result: DailyOperationDetail[] = [];

  sortedDates.forEach((fecha) => {
    const dateObj = new Date(fecha + 'T12:00:00');
    const diaNombre = DIAS_SEMANA[dateObj.getDay()];

    const vDia = ventasFiltradas.filter((v) => v.fecha === fecha);
    const pDia = produccionFiltrada.filter((p) => p.fecha === fecha);

    // Units produced excluding Masas (per prompt rule: Masas no cuenta como unidad)
    const unidProducidas = pDia
      .filter((p) => p.producto !== 'Masas')
      .reduce((s, p) => s + p.cantidad, 0);

    let unidVendidas = 0;
    let ingresos = 0;
    let ganancia = 0;

    vDia.forEach((v) => {
      v.lineas.forEach((l) => {
        unidVendidas += l.cantidad;
        ingresos += l.importe;
        const gUnit = getGananciaUnidad(l.producto, fecha, meta);
        ganancia += l.cantidad * gUnit;
      });
    });

    // Salarios produced on this day
    const salarios = pDia.reduce((s, p) => {
      const pago = getPagoPorDulce(p.producto, meta);
      return s + p.cantidad * pago;
    }, 0);

    const materiales = ingresos - salarios - ganancia;
    const margen = ingresos > 0 ? ganancia / ingresos : 0;
    acumulada += ganancia;

    result.push({
      fecha,
      diaNombre,
      unidProducidas,
      unidVendidas,
      ingresos,
      salarios,
      materiales,
      ganancia,
      margen,
      gananciaAcumulada: acumulada,
    });
  });

  return result;
}

/**
 * Alerta de Conciliación (Producción vs Ventas):
 * ALWAYS analyzes the whole historical record.
 * Excludes product "Masas".
 */
export interface ReconciliationMismatchDay {
  fecha: string;
  producido: number;
  vendido: number;
  diferencia: number;
  justificado?: boolean;
  notaJustificacion?: string;
  justificacionId?: string;
}

export interface ReconciliationCandy {
  producto: string;
  producidoTotal: number;
  vendidoTotal: number;
  diferenciaTotal: number;
  diasConDiferencia: ReconciliationMismatchDay[];
  diasPendientes: ReconciliationMismatchDay[];
  diasJustificados: ReconciliationMismatchDay[];
}

export function calculateReconciliation(
  allProduccion: ProduccionLote[],
  allVentas: VentaVale[],
  justificaciones: JustificacionDiferencia[] = []
): {
  cuadrada: boolean;
  cuadradaOJustificada: boolean;
  totalPendientes: number;
  totalJustificados: number;
  netGlobal: number;
  desglosePorDulce: ReconciliationCandy[];
} {
  // Exclude Masas
  const prodSinMasas = allProduccion.filter((p) => p.producto !== 'Masas');
  const salesSinMasas: { fecha: string; producto: string; cantidad: number }[] = [];
  allVentas.forEach((v) => {
    v.lineas.forEach((l) => {
      if (l.producto !== 'Masas') {
        salesSinMasas.push({ fecha: v.fecha, producto: l.producto, cantidad: l.cantidad });
      }
    });
  });

  // Group by (producto, fecha)
  const productDates = new Map<string, { producido: number; vendido: number }>();
  const allProducts = new Set<string>();

  prodSinMasas.forEach((p) => {
    allProducts.add(p.producto);
    const key = `${p.producto}___${p.fecha}`;
    const curr = productDates.get(key) || { producido: 0, vendido: 0 };
    curr.producido += p.cantidad;
    productDates.set(key, curr);
  });

  salesSinMasas.forEach((s) => {
    allProducts.add(s.producto);
    const key = `${s.producto}___${s.fecha}`;
    const curr = productDates.get(key) || { producido: 0, vendido: 0 };
    curr.vendido += s.cantidad;
    productDates.set(key, curr);
  });

  const desglosePorDulce: ReconciliationCandy[] = [];
  let totalProducido = 0;
  let totalVendido = 0;
  let totalPendientesCount = 0;
  let totalJustificadosCount = 0;

  allProducts.forEach((prod) => {
    let pTot = 0;
    let vTot = 0;
    const diasConDiferencia: ReconciliationMismatchDay[] = [];

    // Find all dates for this product
    const prodKeys = Array.from(productDates.keys())
      .filter((k) => k.startsWith(`${prod}___`))
      .sort();

    prodKeys.forEach((key) => {
      const fecha = key.split('___')[1];
      const data = productDates.get(key)!;
      pTot += data.producido;
      vTot += data.vendido;
      const diff = data.producido - data.vendido;
      if (diff !== 0) {
        // Check if there is a justification for this date/product
        const justif = justificaciones.find((j) => {
          const matchFecha =
            j.fecha === fecha ||
            (j.fecha === '2026-09-29' && fecha === '2026-09-29') ||
            (j.fecha === '2026-10-15' && fecha === '2026-10-15');
          const matchProd = !j.producto || j.producto === prod || j.producto === 'Todos' || j.producto === 'General';
          return matchFecha && matchProd;
        });

        const isJustified = !!justif;
        if (isJustified) {
          totalJustificadosCount++;
        } else {
          totalPendientesCount++;
        }

        diasConDiferencia.push({
          fecha,
          producido: data.producido,
          vendido: data.vendido,
          diferencia: diff,
          justificado: isJustified,
          notaJustificacion: justif?.nota,
          justificacionId: justif?.id,
        });
      }
    });

    const diffTot = pTot - vTot;
    totalProducido += pTot;
    totalVendido += vTot;

    if (diffTot !== 0 || diasConDiferencia.length > 0) {
      const diasPendientes = diasConDiferencia.filter((d) => !d.justificado);
      const diasJustificados = diasConDiferencia.filter((d) => d.justificado);

      desglosePorDulce.push({
        producto: prod,
        producidoTotal: pTot,
        vendidoTotal: vTot,
        diferenciaTotal: diffTot,
        diasConDiferencia,
        diasPendientes,
        diasJustificados,
      });
    }
  });

  const netGlobal = totalProducido - totalVendido;
  const cuadrada = netGlobal === 0 && desglosePorDulce.length === 0;
  const cuadradaOJustificada = cuadrada || totalPendientesCount === 0;

  return {
    cuadrada,
    cuadradaOJustificada,
    totalPendientes: totalPendientesCount,
    totalJustificados: totalJustificadosCount,
    netGlobal,
    desglosePorDulce,
  };
}

/**
 * Calculates daily cash table from fechaInicio to today (or last transaction date).
 */
export interface DailyCashRow {
  fecha: string;
  saldoInicial: number;
  ventas: number;
  salarioTrabajadores: number;
  salarioAdministrador: number;
  salarioTatao: number;
  salarioCarlos: number;
  materiasPrimas: number;
  materiales: number;
  limpieza: number;
  electricidad: number;
  totalGastos: number;
  saldoFinal: number;
}

export function calculateDailyCashHistory(
  cajaConfig: CajaConfig,
  ventas: VentaVale[],
  gastos: GastoItem[],
  endDateStr: string
): { rows: DailyCashRow[]; totales: Omit<DailyCashRow, 'fecha' | 'saldoInicial' | 'saldoFinal'> } {
  const startDateStr = cajaConfig.fechaInicio;

  // Generate date array from startDateStr to max(endDateStr, today)
  const dCur = new Date(startDateStr + 'T12:00:00');
  const dEnd = new Date(endDateStr + 'T12:00:00');

  const rows: DailyCashRow[] = [];
  let currentSaldo = cajaConfig.saldoInicial;

  let totVentas = 0;
  let totSalTrab = 0;
  let totSalAdm = 0;
  let totSalTat = 0;
  let totSalCar = 0;
  let totMP = 0;
  let totMat = 0;
  let totLimp = 0;
  let totElec = 0;
  let totGastos = 0;

  while (dCur <= dEnd) {
    const yyyy = dCur.getFullYear();
    const mm = String(dCur.getMonth() + 1).padStart(2, '0');
    const dd = String(dCur.getDate()).padStart(2, '0');
    const fStr = `${yyyy}-${mm}-${dd}`;

    // Ventas on this day
    const ventasDia = ventas
      .filter((v) => v.fecha === fStr)
      .reduce((s, v) => s + v.importeTotal, 0);

    // Only expenses paid in Efectivo
    const gastosEfectivo = gastos.filter(
      (g) => g.fecha === fStr && (g.formaPago === 'Efectivo' || !g.formaPago)
    );

    let salTrab = 0;
    let salAdm = 0;
    let salTat = 0;
    let salCar = 0;
    let mp = 0;
    let mat = 0;
    let limp = 0;
    let elec = 0;

    gastosEfectivo.forEach((g) => {
      if (g.categoria === 'Salarios') {
        const cLower = g.concepto.toLowerCase();
        if (cLower.includes('administrador')) {
          salAdm += g.importe;
        } else if (cLower.includes('tatao')) {
          salTat += g.importe;
        } else if (cLower.includes('carlos')) {
          salCar += g.importe;
        } else {
          salTrab += g.importe;
        }
      } else if (g.categoria === 'Materias Primas') {
        mp += g.importe;
      } else if (g.categoria === 'Materiales') {
        mat += g.importe;
      } else if (g.categoria === 'Limpieza') {
        limp += g.importe;
      } else if (g.categoria === 'Electricidad') {
        elec += g.importe;
      }
    });

    const dayTotalGastos = salTrab + salAdm + salTat + salCar + mp + mat + limp + elec;
    const daySaldoInicial = currentSaldo;
    const daySaldoFinal = daySaldoInicial + ventasDia - dayTotalGastos;
    currentSaldo = daySaldoFinal;

    totVentas += ventasDia;
    totSalTrab += salTrab;
    totSalAdm += salAdm;
    totSalTat += salTat;
    totSalCar += salCar;
    totMP += mp;
    totMat += mat;
    totLimp += limp;
    totElec += elec;
    totGastos += dayTotalGastos;

    rows.push({
      fecha: fStr,
      saldoInicial: daySaldoInicial,
      ventas: ventasDia,
      salarioTrabajadores: salTrab,
      salarioAdministrador: salAdm,
      salarioTatao: salTat,
      salarioCarlos: salCar,
      materiasPrimas: mp,
      materiales: mat,
      limpieza: limp,
      electricidad: elec,
      totalGastos: dayTotalGastos,
      saldoFinal: daySaldoFinal,
    });

    dCur.setDate(dCur.getDate() + 1);
  }

  return {
    rows,
    totales: {
      ventas: totVentas,
      salarioTrabajadores: totSalTrab,
      salarioAdministrador: totSalAdm,
      salarioTatao: totSalTat,
      salarioCarlos: totSalCar,
      materiasPrimas: totMP,
      materiales: totMat,
      limpieza: totLimp,
      electricidad: totElec,
      totalGastos: totGastos,
    },
  };
}
