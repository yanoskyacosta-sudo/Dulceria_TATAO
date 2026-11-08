import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatNumber, formatDate, getPrecioVigente } from '../lib/calculations';
import { QuickDatePreset, toISODate } from '../utils/dateUtils';
import { VentaVale, LineaVenta } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface DynamicSaleRow {
  producto: string;
  cantidad: string;
  precio?: string;
}

export const SalesView: React.FC = () => {
  const {
    data,
    fechaDesde,
    fechaHasta,
    setDateRange,
    applyQuickPreset,
    addVenta,
    updateVenta,
    deleteVenta,
    getNextValeNumber,
  } = useApp();

  // Filters state
  const [clienteFiltro, setClienteFiltro] = useState<string>('Todos');
  const [searchVale, setSearchVale] = useState<string>('');

  // Pagination (20 rows per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string>(toISODate(new Date()));
  const [cliente, setCliente] = useState<string>('');
  const [formaPago, setFormaPago] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
  const [rows, setRows] = useState<DynamicSaleRow[]>([
    { producto: '', cantidad: '' },
    { producto: '', cantidad: '' },
  ]);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const productOptions = useMemo(() => {
    return data.productos.map((p) => p.nombre);
  }, [data.productos]);

  const clientOptions = useMemo(() => {
    const list = data.clientes.map((c) => c.nombre);
    if (!list.includes('Otros')) list.push('Otros');
    return list;
  }, [data.clientes]);

  // Filtered and sorted sales:
  // "Orden: fecha descendente y dentro del día, vale descendente. Paginación 50 filas."
  const filteredVentas = useMemo(() => {
    return data.ventas
      .filter((v) => v.fecha >= fechaDesde && v.fecha <= fechaHasta)
      .filter((v) => (clienteFiltro === 'Todos' ? true : v.cliente === clienteFiltro))
      .filter((v) => {
        if (!searchVale.trim()) return true;
        return v.vale.toLowerCase().includes(searchVale.trim().toLowerCase());
      })
      .sort((a, b) => {
        // Date descending
        const dateComp = b.fecha.localeCompare(a.fecha);
        if (dateComp !== 0) return dateComp;

        // Vale descending within the day (parse leading integers if possible)
        const intA = parseInt(a.vale, 10);
        const intB = parseInt(b.vale, 10);
        if (!isNaN(intA) && !isNaN(intB)) {
          return intB - intA;
        }
        return b.vale.localeCompare(a.vale);
      });
  }, [data.ventas, fechaDesde, fechaHasta, clienteFiltro, searchVale]);

  const totalPages = Math.ceil(filteredVentas.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVentas.slice(start, start + pageSize);
  }, [filteredVentas, currentPage, pageSize]);

  // Open modal for new sale
  const handleOpenNew = () => {
    setEditingId(null);
    const today = toISODate(new Date());
    setFecha(today);
    setCliente(''); // Default: "Seleccionar cliente"
    setFormaPago('Efectivo'); // Default always Efectivo
    const defaultProd = productOptions[0] || '';
    const prodObj = data.productos.find((p) => p.nombre === defaultProd);
    const defaultPrice = prodObj ? String(getPrecioVigente(prodObj, today)) : '';
    setRows([
      { producto: defaultProd, cantidad: '', precio: defaultPrice },
      { producto: defaultProd, cantidad: '', precio: defaultPrice },
    ]);
    setIsModalOpen(true);
  };

  // Open modal to edit sale
  const handleOpenEdit = (v: VentaVale) => {
    setEditingId(v.id);
    setFecha(v.fecha);
    setCliente(v.cliente);
    setFormaPago(v.formaPago || 'Efectivo');
    setRows(
      v.lineas.map((l) => ({
        producto: l.producto,
        cantidad: String(l.cantidad),
        precio: String(l.precioUnitario ?? (l.cantidad > 0 ? l.importe / l.cantidad : 0)),
      }))
    );
    setIsModalOpen(true);
  };

  // Dynamic rows behavior
  const handleRowChange = (index: number, field: keyof DynamicSaleRow, value: string) => {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, [field]: value } : r));

      // Auto-update price when product changes
      if (field === 'producto') {
        const prodObj = data.productos.find((p) => p.nombre === value);
        if (prodObj) {
          next[index].precio = String(getPrecioVigente(prodObj, fecha));
        }
      }

      // Append empty row if typing in last row and has quantity
      if (index === next.length - 1 && field === 'cantidad' && value.trim() !== '') {
        const defaultProd = productOptions[0] || '';
        const prodObj = data.productos.find((p) => p.nombre === defaultProd);
        const defaultPrice = prodObj ? String(getPrecioVigente(prodObj, fecha)) : '';
        next.push({ producto: defaultProd, cantidad: '', precio: defaultPrice });
      }
      return next;
    });
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        const defaultProd = productOptions[0] || '';
        const prodObj = data.productos.find((p) => p.nombre === defaultProd);
        const defaultPrice = prodObj ? String(getPrecioVigente(prodObj, fecha)) : '';
        return [{ producto: defaultProd, cantidad: '', precio: defaultPrice }];
      }
      const next = prev.filter((_, i) => i !== index);
      const allFilled = next.every((r) => r.cantidad.trim() !== '');
      if (allFilled) {
        const defaultProd = productOptions[0] || '';
        const prodObj = data.productos.find((p) => p.nombre === defaultProd);
        const defaultPrice = prodObj ? String(getPrecioVigente(prodObj, fecha)) : '';
        next.push({ producto: defaultProd, cantidad: '', precio: defaultPrice });
      }
      return next;
    });
  };

  // Modal computed rows and Importe total
  const modalCalculations = useMemo(() => {
    let importeTotal = 0;
    const computedRows = rows.map((r) => {
      const prodObj = data.productos.find((p) => p.nombre === r.producto);
      const precioVigente = prodObj ? getPrecioVigente(prodObj, fecha) : 0;
      const unitPrice =
        r.precio !== undefined && r.precio.trim() !== ''
          ? parseFloat(r.precio)
          : precioVigente;
      const cantNum = parseInt(r.cantidad, 10);
      const isValid = !isNaN(cantNum) && cantNum > 0 && !isNaN(unitPrice) && unitPrice >= 0;
      const importe = isValid ? cantNum * unitPrice : 0;
      if (isValid) importeTotal += importe;
      return {
        ...r,
        unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
        precioVigente,
        importe,
        isValid,
      };
    });
    return { computedRows, importeTotal };
  }, [rows, data.productos, fecha]);

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !cliente || cliente === 'Seleccionar cliente') return;

    const validRows = modalCalculations.computedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    const lineas: LineaVenta[] = validRows.map((r) => ({
      producto: r.producto,
      cantidad: parseInt(r.cantidad, 10),
      precioUnitario: r.unitPrice,
      importe: r.importe,
    }));

    const cleanCliente = cliente === 'Mostrador / Público general' ? 'Otros' : cliente;

    if (editingId) {
      updateVenta(editingId, {
        fecha,
        cliente: cleanCliente,
        lineas,
        importeTotal: modalCalculations.importeTotal,
        formaPago,
      });
    } else {
      addVenta({
        fecha,
        cliente: cleanCliente,
        lineas,
        importeTotal: modalCalculations.importeTotal,
        formaPago,
      });
    }

    setIsModalOpen(false);
  };

  const quickButtons: QuickDatePreset[] = ['Hoy', 'Semana', 'Todo'];

  return (
    <div className="space-y-3 pb-10">
      {/* Header Row 2: Date Filters + Quick Buttons + Restablecer + Cliente + Vale + "+ Nueva Venta" */}
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

            {/* Cliente filter */}
            <div className="flex items-center gap-1 text-xs">
              <label className="text-gray-500 font-medium">Cliente:</label>
              <select
                value={clienteFiltro}
                onChange={(e) => setClienteFiltro(e.target.value)}
                className="h-7 px-2 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value="Todos">Todos</option>
                {clientOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* No. de Vale filter */}
            <div className="flex items-center gap-1 text-xs">
              <label className="text-gray-500 font-medium">Vale:</label>
              <input
                type="text"
                placeholder="Buscar vale..."
                value={searchVale}
                onChange={(e) => setSearchVale(e.target.value)}
                className="w-24 h-7 px-2 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Venta</span>
          </button>
        </div>
      </div>

      {/* Sales Table: No. | No. de Vale | Fecha | Cliente | Detalle (productos) | Importe Total | Acciones (SIN columna Cantidad) */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3 w-12 text-center">No.</th>
                <th className="py-2 px-3 w-24">No. de Vale</th>
                <th className="py-2 px-3 w-28">Fecha</th>
                <th className="py-2 px-3 w-32">Cliente</th>
                <th className="py-2 px-3">Detalle (productos)</th>
                <th className="py-2 px-3 text-right w-32">Importe Total</th>
                <th className="py-2 px-3 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    <p className="text-xs">No hay ventas registradas en el intervalo seleccionado.</p>
                    <button
                      type="button"
                      onClick={handleOpenNew}
                      className="mt-2 text-xs font-medium text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar primera venta
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const consecutive = (currentPage - 1) * pageSize + index + 1;
                  const detalleStr = item.lineas
                    .map((l) => `${l.producto} (${l.cantidad})`)
                    .join(', ');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {consecutive}
                      </td>
                      <td className="py-2 px-3 font-bold text-gray-900 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>#{item.vale}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-sans font-semibold ${
                              item.formaPago === 'Transferencia'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.formaPago === 'Transferencia' ? 'Transf.' : 'Efec.'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-800">{formatDate(item.fecha)}</td>
                      <td className="py-2 px-3 font-medium text-gray-900">{item.cliente}</td>
                      <td className="py-2 px-3 text-gray-600 truncate max-w-xs" title={detalleStr}>
                        {detalleStr}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">
                        {formatNumber(item.importeTotal)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 text-gray-500 hover:text-amber-600 rounded transition-colors"
                            title="Editar vale"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            className="p-1 text-gray-500 hover:text-rose-600 rounded transition-colors"
                            title="Eliminar vale"
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
              Total: {filteredVentas.length} vales (Página {currentPage} de {totalPages})
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

      {/* Modal Nueva/Editar Venta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-3 sm:p-4 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-baseline gap-2">
                <h3 className="font-bold text-sm text-gray-900">
                  {editingId ? 'Editar Venta' : 'Nueva Venta'}
                </h3>
                {!editingId && (
                  <span className="text-xs font-mono font-bold text-amber-600">
                    Vale sugerido: #{getNextValeNumber()}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3">
              {/* Header: Fecha y Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-700 w-12">Fecha:</label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="flex-1 h-8 px-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-700 w-12">Cliente:</label>
                  <select
                    required
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="flex-1 h-8 px-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="" disabled>
                      Seleccionar cliente
                    </option>
                    {clientOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Forma de Pago: Efectivo (por defecto) o Transferencia */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded text-xs">
                <span className="font-semibold text-gray-700">Forma de pago:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-800">
                    <input
                      type="radio"
                      name="formaPagoModal"
                      value="Efectivo"
                      checked={formaPago === 'Efectivo'}
                      onChange={() => setFormaPago('Efectivo')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Efectivo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-800">
                    <input
                      type="radio"
                      name="formaPagoModal"
                      value="Transferencia"
                      checked={formaPago === 'Transferencia'}
                      onChange={() => setFormaPago('Transferencia')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Transferencia</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Rows: Producto | Cantidad | Precio (editable) | Importe */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-gray-200 text-gray-600">
                    <tr>
                      <th className="py-1.5 px-2">Producto</th>
                      <th className="py-1.5 px-2 text-center w-16">Cantidad</th>
                      <th className="py-1.5 px-2 text-right w-24">Precio</th>
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
                            step="any"
                            min="0"
                            placeholder={String(r.precioVigente)}
                            value={r.precio !== undefined ? r.precio : String(r.precioVigente)}
                            onChange={(e) => handleRowChange(i, 'precio', e.target.value)}
                            className="w-20 h-7 text-right mx-auto block px-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 font-medium text-gray-800"
                            title="Precio unitario (editable si es precio especial)"
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

              {/* Bottom summary: SOLO "Importe total" */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-gray-200 rounded font-bold text-xs text-gray-900">
                <span>Importe total:</span>
                <span className="text-sm font-black text-gray-900">
                  {formatNumber(modalCalculations.importeTotal)}
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
                  disabled={!cliente}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded transition-colors"
                >
                  Guardar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar Venta"
        message="¿Estás seguro de que deseas eliminar este vale de venta? Los números de vale no se reutilizan."
        onConfirm={() => {
          if (deletingId) {
            deleteVenta(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
