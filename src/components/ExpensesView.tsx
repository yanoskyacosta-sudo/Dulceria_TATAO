import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatNumber, formatDate } from '../lib/calculations';
import { toISODate } from '../utils/dateUtils';
import { CategoriaGasto, FormaPago, GastoItem } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Trash2, Edit2, Lock } from 'lucide-react';

interface DisplayGastoRow {
  keyId: string;
  fecha: string;
  categoria: CategoriaGasto;
  concepto: string;
  subdetalle?: string;
  formaPago: FormaPago;
  importe: number;
  generadoPor?: 'Producción' | 'Reparto';
  rawIds: string[];
}

export const ExpensesView: React.FC = () => {
  const {
    data,
    fechaDesde,
    fechaHasta,
    setDateRange,
    addGasto,
    updateGasto,
    deleteGasto,
  } = useApp();

  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todas');

  // Pagination (20 rows)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string>(toISODate(new Date()));
  const [categoria, setCategoria] = useState<CategoriaGasto>('Materias Primas');
  const [concepto, setConcepto] = useState<string>('');
  const [importe, setImporte] = useState<string>('');
  const [formaPago, setFormaPago] = useState<FormaPago>('Efectivo');

  // Materias Primas specific fields
  const [mpProducto, setMpProducto] = useState<string>('');
  const [mpCantidad, setMpCantidad] = useState<string>('');
  const [mpUnidad, setMpUnidad] = useState<string>('saco');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoriasList: CategoriaGasto[] = [
    'Materias Primas',
    'Materiales',
    'Limpieza',
    'Electricidad',
    'Salarios',
    'Otros',
  ];

  // Raw expenses filtered by date interval
  const intervalGastos = useMemo(() => {
    return data.gastos.filter((g) => g.fecha >= fechaDesde && g.fecha <= fechaHasta);
  }, [data.gastos, fechaDesde, fechaHasta]);

  // Recuadros métricos superiores (4) calculados sobre el intervalo seleccionado:
  // Salario (suma trabajadores + admin + dueños), Materiales (incluye Materias Primas), Electricidad, Limpieza
  const topMetrics = useMemo(() => {
    let salario = 0;
    let materiales = 0;
    let electricidad = 0;
    let limpieza = 0;

    intervalGastos.forEach((g) => {
      if (g.categoria === 'Salarios') {
        salario += g.importe;
      } else if (g.categoria === 'Materiales' || g.categoria === 'Materias Primas') {
        materiales += g.importe;
      } else if (g.categoria === 'Electricidad') {
        electricidad += g.importe;
      } else if (g.categoria === 'Limpieza') {
        limpieza += g.importe;
      }
    });

    return { salario, materiales, electricidad, limpieza };
  }, [intervalGastos]);

  // Consolidate worker salaries for table display:
  // "En menú Gastos cuando el concepto sea Salario trabajadores no poner la cantidad de dulces vendidos,
  // así los renglones serían mas estrechos y se vería mejor, tampoco Generado por ...."
  const consolidatedRows: DisplayGastoRow[] = useMemo(() => {
    const rows: DisplayGastoRow[] = [];
    const workerSalariesByDay: Record<string, GastoItem[]> = {};

    intervalGastos.forEach((g) => {
      if (g.categoria === 'Salarios' && (g.tipoSalario === 'Trabajadores' || (!g.tipoSalario && g.concepto.startsWith('Salario ')))) {
        if (!workerSalariesByDay[g.fecha]) {
          workerSalariesByDay[g.fecha] = [];
        }
        workerSalariesByDay[g.fecha].push(g);
      } else {
        // Normal row or Reparto salary
        let displayConcepto = g.concepto;
        if (g.tipoSalario === 'Administrador' || g.concepto.toLowerCase().includes('administrador')) {
          displayConcepto = 'Salario Administrador';
        } else if (g.concepto.toLowerCase().includes('tatao')) {
          displayConcepto = 'Salario Tatao';
        } else if (g.concepto.toLowerCase().includes('carlos')) {
          displayConcepto = 'Salario Carlos';
        }

        rows.push({
          keyId: g.id,
          fecha: g.fecha,
          categoria: g.categoria,
          concepto: displayConcepto,
          formaPago: g.formaPago || 'Efectivo',
          importe: g.importe,
          generadoPor: g.generadoPor,
          rawIds: [g.id],
        });
      }
    });

    // Consolidate worker salaries per day without subdetail or 'Generado por'
    Object.keys(workerSalariesByDay).forEach((day) => {
      const dayItems = workerSalariesByDay[day];
      const totalAmount = dayItems.reduce((s, it) => s + it.importe, 0);

      rows.push({
        keyId: `workers-${day}`,
        fecha: day,
        categoria: 'Salarios',
        concepto: 'Salario trabajadores',
        formaPago: 'Efectivo',
        importe: totalAmount,
        rawIds: dayItems.map((it) => it.id),
      });
    });

    // Filter by category if selected
    const filtered =
      categoriaFiltro === 'Todas'
        ? rows
        : rows.filter((r) => r.categoria === categoriaFiltro);

    // Sort descending by date
    return filtered.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.keyId.localeCompare(a.keyId));
  }, [intervalGastos, categoriaFiltro]);

  const totalPages = Math.ceil(consolidatedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return consolidatedRows.slice(start, start + pageSize);
  }, [consolidatedRows, currentPage, pageSize]);

  // Open modal for new expense
  const handleOpenNew = () => {
    setEditingId(null);
    setFecha(toISODate(new Date()));
    setCategoria('Materias Primas');
    setConcepto('');
    setMpProducto('');
    setMpCantidad('');
    setMpUnidad('saco');
    setImporte('');
    setFormaPago('Efectivo');
    setIsModalOpen(true);
  };

  // Open modal to edit existing manual expense
  const handleOpenEdit = (item: DisplayGastoRow) => {
    if (item.generadoPor) return; // Read-only
    setEditingId(item.keyId);
    setFecha(item.fecha);
    setCategoria(item.categoria);
    setConcepto(item.concepto);

    const mpMatch = item.concepto.match(/^(.+?)\s*\(([\d.,]+)\s*([^)]+)\)$/);
    if (mpMatch) {
      setMpProducto(mpMatch[1].trim());
      setMpCantidad(mpMatch[2].trim());
      setMpUnidad(mpMatch[3].trim());
    } else {
      setMpProducto(item.concepto);
      setMpCantidad('');
      setMpUnidad('saco');
    }

    setImporte(String(item.importe));
    setFormaPago(item.formaPago);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const impNum = parseFloat(importe);

    let finalConcepto = concepto.trim();
    if (categoria === 'Materias Primas') {
      const prod = mpProducto.trim() || concepto.trim();
      if (!prod) return;
      if (mpCantidad.trim()) {
        finalConcepto = `${prod} (${mpCantidad.trim()} ${mpUnidad.trim()})`;
      } else {
        finalConcepto = prod;
      }
    } else {
      if (!finalConcepto) return;
    }

    if (!fecha || !finalConcepto || isNaN(impNum) || impNum <= 0) return;

    if (editingId) {
      updateGasto(editingId, {
        fecha,
        categoria,
        concepto: finalConcepto,
        importe: impNum,
        formaPago,
      });
    } else {
      addGasto({
        fecha,
        categoria,
        concepto: finalConcepto,
        importe: impNum,
        formaPago,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-3 pb-10">
      {/* Header Row 2: Desde/Hasta + Categoría + "+ Nuevo Gasto" ALL ALIGNED IN A SINGLE ROW! NO QUICK BUTTONS */}
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

            <div className="flex items-center gap-1 text-xs">
              <label className="text-gray-500 font-medium">Categoría:</label>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="h-7 px-2 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value="Todas">Todas</option>
                {categoriasList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Gasto</span>
          </button>
        </div>
      </div>

      {/* Recuadros métricos superiores (4): Salario, Materiales, Electricidad, Limpieza */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Salario
          </span>
          <span className="text-sm sm:text-base font-black text-gray-900 mt-0.5 block truncate">
            {formatNumber(topMetrics.salario)}
          </span>
          <span className="text-[10px] text-gray-400 block truncate">
            Trabajadores + Admin + Dueños
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Materiales
          </span>
          <span className="text-sm sm:text-base font-black text-gray-900 mt-0.5 block truncate">
            {formatNumber(topMetrics.materiales)}
          </span>
          <span className="text-[10px] text-gray-400 block truncate">
            Incluye Materias Primas
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Electricidad
          </span>
          <span className="text-sm sm:text-base font-black text-gray-900 mt-0.5 block truncate">
            {formatNumber(topMetrics.electricidad)}
          </span>
          <span className="text-[10px] text-gray-400 block truncate">
            Corriente eléctrica
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Limpieza
          </span>
          <span className="text-sm sm:text-base font-black text-gray-900 mt-0.5 block truncate">
            {formatNumber(topMetrics.limpieza)}
          </span>
          <span className="text-[10px] text-gray-400 block truncate">
            Higiene e insumos
          </span>
        </div>
      </div>

      {/* Tabla de Gastos: No. | Fecha | Categoría | Concepto | Pago (Efectivo/Transferencia) | Importe | Acciones (SIN Proveedor) */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3 w-12 text-center">No.</th>
                <th className="py-2 px-3 w-28">Fecha</th>
                <th className="py-2 px-3 w-32">Categoría</th>
                <th className="py-2 px-3">Concepto</th>
                <th className="py-2 px-3 w-28">Pago</th>
                <th className="py-2 px-3 text-right w-32">Importe</th>
                <th className="py-2 px-3 text-center w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    <p className="text-xs">No hay gastos registrados en este período.</p>
                    <button
                      type="button"
                      onClick={handleOpenNew}
                      className="mt-2 text-xs font-medium text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar nuevo gasto
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((item, index) => {
                  const consecutive = (currentPage - 1) * pageSize + index + 1;
                  const isReadOnly = !!item.generadoPor;

                  return (
                    <tr key={item.keyId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {consecutive}
                      </td>
                      <td className="py-2 px-3 text-gray-800">{formatDate(item.fecha)}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.categoria === 'Salarios'
                              ? 'bg-blue-50 text-blue-800'
                              : item.categoria === 'Materias Primas'
                              ? 'bg-purple-50 text-purple-800'
                              : item.categoria === 'Materiales'
                              ? 'bg-amber-50 text-amber-800'
                              : item.categoria === 'Electricidad'
                              ? 'bg-yellow-50 text-yellow-800'
                              : item.categoria === 'Limpieza'
                              ? 'bg-teal-50 text-teal-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {item.categoria}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span>{item.concepto}</span>
                          {isReadOnly && item.concepto !== 'Salario trabajadores' && (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-gray-100 text-gray-500 font-normal italic flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              Generado por {item.generadoPor}
                            </span>
                          )}
                        </div>
                        {item.subdetalle && item.concepto !== 'Salario trabajadores' && (
                          <div className="text-[10px] text-gray-600 italic mt-0.5">
                            {item.subdetalle}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-700">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            item.formaPago === 'Efectivo'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-indigo-50 text-indigo-800'
                          }`}
                        >
                          {item.formaPago}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">
                        {formatNumber(item.importe)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isReadOnly ? (
                          <span className="text-[11px] text-gray-500 italic">Solo lectura</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 text-gray-500 hover:text-amber-600 rounded transition-colors"
                              title="Editar gasto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(item.keyId)}
                              className="p-1 text-gray-500 hover:text-rose-600 rounded transition-colors"
                              title="Eliminar gasto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
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
              Total: {consolidatedRows.length} renglones (Página {currentPage} de {totalPages})
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

      {/* Modal Nuevo/Editar Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-3 sm:p-4 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">
                {editingId ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-2.5 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-0.5">Fecha:</label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-0.5">Categoría:</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                >
                  {categoriasList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {categoria === 'Materias Primas' ? (
                <div className="space-y-2 p-2 bg-purple-50/50 border border-purple-200 rounded">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-0.5">
                      Producto / Materia Prima:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Harina, Azúcar, Manteca, Levadura..."
                      value={mpProducto}
                      onChange={(e) => setMpProducto(e.target.value)}
                      className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-gray-700 block mb-0.5">
                        Cantidad comprada:
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder="Ej. 2, 5, 25..."
                        value={mpCantidad}
                        onChange={(e) => setMpCantidad(e.target.value)}
                        className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-gray-700 block mb-0.5">
                        Unidad de medida:
                      </label>
                      <select
                        value={mpUnidad}
                        onChange={(e) => setMpUnidad(e.target.value)}
                        className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                      >
                        <option value="saco">saco</option>
                        <option value="unidad">unidad</option>
                        <option value="kg">kg</option>
                        <option value="barra">barra</option>
                        <option value="lb">lb</option>
                        <option value="pomo">pomo</option>
                        <option value="caja">caja</option>
                        <option value="paquete">paquete</option>
                        <option value="litro">litro</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-gray-700 block mb-0.5">
                    Concepto:
                    {categoria === 'Materiales' && (
                      <span className="text-[10px] text-gray-400 font-normal ml-1">
                        (Identificar claramente el material/insumo)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      categoria === 'Materiales'
                        ? 'Ej. Lámpara, Estropajo, Balanza...'
                        : 'Descripción del gasto...'
                    }
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-700 block mb-0.5">Importe:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-0.5">Forma de Pago:</label>
                <select
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value as FormaPago)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Banco/Transferencia">Banco/Transferencia</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar Gasto"
        message="¿Estás seguro de que deseas eliminar este gasto?"
        onConfirm={() => {
          if (deletingId) {
            deleteGasto(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
