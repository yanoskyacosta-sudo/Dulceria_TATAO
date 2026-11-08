import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatNumber, formatDate } from '../lib/calculations';
import { toISODate } from '../utils/dateUtils';
import { Producto, HistoricoPrecio } from '../types';
import { Plus, Edit2, History, CheckCircle } from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { data, addProducto, updatePrecioProducto } = useApp();

  // Modal Nuevo Producto
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newNombre, setNewNombre] = useState<string>('');
  const [newPrecio, setNewPrecio] = useState<string>('');
  const [newFechaInicio, setNewFechaInicio] = useState<string>(toISODate(new Date()));
  const [newVigenteHasta, setNewVigenteHasta] = useState<string>('');

  // Modal Actualizar Precio
  const [editingPrecioProd, setEditingPrecioProd] = useState<Producto | null>(null);
  const [nuevoPrecioInput, setNuevoPrecioInput] = useState<string>('');
  const [nuevoFechaInicio, setNuevoFechaInicio] = useState<string>(toISODate(new Date()));

  // Modal Historial de Precios
  const [historyModalProd, setHistoryModalProd] = useState<Producto | null>(null);

  // Open New modal
  const handleOpenNew = () => {
    setNewNombre('');
    setNewPrecio('');
    setNewFechaInicio(toISODate(new Date()));
    setNewVigenteHasta('');
    setIsNewModalOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    const pVal = parseFloat(newPrecio);
    if (!newNombre.trim() || isNaN(pVal) || pVal <= 0) return;

    addProducto({
      nombre: newNombre.trim(),
      precioVenta: pVal,
      fechaInicio: newFechaInicio || toISODate(new Date()),
      vigenteHasta: newVigenteHasta.trim() || null,
    });

    setIsNewModalOpen(false);
  };

  // Open Price update modal
  const handleOpenUpdatePrecio = (prod: Producto) => {
    setEditingPrecioProd(prod);
    setNuevoPrecioInput(String(prod.precioVigente));
    setNuevoFechaInicio(toISODate(new Date()));
  };

  const handleSaveUpdatePrecio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrecioProd) return;

    const pVal = parseFloat(nuevoPrecioInput);
    if (isNaN(pVal) || pVal <= 0) return;

    updatePrecioProducto(
      editingPrecioProd.id,
      pVal,
      nuevoFechaInicio || toISODate(new Date())
    );

    setEditingPrecioProd(null);
  };

  return (
    <div className="space-y-3 pb-10">
      {/* Action button bar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleOpenNew}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Tabla EXACTA: No. | Nombre de producto | Precio de venta | Fecha de inicio | Vigente hasta | Histórico de precios | Acciones */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3 w-12 text-center">No.</th>
                <th className="py-2 px-3">Nombre de producto</th>
                <th className="py-2 px-3 text-right w-36">Precio de venta</th>
                <th className="py-2 px-3 text-center w-32">Fecha de inicio</th>
                <th className="py-2 px-3 text-center w-32">Vigente hasta</th>
                <th className="py-2 px-3 text-center w-36">Histórico de precios</th>
                <th className="py-2 px-3 text-center w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.productos.map((prod, index) => {
                // Determine current active history record
                const activeRecord =
                  prod.historicoPrecios.find((h) => h.hasta === null) ||
                  prod.historicoPrecios[prod.historicoPrecios.length - 1];

                const fechaInicio = activeRecord?.desde || '—';
                const fechaHasta = activeRecord?.hasta;

                return (
                  <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-gray-900">
                      {prod.nombre}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="font-black text-emerald-800 text-sm">
                        {formatNumber(prod.precioVigente)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-gray-700">
                      {fechaInicio !== '—' ? formatDate(fechaInicio) : '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {!fechaHasta ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Vigente
                        </span>
                      ) : (
                        <span className="text-gray-600">{formatDate(fechaHasta)}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setHistoryModalProd(prod)}
                        className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1 transition-colors"
                        title="Ver línea de tiempo de precios"
                      >
                        <History className="w-3 h-3 text-amber-600" />
                        <span>{prod.historicoPrecios.length} registro(s)</span>
                      </button>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenUpdatePrecio(prod)}
                        className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded inline-flex items-center gap-1 transition-colors"
                        title="Actualizar precio de venta"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Cambiar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Histórico de Precios */}
      {historyModalProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <span>Historial de Precios — {historyModalProd.nombre}</span>
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModalProd(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-1.5 px-2.5">Desde</th>
                    <th className="py-1.5 px-2.5">Hasta</th>
                    <th className="py-1.5 px-2.5 text-right">Precio de Venta</th>
                    <th className="py-1.5 px-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyModalProd.historicoPrecios.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 text-gray-900 font-medium">
                        {formatDate(h.desde)}
                      </td>
                      <td className="py-2 px-2.5 text-gray-600">
                        {h.hasta ? formatDate(h.hasta) : 'Actualidad'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-black text-gray-900">
                        {formatNumber(h.precio)}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        {!h.hasta ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Vigente
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                            Archivado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setHistoryModalProd(null)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Producto */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">Nuevo Producto (Dulce)</h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nombre del Dulce <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Torta de Chocolate, Polvorón..."
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Precio de Venta <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={newPrecio}
                  onChange={(e) => setNewPrecio(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Fecha de Inicio:
                  </label>
                  <input
                    type="date"
                    required
                    value={newFechaInicio}
                    onChange={(e) => setNewFechaInicio(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Vigente Hasta:
                  </label>
                  <input
                    type="date"
                    placeholder="Opcional"
                    value={newVigenteHasta}
                    onChange={(e) => setNewVigenteHasta(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                >
                  Crear Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambiar Precio */}
      {editingPrecioProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">
                Cambiar Precio — {editingPrecioProd.nombre}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPrecioProd(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUpdatePrecio} className="space-y-3 text-xs">
              <div className="p-2 bg-slate-50 border border-gray-200 rounded text-gray-600 flex justify-between">
                <span>Precio actual:</span>
                <span className="font-bold text-gray-900">
                  {formatNumber(editingPrecioProd.precioVigente)}
                </span>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nuevo Precio de Venta:
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  value={nuevoPrecioInput}
                  onChange={(e) => setNuevoPrecioInput(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Fecha Inicio de Vigencia:
                </label>
                <input
                  type="date"
                  required
                  value={nuevoFechaInicio}
                  onChange={(e) => setNuevoFechaInicio(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10px] text-gray-500 block mt-1">
                  El precio previo se cerrará automáticamente el día anterior.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPrecioProd(null)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                >
                  Guardar Nuevo Precio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
