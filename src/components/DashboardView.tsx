import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Cloud, RefreshCw, Settings } from 'lucide-react';
import {
  formatNumber,
  formatDate,
  calculateProductSummary,
  calculateDailyOperations,
  calculateReparto,
} from '../lib/calculations';
import { QuickDatePreset } from '../utils/dateUtils';

export const DashboardView: React.FC = () => {
  const {
    data,
    fechaDesde,
    fechaHasta,
    setDateRange,
    applyQuickPreset,
    isSyncing,
    lastCloudSync,
    syncWithCloud,
    setIsCloudSyncModalOpen,
  } = useApp();

  const [clienteFiltro, setClienteFiltro] = useState<string>('Todos');
  const [productoFiltro, setProductoFiltro] = useState<string>('Todos');

  // Filter sales and production by global date interval + client + product
  const ventasFiltradas = useMemo(() => {
    return data.ventas
      .filter((v) => v.fecha >= fechaDesde && v.fecha <= fechaHasta)
      .filter((v) => (clienteFiltro === 'Todos' ? true : v.cliente === clienteFiltro))
      .map((v) => {
        if (productoFiltro === 'Todos') return v;
        const lineasFiltradas = v.lineas.filter((l) => l.producto === productoFiltro);
        return {
          ...v,
          lineas: lineasFiltradas,
          importeTotal: lineasFiltradas.reduce((s, l) => s + l.importe, 0),
        };
      })
      .filter((v) => v.lineas.length > 0);
  }, [data.ventas, fechaDesde, fechaHasta, clienteFiltro, productoFiltro]);

  const produccionFiltrada = useMemo(() => {
    return data.produccion
      .filter((p) => p.fecha >= fechaDesde && p.fecha <= fechaHasta)
      .filter((p) => (productoFiltro === 'Todos' ? true : p.producto === productoFiltro));
  }, [data.produccion, fechaDesde, fechaHasta, productoFiltro]);

  // 1. Resumen por Producto
  const { items: productItems, total: productTotal } = useMemo(() => {
    const list =
      productoFiltro === 'Todos'
        ? data.productos
        : data.productos.filter((p) => p.nombre === productoFiltro);
    return calculateProductSummary(ventasFiltradas, produccionFiltrada, data.meta, list);
  }, [ventasFiltradas, produccionFiltrada, data.meta, data.productos, productoFiltro]);

  // 2. Reparto de la ganancia del período
  const repartoPeriodo = useMemo(() => {
    const ganancia = productTotal.ganancia;
    const fondoPct = data.meta.reparto?.fondoPct ?? 0.3;
    const adminPct = data.meta.reparto?.administradorPct ?? 0.2;
    const duenos = data.meta.reparto?.duenos ?? ['Tatao', 'Carlos'];
    return calculateReparto(ganancia, fondoPct, adminPct, duenos.length);
  }, [productTotal.ganancia, data.meta.reparto]);

  // 3. Ingresos por Cliente y Día
  // Columns = Clientes (unique in system or in filtered range). Rows = Lunes..Viernes + Fin de semana (Sáb/Dom) + TOTAL
  const clientesColumns = useMemo(() => {
    const baseClients = data.clientes.map((c) => c.nombre);
    if (!baseClients.includes('Otros')) baseClients.push('Otros');
    if (clienteFiltro !== 'Todos') return [clienteFiltro];
    return baseClients;
  }, [data.clientes, clienteFiltro]);

  const ingresosPorClienteDia = useMemo(() => {
    // 0: Lunes, 1: Martes, 2: Miércoles, 3: Jueves, 4: Viernes, 5: Fin de semana
    const dayRows = [
      { name: 'Lunes', matrix: {} as Record<string, number>, total: 0 },
      { name: 'Martes', matrix: {} as Record<string, number>, total: 0 },
      { name: 'Miércoles', matrix: {} as Record<string, number>, total: 0 },
      { name: 'Jueves', matrix: {} as Record<string, number>, total: 0 },
      { name: 'Viernes', matrix: {} as Record<string, number>, total: 0 },
      { name: 'Fin de semana (Sáb/Dom)', matrix: {} as Record<string, number>, total: 0 },
    ];

    clientesColumns.forEach((c) => {
      dayRows.forEach((r) => {
        r.matrix[c] = 0;
      });
    });

    ventasFiltradas.forEach((v) => {
      const d = new Date(v.fecha + 'T12:00:00');
      const dayOfWeek = d.getDay(); // 0 is Sunday, 1 Monday, 6 Saturday
      let rowIndex = 5; // default weekend
      if (dayOfWeek === 1) rowIndex = 0;
      else if (dayOfWeek === 2) rowIndex = 1;
      else if (dayOfWeek === 3) rowIndex = 2;
      else if (dayOfWeek === 4) rowIndex = 3;
      else if (dayOfWeek === 5) rowIndex = 4;

      const cli = clientesColumns.includes(v.cliente) ? v.cliente : 'Otros';
      dayRows[rowIndex].matrix[cli] = (dayRows[rowIndex].matrix[cli] || 0) + v.importeTotal;
      dayRows[rowIndex].total += v.importeTotal;
    });

    const colTotals: Record<string, number> = {};
    clientesColumns.forEach((c) => {
      colTotals[c] = dayRows.reduce((sum, r) => sum + (r.matrix[c] || 0), 0);
    });
    const grandTotal = dayRows.reduce((sum, r) => sum + r.total, 0);

    return { dayRows, colTotals, grandTotal };
  }, [ventasFiltradas, clientesColumns]);

  // 4. Detalle Diario de Operaciones
  const detalleDiario = useMemo(() => {
    return calculateDailyOperations(ventasFiltradas, produccionFiltrada, data.meta);
  }, [ventasFiltradas, produccionFiltrada, data.meta]);

  const quickButtons: QuickDatePreset[] = ['Hoy', 'Semana', 'Todo'];

  return (
    <div className="space-y-4 pb-10">
      {/* Barra de Sincronización con la Nube */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-50 via-white to-orange-50 border border-amber-200/90 rounded-xl px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs text-gray-900 tracking-tight">
                Sincronización con la Nube (PostgreSQL)
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Conectado
              </span>
            </div>
            <p className="text-[11px] text-gray-600 mt-0.5">
              {lastCloudSync
                ? `Última sincronización: ${lastCloudSync.toLocaleTimeString('es-CU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })} • Auto-sincronización cada 30 min activa con aviso preventivo`
                : 'Auto-sincronización cada 30 min activa con aviso preventivo de 30s'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => syncWithCloud('pull')}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            title="Descargar las últimas ventas y registros actualizados en la nube"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar con la nube'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCloudSyncModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-900 rounded-lg text-xs font-semibold border border-amber-300 transition-colors cursor-pointer"
            title="Abrir opciones de sincronización y respaldo en la nube"
          >
            <Settings className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Opciones</span>
          </button>
        </div>
      </div>

      {/* Filters Bar (Header Row 2 rendered inside view) */}
      <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Date interval + quick buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <label className="text-gray-500 font-medium">Desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setDateRange(e.target.value, fechaHasta)}
                className="w-36 h-7 px-2 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <label className="text-gray-500 font-medium">Hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setDateRange(fechaDesde, e.target.value)}
                className="w-36 h-7 px-2 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-1">
              {quickButtons.map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => applyQuickPreset(btn)}
                  className="px-2 py-1 text-[11px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  {btn}
                </button>
              ))}
              <button
                type="button"
                onClick={() => applyQuickPreset('Restablecer')}
                className="px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
              >
                Restablecer
              </button>
            </div>
          </div>

          {/* Cliente and Producto Dropdowns */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <label className="text-gray-500 font-medium">Cliente:</label>
              <select
                value={clienteFiltro}
                onChange={(e) => setClienteFiltro(e.target.value)}
                className="h-7 px-2 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value="Todos">Todos</option>
                {data.clientes.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 text-xs">
              <label className="text-gray-500 font-medium">Producto:</label>
              <select
                value={productoFiltro}
                onChange={(e) => setProductoFiltro(e.target.value)}
                className="h-7 px-2 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value="Todos">Todos</option>
                {data.productos.map((p) => (
                  <option key={p.id} value={p.nombre}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Resumen por Producto */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-3 py-2 bg-slate-100 border-b border-gray-200 font-bold text-xs text-gray-800">
          Resumen por Producto
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3">Producto</th>
                <th className="py-2 px-3 text-right">Producido</th>
                <th className="py-2 px-3 text-right">Vendido</th>
                <th className="py-2 px-3 text-right">Ingresos</th>
                <th className="py-2 px-3 text-right">Salarios</th>
                <th className="py-2 px-3 text-right">Materiales</th>
                <th className="py-2 px-3 text-right">Ganancia</th>
                <th className="py-2 px-3 text-right">Margen</th>
                <th className="py-2 px-3 text-center">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productItems.map((item) => (
                <tr key={item.producto} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-medium text-gray-900">{item.producto}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{item.producido}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{item.vendido}</td>
                  <td className="py-2 px-3 text-right text-gray-800">{formatNumber(item.ingresos)}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{formatNumber(item.salarios)}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{formatNumber(item.materiales)}</td>
                  <td className="py-2 px-3 text-right font-medium text-emerald-700">
                    {formatNumber(item.ganancia)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600">
                    {(item.margen * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.diferencia > 0
                          ? 'bg-amber-100 text-amber-800'
                          : item.diferencia < 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-gray-900 border-t-2 border-gray-300">
                <td className="py-2 px-3">{productTotal.producto}</td>
                <td className="py-2 px-3 text-right">{productTotal.producido}</td>
                <td className="py-2 px-3 text-right">{productTotal.vendido}</td>
                <td className="py-2 px-3 text-right">{formatNumber(productTotal.ingresos)}</td>
                <td className="py-2 px-3 text-right">{formatNumber(productTotal.salarios)}</td>
                <td className="py-2 px-3 text-right">{formatNumber(productTotal.materiales)}</td>
                <td className="py-2 px-3 text-right text-emerald-800">
                  {formatNumber(productTotal.ganancia)}
                </td>
                <td className="py-2 px-3 text-right">
                  {(productTotal.margen * 100).toFixed(1)}%
                </td>
                <td className="py-2 px-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      productTotal.diferencia > 0
                        ? 'bg-amber-200 text-amber-900'
                        : productTotal.diferencia < 0
                        ? 'bg-rose-200 text-rose-900'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {productTotal.diferencia > 0
                      ? `+${productTotal.diferencia}`
                      : productTotal.diferencia}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2. Reparto de la ganancia del período */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-3 py-2 bg-slate-100 border-b border-gray-200 font-bold text-xs text-gray-800 flex items-center justify-between">
          <span>Reparto de la ganancia del período</span>
          <span className="text-[11px] text-gray-500 font-normal">
            Fondo: {(data.meta.reparto.fondoPct * 100).toFixed(0)}% | Admin:{' '}
            {(data.meta.reparto.administradorPct * 100).toFixed(0)}% | Dueños:{' '}
            {data.meta.reparto.duenos.join(' y ')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3">Ganancia</th>
                <th className="py-2 px-3 text-rose-600">(−) Fondo del negocio</th>
                <th className="py-2 px-3">Queda</th>
                <th className="py-2 px-3 text-rose-600">(−) Administrador</th>
                <th className="py-2 px-3 font-bold text-gray-900">Para los dueños</th>
                <th className="py-2 px-3 font-bold text-amber-800">Cada dueño</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-sm font-semibold">
                <td className="py-2 px-3 text-emerald-700 font-bold">
                  {formatNumber(repartoPeriodo.ganancia)}
                </td>
                <td className="py-2 px-3 text-rose-600 font-medium">
                  −{formatNumber(repartoPeriodo.fondo)}
                </td>
                <td className="py-2 px-3 text-gray-800">
                  {formatNumber(repartoPeriodo.queda)}
                </td>
                <td className="py-2 px-3 text-rose-600 font-medium">
                  −{formatNumber(repartoPeriodo.administrador)}
                </td>
                <td className="py-2 px-3 text-gray-900 font-bold">
                  {formatNumber(repartoPeriodo.paraDuenos)}
                </td>
                <td className="py-2 px-3 text-amber-800 font-black bg-amber-50/50">
                  {formatNumber(repartoPeriodo.cadaDueno)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Ingresos por Cliente y Día */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-3 py-2 bg-slate-100 border-b border-gray-200 font-bold text-xs text-gray-800">
          Ingresos por Cliente y Día
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3 w-44">Día</th>
                {clientesColumns.map((col) => (
                  <th key={col} className="py-2 px-3 text-right">
                    {col}
                  </th>
                ))}
                <th className="py-2 px-3 text-right font-bold text-gray-900 bg-slate-100/50">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ingresosPorClienteDia.dayRows.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-medium text-gray-800">{row.name}</td>
                  {clientesColumns.map((col) => {
                    const val = row.matrix[col] || 0;
                    return (
                      <td key={col} className="py-2 px-3 text-right text-gray-700">
                        {val > 0 ? formatNumber(val) : '—'}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right font-bold text-gray-900 bg-slate-50/50">
                    {formatNumber(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-gray-900 border-t-2 border-gray-300">
                <td className="py-2 px-3">TOTAL</td>
                {clientesColumns.map((col) => (
                  <td key={col} className="py-2 px-3 text-right">
                    {formatNumber(ingresosPorClienteDia.colTotals[col] || 0)}
                  </td>
                ))}
                <td className="py-2 px-3 text-right font-black text-emerald-800 bg-emerald-50">
                  {formatNumber(ingresosPorClienteDia.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. Detalle Diario de Operaciones */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-3 py-2 bg-slate-100 border-b border-gray-200 font-bold text-xs text-gray-800">
          Detalle Diario de Operaciones
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Día</th>
                <th className="py-2 px-3 text-right">Unid. producidas</th>
                <th className="py-2 px-3 text-right">Unid. vendidas</th>
                <th className="py-2 px-3 text-right">Ingresos</th>
                <th className="py-2 px-3 text-right">Salarios</th>
                <th className="py-2 px-3 text-right">Materiales</th>
                <th className="py-2 px-3 text-right">Ganancia</th>
                <th className="py-2 px-3 text-right">Margen</th>
                <th className="py-2 px-3 text-right font-bold text-emerald-800">
                  Ganancia acumulada
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detalleDiario.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-4 text-center text-gray-500">
                    No hay operaciones en el período seleccionado
                  </td>
                </tr>
              ) : (
                detalleDiario.map((d) => (
                  <tr key={d.fecha} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-gray-900 font-medium">
                      {formatDate(d.fecha)}
                    </td>
                    <td className="py-2 px-3 text-gray-600">{d.diaNombre}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{d.unidProducidas}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{d.unidVendidas}</td>
                    <td className="py-2 px-3 text-right text-gray-800">{formatNumber(d.ingresos)}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{formatNumber(d.salarios)}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{formatNumber(d.materiales)}</td>
                    <td className="py-2 px-3 text-right font-medium text-emerald-700">
                      {formatNumber(d.ganancia)}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600">
                      {(d.margen * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-800">
                      {formatNumber(d.gananciaAcumulada)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
