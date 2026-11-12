import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, AlertTriangle, ArrowRight, X, Clock } from 'lucide-react';

export const AlertReminder: React.FC = () => {
  const { currentModule, setCurrentModule, pendingAlertsCount } = useApp();
  const [isReminderOpen, setIsReminderOpen] = useState<boolean>(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('dulceria_tatao_snoozedUntil') || '0', 10);
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    localStorage.setItem('dulceria_tatao_snoozedUntil', String(snoozedUntil));
  }, [snoozedUntil]);

  // Interval in ms for periodic reminder: 1 hour (60 minutes)
  const REMINDER_INTERVAL_MS = 60 * 60 * 1000;

  useEffect(() => {
    if (pendingAlertsCount === 0 || currentModule === 'Alertas') {
      setIsReminderOpen(false);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      if (now > snoozedUntil && pendingAlertsCount > 0 && !isReminderOpen) {
        setIsReminderOpen(true);
      }
    }, 60000); // Check once a minute

    return () => clearInterval(interval);
  }, [pendingAlertsCount, currentModule, snoozedUntil]);

  // Initial trigger only after 1 hour of session if pending alerts exist
  useEffect(() => {
    if (pendingAlertsCount > 0 && currentModule !== 'Alertas') {
      const timeout = setTimeout(() => {
        if (Date.now() > snoozedUntil) {
          setIsReminderOpen(true);
        }
      }, 60 * 60 * 1000);
      return () => clearTimeout(timeout);
    }
  }, [pendingAlertsCount, currentModule, snoozedUntil]);

  if (pendingAlertsCount === 0) return null;

  const handleGoToAlerts = () => {
    setIsReminderOpen(false);
    setCurrentModule('Alertas');
  };

  const handleSnooze = () => {
    setIsReminderOpen(false);
    setSnoozedUntil(Date.now() + REMINDER_INTERVAL_MS);
  };

  return (
    <>
      {/* 1. Circulito Flotante en la esquina inferior derecha */}
      {currentModule !== 'Alertas' && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            type="button"
            onClick={handleGoToAlerts}
            className="group relative flex items-center gap-2 p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            title={`${pendingAlertsCount} diferencia(s) pendiente(s) de justificar en Alertas`}
            aria-label="Ver alertas pendientes"
          >
            <Bell className="w-5 h-5 animate-bounce" />
            <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-black text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              {pendingAlertsCount}
            </span>
            <span className="hidden group-hover:inline-block pr-1 text-xs font-semibold whitespace-nowrap animate-in fade-in duration-150">
              {pendingAlertsCount} Alerta{pendingAlertsCount > 1 ? 's' : ''}
            </span>
          </button>
        </div>
      )}

      {/* 2. Modal Semitransparente Superpuesto de Recordatorio Periódico */}
      {isReminderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white/95 border border-amber-300 rounded-xl shadow-2xl max-w-sm w-full p-4 space-y-3.5 backdrop-blur-md">
            <div className="flex items-start justify-between gap-2 border-b border-amber-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Recordatorio de Conciliación
                  </h3>
                  <span className="text-[11px] font-semibold text-amber-700">
                    {pendingAlertsCount} diferencia(s) pendiente(s)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSnooze}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
                title="Cerrar recordatorio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              Existen <strong className="text-amber-800">{pendingAlertsCount} diferencia(s)</strong> históricas
              entre la producción y las ventas que aún no han sido justificadas o rectificadas.
              Recuerda ingresar la causa de cada diferencia para mantener la contabilidad cuadrada.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1 border-t border-gray-100 text-xs">
              <button
                type="button"
                onClick={handleSnooze}
                className="px-3 py-1.5 font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Recordar más tarde</span>
              </button>
              <button
                type="button"
                onClick={handleGoToAlerts}
                className="px-3.5 py-1.5 font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <span>Ir al Menú Alertas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
