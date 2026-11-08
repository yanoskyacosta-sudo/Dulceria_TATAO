import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatNumber, formatDate } from '../lib/calculations';
import { toISODate } from '../utils/dateUtils';
import { FacturaItem, VentaVale } from '../types';
import { ConfirmModal } from './ConfirmModal';
import {
  Plus,
  Search,
  Eye,
  Printer,
  MessageCircle,
  Copy,
  Check,
  Trash2,
  FileText,
} from 'lucide-react';

export const BillingView: React.FC = () => {
  const {
    data,
    fechaDesde,
    fechaHasta,
    setDateRange,
    addFactura,
    deleteFactura,
    getNextFacturaNumber,
  } = useApp();

  // Filters for Billing view
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [clienteFiltro, setClienteFiltro] = useState<string>('Todos');

  // Pagination (20 rows per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // Modal "+ Nueva Factura" state
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [modalCliente, setModalCliente] = useState<string>('');
  const [modalTelefono, setModalTelefono] = useState<string>('');
  const [modalCI, setModalCI] = useState<string>('');
  const [modalDireccion, setModalDireccion] = useState<string>('');
  const [modalDesde, setModalDesde] = useState<string>(fechaDesde);
  const [modalHasta, setModalHasta] = useState<string>(fechaHasta);
  const [selectedVales, setSelectedVales] = useState<string[]>([]);
  const [modalNumero, setModalNumero] = useState<string>('');
  const [modalObservaciones, setModalObservaciones] = useState<string>('');

  // View / Print Document Modal
  const [activeFactura, setActiveFactura] = useState<FacturaItem | null>(null);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState<boolean>(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const clientOptions = useMemo(() => {
    const list = data.clientes.map((c) => c.nombre);
    if (!list.includes('Otros')) list.push('Otros');
    return list;
  }, [data.clientes]);

  // When client is selected in modal, load CI, phone, and address
  const handleSelectClientInModal = (clientName: string) => {
    setModalCliente(clientName);
    const found = data.clientes.find((c) => c.nombre === clientName);
    if (found) {
      setModalTelefono(found.telefono || '');
      setModalCI(found.ci || '');
      setModalDireccion(found.direccion || '');
    } else {
      setModalTelefono('');
      setModalCI('');
      setModalDireccion('');
    }
  };

  // Open new invoice modal
  const handleOpenNewInvoice = () => {
    const defaultClient = clientOptions[0] || 'Otros';
    setModalCliente(defaultClient);
    handleSelectClientInModal(defaultClient);
    setModalDesde(fechaDesde);
    setModalHasta(fechaHasta);
    setSelectedVales([]);
    setModalNumero(getNextFacturaNumber());
    setModalObservaciones('');
    setIsNewModalOpen(true);
  };

  // Filter vales available for the selected client in the modal date range
  const clientValesInRange = useMemo(() => {
    if (!modalCliente) return [];
    return data.ventas
      .filter((v) => v.fecha >= modalDesde && v.fecha <= modalHasta)
      .filter((v) => v.cliente === modalCliente)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [data.ventas, modalCliente, modalDesde, modalHasta]);

  // Select all / deselect all vales
  const handleToggleSelectAll = () => {
    if (selectedVales.length === clientValesInRange.length) {
      setSelectedVales([]);
    } else {
      setSelectedVales(clientValesInRange.map((v) => v.id));
    }
  };

  const handleToggleVale = (id: string) => {
    setSelectedVales((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  // Compute live summary for marked vales
  const liveSummary = useMemo(() => {
    const marked = clientValesInRange.filter((v) => selectedVales.includes(v.id));
    const totalAmount = marked.reduce((s, v) => s + v.importeTotal, 0);

    // Products consolidation
    const prodMap: Record<string, { cantidad: number; importe: number; count: number }> = {};
    marked.forEach((v) => {
      v.lineas.forEach((l) => {
        if (!prodMap[l.producto]) {
          prodMap[l.producto] = { cantidad: 0, importe: 0, count: 0 };
        }
        prodMap[l.producto].cantidad += l.cantidad;
        prodMap[l.producto].importe += l.importe;
        prodMap[l.producto].count += 1;
      });
    });

    const productosConsolidados = Object.keys(prodMap).map((pName) => {
      const p = prodMap[pName];
      const precioUnitario = p.cantidad > 0 ? p.importe / p.cantidad : 0;
      return {
        producto: pName,
        cantidad: p.cantidad,
        precioUnitario,
        importe: p.importe,
      };
    });

    return {
      markedCount: marked.length,
      totalAmount,
      markedVales: marked,
      productosConsolidados,
    };
  }, [clientValesInRange, selectedVales]);

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCliente || liveSummary.markedCount === 0) return;

    const valesDetalle = liveSummary.markedVales.map((v) => ({
      vale: v.vale,
      fecha: v.fecha,
      detalle: v.lineas.map((l) => `${l.producto} (${l.cantidad})`).join(', '),
      importe: v.importeTotal,
    }));

    const periodoVales = `${formatDate(modalDesde)} al ${formatDate(modalHasta)}`;

    addFactura({
      numero: modalNumero || getNextFacturaNumber(),
      cliente: modalCliente,
      telefono: modalTelefono,
      ci: modalCI,
      direccion: modalDireccion,
      fecha: toISODate(new Date()),
      periodoVales,
      valesIncluidos: selectedVales,
      valesDetalle,
      productosConsolidados: liveSummary.productosConsolidados,
      importeTotal: liveSummary.totalAmount,
      observaciones: modalObservaciones,
    });

    setIsNewModalOpen(false);
  };

  // Filtered invoices list
  const filteredFacturas = useMemo(() => {
    const list = data.facturas || [];
    return list
      .filter((f) => f.fecha >= fechaDesde && f.fecha <= fechaHasta)
      .filter((f) => (clienteFiltro === 'Todos' ? true : f.cliente === clienteFiltro))
      .filter((f) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          f.numero.toLowerCase().includes(q) ||
          f.cliente.toLowerCase().includes(q) ||
          f.valesDetalle.some((v) => v.vale.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero));
  }, [data.facturas, fechaDesde, fechaHasta, clienteFiltro, searchTerm]);

  // Summary metric cards
  const totalFacturas = filteredFacturas.length;
  const clientesFacturadosCount = new Set(filteredFacturas.map((f) => f.cliente)).size;
  const totalFacturadoSum = filteredFacturas.reduce((s, f) => s + f.importeTotal, 0);

  const totalPages = Math.ceil(filteredFacturas.length / pageSize) || 1;
  const paginatedFacturas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFacturas.slice(start, start + pageSize);
  }, [filteredFacturas, currentPage, pageSize]);

  // Generate WhatsApp formatted text message
  const generateWhatsAppMessage = (f: FacturaItem): string => {
    let msg = `*DULCERÍA TATAO — FACTURA DE VENTA*\n`;
    msg += `*No. Factura:* ${f.numero}\n`;
    msg += `*Fecha de Emisión:* ${formatDate(f.fecha)}\n`;
    msg += `*Cliente:* ${f.cliente}\n`;
    if (f.ci) msg += `*Carné de Identidad:* ${f.ci}\n`;
    if (f.direccion) msg += `*Dirección:* ${f.direccion}\n`;
    msg += `*Período:* ${f.periodoVales}\n`;
    msg += `─────────────────────────\n`;
    msg += `*DETALLE DE VALES INCLUIDOS:*\n`;
    f.valesDetalle.forEach((v) => {
      msg += `• Vale #${v.vale} (${formatDate(v.fecha)}): ${v.detalle} → ${formatNumber(v.importe)}\n`;
    });
    msg += `─────────────────────────\n`;
    msg += `*RESUMEN CONSOLIDADO:*\n`;
    f.productosConsolidados.forEach((p) => {
      msg += `• ${p.producto}: ${p.cantidad} u. × ${formatNumber(p.precioUnitario)} = ${formatNumber(p.importe)}\n`;
    });
    msg += `─────────────────────────\n`;
    msg += `*TOTAL A PAGAR:* ${formatNumber(f.importeTotal)}\n`;
    if (f.observaciones) {
      msg += `\n_Nota: ${f.observaciones}_\n`;
    }
    msg += `\n¡Gracias por su preferencia! 🍰`;
    return msg;
  };

  const handleOpenWhatsApp = (f: FacturaItem) => {
    const rawPhone = f.telefono.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(generateWhatsAppMessage(f));
    const url = rawPhone ? `https://wa.me/${rawPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyMessage = (f: FacturaItem) => {
    const text = generateWhatsAppMessage(f);
    navigator.clipboard.writeText(text);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2000);
  };

  return (
    <div className="space-y-3 pb-10">
      {/* Header Row 2: Live Search + Cliente + Desde/Hasta + "+ Nueva Factura" */}
      <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente o vale..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-44 sm:w-56 h-7 pl-8 pr-2 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Client Filter */}
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

            {/* Date Filters (synced with global) */}
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
          </div>

          <button
            type="button"
            onClick={handleOpenNewInvoice}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Factura</span>
          </button>
        </div>
      </div>

      {/* Main View: Tarjetas Resumen (Facturas Emitidas, Clientes Facturados, Total Facturado) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Facturas Emitidas
          </span>
          <span className="text-lg font-black text-gray-900 mt-1 block">
            {totalFacturas}
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Clientes Facturados
          </span>
          <span className="text-lg font-black text-gray-900 mt-1 block">
            {clientesFacturadosCount}
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Total Facturado
          </span>
          <span className="text-lg font-black text-emerald-800 mt-1 block">
            {formatNumber(totalFacturadoSum)}
          </span>
        </div>
      </div>

      {/* Tabla de Facturas Emitidas: No. | No. Factura | Cliente | Fecha | Período/Vales | Importe Total | Acciones */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3 w-12 text-center">No.</th>
                <th className="py-2 px-3 w-28">No. Factura</th>
                <th className="py-2 px-3">Cliente</th>
                <th className="py-2 px-3 w-28">Fecha</th>
                <th className="py-2 px-3">Período / Vales</th>
                <th className="py-2 px-3 text-right w-32">Importe Total</th>
                <th className="py-2 px-3 text-center w-36">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFacturas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs">No hay facturas emitidas en este período.</p>
                    <button
                      type="button"
                      onClick={handleOpenNewInvoice}
                      className="mt-2 text-xs font-medium text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Crear primera factura
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedFacturas.map((item, index) => {
                  const consecutive = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {consecutive}
                      </td>
                      <td className="py-2 px-3 font-bold text-gray-900 font-mono">
                        {item.numero}
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">{item.cliente}</td>
                      <td className="py-2 px-3 text-gray-700">{formatDate(item.fecha)}</td>
                      <td className="py-2 px-3 text-gray-600 text-[11px]">
                        <div>{item.periodoVales}</div>
                        <div className="text-gray-400">
                          {item.valesDetalle.length} vale(s) incluidos
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">
                        {formatNumber(item.importeTotal)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveFactura(item)}
                            className="p-1 text-gray-500 hover:text-amber-600 rounded transition-colors"
                            title="Ver documento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFactura(item);
                              setTimeout(() => window.print(), 200);
                            }}
                            className="p-1 text-gray-500 hover:text-indigo-600 rounded transition-colors"
                            title="Imprimir / PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(item)}
                            className="p-1 text-gray-500 hover:text-emerald-600 rounded transition-colors"
                            title="Enviar por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                            title="Eliminar factura"
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
              Total: {filteredFacturas.length} facturas (Página {currentPage} de {totalPages})
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

      {/* Modal "+ Nueva Factura" */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-3 sm:p-4 space-y-3 max-h-[90vh] overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-baseline gap-2">
                <h3 className="font-bold text-sm text-gray-900">Nueva Factura</h3>
                <span className="text-xs font-mono font-bold text-amber-600">
                  {modalNumero || getNextFacturaNumber()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-3 text-xs">
              {/* Cliente y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-0.5">Cliente:</label>
                  <select
                    required
                    value={modalCliente}
                    onChange={(e) => handleSelectClientInModal(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  >
                    {clientOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-0.5">
                    Teléfono / WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={modalTelefono}
                    onChange={(e) => setModalTelefono(e.target.value)}
                    placeholder="+53 50000000"
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Carné de Identidad y Dirección particular */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-0.5">
                    Carné de Identidad (CI):
                  </label>
                  <input
                    type="text"
                    value={modalCI}
                    onChange={(e) => setModalCI(e.target.value)}
                    placeholder="Ej. 85010212345"
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-0.5">
                    Dirección particular:
                  </label>
                  <input
                    type="text"
                    value={modalDireccion}
                    onChange={(e) => setModalDireccion(e.target.value)}
                    placeholder="Calle, número, entrecalles..."
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Intervalo de fechas para filtrar vales */}
              <div className="p-2 bg-slate-50 border border-gray-200 rounded flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Rango de vales:</span>
                  <input
                    type="date"
                    value={modalDesde}
                    onChange={(e) => setModalDesde(e.target.value)}
                    className="w-32 h-7 px-1.5 border border-gray-300 rounded bg-white text-xs"
                  />
                  <span className="text-gray-400">a</span>
                  <input
                    type="date"
                    value={modalHasta}
                    onChange={(e) => setModalHasta(e.target.value)}
                    className="w-32 h-7 px-1.5 border border-gray-300 rounded bg-white text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200"
                >
                  {selectedVales.length === clientValesInRange.length
                    ? 'Deseleccionar todos'
                    : 'Seleccionar todos'}
                </button>
              </div>

              {/* Lista de vales con checkboxes */}
              <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-gray-600 sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="py-1.5 px-2 w-8 text-center">✓</th>
                      <th className="py-1.5 px-2 w-16">Vale</th>
                      <th className="py-1.5 px-2 w-24">Fecha</th>
                      <th className="py-1.5 px-2">Detalle de dulces</th>
                      <th className="py-1.5 px-2 text-right w-24">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientValesInRange.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">
                          No hay vales para este cliente en el intervalo seleccionado.
                        </td>
                      </tr>
                    ) : (
                      clientValesInRange.map((v) => {
                        const isChecked = selectedVales.includes(v.id);
                        return (
                          <tr
                            key={v.id}
                            onClick={() => handleToggleVale(v.id)}
                            className={`cursor-pointer transition-colors ${
                              isChecked ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-1.5 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by row click
                                className="rounded text-amber-600 focus:ring-amber-500"
                              />
                            </td>
                            <td className="py-1.5 px-2 font-mono font-bold text-gray-900">
                              #{v.vale}
                            </td>
                            <td className="py-1.5 px-2 text-gray-700">{formatDate(v.fecha)}</td>
                            <td className="py-1.5 px-2 text-gray-600 truncate max-w-[200px]">
                              {v.lineas.map((l) => `${l.producto} (${l.cantidad})`).join(', ')}
                            </td>
                            <td className="py-1.5 px-2 text-right font-medium text-gray-900">
                              {formatNumber(v.importeTotal)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Barra de resumen en vivo */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white rounded font-medium">
                <span>Vales marcados: {liveSummary.markedCount}</span>
                <span className="text-sm font-black text-amber-400">
                  Total consolidado: {formatNumber(liveSummary.totalAmount)}
                </span>
              </div>

              {/* Observaciones */}
              <div>
                <label className="font-semibold text-gray-700 block mb-0.5">
                  Observaciones / Notas:
                </label>
                <input
                  type="text"
                  placeholder="Instrucciones de entrega, condiciones especiales..."
                  value={modalObservaciones}
                  onChange={(e) => setModalObservaciones(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
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
                  disabled={liveSummary.markedCount === 0}
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded"
                >
                  Emitir Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documento de Factura (Print/PDF and WhatsApp Modal) */}
      {activeFactura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Action Bar (Top) */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3 print:hidden">
              <span className="font-bold text-xs text-gray-500">DOCUMENTO DE FACTURA</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyMessage(activeFactura)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded flex items-center gap-1.5 transition-colors"
                >
                  {copiedWhatsapp ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWhatsapp ? '¡Copiado!' : 'Copiar mensaje'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(activeFactura)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFactura(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Print Document Content */}
            <div id="factura-print-area" className="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg space-y-5 text-gray-900">
              {/* Membrete "Dulcería TATAO" con eslogan */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-500 text-slate-950 font-black text-sm tracking-tighter">
                      DT
                    </span>
                    <h2 className="text-xl font-black tracking-tight text-slate-900">
                      Dulcería TATAO
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 italic mt-0.5">
                    El sabor tradicional de la mejor repostería artesanal
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-black text-slate-900">
                    {activeFactura.numero}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Fecha de emisión: {formatDate(activeFactura.fecha)}
                  </div>
                </div>
              </div>

              {/* Datos del cliente (Nombre, Carné de Identidad, Dirección particular, Teléfono) */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                    Cliente
                  </span>
                  <span className="font-bold text-gray-900 text-sm">
                    {activeFactura.cliente}
                  </span>
                  {activeFactura.ci && (
                    <div className="text-gray-700 mt-1">
                      <span className="text-gray-500 font-medium">CI:</span> {activeFactura.ci}
                    </div>
                  )}
                </div>
                <div className="text-right sm:text-left">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                    Contacto & Entrega
                  </span>
                  <div className="text-gray-700">
                    <span className="text-gray-500 font-medium">Tel:</span>{' '}
                    {activeFactura.telefono || 'No especificado'}
                  </div>
                  {activeFactura.direccion && (
                    <div className="text-gray-700 mt-1">
                      <span className="text-gray-500 font-medium">Dirección:</span>{' '}
                      {activeFactura.direccion}
                    </div>
                  )}
                </div>
              </div>

              {/* Tabla de vales incluidos (número, fecha, productos, importe individual) */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Vales Incluidos ({activeFactura.valesDetalle.length})
                </h4>
                <table className="w-full text-left text-xs border border-gray-200">
                  <thead className="bg-slate-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-1.5 px-2 w-16">Vale</th>
                      <th className="py-1.5 px-2 w-24">Fecha</th>
                      <th className="py-1.5 px-2">Productos Despachados</th>
                      <th className="py-1.5 px-2 text-right w-28">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeFactura.valesDetalle.map((v, i) => (
                      <tr key={i}>
                        <td className="py-1.5 px-2 font-mono font-bold text-gray-900">
                          #{v.vale}
                        </td>
                        <td className="py-1.5 px-2 text-gray-700">{formatDate(v.fecha)}</td>
                        <td className="py-1.5 px-2 text-gray-600">{v.detalle}</td>
                        <td className="py-1.5 px-2 text-right font-medium text-gray-900">
                          {formatNumber(v.importe)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tabla consolidada de productos (cantidad total por producto, precio unitario, importe) */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Resumen Consolidado de Productos
                </h4>
                <table className="w-full text-left text-xs border border-gray-200">
                  <thead className="bg-slate-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-1.5 px-2">Producto</th>
                      <th className="py-1.5 px-2 text-right w-24">Cantidad Total</th>
                      <th className="py-1.5 px-2 text-right w-28">Precio Unitario</th>
                      <th className="py-1.5 px-2 text-right w-28">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeFactura.productosConsolidados.map((p, i) => (
                      <tr key={i}>
                        <td className="py-1.5 px-2 font-medium text-gray-900">{p.producto}</td>
                        <td className="py-1.5 px-2 text-right text-gray-700">{p.cantidad}</td>
                        <td className="py-1.5 px-2 text-right text-gray-700">
                          {formatNumber(p.precioUnitario)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-gray-900">
                          {formatNumber(p.importe)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Observaciones y Total General */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pt-2">
                <div className="text-xs text-gray-600 max-w-sm">
                  {activeFactura.observaciones && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                      <span className="font-semibold block text-amber-900">Observaciones:</span>
                      <span>{activeFactura.observaciones}</span>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-64 bg-slate-900 text-white p-3 rounded text-right space-y-1">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                    Total General
                  </span>
                  <span className="text-xl font-black text-amber-400 block">
                    {formatNumber(activeFactura.importeTotal)}
                  </span>
                </div>
              </div>

              {/* Espacio para firma de recibido conforme */}
              <div className="pt-8 border-t border-gray-200 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-1">
                  <div className="border-b border-gray-400 w-44 mx-auto h-8"></div>
                  <span className="text-gray-600 font-medium">Entregado por (TATAO)</span>
                </div>
                <div className="space-y-1">
                  <div className="border-b border-gray-400 w-44 mx-auto h-8"></div>
                  <span className="text-gray-600 font-medium">Recibido Conforme</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar Factura"
        message="¿Estás seguro de que deseas eliminar esta factura? Los vales individuales de venta permanecerán intactos."
        onConfirm={() => {
          if (deletingId) {
            deleteFactura(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
