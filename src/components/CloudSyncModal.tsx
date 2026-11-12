import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Cloud,
  RefreshCw,
  Database,
  UploadCloud,
  DownloadCloud,
  Clock,
  ShieldCheck,
  X,
  CheckCircle2,
  Bell,
  Play,
} from 'lucide-react';

export const CloudSyncModal: React.FC = () => {
  const {
    isCloudSyncModalOpen,
    setIsCloudSyncModalOpen,
    data,
    isSyncing,
    lastCloudSync,
    syncWithCloud,
    isAutoSyncEnabled,
    setIsAutoSyncEnabled,
    triggerManualAutoSyncTest,
  } = useApp();

  if (!isCloudSyncModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">
                Sincronización en la Nube
              </h3>
              <p className="text-xs text-gray-500">
                Cloud SQL PostgreSQL • ai-studio-7bed0f47
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCloudSyncModalOpen(false)}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Estado del Servidor y Base de Datos */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 font-semibold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-700" />
              Estado Base de Datos:
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              PostgreSQL Conectado
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Última sincronización:
            </span>
            <span className="font-bold text-gray-800">
              {lastCloudSync
                ? lastCloudSync.toLocaleTimeString('es-CU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }) +
                  ' (' +
                  lastCloudSync.toLocaleDateString('es-CU') +
                  ')'
                : 'Pendiente'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 grid grid-cols-4 gap-2 text-center text-[11px]">
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-gray-500 block text-[10px]">Ventas</span>
              <span className="font-black text-amber-700 text-xs">
                {data.ventas.length}
              </span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-gray-500 block text-[10px]">Producción</span>
              <span className="font-black text-amber-700 text-xs">
                {data.produccion.length}
              </span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-gray-500 block text-[10px]">Gastos</span>
              <span className="font-black text-amber-700 text-xs">
                {data.gastos.length}
              </span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-gray-500 block text-[10px]">Facturas</span>
              <span className="font-black text-amber-700 text-xs">
                {data.facturas?.length || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones de Sincronización Manual */}
        <div className="space-y-3">
          {/* Opción 1: Descargar de la Nube (Traer datos frescos de vercel / web) */}
          <div className="p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="font-black text-gray-900 text-xs flex items-center gap-1.5">
                <DownloadCloud className="w-4 h-4 text-amber-700" />
                Descargar de la Nube (Actualizar esta vista)
              </h4>
              <p className="text-[11px] text-gray-600 leading-normal">
                Trae los datos más recientes almacenados en la nube. Ideal para actualizar
                este panel con las ventas y gastos registrados desde la versión publicada.
              </p>
            </div>
            <button
              type="button"
              onClick={() => syncWithCloud('pull')}
              disabled={isSyncing}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white font-bold rounded-lg text-xs shrink-0 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Cargando...' : 'Descargar'}</span>
            </button>
          </div>

          {/* Opción 2: Subir a la Nube (Guardar cambios locales en PostgreSQL) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="font-black text-gray-900 text-xs flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-slate-700" />
                Subir a la Nube (Guardar copia actual)
              </h4>
              <p className="text-[11px] text-gray-600 leading-normal">
                Guarda los registros actuales de este navegador en Cloud SQL PostgreSQL para que
                estén disponibles en todos los dispositivos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => syncWithCloud('push')}
              disabled={isSyncing}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 active:bg-black disabled:opacity-50 text-white font-bold rounded-lg text-xs shrink-0 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Subir</span>
            </button>
          </div>
        </div>

        {/* Configuración de Sincronización Automática cada 30 minutos */}
        <div className="p-3.5 bg-amber-50/40 border border-amber-200/60 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Auto-sincronización cada 30 minutos
              </span>
              <p className="text-[11px] text-gray-500">
                Sincroniza en segundo plano y muestra un aviso de 30s con opción de posponer si estás trabajando.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isAutoSyncEnabled}
                onChange={(e) => setIsAutoSyncEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Botón para probar el aviso preventivo */}
          <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-xs">
            <span className="text-gray-600 text-[11px]">
              ¿Quieres verificar el aviso de cuenta regresiva?
            </span>
            <button
              type="button"
              onClick={() => {
                setIsCloudSyncModalOpen(false);
                triggerManualAutoSyncTest();
              }}
              className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md flex items-center gap-1 transition-colors"
            >
              <Play className="w-3 h-3" />
              <span>Probar aviso de 30s</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setIsCloudSyncModalOpen(false)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
