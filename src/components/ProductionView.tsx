import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatNumber, formatDate, getPrecioVigente } from '../lib/calculations';
import { QuickDatePreset, toISODate } from '../utils/dateUtils';
import { ProduccionLote } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface DynamicRow {
  producto: string;
  cantidad: string;
  merma: string;
}

export const ProductionView: React.FC = () => {
  const {
    data,
    fechaDesde,
    fechaHasta,
    setDateRange,
    applyQuickPreset,
    addProduccion,
    updateProduccion,
    deleteProduccion,
  } = useApp();

  // Pagination state (20 rows per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string>(toISODate(new Date()));
  const [rows, setRows] = useState<DynamicRow[]>([
    { producto: '', cantidad: '', merma: '0' },
    { producto: '', cantidad: '', merma: '0' },
  ]);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Available sweet products
  const productOptions = useMemo(() => {
    return data.productos.map((p) => p.nombre);
  }, [data.productos]);

  // Filtered and sorted production (date descending)
  const filteredProduccion = useMemo(() => {
    return data.produccion
      .filter((p) => p.fecha >= fechaDesde && p.fecha <= fechaHasta)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  }, [data.produccion, fechaDesde, fechaHasta]);

  // Paginated items
  const totalPages = Math.ceil(filteredProduccion.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProduccion.slice(start, start + pageSize);
  }, [filteredProduccion, currentPage, pageSize]);

  // Open modal for new batch
  const handleOpenNew = () => {
    setEditingId(null);
    setFecha(toISODate(new Date()));
    const defaultProd = productOptions[0] || '';
    setRows([
      { producto: defaultProd, cantidad: '', merma: '0' },
      { producto: defaultProd, cantidad: '', merma: '0' },
    ]);
    setIsModalOpen(true);
  };

  // Open modal to edit existing batch
  const handleOpenEdit = (item: ProduccionLote) => {
    setEditingId(item.id);
    setFecha(item.fecha);
    setRows([
      {
        producto: item.producto,
        cantidad: String(item.cantidad),
        merma: String(item.merma || 0),
      },
    ]);
    setIsModalOpen(true);
  };

  // Dynamic row editing:
  // "al escribir cantidad en el último renglón aparece otro automáticamente; si se elimina un renglón y todos los restantes están completos, se añade una fila vacía al final. NO existe botón 'Añadir producto'."
  const handleRowChange = (index: number, field: keyof DynamicRow, value: string) => {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, [field]: value } : r));

      // Check if typing in the last row and has quantity
      if (index === next.length - 1 && field === 'cantidad' && value.trim() !== '') {
        const defaultProd = productOptions[0] || '';
        next.push({ producto: defaultProd, cantidad: '', merma: '0' });
      }
      return next;
    });
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        return [{ producto: productOptions[0] || '', cantidad: '', merma: '0' }];
      }
      const next = prev.filter((_, i) => i !== index);
      // If all remaining rows have quantities, append an empty one
      const allFilled = next.every((r) => r.cantidad.trim() !== '');
      if (allFilled) {
        next.push({ producto: productOptions[0] || '', cantidad: '', merma: '0' });
      }
      return next;
    });
  };

  // Calculate row amounts and bottom Costo Total
  const modalCalculations = useMemo(() => {
    let costoTotal = 0;
    const computedRows = rows.map((r) => {
      const prodObj = data.productos.find((p) => p.nombre === r.producto);
      const precioVigente = prodObj ? getPrecioVigente(prodObj, fecha) : 0;
      const cantNum = parseInt(r.cantidad, 10);
      const isValid = !isNaN(cantNum) && cantNum > 0;
      const importe = isValid ? cantNum * precioVigente : 0;
      if (isValid) costoTotal += importe;
      return {
        ...r,
        precioVigente,
        importe,
        isValid,
      };
    });
    return { computedRows, costoTotal };
  }, [rows, data.productos, fecha]);

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha) return;

    if (editingId) {
      // Editing single record
      const validRow = modalCalculations.computedRows[0];
      if (!validRow || !validRow.isValid) return;

      const cant = parseInt(validRow.cantidad, 10);
      const merma = parseInt(validRow.merma, 10) || 0;
      updateProduccion(editingId, {
        fecha,
        producto: validRow.producto,
        cantidad: cant,
        merma,
      });
    } else {
      // Create records: discard rows without valid quantity
      const validRows = modalCalculations.computedRows.filter((r) => r.isValid);
      if (validRows.length === 0) return;

      validRows.forEach((r) => {
        const cant = parseInt(r.cantidad, 10);
        const merma = parseInt(r.merma, 10) || 0;
        addProduccion({
          fecha,
          producto: r.producto,
          cantidad: cant,
          merma,
        });
      });
    }

    setIsModalOpen(false);
  };

  const quickButtons: QuickDatePreset[] = ['Hoy', 'Semana', 'Todo'];

  return (
    <div className="space-y-3 pb-10">
      {/* Header Row 2: Date Filters + Quick Buttons + Restablecer + "+ Registrar Lote" */}
      <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
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

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Lote</span>
          </button>
        </div>
      </div>

      {/* Production Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3 w-12 text-center">No.</th>
                <th className="py-2 px-3 w-28">Fecha</th>
                <th className="py-2 px-3">Producto</th>
                <th className="py-2 px-3 text-right w-24">Cantidad</th>
                <th className="py-2 px-3 text-right w-20">Merma</th>
                <th className="py-2 px-3 text-right w-28">Costo</th>
                <th className="py-2 px-3 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    <p className="text-xs">No hay lotes de producción en el intervalo seleccionado.</p>
                    <button
                      type="button"
                      onClick={handleOpenNew}
                      className="mt-2 text-xs font-medium text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar primer lote
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const consecutive = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {consecutive}
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">
                        {formatDate(item.fecha)}
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">{item.producto}</td>
                      <td className="py-2 px-3 text-right text-gray-800 font-medium">
                        {item.cantidad}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">{item.merma || 0}</td>
                      <td className="py-2 px-3 text-right text-gray-800 font-medium">
                        {formatNumber(item.costo)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 text-gray-500 hover:text-amber-600 rounded transition-colors"
                            title="Editar lote"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            className="p-1 text-gray-500 hover:text-rose-600 rounded transition-colors"
                            title="Eliminar lote"
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-3 py-2 bg-slate-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <span>
              Total: {filteredProduccion.length} lotes (Página {currentPage} de {totalPages})
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 border border-gray-300 rounded bg-white disabled:opacity-40 hover:bg-gray-100"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 border border-gray-300 rounded bg-white disabled:opacity-40 hover:bg-gray-100"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Registrar/Editar Lote */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-3 sm:p-4 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">
                {editingId ? 'Editar Lote de Producción' : 'Registrar Lote de Producción'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3">
              {/* Header: Fecha */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-700">Fecha:</label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-36 h-8 px-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Dynamic Rows */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-gray-200 text-gray-600">
                    <tr>
                      <th className="py-1.5 px-2">Producto</th>
                      <th className="py-1.5 px-2 text-center w-16">Cantidad</th>
                      <th className="py-1.5 px-2 text-center w-16">Merma</th>
                      <th className="py-1.5 px-2 text-right w-24">Importe</th>
                      <th className="py-1.5 px-1 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modalCalculations.computedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-1 px-2">
                          <select
                            value={r.producto}
                            onChange={(e) => handleRowChange(i, 'producto', e.target.value)}
                            className="w-full h-7 px-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                          >
                            {productOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="number"
                            min="0"
                            max="999"
                            placeholder="0"
                            value={r.cantidad}
                            onChange={(e) => handleRowChange(i, 'cantidad', e.target.value)}
                            className="w-14 h-7 text-center mx-auto block px-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="number"
                            min="0"
                            max="999"
                            placeholder="0"
                            value={r.merma}
                            onChange={(e) => handleRowChange(i, 'merma', e.target.value)}
                            className="w-14 h-7 text-center mx-auto block px-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="py-1 px-2 text-right font-medium text-gray-800">
                          {formatNumber(r.importe)}
                        </td>
                        <td className="py-1 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(i)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom summary: SOLO "Costo Total" */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-gray-200 rounded font-bold text-xs text-gray-900">
                <span>Costo Total:</span>
                <span className="text-sm font-black text-gray-900">
                  {formatNumber(modalCalculations.costoTotal)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                >
                  Guardar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar Lote de Producción"
        message="¿Estás seguro de que deseas eliminar este lote? El gasto salarial asociado también se eliminará automáticamente."
        onConfirm={() => {
          if (deletingId) {
            deleteProduccion(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
