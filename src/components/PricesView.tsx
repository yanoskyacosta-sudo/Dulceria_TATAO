import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatNumber, getGananciaUnidad, getPagoPorDulce } from '../lib/calculations';
import { toISODate } from '../utils/dateUtils';
import { Producto } from '../types';
import { SlidersHorizontal, Edit2, DollarSign } from 'lucide-react';

export const PricesView: React.FC = () => {
  const {
    data,
    updateCostoUnitario,
    updatePrecioProducto,
    updateParametrosProducto,
  } = useApp();

  // Modal Parámetros
  const [isParamsModalOpen, setIsParamsModalOpen] = useState<boolean>(false);
  const [paramProduct, setParamProduct] = useState<string>(
    data.productos[0]?.nombre || ''
  );
  const [paramPagoTrabajador, setParamPagoTrabajador] = useState<string>('');
  const [paramGananciaUnidad, setParamGananciaUnidad] = useState<string>('');
  const [paramFechaDesde, setParamFechaDesde] = useState<string>(toISODate(new Date()));

  // Modal Editar Costo Unitario
  const [costoModalProd, setCostoModalProd] = useState<Producto | null>(null);
  const [costoInput, setCostoInput] = useState<string>('');

  // Modal Actualizar Precio de Venta
  const [precioModalProd, setPrecioModalProd] = useState<Producto | null>(null);
  const [precioInput, setPrecioInput] = useState<string>('');
  const [precioFechaDesde, setPrecioFechaDesde] = useState<string>(toISODate(new Date()));

  // Open Parámetros Modal
  const handleOpenParams = () => {
    const firstProd = data.productos[0]?.nombre || '';
    setParamProduct(firstProd);
    const today = toISODate(new Date());
    setParamFechaDesde(today);

    const currentPago = getPagoPorDulce(firstProd, data.meta);
    const currentGanancia = getGananciaUnidad(firstProd, today, data.meta);

    setParamPagoTrabajador(String(currentPago));
    setParamGananciaUnidad(String(currentGanancia));
    setIsParamsModalOpen(true);
  };

  const handleProductParamChange = (prodName: string) => {
    setParamProduct(prodName);
    const currentPago = getPagoPorDulce(prodName, data.meta);
    const currentGanancia = getGananciaUnidad(prodName, paramFechaDesde, data.meta);
    setParamPagoTrabajador(String(currentPago));
    setParamGananciaUnidad(prodName === 'Masas' ? '0' : String(currentGanancia));
  };

  const handleSaveParams = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paramProduct) return;

    const pagoNum = parseFloat(paramPagoTrabajador) || 0;
    const gananciaNum = paramProduct === 'Masas' ? 0 : parseFloat(paramGananciaUnidad) || 0;

    updateParametrosProducto(
      paramProduct,
      pagoNum,
      gananciaNum,
      paramFechaDesde || toISODate(new Date())
    );

    setIsParamsModalOpen(false);
  };

  // Open Costo Modal
  const handleOpenCosto = (prod: Producto) => {
    setCostoModalProd(prod);
    setCostoInput(prod.costoUnitario !== null ? String(prod.costoUnitario) : '');
  };

  const handleSaveCosto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!costoModalProd) return;

    const val = costoInput.trim() === '' ? null : parseFloat(costoInput);
    updateCostoUnitario(costoModalProd.id, val);
    setCostoModalProd(null);
  };

  // Open Precio Modal
  const handleOpenPrecio = (prod: Producto) => {
    setPrecioModalProd(prod);
    setPrecioInput(String(prod.precioVigente));
    setPrecioFechaDesde(toISODate(new Date()));
  };

  const handleSavePrecio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!precioModalProd) return;

    const val = parseFloat(precioInput);
    if (isNaN(val) || val <= 0) return;

    updatePrecioProducto(precioModalProd.id, val, precioFechaDesde || toISODate(new Date()));
    setPrecioModalProd(null);
  };

  return (
    <div className="space-y-3 pb-10">
      {/* Action button bar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleOpenParams}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-gray-300 rounded-md flex items-center gap-1.5 shadow-2xs transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
          <span>Parámetros</span>
        </button>
      </div>

      {/* Tabla EXACTA: No. | Producto | Costo Unitario | Precio de Venta | Acciones */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3 w-12 text-center">No.</th>
                <th className="py-2 px-3">Producto</th>
                <th className="py-2 px-3 text-right w-40">Costo Unitario</th>
                <th className="py-2 px-3 text-right w-40">Precio de Venta</th>
                <th className="py-2 px-3 text-center w-36">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.productos.map((prod, index) => {
                const currentPago = getPagoPorDulce(prod.nombre, data.meta);
                const currentGanancia = getGananciaUnidad(
                  prod.nombre,
                  toISODate(new Date()),
                  data.meta
                );

                return (
                  <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-gray-900">
                      <div>{prod.nombre}</div>
                      <div className="text-[11px] text-gray-600 font-normal mt-0.5">
                        Pago trabajador: {formatNumber(currentPago)} | Ganancia:{' '}
                        {formatNumber(currentGanancia)}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="text-gray-400 font-medium" title="Se calculará con el módulo de Recetas">—</span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="font-black text-emerald-800 text-sm">
                        {formatNumber(prod.precioVigente)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenPrecio(prod)}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center gap-0.5 transition-colors"
                          title="Actualizar precio de venta"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Precio</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Costo Unitario */}
      {costoModalProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">
                Costo Unitario — {costoModalProd.nombre}
              </h3>
              <button
                type="button"
                onClick={() => setCostoModalProd(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCosto} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Costo Unitario (dejar en blanco para "—"):
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  autoFocus
                  placeholder="0.00"
                  value={costoInput}
                  onChange={(e) => setCostoInput(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCostoModalProd(null)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded"
                >
                  Guardar Costo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Actualizar Precio de Venta */}
      {precioModalProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">
                Actualizar Precio — {precioModalProd.nombre}
              </h3>
              <button
                type="button"
                onClick={() => setPrecioModalProd(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrecio} className="space-y-3 text-xs">
              <div className="p-2 bg-slate-50 border border-gray-200 rounded text-gray-600 flex justify-between">
                <span>Precio actual:</span>
                <span className="font-bold text-gray-900">
                  {formatNumber(precioModalProd.precioVigente)}
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
                  value={precioInput}
                  onChange={(e) => setPrecioInput(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Fecha de Inicio de Vigencia:
                </label>
                <input
                  type="date"
                  required
                  value={precioFechaDesde}
                  onChange={(e) => setPrecioFechaDesde(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10px] text-gray-500 block mt-1">
                  El precio anterior quedará registrado en el historial hasta el día anterior.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPrecioModalProd(null)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded"
                >
                  Actualizar Precio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Parámetros de Utilidad y Salarios */}
      {isParamsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">
                Parámetros de Utilidad y Salarios
              </h3>
              <button
                type="button"
                onClick={() => setIsParamsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveParams} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Seleccionar Producto:
                </label>
                <select
                  value={paramProduct}
                  onChange={(e) => handleProductParamChange(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                >
                  {data.productos.map((p) => (
                    <option key={p.id} value={p.nombre}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Pago por Dulce al Trabajador:
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={paramPagoTrabajador}
                  onChange={(e) => setParamPagoTrabajador(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  Salario que se genera automáticamente al registrar producción.
                </span>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Ganancia por Unidad:
                </label>
                {paramProduct === 'Masas' ? (
                  <div>
                    <input
                      type="text"
                      disabled
                      value="0.00 (Fijo para Masas)"
                      className="w-full h-8 px-2 border border-gray-200 rounded bg-gray-100 text-gray-500 font-medium"
                    />
                    <span className="text-[10px] text-gray-500 block mt-0.5">
                      Regla: Masas no computa ganancia de venta (0).
                    </span>
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={paramGananciaUnidad}
                      onChange={(e) => setParamGananciaUnidad(e.target.value)}
                      className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-gray-500 block mt-0.5">
                      Utilidad neta atribuida por cada unidad vendida.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Vigente Desde (Fecha):
                </label>
                <input
                  type="date"
                  required
                  value={paramFechaDesde}
                  onChange={(e) => setParamFechaDesde(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsParamsModalOpen(false)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors"
                >
                  Guardar Parámetros
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
