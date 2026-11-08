import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Cliente } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, IdCard } from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { data, addCliente, updateCliente, deleteCliente } = useApp();

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [ci, setCi] = useState<string>('');
  const [direccion, setDireccion] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenNew = () => {
    setEditingId(null);
    setNombre('');
    setTelefono('');
    setCi('');
    setDireccion('');
    setEmail('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cli: Cliente) => {
    setEditingId(cli.id);
    setNombre(cli.nombre === 'Mostrador / Público general' ? 'Otros' : cli.nombre);
    setTelefono(cli.telefono || '');
    setCi(cli.ci || '');
    setDireccion(cli.direccion || '');
    setEmail(cli.email || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) return;

    const cleanNombre =
      nombre.trim() === 'Mostrador / Público general' ? 'Otros' : nombre.trim();

    if (editingId) {
      updateCliente(editingId, {
        nombre: cleanNombre,
        telefono: telefono.trim(),
        ci: ci.trim() || undefined,
        direccion: direccion.trim() || undefined,
        email: email.trim() || undefined,
      });
    } else {
      addCliente({
        nombre: cleanNombre,
        telefono: telefono.trim(),
        ci: ci.trim() || undefined,
        direccion: direccion.trim() || undefined,
        email: email.trim() || undefined,
      });
    }

    setIsModalOpen(false);
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
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Tabla EXACTA: No. | Nombre del cliente | Teléfono/Móvil | Carné de Identidad | Dirección particular | Correo electrónico | Acciones */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="py-2 px-3 w-12 text-center">No.</th>
                <th className="py-2 px-3">Nombre del cliente</th>
                <th className="py-2 px-3 w-36">Teléfono/Móvil</th>
                <th className="py-2 px-3 w-36">Carné de Identidad</th>
                <th className="py-2 px-3">Dirección particular</th>
                <th className="py-2 px-3 w-48">Correo electrónico</th>
                <th className="py-2 px-3 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.clientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    <p className="text-xs">No hay clientes registrados.</p>
                    <button
                      type="button"
                      onClick={handleOpenNew}
                      className="mt-2 text-xs font-medium text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar primer cliente
                    </button>
                  </td>
                </tr>
              ) : (
                data.clientes.map((cli, index) => {
                  const displayName =
                    cli.nombre === 'Mostrador / Público general' ? 'Otros' : cli.nombre;

                  return (
                    <tr key={cli.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-900">
                        {displayName}
                      </td>
                      <td className="py-2 px-3 text-gray-700 font-medium">
                        {cli.telefono || '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-600 font-mono text-[11px]">
                        {cli.ci || '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {cli.direccion || '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {cli.email || '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cli)}
                            className="p-1 text-gray-500 hover:text-amber-600 rounded transition-colors"
                            title="Editar cliente"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(cli.id)}
                            className="p-1 text-gray-500 hover:text-rose-600 rounded transition-colors"
                            title="Eliminar cliente"
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

      {/* Modal Crear / Editar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">
                {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nombre del Cliente <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Juan Pérez, Cafetería La Palma..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Teléfono / Móvil <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+53 5xxxxxxx o fijo"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1 flex items-center justify-between">
                  <span>Carné de Identidad (CI):</span>
                  <span className="text-[10px] text-gray-400 font-normal">Opcional</span>
                </label>
                <input
                  type="text"
                  placeholder="11 dígitos"
                  value={ci}
                  onChange={(e) => setCi(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1 flex items-center justify-between">
                  <span>Dirección Particular:</span>
                  <span className="text-[10px] text-gray-400 font-normal">Opcional</span>
                </label>
                <input
                  type="text"
                  placeholder="Calle, número, entrecalles, municipio..."
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1 flex items-center justify-between">
                  <span>Correo Electrónico:</span>
                  <span className="text-[10px] text-gray-400 font-normal">Opcional</span>
                </label>
                <input
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
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
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar Cliente"
        message="¿Estás seguro de que deseas eliminar este cliente? Los vales emitidos a su nombre seguirán conservándose en el historial."
        onConfirm={() => {
          if (deletingId) {
            deleteCliente(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
