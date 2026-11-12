import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Menu, LogIn, LogOut, User as UserIcon, HardDrive, Download, Upload, X, Check, Cloud, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  row1RightAction?: React.ReactNode;
  row2Content?: React.ReactNode;
}

const MODULE_INFO: Record<string, { title: string; desc: string }> = {
  Panel: {
    title: 'PANEL CONTABLE',
    desc: 'Resumen de operaciones, reparto y conciliación',
  },
  Producción: {
    title: 'PRODUCCIÓN',
    desc: 'Registro diario de lotes elaborados',
  },
  Ventas: {
    title: 'VENTAS',
    desc: 'Control de vales y despachos por cliente',
  },
  Facturación: {
    title: 'FACTURACIÓN',
    desc: 'Emisión de facturas y envío por WhatsApp',
  },
  Gastos: {
    title: 'GASTOS',
    desc: 'Control de egresos, compras y salarios',
  },
  Caja: {
    title: 'CAJA',
    desc: 'Control de arqueos, liquidaciones de caja y repartos de ganancia',
  },
  Almacén: {
    title: 'ALMACÉN',
    desc: 'Inventario de materias primas y tarjetas de estiba',
  },
  Precios: {
    title: 'PRECIOS',
    desc: 'Tarifas de venta, costos y parámetros de ganancia',
  },
  Clientes: {
    title: 'CLIENTES',
    desc: 'Directorio de clientes habituales y particulares',
  },
  Productos: {
    title: 'PRODUCTOS',
    desc: 'Catálogo de dulces y vigencias de precios',
  },
  Materiales: {
    title: 'MATERIALES',
    desc: 'Materias primas e insumos para el cálculo de costos de recetas',
  },
  Recetas: {
    title: 'RECETAS',
    desc: 'Fórmulas de producción, costeo por porción y rendimientos',
  },
  Alertas: {
    title: 'ALERTAS',
    desc: 'Control de conciliaciones, mermas e incidencias operativas',
  },
  Ajustes: {
    title: 'AJUSTES',
    desc: 'Configuración general del sistema y cuentas de acceso',
  },
  Usuarios: {
    title: 'USUARIOS',
    desc: 'Cuentas de Gmail autorizadas y roles de acceso',
  },
};

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  row1RightAction,
  row2Content,
}) => {
  const { currentModule, exportBackup, importBackup, isSyncing, syncWithCloud, setIsCloudSyncModalOpen } = useApp();
  const { user, signInWithGoogle, signOut } = useAuth();
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = importBackup(content);
        if (success) {
          setImportStatus({ ok: true, msg: '¡Respaldo importado y sincronizado con éxito!' });
          setTimeout(() => {
            setIsBackupModalOpen(false);
            setImportStatus(null);
          }, 1500);
        } else {
          setImportStatus({ ok: false, msg: 'El archivo no contiene un formato de datos válido.' });
        }
      } catch (err) {
        setImportStatus({ ok: false, msg: 'Error leyendo el archivo JSON.' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const info = MODULE_INFO[currentModule] || {
    title: currentModule.toUpperCase(),
    desc: '',
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs">
      {/* Renglón 1: Hamburguesa + Título identificativo en mayúsculas + descripción breve al lado con letra diferenciada + acciones nivel módulo */}
      <div className="h-12 px-3 sm:px-4 flex items-center justify-between gap-2 border-b border-gray-100">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="md:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-baseline gap-2 truncate">
            <h1 className="text-xs sm:text-sm font-black text-gray-900 tracking-wide shrink-0">
              {info.title}
            </h1>
            {info.desc && (
              <span className="text-[11px] sm:text-xs text-gray-600 italic font-medium truncate hidden sm:inline">
                {info.desc}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {row1RightAction}

          {/* Botón de Sincronización en la Nube */}
          <button
            type="button"
            onClick={() => syncWithCloud('pull')}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1 text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 rounded-md text-xs font-semibold border border-amber-200 transition-colors cursor-pointer"
            title="Sincronizar datos con Cloud SQL (PostgreSQL)"
          >
            <Cloud className={`w-3.5 h-3.5 text-amber-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Nube'}</span>
          </button>

          {/* Botón de Gestión de Respaldos */}
          <button
            type="button"
            onClick={() => {
              setIsBackupModalOpen(true);
              setImportStatus(null);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-semibold border border-slate-200 transition-colors"
            title="Descargar o restaurar respaldo de datos"
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Respaldos</span>
          </button>

          {user ? (
            <div className="flex items-center gap-1.5 bg-slate-100 pl-2 pr-1.5 py-1 rounded-full border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-700 max-w-[100px] truncate hidden sm:inline">
                {user.displayName || user.email?.split('@')[0]}
              </span>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Usuario"
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => signOut()}
                className="p-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-slate-200 transition-colors"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold border border-slate-200 transition-colors"
              title="Iniciar sesión con Google"
            >
              <UserIcon className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Acceder</span>
            </button>
          )}
        </div>
      </div>

      {/* Renglón 2: Filtros específicos del módulo + botón de acción principal verde. Si no tiene filtros, se oculta */}
      {row2Content && (
        <div className="px-3 sm:px-4 py-2 bg-slate-50 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 text-xs">
          {row2Content}
        </div>
      )}

      {/* Modal de Gestión de Respaldos */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Gestión de Respaldos</h3>
                  <p className="text-[11px] text-gray-500">Sincroniza y resguarda la información de la dulcería</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importStatus && (
              <div
                className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  importStatus.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {importStatus.ok && <Check className="w-4 h-4 shrink-0 text-emerald-600" />}
                <span>{importStatus.msg}</span>
              </div>
            )}

            <div className="space-y-3 text-xs text-gray-600">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-gray-800 mb-0.5">Exportar Respaldo</h4>
                  <p className="text-gray-500 text-[11px]">
                    Descarga un archivo JSON con todos los datos actuales para guardar o llevar a Vercel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportBackup}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-md font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-gray-800 mb-0.5">Importar Respaldo</h4>
                  <p className="text-gray-500 text-[11px]">
                    Carga un archivo de respaldo (como <code className="text-amber-800">respaldo-datos.json</code>) para restaurar todos los registros.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Cargar</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-amber-900 mb-0.5 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-amber-700" />
                    Sincronización Cloud SQL (Nube)
                  </h4>
                  <p className="text-gray-600 text-[11px]">
                    Sincroniza y descarga automáticamente los datos directamente desde la base de datos PostgreSQL.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupModalOpen(false);
                    setIsCloudSyncModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Gestionar</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 text-xs">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-md transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
