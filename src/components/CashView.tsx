import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  formatNumber,
  formatDate,
  calculateDailyCashHistory,
  calculateReparto,
  getGananciaUnidad,
} from '../lib/calculations';
import { toISODate } from '../utils/dateUtils';
import { RepartoSemanal } from '../types';
import { SlidersHorizontal, CheckCircle, RotateCcw } from 'lucide-react';

export const CashView: React.FC = () => {
  const {
    data,
    marcarRepartoPagado,
    deshacerRepartoPagado,
    updateReglasReparto,
  } = useApp();

  // Modal "Reglas de reparto"
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [fondoPctInput, setFondoPctInput] = useState<string>(
    String((data.meta.reparto?.fondoPct ?? 0.3) * 100)
  );
  const [adminPctInput, setAdminPctInput] = useState<string>(
    String((data.meta.reparto?.administradorPct ?? 0.2) * 100)
  );
  const [duenosInput, setDuenosInput] = useState<string>(
    (data.meta.reparto?.duenos ?? ['Tatao', 'Carlos']).join(', ')
  );

  // Modal "Marcar pagado"
  const [payingRepartoId, setPayingRepartoId] = useState<string | null>(null);
  const [fechaPagoInput, setFechaPagoInput] = useState<string>(toISODate(new Date()));

  // End date for daily cash is today
  const todayStr = toISODate(new Date());

  // 1. Calculate Daily Cash History table
  const { rows: dailyRows, totales: dailyTotales } = useMemo(() => {
    return calculateDailyCashHistory(data.caja, data.ventas, data.gastos, todayStr);
  }, [data.caja, data.ventas, data.gastos, todayStr]);

  // Current cash on hand: the last day's saldoFinal (or initial if empty)
  const currentEfectivoCaja = useMemo(() => {
    if (dailyRows.length > 0) {
      return dailyRows[dailyRows.length - 1].saldoFinal;
    }
    return data.caja.saldoInicial;
  }, [dailyRows, data.caja.saldoInicial]);

  // Weekly repartos:
  // "Las semanas Pendientes se recalculan solas; las Pagadas quedan congeladas."
  const dynamicRepartos: RepartoSemanal[] = useMemo(() => {
    const fondo = data.meta.reparto?.fondoPct ?? 0.3;
    const admin = data.meta.reparto?.administradorPct ?? 0.2;
    const duenos = data.meta.reparto?.duenos ?? ['Tatao', 'Carlos'];

    return data.repartos.map((r) => {
      if (r.estado === 'Pendiente') {
        // Calculate weekly sales gain dynamically
        const weekSales = data.ventas.filter(
          (v) => v.fecha >= r.desde && v.fecha <= r.hasta
        );
        let dynamicGanancia = 0;
        weekSales.forEach((v) => {
          v.lineas.forEach((l) => {
            const gUnit = getGananciaUnidad(l.producto, v.fecha, data.meta);
            dynamicGanancia += l.cantidad * gUnit;
          });
        });

        const calc = calculateReparto(dynamicGanancia, fondo, admin, duenos.length);
        return {
          ...r,
          ganancia: dynamicGanancia,
          administrador: calc.administrador,
          tatao: calc.cadaDueno,
          carlos: calc.cadaDueno,
        };
      }
      return r;
    });
  }, [data.repartos, data.ventas, data.meta]);

  // Reparto pendiente de pago: sum of repartos in 'Pendiente' status (total distributed to admin + duenos)
  const repartoPendientePago = useMemo(() => {
    return dynamicRepartos
      .filter((r) => r.estado === 'Pendiente')
      .reduce((sum, r) => sum + r.administrador + r.tatao + r.carlos, 0);
  }, [dynamicRepartos]);

  // Handle save reparto rules
  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    const fPct = parseFloat(fondoPctInput) / 100;
    const aPct = parseFloat(adminPctInput) / 100;
    const dList = duenosInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (isNaN(fPct) || isNaN(aPct) || dList.length === 0) return;
    updateReglasReparto(fPct, aPct, dList);
    setIsRulesModalOpen(false);
  };

  const handleConfirmPayReparto = (e: React.FormEvent) => {
    e.preventDefault();
    if (payingRepartoId && fechaPagoInput) {
      marcarRepartoPagado(payingRepartoId, fechaPagoInput);
      setPayingRepartoId(null);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Action button inside view header bar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setFondoPctInput(String((data.meta.reparto?.fondoPct ?? 0.3) * 100));
            setAdminPctInput(String((data.meta.reparto?.administradorPct ?? 0.2) * 100));
            setDuenosInput((data.meta.reparto?.duenos ?? ['Tatao', 'Carlos']).join(', '));
            setIsRulesModalOpen(true);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-gray-300 rounded-md flex items-center gap-1.5 shadow-2xs transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
          <span>Reglas de reparto</span>
        </button>
      </div>

      {/* Línea superior (no tarjetas): Efectivo en caja | Reparto pendiente de pago */}
      <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-500 uppercase tracking-wider text-[11px]">
            Efectivo en caja:
          </span>
          <span className="text-base sm:text-lg font-black text-emerald-800">
            {formatNumber(currentEfectivoCaja)}
          </span>
        </div>

        <div className="h-4 w-px bg-gray-200 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-500 uppercase tracking-wider text-[11px]">
            Reparto pendiente de pago:
          </span>
          <span className="text-base sm:text-lg font-black text-amber-700">
            {formatNumber(repartoPendientePago)}
          </span>
        </div>
      </div>

      {/* Tabla Diaria (Consulta, sin Acciones, un día por fila desde fechaInicio hasta hoy, con fila TOTAL arriba) */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-3 py-2 bg-slate-100 border-b border-gray-200 font-bold text-xs text-gray-800 flex items-center justify-between">
          <span>Arqueo Diario de Caja</span>
          <span className="text-[11px] text-gray-500 font-normal">
            Saldo inicial del negocio: {formatNumber(data.caja.saldoInicial)} ({formatDate(data.caja.fechaInicio)})
          </span>
        </div>
        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left border-collapse text-[11px] min-w-[950px]">
            <thead className="sticky top-0 bg-slate-100 z-10 border-b-2 border-gray-300 shadow-2xs">
              {/* FILA TOTAL ARRIBA */}
              <tr className="bg-slate-200 font-black text-gray-900 border-b border-gray-300">
                <td className="py-2 px-2.5 font-bold">TOTALES</td>
                <td className="py-2 px-2.5 text-right font-medium text-gray-500">—</td>
                <td className="py-2 px-2.5 text-right text-emerald-800">
                  {formatNumber(dailyTotales.ventas)}
                </td>
                <td className="py-2 px-2.5 text-right text-gray-800">
                  {formatNumber(dailyTotales.salarioTrabajadores)}
                </td>
                <td className="py-2 px-2.5 text-right text-gray-800">
                  {formatNumber(dailyTotales.salarioAdministrador)}
                </td>
                <td className="py-2 px-2.5 text-right text-gray-800">
                  {formatNumber(dailyTotales.salarioTatao)}
                </td>
                <td className="py-2 px-2.5 text-right text-gray-800">
                  {formatNumber(dailyTotales.salarioCarlos)}
                </td>
                <td className="py-2 px-2.5 text-right text-gray-800">
                  {formatNumber(dailyTotales.materiasPrimas)}
                </td>
                <td className="py-2 px-2.5 text-right text-gray-800">
                  {formatNumber(dailyTotales.materiales)}
                </td>
                <td className="py-2 px-2.5 text-right text-gray-800">
                  {formatNumber(dailyTotales.limpieza)}
                </td>
                <td className="py-2 px-2.5 text-right text-gray-800">
                  {formatNumber(dailyTotales.electricidad)}
                </td>
                <td className="py-2 px-2.5 text-right font-black text-rose-700 bg-rose-50/50">
                  {formatNumber(dailyTotales.totalGastos)}
                </td>
                <td className="py-2 px-2.5 text-right font-black text-emerald-900 bg-emerald-50/70">
                  {formatNumber(currentEfectivoCaja)}
                </td>
              </tr>
              {/* Header Columns */}
              <tr className="text-gray-600 font-semibold text-[10px] uppercase">
                <th className="py-2 px-2.5">Fecha</th>
                <th className="py-2 px-2.5 text-right">Saldo Inicial</th>
                <th className="py-2 px-2.5 text-right text-emerald-800">Ventas</th>
                <th className="py-2 px-2.5 text-right">Sal. Trab.</th>
                <th className="py-2 px-2.5 text-right">Sal. Admin</th>
                <th className="py-2 px-2.5 text-right">Sal. Tatao</th>
                <th className="py-2 px-2.5 text-right">Sal. Carlos</th>
                <th className="py-2 px-2.5 text-right">Mat. Primas</th>
                <th className="py-2 px-2.5 text-right">Materiales</th>
                <th className="py-2 px-2.5 text-right">Limpieza</th>
                <th className="py-2 px-2.5 text-right">Electricidad</th>
                <th className="py-2 px-2.5 text-right text-rose-700 font-bold">Total Gastos</th>
                <th className="py-2 px-2.5 text-right font-bold text-gray-900">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dailyRows.map((row) => (
                <tr key={row.fecha} className="hover:bg-slate-50 transition-colors">
                  <td className="py-1.5 px-2.5 font-medium text-gray-900 whitespace-nowrap">
                    {formatDate(row.fecha)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-gray-600">
                    {formatNumber(row.saldoInicial)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-medium text-emerald-800">
                    {row.ventas > 0 ? formatNumber(row.ventas) : '0.00'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-gray-600">
                    {row.salarioTrabajadores > 0 ? formatNumber(row.salarioTrabajadores) : '—'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-gray-600">
                    {row.salarioAdministrador > 0 ? formatNumber(row.salarioAdministrador) : '—'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-gray-600">
                    {row.salarioTatao > 0 ? formatNumber(row.salarioTatao) : '—'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-gray-600">
                    {row.salarioCarlos > 0 ? formatNumber(row.salarioCarlos) : '—'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-gray-600">
                    {row.materiasPrimas > 0 ? formatNumber(row.materiasPrimas) : '—'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-gray-600">
                    {row.materiales > 0 ? formatNumber(row.materiales) : '—'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-gray-600">
                    {row.limpieza > 0 ? formatNumber(row.limpieza) : '—'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right text-gray-600">
                    {row.electricidad > 0 ? formatNumber(row.electricidad) : '—'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-medium text-rose-700 bg-rose-50/20">
                    {formatNumber(row.totalGastos)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-bold text-gray-900 bg-slate-50/30">
                    {formatNumber(row.saldoFinal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reparto Semanal: Desde | Hasta | Ganancia | Administrador | Tatao | Carlos | Fecha de pago | Estado | Acciones */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-3 py-2 bg-slate-100 border-b border-gray-200 font-bold text-xs text-gray-800">
          Reparto Semanal de Ganancia
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3">Desde</th>
                <th className="py-2 px-3">Hasta</th>
                <th className="py-2 px-3 text-right">Ganancia</th>
                <th className="py-2 px-3 text-right">Administrador</th>
                <th className="py-2 px-3 text-right">Tatao</th>
                <th className="py-2 px-3 text-right">Carlos</th>
                <th className="py-2 px-3 text-center">Fecha de Pago</th>
                <th className="py-2 px-3 text-center">Estado</th>
                <th className="py-2 px-3 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dynamicRepartos.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-medium text-gray-800">{formatDate(item.desde)}</td>
                  <td className="py-2 px-3 font-medium text-gray-800">{formatDate(item.hasta)}</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-800">
                    {formatNumber(item.ganancia)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-700">
                    {formatNumber(item.administrador)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-700">{formatNumber(item.tatao)}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{formatNumber(item.carlos)}</td>
                  <td className="py-2 px-3 text-center text-gray-600">
                    {item.fechaPago ? formatDate(item.fechaPago) : '—'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.estado === 'Pagado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.estado}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {item.estado === 'Pendiente' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPayingRepartoId(item.id);
                          setFechaPagoInput(toISODate(new Date()));
                        }}
                        className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center justify-center gap-1 mx-auto transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Marcar pagado</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => deshacerRepartoPagado(item.id)}
                        className="px-2 py-1 text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center gap-1 mx-auto transition-colors"
                        title="Revertir pago y volver a estado Pendiente"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Deshacer</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Marcar Pagado */}
      {payingRepartoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-4 space-y-3 animate-in fade-in duration-150">
            <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
              Liquidar Reparto Semanal
            </h3>
            <form onSubmit={handleConfirmPayReparto} className="space-y-3 text-xs">
              <p className="text-gray-600">
                Se generarán 3 gastos de Salarios en Efectivo (Administrador, Tatao, Carlos)
                en la fecha indicada.
              </p>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Fecha de Pago:
                </label>
                <input
                  type="date"
                  required
                  value={fechaPagoInput}
                  onChange={(e) => setFechaPagoInput(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPayingRepartoId(null)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reglas de Reparto */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">Reglas de Reparto de Ganancia</h3>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRules} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-0.5">
                  Porcentaje Fondo del Negocio (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  value={fondoPctInput}
                  onChange={(e) => setFondoPctInput(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  Se descuenta primero de la ganancia total (ej. 30%).
                </span>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-0.5">
                  Porcentaje Administrador sobre lo que queda (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  value={adminPctInput}
                  onChange={(e) => setAdminPctInput(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  Se descuenta del saldo restante tras el fondo (ej. 20%).
                </span>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-0.5">
                  Dueños (separados por coma):
                </label>
                <input
                  type="text"
                  required
                  value={duenosInput}
                  onChange={(e) => setDuenosInput(e.target.value)}
                  placeholder="Tatao, Carlos"
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  El sobrante se divide a partes iguales entre ellos.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(false)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded"
                >
                  Guardar Reglas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
