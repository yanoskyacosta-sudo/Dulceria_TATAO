import React from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  Clock,
  RefreshCw,
  X,
  CheckCircle2,
  Info,
  XCircle,
  Cloud,
} from 'lucide-react';

export const SyncNotification: React.FC = () => {
  const {
    autoSyncWarning,
    syncStatusMessage,
    setSyncStatusMessage,
    syncWithCloud,
    postponeAutoSync,
    dismissAutoSyncWarning,
    isSyncing,
  } = useApp();

  return (
    <>
      {/* 1. Modal / Banner de Aviso Previo de Sincronización Automática (30 segundos antes) */}
      {autoSyncWarning?.active && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 pt-6 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border-2 border-amber-400 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Cabecera con Contador y Alerta */}
            <div className="flex items-start justify-between gap-3 border-b border-amber-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-gray-900 text-sm tracking-tight">
                      Sincronización con la Nube
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white animate-pulse">
                      {autoSyncWarning.secondsLeft}s
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 font-semibold mt-0.5">
                    Aviso preventivo antes de actualizar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissAutoSyncWarning}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Omitir este ciclo de sincronización"
                aria-label="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mensaje descriptivo claro para el usuario */}
            <div className="text-xs text-gray-700 leading-relaxed bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/70 space-y-2">
              <p>
                En <strong className="text-amber-900 font-bold">{autoSyncWarning.secondsLeft} segundos</strong>{' '}
                se actualizarán automáticamente los datos con <strong>Cloud SQL (PostgreSQL)</strong> para
                mantener sincronizados todos los dispositivos y la web.
              </p>
              <p className="text-gray-600 text-[11px]">
                ℹ️ <strong>¿Estás introduciendo datos o llenando un formulario?</strong> Posponla 10 minutos
                para evitar cualquier interrupción o descarte de tus cambios actuales.
              </p>
            </div>

            {/* Barra de progreso visual del contador */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${Math.min(100, (autoSyncWarning.secondsLeft / 30) * 100)}%` }}
              />
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => postponeAutoSync(10)}
                className="px-3.5 py-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Posponer la sincronización 10 minutos más"
              >
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Posponer 10 min</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dismissAutoSyncWarning();
                  syncWithCloud('pull');
                }}
                disabled={isSyncing}
                className="px-4 py-2 font-black text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Toast flotante de estado de sincronización */}
      {syncStatusMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-5 z-50 max-w-sm animate-in slide-in-from-bottom-4 duration-200"
        >
          <div
            className={`p-3.5 rounded-xl shadow-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              syncStatusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-900/10'
                : syncStatusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-rose-900/10'
                : 'bg-sky-50 border-sky-300 text-sky-900 shadow-sky-900/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {syncStatusMessage.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              {syncStatusMessage.type === 'error' && (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              {syncStatusMessage.type === 'info' && (
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
              )}
              <span>{syncStatusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncStatusMessage(null)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-md"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}
    </>
  );
};
