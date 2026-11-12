import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UsuarioAutorizado } from '../types';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Mail,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  Search,
  KeyRound,
  Info,
  UserCheck
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const {
    usuariosAutorizados,
    addUsuarioAutorizado,
    updateUsuarioAutorizado,
    deleteUsuarioAutorizado,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'Todos' | 'Administrador' | 'Operador' | 'Lector'>('Todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioAutorizado | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<'Administrador' | 'Operador' | 'Lector'>('Operador');
  const [activo, setActivo] = useState(true);
  const [formError, setFormError] = useState('');

  const openCreateModal = () => {
    setEditingUser(null);
    setEmail('');
    setNombre('');
    setRol('Operador');
    setActivo(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: UsuarioAutorizado) => {
    setEditingUser(user);
    setEmail(user.email);
    setNombre(user.nombre || '');
    setRol(user.rol);
    setActivo(user.activo);
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanNombre = nombre.trim();

    if (!cleanEmail) {
      setFormError('Por favor ingrese una dirección de correo Gmail válida.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setFormError('El correo debe contener una arroba (@) válida.');
      return;
    }

    // Check duplicate email
    const exists = usuariosAutorizados.some(
      (u) => u.email.toLowerCase() === cleanEmail && (!editingUser || u.id !== editingUser.id)
    );

    if (exists) {
      setFormError(`Ya existe un usuario registrado con el correo ${cleanEmail}`);
      return;
    }

    if (editingUser) {
      updateUsuarioAutorizado(editingUser.id, {
        email: cleanEmail,
        nombre: cleanNombre || cleanEmail.split('@')[0],
        rol,
        activo,
      });
    } else {
      addUsuarioAutorizado({
        email: cleanEmail,
        nombre: cleanNombre || cleanEmail.split('@')[0],
        rol,
        activo,
      });
    }

    closeModal();
  };

  const handleDelete = (user: UsuarioAutorizado) => {
    if (user.email === 'acostacastilleroyanosky@gmail.com') {
      window.alert('No se puede eliminar la cuenta principal de administración del sistema.');
      return;
    }
    const confirmed = window.confirm(
      `¿Está seguro de revocar el acceso a "${user.nombre || user.email}"?`
    );
    if (confirmed) {
      deleteUsuarioAutorizado(user.id);
    }
  };

  const filteredUsers = usuariosAutorizados.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.nombre && u.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'Todos' || u.rol === filterRole;
    return matchesSearch && matchesRole;
  });

  const countTotal = usuariosAutorizados.length;
  const countAdmins = usuariosAutorizados.filter((u) => u.rol === 'Administrador').length;
  const countOperadores = usuariosAutorizados.filter((u) => u.rol === 'Operador').length;
  const countLectores = usuariosAutorizados.filter((u) => u.rol === 'Lector').length;

  return (
    <div className="space-y-6">
      {/* Banner Superior Explicativo */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full opacity-10 pointer-events-none flex items-center justify-end pr-8">
          <KeyRound className="w-56 h-56" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-600/60 text-amber-100 text-xs px-2.5 py-0.5 rounded-full font-medium border border-amber-400/30 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-200" />
                Ajustes del Sistema
              </span>
              <span className="text-amber-200 text-xs">Gestión de Cuentas y Accesos</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-amber-300" />
              Usuarios Autorizados (Cuentas de Gmail)
            </h1>
            <p className="text-amber-100 text-sm mt-1 max-w-2xl leading-relaxed">
              Administre las cuentas de Google / Gmail autorizadas para acceder a la aplicación Dulcería Tatao,
              asignando roles de Administrador, Operador o Lector según las responsabilidades del equipo.
            </p>
          </div>
          <div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-white text-amber-900 hover:bg-amber-50 font-semibold px-4 py-2.5 rounded-xl shadow transition-colors"
            >
              <UserPlus className="w-5 h-5 text-amber-700" />
              Añadir Usuario
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Registrados</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{countTotal}</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Administradores</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{countAdmins}</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-amber-100/70 text-amber-800 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Operadores</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{countOperadores}</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Lectores</p>
            <p className="text-2xl font-bold text-stone-700 mt-1">{countLectores}</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            <Info className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por correo o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-medium text-stone-500 whitespace-nowrap">Filtrar Rol:</span>
          {(['Todos', 'Administrador', 'Operador', 'Lector'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filterRole === r
                  ? 'bg-amber-800 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Correo Gmail</th>
                <th className="py-3 px-4">Rol Asignado</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4">Fecha Alta</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500 text-sm">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isPrimaryAdmin = user.email === 'acostacastilleroyanosky@gmail.com';
                  const initials = (user.nombre || user.email)
                    .split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              user.rol === 'Administrador'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : user.rol === 'Operador'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-stone-100 text-stone-700 border border-stone-300'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900 flex items-center gap-1.5">
                              {user.nombre || 'Usuario'}
                              {isPrimaryAdmin && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded border border-amber-300">
                                  Principal
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-stone-600">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            user.rol === 'Administrador'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : user.rol === 'Operador'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-stone-100 text-stone-700 border border-stone-200'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {user.rol}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (isPrimaryAdmin) return;
                            updateUsuarioAutorizado(user.id, { activo: !user.activo });
                          }}
                          disabled={isPrimaryAdmin}
                          title={isPrimaryAdmin ? 'No se puede desactivar el administrador principal' : 'Clic para alternar estado'}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-opacity ${
                            user.activo
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          } ${isPrimaryAdmin ? 'opacity-80 cursor-not-allowed' : ''}`}
                        >
                          {user.activo ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Activo
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Inactivo
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-xs text-stone-500">
                        {user.fechaAgregado}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-stone-500 hover:text-amber-800 hover:bg-amber-50 rounded-md transition-colors"
                            title="Editar usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isPrimaryAdmin && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Revocar acceso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Modal Crear / Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-800" />
                {editingUser ? 'Editar Usuario Autorizado' : 'Añadir Usuario Autorizado'}
              </h2>
              <button
                onClick={closeModal}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Correo Electrónico (Gmail / Google Workspace) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  El usuario podrá acceder validando su cuenta de Google.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Nombre Completo / Apodo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Carlos Panadero o Maité"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Rol y Permisos en el Sistema <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    {
                      role: 'Administrador' as const,
                      desc: 'Acceso total: puede modificar ajustes, usuarios, parámetros y repartos.',
                    },
                    {
                      role: 'Operador' as const,
                      desc: 'Registro diario: ventas, producción, recetas, materiales y gastos.',
                    },
                    {
                      role: 'Lector' as const,
                      desc: 'Solo lectura: visualización de balances, reportes y conciliaciones.',
                    },
                  ].map((item) => (
                    <label
                      key={item.role}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        rol === item.role
                          ? 'border-amber-600 bg-amber-50/50'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="userRole"
                        value={item.role}
                        checked={rol === item.role}
                        onChange={() => setRol(item.role)}
                        className="mt-0.5 text-amber-800 focus:ring-amber-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{item.role}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Estado del Acceso
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-800"></div>
                  <span className="ml-2 text-xs font-medium text-stone-700">
                    {activo ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-stone-300 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold rounded-lg shadow transition-colors"
                >
                  {editingUser ? 'Guardar Cambios' : 'Añadir Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
