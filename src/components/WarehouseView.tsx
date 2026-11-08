import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatNumber, formatDate } from '../lib/calculations';
import { toISODate } from '../utils/dateUtils';
import { AlmacenItem } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Minus, FileText, Edit2, Trash2, RotateCcw } from 'lucide-react';

export const WarehouseView: React.FC = () => {
  const {
    data,
    addAlmacenItem,
    updateAlmacenItem,
    deleteAlmacenItem,
    addMovimientoAlmacen,
    revertirMovimientoAlmacen,
  } = useApp();

  // Create item modal
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newProducto, setNewProducto] = useState<string>('');
  const [newUnidad, setNewUnidad] = useState<string>('kg');
  const [newExistencia, setNewExistencia] = useState<string>('0');
  const [newFechaConteo, setNewFechaConteo] = useState<string>(toISODate(new Date()));
  const [newStockMinimo, setNewStockMinimo] = useState<string>('');

  // Edit item modal
  const [editingItem, setEditingItem] = useState<AlmacenItem | null>(null);
  const [editProducto, setEditProducto] = useState<string>('');
  const [editUnidad, setEditUnidad] = useState<string>('');
  const [editStockMinimo, setEditStockMinimo] = useState<string>('');

  // Quick movement modal (+ Entrada / − Salida)
  const [movementModal, setMovementModal] = useState<{
    item: AlmacenItem;
    tipo: 'Entrada' | 'Salida';
  } | null>(null);
  const [movCantidad, setMovCantidad] = useState<string>('');
  const [movConcepto, setMovConcepto] = useState<string>('');
  const [movComprobante, setMovComprobante] = useState<string>('');
  const [movFecha, setMovFecha] = useState<string>(toISODate(new Date()));

  // Tarjeta de Estiba modal
  const [kardexItem, setKardexItem] = useState<AlmacenItem | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auto-calculated next code
  const nextCode = `MP-${String(data.almacen.length + 1).padStart(4, '0')}`;

  // Open Add modal
  const handleOpenAdd = () => {
    setNewProducto('');
    setNewUnidad('kg');
    setNewExistencia('0');
    setNewFechaConteo(toISODate(new Date()));
    setNewStockMinimo('');
    setIsNewModalOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProducto.trim() || !newUnidad.trim()) return;

    const exist = parseFloat(newExistencia) || 0;
    const min = newStockMinimo.trim() !== '' ? parseFloat(newStockMinimo) : undefined;

    addAlmacenItem({
      producto: newProducto.trim(),
      unidad: newUnidad.trim(),
      existencia: exist,
      fechaConteo: newFechaConteo || toISODate(new Date()),
      stockMinimo: min,
    });

    setIsNewModalOpen(false);
  };

  // Open Edit modal
  const handleOpenEdit = (item: AlmacenItem) => {
    setEditingItem(item);
    setEditProducto(item.producto);
    setEditUnidad(item.unidad);
    setEditStockMinimo(item.stockMinimo !== undefined ? String(item.stockMinimo) : '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editProducto.trim()) return;

    const min = editStockMinimo.trim() !== '' ? parseFloat(editStockMinimo) : undefined;
    updateAlmacenItem(editingItem.id, {
      producto: editProducto.trim(),
      unidad: editUnidad.trim(),
      stockMinimo: min,
    });

    setEditingItem(null);
  };

  // Open Movement modal
  const handleOpenMovement = (item: AlmacenItem, tipo: 'Entrada' | 'Salida') => {
    setMovementModal({ item, tipo });
    setMovCantidad('');
    setMovConcepto(tipo === 'Entrada' ? 'Compra de materia prima' : 'Consumo en producción');
    setMovComprobante('');
    setMovFecha(toISODate(new Date()));
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModal) return;

    const cant = parseFloat(movCantidad);
    if (isNaN(cant) || cant <= 0) return;

    addMovimientoAlmacen(
      movementModal.item.id,
      movementModal.tipo,
      cant,
      movConcepto.trim() || (movementModal.tipo === 'Entrada' ? 'Entrada' : 'Salida'),
      movComprobante.trim(),
      movFecha
    );

    // If kardex is open for this item, refresh it
    if (kardexItem && kardexItem.id === movementModal.item.id) {
      const updated = data.almacen.find((a) => a.id === movementModal.item.id);
      if (updated) setKardexItem(updated);
    }

    setMovementModal(null);
  };

  // Keep kardexItem in sync with global state changes
  const activeKardexItem = kardexItem
    ? data.almacen.find((a) => a.id === kardexItem.id) || null
    : null;

  return (
    <div className="space-y-3 pb-10">
      {/* Action button bar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Insertar Producto</span>
        </button>
      </div>

      {/* Almacén Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3 w-12 text-center">No.</th>
                <th className="py-2 px-3">Producto</th>
                <th className="py-2 px-3 text-right w-36">Existencia (Stock Actual)</th>
                <th className="py-2 px-3 text-right w-28">Stock Mínimo</th>
                <th className="py-2 px-3 text-center w-52">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.almacen.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    <p className="text-xs">No hay materias primas registradas en el almacén.</p>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="mt-2 text-xs font-medium text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar primera materia prima
                    </button>
                  </td>
                </tr>
              ) : (
                data.almacen.map((item, index) => {
                  const isUnderMin =
                    item.stockMinimo !== undefined &&
                    item.stockMinimo > 0 &&
                    item.existencia <= item.stockMinimo;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isUnderMin
                          ? 'bg-rose-50/70 hover:bg-rose-100/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{item.producto}</span>
                          {isUnderMin && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                              Bajo Mínimo
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-600 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-gray-700 bg-gray-100 px-1 rounded">
                            {item.codigo}
                          </span>
                          <span>•</span>
                          <span>Unidad: {item.unidad}</span>
                          <span>•</span>
                          <span>Conteo: {formatDate(item.fechaConteo)}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`font-black text-sm ${
                            isUnderMin ? 'text-rose-700' : 'text-gray-900'
                          }`}
                        >
                          {formatNumber(item.existencia)}
                        </span>
                        <span className="text-[11px] text-gray-600 ml-1 font-medium">
                          {item.unidad}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700 font-medium">
                        {item.stockMinimo !== undefined && item.stockMinimo > 0 ? (
                          <span>
                            {formatNumber(item.stockMinimo)}{' '}
                            <span className="text-[10px] text-gray-600">{item.unidad}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {/* Botón + Entrada */}
                          <button
                            type="button"
                            onClick={() => handleOpenMovement(item, 'Entrada')}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1 transition-colors"
                            title="Registrar entrada de stock"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Entrada</span>
                          </button>

                          {/* Botón − Salida */}
                          <button
                            type="button"
                            onClick={() => handleOpenMovement(item, 'Salida')}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1 transition-colors"
                            title="Registrar salida de stock"
                          >
                            <Minus className="w-3 h-3" />
                            <span>Salida</span>
                          </button>

                          {/* Tarjeta de Estiba (Kardex) */}
                          <button
                            type="button"
                            onClick={() => setKardexItem(item)}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            title="Ver Tarjeta de Estiba (Kardex)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 text-gray-500 hover:text-amber-600 rounded transition-colors"
                            title="Editar materia prima"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            className="p-1 text-gray-500 hover:text-rose-600 rounded transition-colors"
                            title="Eliminar materia prima"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tarjeta de Estiba (Kardex) */}
      {activeKardexItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-4 space-y-3 animate-in fade-in duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Tarjeta de Estiba — {activeKardexItem.producto}</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Código: <span className="font-mono text-gray-800">{activeKardexItem.codigo}</span> | Unidad: {activeKardexItem.unidad} | Existencia actual:{' '}
                  <span className="font-black text-gray-900">
                    {formatNumber(activeKardexItem.existencia)} {activeKardexItem.unidad}
                  </span>{' '}
                  | Mínimo:{' '}
                  {activeKardexItem.stockMinimo !== undefined
                    ? `${formatNumber(activeKardexItem.stockMinimo)} ${activeKardexItem.unidad}`
                    : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setKardexItem(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Sub-actions: quick add movement right from Kardex */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-semibold text-gray-700">Movimientos Históricos</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenMovement(activeKardexItem, 'Entrada')}
                  className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Entrada
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenMovement(activeKardexItem, 'Salida')}
                  className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1"
                >
                  <Minus className="w-3 h-3" /> Salida
                </button>
              </div>
            </div>

            {/* Table of Movements */}
            <div className="border border-gray-200 rounded overflow-y-auto flex-1 min-h-[220px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-1.5 px-2.5">Fecha</th>
                    <th className="py-1.5 px-2.5 text-center">Tipo</th>
                    <th className="py-1.5 px-2.5 text-right">Cantidad</th>
                    <th className="py-1.5 px-2.5 text-right">Saldo</th>
                    <th className="py-1.5 px-2.5">Concepto</th>
                    <th className="py-1.5 px-2.5">Comprobante</th>
                    <th className="py-1.5 px-2.5 text-center w-16">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(!activeKardexItem.movimientos || activeKardexItem.movimientos.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-500 text-xs">
                        No hay movimientos registrados.
                      </td>
                    </tr>
                  ) : (
                    activeKardexItem.movimientos.map((mov) => (
                      <tr key={mov.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-gray-800">
                          {formatDate(mov.fecha)}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              mov.tipo === 'Entrada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {mov.tipo === 'Entrada' ? '+ Entrada' : '− Salida'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-medium text-gray-900">
                          {formatNumber(mov.cantidad)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-black text-gray-900">
                          {formatNumber(mov.saldoResultante)}
                        </td>
                        <td className="py-1.5 px-2.5 text-gray-700">{mov.concepto}</td>
                        <td className="py-1.5 px-2.5 text-gray-500 font-mono text-[11px]">
                          {mov.comprobante || '—'}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          {mov.comprobante !== 'INICIAL' ? (
                            <button
                              type="button"
                              onClick={() =>
                                revertirMovimientoAlmacen(activeKardexItem.id, mov.id)
                              }
                              className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                              title="Revertir movimiento de inventario"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setKardexItem(null)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Movimiento (Entrada o Salida) */}
      {movementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <span
                  className={
                    movementModal.tipo === 'Entrada' ? 'text-emerald-700' : 'text-rose-700'
                  }
                >
                  {movementModal.tipo === 'Entrada' ? '+ Entrada' : '− Salida'}
                </span>
                <span>de {movementModal.item.producto}</span>
              </h3>
              <button
                type="button"
                onClick={() => setMovementModal(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-3 text-xs">
              <div className="p-2 bg-slate-50 border border-gray-200 rounded text-gray-600 flex justify-between">
                <span>Existencia actual:</span>
                <span className="font-black text-gray-900">
                  {formatNumber(movementModal.item.existencia)} {movementModal.item.unidad}
                </span>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Cantidad ({movementModal.item.unidad}):
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  value={movCantidad}
                  onChange={(e) => setMovCantidad(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Fecha:</label>
                <input
                  type="date"
                  required
                  value={movFecha}
                  onChange={(e) => setMovFecha(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Concepto:</label>
                <input
                  type="text"
                  required
                  value={movConcepto}
                  onChange={(e) => setMovConcepto(e.target.value)}
                  placeholder="Motivo del movimiento..."
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Comprobante / No. Factura (Opcional):
                </label>
                <input
                  type="text"
                  value={movComprobante}
                  onChange={(e) => setMovComprobante(e.target.value)}
                  placeholder="Ej. FAC-1204, VALE-22..."
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setMovementModal(null)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 font-semibold text-white rounded transition-colors ${
                    movementModal.tipo === 'Entrada'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirmar {movementModal.tipo}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Insertar Producto (Materia Prima) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">Insertar Materia Prima</h3>
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
                  Código (Auto-generado):
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={nextCode}
                  className="w-full h-8 px-2 border border-gray-200 rounded bg-gray-100 font-mono text-gray-600"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nombre de la Materia Prima:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Harina de trigo, Azúcar..."
                  value={newProducto}
                  onChange={(e) => setNewProducto(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Unidad de Medida:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="kg, lb, u, saco..."
                    value={newUnidad}
                    onChange={(e) => setNewUnidad(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Existencia Inicial:
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={newExistencia}
                    onChange={(e) => setNewExistencia(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Fecha Conteo:
                  </label>
                  <input
                    type="date"
                    required
                    value={newFechaConteo}
                    onChange={(e) => setNewFechaConteo(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Stock Mínimo (Opcional):
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ej. 10"
                    value={newStockMinimo}
                    onChange={(e) => setNewStockMinimo(e.target.value)}
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
                  Insertar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Producto (Materia Prima) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">Editar Materia Prima</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Código:</label>
                <input
                  type="text"
                  disabled
                  value={editingItem.codigo}
                  className="w-full h-8 px-2 border border-gray-200 rounded bg-gray-100 font-mono text-gray-600"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nombre de la Materia Prima:
                </label>
                <input
                  type="text"
                  required
                  value={editProducto}
                  onChange={(e) => setEditProducto(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Unidad de Medida:
                  </label>
                  <input
                    type="text"
                    required
                    value={editUnidad}
                    onChange={(e) => setEditUnidad(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Stock Mínimo (Opcional):
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ej. 10"
                    value={editStockMinimo}
                    onChange={(e) => setEditStockMinimo(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar Materia Prima"
        message="¿Estás seguro de que deseas eliminar este producto de almacén junto con todo su historial de movimientos?"
        onConfirm={() => {
          if (deletingId) {
            deleteAlmacenItem(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
