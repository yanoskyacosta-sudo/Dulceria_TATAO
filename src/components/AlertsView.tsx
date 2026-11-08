import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  formatDate,
  calculateReconciliation,
} from '../lib/calculations';
import {
  AlertCircle,
  CheckCircle2,
  Save,
  FileText,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  Bell,
  Info,
} from 'lucide-react';

export const AlertsView: React.FC = () => {
  const {
    data,
    reconciliationNote,
    saveReconciliationNote,
    justificaciones,
    addJustificacion,
    updateJustificacion,
    deleteJustificacion,
  } = useApp();

  const [localNote, setLocalNote] = useState<string>(reconciliationNote);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState<boolean>(false);

  // Modal para justificar un día o diferencia
  const [justifyingModal, setJustifyingModal] = useState<{
    fecha: string;
    producto?: string;
    diferencia?: number;
    nota: string;
    id?: string;
  } | null>(null);

  const [showJustifiedDetails, setShowJustifiedDetails] = useState<boolean>(false);

  // Alerta de Conciliación (Producción vs Ventas): siempre usa histórico completo, excluyendo Masas
  const conciliacion = useMemo(() => {
    return calculateReconciliation(data.produccion, data.ventas, justificaciones);
  }, [data.produccion, data.ventas, justificaciones]);

  const handleSaveNote = () => {
    saveReconciliationNote(localNote);
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2000);
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Resumen Superior de Alertas Activas */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Centro de Alertas y Conciliación</h2>
            <p className="text-[11px] text-gray-500">
              Control de diferencias históricas entre producción y ventas, mermas y justificaciones.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-bold ${
              conciliacion.totalPendientes === 0
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            {conciliacion.totalPendientes === 0
              ? '0 Alertas Pendientes'
              : `${conciliacion.totalPendientes} Pendiente(s)`}
          </span>
          {conciliacion.totalJustificados > 0 && (
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {conciliacion.totalJustificados} Justificada(s)
            </span>
          )}
        </div>
      </div>

      {/* 1. Alerta de Conciliación (Producción vs Ventas) */}
      {conciliacion.cuadrada ? (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold text-sm block">Conciliación Cuadrada</span>
            <span>
              Todas las unidades producidas coinciden exactamente con las vendidas en el histórico total.
            </span>
          </div>
        </div>
      ) : conciliacion.cuadradaOJustificada ? (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg space-y-2 text-xs shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs sm:text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Conciliación Justificada (Sin alertas activas)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-200 text-emerald-900">
                {conciliacion.totalJustificados} diferencia(s) justificada(s)
              </span>
              <button
                type="button"
                onClick={() => setShowJustifiedDetails((prev) => !prev)}
                className="px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline"
              >
                {showJustifiedDetails ? 'Ocultar detalles' : 'Ver detalles'}
              </button>
            </div>
          </div>
          <p className="text-emerald-800">
            Todas las diferencias históricas entre unidades producidas y vendidas (incluyendo las fechas 29/09 y 15/10) cuentan con su respectiva justificación registrada. Ya no se consideran alertas pendientes.
          </p>

          {showJustifiedDetails && (
            <div className="pt-2 border-t border-emerald-200 space-y-2">
              {conciliacion.desglosePorDulce.map((item) => (
                <div key={item.producto} className="bg-white/80 p-2 rounded border border-emerald-100">
                  <div className="flex justify-between font-semibold text-gray-800 text-[11px]">
                    <span>{item.producto}</span>
                    <span className="text-emerald-700">
                      {item.diasJustificados.length} día(s) justificado(s)
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {item.diasJustificados.map((d) => (
                      <div
                        key={d.fecha}
                        className="flex flex-wrap items-center justify-between text-[11px] bg-slate-50 p-1 rounded"
                      >
                        <span className="font-medium text-gray-700">
                          {formatDate(d.fecha)}: {d.diferencia > 0 ? `+${d.diferencia}` : d.diferencia} unid.
                        </span>
                        <span className="text-gray-600 italic">
                          Nota: "{d.notaJustificacion || 'Sin detalle adicional'}"
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Diferencias de Conciliación Pendientes (Producción vs Ventas)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900">
                Pendientes: {conciliacion.totalPendientes}
              </span>
              {conciliacion.totalJustificados > 0 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Justificadas: {conciliacion.totalJustificados}
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                Balance global: {conciliacion.netGlobal > 0 ? `+${conciliacion.netGlobal}` : conciliacion.netGlobal}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-amber-800 italic">
            Al registrar una justificación para un día determinado, esa diferencia se oculta automáticamente de esta alerta y pasa al registro de justificadas.
          </p>

          {/* Breakdown per sweet with pending differences */}
          <div className="space-y-2">
            {conciliacion.desglosePorDulce
              .filter((item) => item.diasPendientes.length > 0)
              .map((item) => (
                <div
                  key={item.producto}
                  className="bg-white border border-amber-200 rounded p-2 text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between font-semibold text-gray-900 border-b border-gray-100 pb-1 gap-2">
                    <span className="text-sm font-bold text-gray-900">{item.producto}</span>
                    <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
                      <span className="text-gray-500">Producido: {item.producidoTotal}</span>
                      <span className="text-gray-500">Vendido: {item.vendidoTotal}</span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded ${
                          item.diferenciaTotal > 0
                            ? 'bg-amber-100 text-amber-800'
                            : item.diferenciaTotal < 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Diferencia Total: {item.diferenciaTotal > 0 ? `+${item.diferenciaTotal}` : item.diferenciaTotal}
                      </span>
                    </div>
                  </div>

                  {/* Pending days table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-100">
                          <th className="py-1 px-1.5 font-medium">Fecha</th>
                          <th className="py-1 px-1.5 font-medium text-right">Producido</th>
                          <th className="py-1 px-1.5 font-medium text-right">Vendido</th>
                          <th className="py-1 px-1.5 font-medium text-right">Diferencia</th>
                          <th className="py-1 px-1.5 font-medium text-center w-28">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.diasPendientes.map((d) => (
                          <tr key={d.fecha} className="border-b border-gray-50 hover:bg-amber-50/40 transition-colors">
                            <td className="py-1 px-1.5 font-semibold text-gray-800">
                              {formatDate(d.fecha)}
                            </td>
                            <td className="py-1 px-1.5 text-right text-gray-600">{d.producido}</td>
                            <td className="py-1 px-1.5 text-right text-gray-600">{d.vendido}</td>
                            <td className="py-1 px-1.5 text-right font-medium">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  d.diferencia > 0
                                    ? 'text-amber-800 bg-amber-100'
                                    : 'text-rose-800 bg-rose-100'
                                }`}
                              >
                                {d.diferencia > 0 ? `+${d.diferencia}` : d.diferencia}
                              </span>
                            </td>
                            <td className="py-1 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setJustifyingModal({
                                    fecha: d.fecha,
                                    producto: item.producto,
                                    diferencia: d.diferencia,
                                    nota: '',
                                  })
                                }
                                className="px-2 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded inline-flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Justificar</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 2. Historial de Notas y Justificaciones Registradas */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-3 py-2 bg-slate-100 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-xs text-gray-800">
              Historial de Notas y Justificaciones de Diferencias
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setJustifyingModal({
                fecha: '2026-09-29',
                producto: 'Todos',
                nota: '',
              })
            }
            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Justificación Manual</span>
          </button>
        </div>

        <div className="p-3 space-y-3 text-xs">
          {/* Si existe una nota previa en localStorage no estructurada, mostrarla destacada */}
          {reconciliationNote && reconciliationNote.trim() !== '' && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-amber-900 uppercase tracking-wide">
                  Nota guardada en este navegador (localStorage):
                </span>
                <span className="text-[10px] text-amber-700 font-medium">Clave: dulceria_tatao_reconciliation_note</span>
              </div>
              <p className="text-xs text-gray-800 whitespace-pre-wrap bg-white/70 p-2 rounded border border-amber-100 font-medium">
                {reconciliationNote}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[10px] text-gray-500">Asignar rápidamente como justificación:</span>
                <button
                  type="button"
                  onClick={() => {
                    addJustificacion('2026-09-29', reconciliationNote, 'Todos');
                  }}
                  className="px-2 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors"
                >
                  Asignar a 29/09/2026
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addJustificacion('2026-10-15', reconciliationNote, 'Todos');
                  }}
                  className="px-2 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors"
                >
                  Asignar a 15/10/2026
                </button>
              </div>
            </div>
          )}

          {/* List of Registered Justifications */}
          {justificaciones.length === 0 ? (
            <div className="py-4 text-center text-gray-500">
              <p className="text-xs">
                No hay justificaciones guardadas todavía. Al pulsar en{' '}
                <strong className="text-amber-700">[+ Justificar]</strong> en las fechas 29/09 o 15/10,
                la nota se guardará de forma permanente y el día quedará validado sin mostrarse como alerta.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                    <th className="py-1.5 px-2.5 w-28">Fecha</th>
                    <th className="py-1.5 px-2.5 w-32">Dulce</th>
                    <th className="py-1.5 px-2.5">Justificación Registrada</th>
                    <th className="py-1.5 px-2.5 text-center w-24">Estado</th>
                    <th className="py-1.5 px-2.5 text-center w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {justificaciones.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-2.5 font-bold text-gray-900 whitespace-nowrap">
                        {j.fecha === 'General' ? 'General' : formatDate(j.fecha)}
                      </td>
                      <td className="py-2 px-2.5 text-gray-700">
                        {j.producto || 'Todos los dulces'}
                      </td>
                      <td className="py-2 px-2.5 text-gray-900 font-medium whitespace-pre-wrap">
                        {j.nota}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Justificado
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setJustifyingModal({
                                id: j.id,
                                fecha: j.fecha,
                                producto: j.producto,
                                nota: j.nota,
                              })
                            }
                            className="p-1 text-gray-500 hover:text-amber-600 rounded transition-colors"
                            title="Editar nota"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteJustificacion(j.id)}
                            className="p-1 text-gray-500 hover:text-rose-600 rounded transition-colors"
                            title="Eliminar justificación (volverá a mostrar la alerta)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick note input to maintain backwards compatibility */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-gray-100">
            <input
              type="text"
              placeholder="Nota rápida de observaciones en localStorage..."
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={handleSaveNote}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Nota Libre</span>
            </button>
            {noteSavedFeedback && (
              <span className="text-xs font-medium text-emerald-700 shrink-0">
                ¡Guardada!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal Justificar Día / Diferencia */}
      {justifyingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  {justifyingModal.id ? 'Editar Justificación' : 'Justificar Diferencia'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setJustifyingModal(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!justifyingModal.nota.trim()) return;

                if (justifyingModal.id) {
                  updateJustificacion(justifyingModal.id, justifyingModal.nota.trim());
                } else {
                  addJustificacion(
                    justifyingModal.fecha,
                    justifyingModal.nota.trim(),
                    justifyingModal.producto
                  );
                }
                setJustifyingModal(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="p-2 bg-slate-50 border border-gray-200 rounded text-gray-700 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha del registro:</span>
                  <span className="font-bold text-gray-900">
                    {formatDate(justifyingModal.fecha)}
                  </span>
                </div>
                {justifyingModal.producto && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dulce:</span>
                    <span className="font-bold text-gray-900">
                      {justifyingModal.producto}
                    </span>
                  </div>
                )}
                {justifyingModal.diferencia !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Diferencia:</span>
                    <span className="font-bold text-amber-800">
                      {justifyingModal.diferencia > 0
                        ? `+${justifyingModal.diferencia}`
                        : justifyingModal.diferencia}{' '}
                      unidades
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Fecha a Justificar:
                </label>
                <input
                  type="date"
                  required
                  value={justifyingModal.fecha}
                  onChange={(e) =>
                    setJustifyingModal({ ...justifyingModal, fecha: e.target.value })
                  }
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Dulce (opcional, 'Todos' aplica a todo el día):
                </label>
                <select
                  value={justifyingModal.producto || 'Todos'}
                  onChange={(e) =>
                    setJustifyingModal({
                      ...justifyingModal,
                      producto: e.target.value === 'Todos' ? undefined : e.target.value,
                    })
                  }
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                >
                  <option value="Todos">Todos los dulces de este día</option>
                  {data.productos
                    .filter((p) => p.nombre !== 'Masas')
                    .map((p) => (
                      <option key={p.id} value={p.nombre}>
                        {p.nombre}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Motivo / Justificación de la diferencia:
                </label>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  placeholder="Ej. Se reservaron 2 unidades para degustación de clientes, merma ocurrida durante el horneado, etc..."
                  value={justifyingModal.nota}
                  onChange={(e) =>
                    setJustifyingModal({ ...justifyingModal, nota: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setJustifyingModal(null)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                >
                  Guardar y Justificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
