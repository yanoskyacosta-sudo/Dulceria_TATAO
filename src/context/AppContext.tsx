import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import initialJson from '../data/datos_tatao.json';
import {
  AppData,
  ModuleName,
  ProduccionLote,
  VentaVale,
  GastoItem,
  AlmacenItem,
  Cliente,
  Producto,
  FacturaItem,
  RepartoSemanal,
  JustificacionDiferencia,
  MaterialReceta,
  Receta,
  UsuarioAutorizado,
} from '../types';
import { getDefaultDateRange, getQuickRange, QuickDatePreset } from '../utils/dateUtils';
import { getPrecioVigente, getPagoPorDulce, calculateReparto, calculateReconciliation } from '../lib/calculations';

const STORAGE_KEY = 'dulceria_tatao_data_v2';
const NOTES_KEY = 'dulceria_tatao_reconciliation_note';

interface AppContextType {
  data: AppData;
  currentModule: ModuleName;
  setCurrentModule: (mod: ModuleName) => void;
  fechaDesde: string;
  fechaHasta: string;
  setDateRange: (desde: string, hasta: string) => void;
  applyQuickPreset: (preset: QuickDatePreset) => void;
  reconciliationNote: string;
  saveReconciliationNote: (note: string) => void;

  // Contador global de alertas pendientes
  pendingAlertsCount: number;

  // Justificaciones de diferencias
  justificaciones: JustificacionDiferencia[];
  addJustificacion: (fecha: string, nota: string, producto?: string) => void;
  updateJustificacion: (id: string, nota: string) => void;
  deleteJustificacion: (id: string) => void;

  // Producción
  addProduccion: (lote: Omit<ProduccionLote, 'id' | 'costo'>) => void;
  updateProduccion: (id: string, lote: Partial<ProduccionLote>) => void;
  deleteProduccion: (id: string) => void;

  // Ventas
  getNextValeNumber: () => string;
  addVenta: (venta: Omit<VentaVale, 'id' | 'vale'>) => void;
  updateVenta: (id: string, venta: Partial<VentaVale>) => void;
  deleteVenta: (id: string) => void;

  // Gastos
  addGasto: (gasto: Omit<GastoItem, 'id'>) => void;
  updateGasto: (id: string, gasto: Partial<GastoItem>) => void;
  deleteGasto: (id: string) => void;

  // Caja & Repartos
  marcarRepartoPagado: (repartoId: string, fechaPago: string) => void;
  deshacerRepartoPagado: (repartoId: string) => void;
  updateReglasReparto: (fondoPct: number, administradorPct: number, duenos: string[]) => void;

  // Almacén
  addAlmacenItem: (item: Omit<AlmacenItem, 'id' | 'codigo' | 'movimientos'>) => void;
  updateAlmacenItem: (id: string, item: Partial<AlmacenItem>) => void;
  deleteAlmacenItem: (id: string) => void;
  addMovimientoAlmacen: (
    itemId: string,
    tipo: 'Entrada' | 'Salida',
    cantidad: number,
    concepto: string,
    comprobante?: string,
    fecha?: string
  ) => void;
  revertirMovimientoAlmacen: (itemId: string, movId: string) => void;

  // Clientes
  addCliente: (cli: Omit<Cliente, 'id'>) => void;
  updateCliente: (id: string, cli: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;

  // Productos & Precios
  addProducto: (prod: {
    nombre: string;
    precioVenta: number;
    fechaInicio: string;
    vigenteHasta?: string | null;
  }) => void;
  updatePrecioProducto: (
    id: string,
    nuevoPrecio: number,
    fechaInicio: string,
    vigenteHasta?: string | null
  ) => void;
  updateCostoUnitario: (id: string, costoUnitario: number | null) => void;
  updateParametrosProducto: (
    productoNombre: string,
    pagoTrabajador: number,
    gananciaUnidad: number,
    desde: string
  ) => void;

  // Submenú 1: Materiales
  addMaterialReceta: (mat: Omit<MaterialReceta, 'id'>) => void;
  updateMaterialReceta: (id: string, mat: Partial<MaterialReceta>) => void;
  deleteMaterialReceta: (id: string) => void;

  // Submenú 2: Recetas
  addReceta: (rec: Omit<Receta, 'id'>) => void;
  updateReceta: (id: string, rec: Partial<Receta>) => void;
  deleteReceta: (id: string) => void;

  // Ajustes -> Usuarios
  usuariosAutorizados: UsuarioAutorizado[];
  addUsuarioAutorizado: (usr: Omit<UsuarioAutorizado, 'id' | 'fechaAgregado'>) => void;
  updateUsuarioAutorizado: (id: string, usr: Partial<UsuarioAutorizado>) => void;
  deleteUsuarioAutorizado: (id: string) => void;

  // Facturas
  getNextFacturaNumber: () => string;
  addFactura: (factura: Omit<FacturaItem, 'id'>) => void;
  deleteFactura: (id: string) => void;

  // Respaldos
  importBackup: (backupContent: string) => boolean;
  exportBackup: () => void;

  // Sincronización en la Nube & Auto-sync
  isSyncing: boolean;
  lastCloudSync: Date | null;
  syncStatusMessage: { type: 'success' | 'error' | 'info'; text: string } | null;
  setSyncStatusMessage: (msg: { type: 'success' | 'error' | 'info'; text: string } | null) => void;
  autoSyncWarning: { active: boolean; secondsLeft: number } | null;
  isAutoSyncEnabled: boolean;
  setIsAutoSyncEnabled: (enabled: boolean) => void;
  isCloudSyncModalOpen: boolean;
  setIsCloudSyncModalOpen: (open: boolean) => void;
  syncWithCloud: (mode?: 'pull' | 'push') => Promise<{ success: boolean; message: string }>;
  postponeAutoSync: (minutes?: number) => void;
  dismissAutoSyncWarning: () => void;
  triggerManualAutoSyncTest: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Normalization helper
function normalizeData(raw: Partial<AppData> | null | undefined): AppData {
  const init = initialJson as unknown as AppData;
  if (!raw || typeof raw !== 'object') {
    return normalizeData(init);
  }

  const rawClients = Array.isArray(raw.clientes) ? raw.clientes : init.clientes || [];
  const rawVentas = Array.isArray(raw.ventas) ? raw.ventas : init.ventas || [];

  const normClients = rawClients.map((c) => ({
    ...c,
    nombre: c.nombre === 'Mostrador / Público general' ? 'Otros' : c.nombre,
  }));

  const normVentas = rawVentas.map((v) => ({
    ...v,
    cliente: v.cliente === 'Mostrador / Público general' ? 'Otros' : v.cliente,
    formaPago: v.formaPago || 'Efectivo',
  }));

  let normFacturas: FacturaItem[] = Array.isArray(raw.facturas) ? raw.facturas : [];
  // Auto-generate invoices for historical vales from September 21, 2026 if empty
  if (normFacturas.length === 0 && normVentas.length > 0) {
    normFacturas = normVentas
      .filter((v) => v.fecha >= '2026-09-21')
      .map((v) => {
        const cli = normClients.find((c) => c.nombre === v.cliente);
        return {
          id: `fac-vale-${v.vale}-${v.id}`,
          numero: v.vale,
          cliente: v.cliente,
          telefono: cli?.telefono || '',
          ci: cli?.ci || '',
          direccion: cli?.direccion || '',
          fecha: v.fecha,
          periodoVales: v.fecha,
          valesIncluidos: [v.id],
          valesDetalle: [
            {
              vale: v.vale,
              fecha: v.fecha,
              detalle: v.lineas.map((l) => `${l.producto} (${l.cantidad})`).join(', '),
              importe: v.importeTotal,
            },
          ],
          productosConsolidados: v.lineas.map((l) => ({
            producto: l.producto,
            cantidad: l.cantidad,
            precioUnitario: l.cantidad > 0 ? l.importe / l.cantidad : 0,
            importe: l.importe,
          })),
          importeTotal: v.importeTotal,
          observaciones: `Factura correspondiente al vale ${v.vale}`,
        };
      });
  }

  const defaultMateriales: MaterialReceta[] = [
    { id: 'mat-1', nombre: 'Azúcar', precio: 26000, contenidoTotal: 25, unidadMedida: 'Kg' },
    { id: 'mat-2', nombre: 'Harina de Trigo', precio: 22500, contenidoTotal: 50, unidadMedida: 'Kg' },
    { id: 'mat-3', nombre: 'Manteca', precio: 18000, contenidoTotal: 10, unidadMedida: 'Kg' },
    { id: 'mat-4', nombre: 'Levadura', precio: 3200, contenidoTotal: 500, unidadMedida: 'g' },
    { id: 'mat-5', nombre: 'Huevos', precio: 4500, contenidoTotal: 30, unidadMedida: 'Unidades' },
    { id: 'mat-6', nombre: 'Esencia de Vainilla', precio: 1500, contenidoTotal: 1, unidadMedida: 'L' },
  ];

  const normMateriales =
    Array.isArray(raw.materialesReceta) && raw.materialesReceta.length > 0
      ? raw.materialesReceta
      : defaultMateriales;

  const normRecetas = Array.isArray(raw.recetas) ? raw.recetas : [];

  const defaultUsuarios: UsuarioAutorizado[] = [
    {
      id: 'usr-admin-yanosky',
      email: 'acostacastilleroyanosky@gmail.com',
      nombre: 'Yanosky Acosta (Admin)',
      rol: 'Administrador',
      fechaAgregado: '2026-11-10',
      activo: true,
    },
  ];

  const normUsuarios: UsuarioAutorizado[] =
    Array.isArray(raw.usuariosAutorizados) && raw.usuariosAutorizados.length > 0
      ? raw.usuariosAutorizados
      : defaultUsuarios;

  return {
    meta: raw.meta || init.meta,
    repartos: Array.isArray(raw.repartos) ? raw.repartos : init.repartos || [],
    clientes: normClients,
    productos: Array.isArray(raw.productos) ? raw.productos : init.productos || [],
    produccion: Array.isArray(raw.produccion) ? raw.produccion : init.produccion || [],
    ventas: normVentas,
    gastos: Array.isArray(raw.gastos) ? raw.gastos : init.gastos || [],
    almacen: Array.isArray(raw.almacen) ? raw.almacen : init.almacen || [],
    facturas: normFacturas,
    caja: raw.caja || init.caja,
    justificaciones: Array.isArray(raw.justificaciones) ? raw.justificaciones : [],
    materialesReceta: normMateriales,
    recetas: normRecetas,
    usuariosAutorizados: normUsuarios,
  };
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Cloud Sync & 30-minute Auto-Sync State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastCloudSync, setLastCloudSync] = useState<Date | null>(() => {
    try {
      const s = localStorage.getItem('dulceria_tatao_last_sync');
      return s ? new Date(s) : new Date();
    } catch {
      return new Date();
    }
  });
  const [syncStatusMessage, setSyncStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [autoSyncWarning, setAutoSyncWarning] = useState<{
    active: boolean;
    secondsLeft: number;
  } | null>(null);
  const [isAutoSyncEnabled, setIsAutoSyncEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dulceria_tatao_auto_sync') !== 'false';
    } catch {
      return true;
    }
  });
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState<boolean>(false);
  const [nextAutoSyncTime, setNextAutoSyncTime] = useState<number>(() => Date.now() + 30 * 60 * 1000);

  const setIsAutoSyncEnabled = (enabled: boolean) => {
    setIsAutoSyncEnabledState(enabled);
    try {
      localStorage.setItem('dulceria_tatao_auto_sync', String(enabled));
    } catch (e) {
      console.error(e);
    }
  };

  // Load data from localStorage or default to datos_tatao.json
  const [data, setData] = useState<AppData>(() => {
    let result: AppData;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const normSaved = normalizeData(parsed);
        const init = initialJson as unknown as AppData;
        // Prefer freshly updated file if it contains more records than old cached localStorage
        if ((init.ventas?.length || 0) > (normSaved.ventas?.length || 0)) {
          result = normalizeData(init);
        } else {
          result = normSaved;
        }
      } else {
        result = normalizeData(initialJson as unknown as AppData);
      }
    } catch (e) {
      console.error('Error loading data from localStorage', e);
      result = normalizeData(initialJson as unknown as AppData);
    }

    // Check if separate justificaciones key exists
    try {
      const savedJust = localStorage.getItem('dulceria_tatao_justificaciones');
      if (savedJust) {
        const parsedJust = JSON.parse(savedJust);
        if (Array.isArray(parsedJust) && parsedJust.length > 0) {
          result.justificaciones = parsedJust;
        }
      }
    } catch (e) {
      console.error('Error loading justificaciones', e);
    }

    return result;
  });

  const isHydratedRef = React.useRef<boolean>(false);

  // Save data to localStorage and sync with Cloud SQL PostgreSQL backend
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving data to localStorage', e);
    }

    // Do NOT push unhydrated state back to PostgreSQL on initial render
    if (!isHydratedRef.current) {
      return;
    }

    // Debounced background sync to Cloud SQL PostgreSQL
    const syncTimer = setTimeout(() => {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appData: data }),
      }).catch((err) => {
        // Silently handle offline/network deviations
      });
    }, 1200);

    return () => clearTimeout(syncTimer);
  }, [data]);

  // Initial load from Cloud SQL PostgreSQL to ensure multi-device synchronization
  useEffect(() => {
    let isMounted = true;
    async function hydrateFromPostgres() {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const result = await res.json();
          if (result && result.data && isMounted) {
            const remoteData = normalizeData(result.data);
            const init = initialJson as unknown as AppData;

            // Intelligently select whichever dataset is richer/newer
            const initVentas = init.ventas?.length || 0;
            const remoteVentas = remoteData.ventas?.length || 0;
            const currentVentas = data.ventas?.length || 0;

            let chosen = remoteData;
            if (initVentas > remoteVentas && initVentas >= currentVentas) {
              chosen = normalizeData(init);
              // Update remote with richer init dataset
              fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appData: chosen }),
              }).catch(() => {});
            }

            setData(chosen);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(chosen));
            } catch {}

            const syncDate = new Date();
            setLastCloudSync(syncDate);
            try {
              localStorage.setItem('dulceria_tatao_last_sync', syncDate.toISOString());
            } catch {}
          } else if (result && !result.data) {
            // Seed PostgreSQL with current data on first run
            await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ appData: data }),
            });
          }
        }
      } catch (err) {
        // Fall back gracefully to localStorage
      } finally {
        isHydratedRef.current = true;
      }
    }
    hydrateFromPostgres();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync with Cloud SQL PostgreSQL: pull or push
  const syncWithCloud = async (
    mode: 'pull' | 'push' = 'pull'
  ): Promise<{ success: boolean; message: string }> => {
    setIsSyncing(true);
    try {
      if (mode === 'push') {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appData: data }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const syncDate = new Date();
        setLastCloudSync(syncDate);
        try {
          localStorage.setItem('dulceria_tatao_last_sync', syncDate.toISOString());
        } catch {}
        const msg = `Datos locales guardados en la nube con éxito a las ${syncDate.toLocaleTimeString('es-CU')}.`;
        setSyncStatusMessage({ type: 'success', text: msg });
        setTimeout(() => setSyncStatusMessage(null), 5000);
        return { success: true, message: msg };
      } else {
        // Pull latest from Cloud SQL PostgreSQL
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (result && result.data) {
          const normalized = normalizeData(result.data);
          setData(normalized);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          } catch {}
          const syncDate = new Date();
          setLastCloudSync(syncDate);
          try {
            localStorage.setItem('dulceria_tatao_last_sync', syncDate.toISOString());
          } catch {}
          const vCount = normalized.ventas?.length || 0;
          const pCount = normalized.produccion?.length || 0;
          const gCount = normalized.gastos?.length || 0;
          const msg = `Sincronización con la nube completada: ${vCount} ventas, ${pCount} lotes y ${gCount} gastos al día.`;
          setSyncStatusMessage({ type: 'success', text: msg });
          setTimeout(() => setSyncStatusMessage(null), 5000);
          return { success: true, message: msg };
        } else {
          throw new Error('No se encontraron datos remotos en la base de datos');
        }
      }
    } catch (err: any) {
      const errorMsg = `Error al sincronizar con la nube: ${err.message || 'Error de conexión'}`;
      setSyncStatusMessage({ type: 'error', text: errorMsg });
      setTimeout(() => setSyncStatusMessage(null), 6000);
      return { success: false, message: errorMsg };
    } finally {
      setIsSyncing(false);
      // Reschedule next auto sync for 30 minutes from now
      setNextAutoSyncTime(Date.now() + 30 * 60 * 1000);
    }
  };

  // Postpone scheduled auto-sync (e.g. 10 minutes)
  const postponeAutoSync = (minutes = 10) => {
    setAutoSyncWarning(null);
    const newTarget = Date.now() + minutes * 60 * 1000;
    setNextAutoSyncTime(newTarget);
    setSyncStatusMessage({
      type: 'info',
      text: `Sincronización aplazada ${minutes} minutos. Puedes continuar trabajando.`,
    });
    setTimeout(() => setSyncStatusMessage(null), 4000);
  };

  // Dismiss auto-sync warning and reset for next 30 min cycle
  const dismissAutoSyncWarning = () => {
    setAutoSyncWarning(null);
    setNextAutoSyncTime(Date.now() + 30 * 60 * 1000);
  };

  // Manually test advance warning for demo / verification
  const triggerManualAutoSyncTest = () => {
    setNextAutoSyncTime(Date.now() + 30 * 1000);
    setAutoSyncWarning({ active: true, secondsLeft: 30 });
  };

  // 30-minute Auto-Sync Countdown and Warning logic
  useEffect(() => {
    if (!isAutoSyncEnabled) {
      setAutoSyncWarning(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const msRemaining = nextAutoSyncTime - now;

      // 30 seconds before sync: trigger advance warning
      if (msRemaining <= 30000 && msRemaining > 0) {
        const secondsLeft = Math.max(1, Math.ceil(msRemaining / 1000));
        setAutoSyncWarning({ active: true, secondsLeft });
      } else if (msRemaining <= 0) {
        // Time to sync!
        // Safety check: is user actively typing in an input, textarea, or select?
        const activeTag = document.activeElement?.tagName;
        const isEditing =
          activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

        if (isEditing) {
          // Postpone automatically by 5 minutes to avoid interrupting active typing
          setNextAutoSyncTime(Date.now() + 5 * 60 * 1000);
          setAutoSyncWarning(null);
          setSyncStatusMessage({
            type: 'info',
            text: 'Sincronización aplazada 5 minutos para proteger los datos que estás editando.',
          });
          setTimeout(() => setSyncStatusMessage(null), 5000);
        } else {
          // Smoothly perform auto-sync
          setAutoSyncWarning(null);
          setNextAutoSyncTime(Date.now() + 30 * 60 * 1000);
          syncWithCloud('pull');
        }
      } else {
        // Outside warning window
        if (autoSyncWarning) {
          setAutoSyncWarning(null);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoSyncEnabled, nextAutoSyncTime, autoSyncWarning]);

  // Reconciliation note
  const [reconciliationNote, setReconciliationNote] = useState<string>(() => {
    try {
      return localStorage.getItem(NOTES_KEY) || '';
    } catch {
      return '';
    }
  });

  const saveReconciliationNote = (note: string) => {
    setReconciliationNote(note);
    try {
      localStorage.setItem(NOTES_KEY, note);
    } catch (e) {
      console.error('Error saving note', e);
    }
  };

  // Global Navigation: starts on 'Panel'
  const [currentModule, setCurrentModule] = useState<ModuleName>('Panel');

  // Global Date State: starts on Monday of current week to today
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [fechaDesde, setFechaDesde] = useState<string>(defaultRange.desde);
  const [fechaHasta, setFechaHasta] = useState<string>(defaultRange.hasta);

  const setDateRange = (desde: string, hasta: string) => {
    setFechaDesde(desde);
    setFechaHasta(hasta);
  };

  const applyQuickPreset = (preset: QuickDatePreset) => {
    const range = getQuickRange(preset, data.caja.fechaInicio || '2026-09-21');
    setDateRange(range.desde, range.hasta);
  };

  // ----------------------------------------------------
  // PRODUCCIÓN
  // ----------------------------------------------------
  const addProduccion = (lote: Omit<ProduccionLote, 'id' | 'costo'>) => {
    const prodObj = data.productos.find((p) => p.nombre === lote.producto);
    const precioVigente = prodObj ? getPrecioVigente(prodObj, lote.fecha) : 0;
    const costo = lote.cantidad * precioVigente;
    const newLoteId = `lote-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const newLote: ProduccionLote = {
      ...lote,
      id: newLoteId,
      costo,
    };

    // Auto-create salary expense in gastos
    const pagoUnit = getPagoPorDulce(lote.producto, data.meta);
    const importeSalario = lote.cantidad * pagoUnit;

    const newSalaryGasto: GastoItem = {
      id: `gst-prod-${newLoteId}`,
      fecha: lote.fecha,
      categoria: 'Salarios',
      concepto: `Salario ${lote.producto}`,
      importe: importeSalario,
      formaPago: 'Efectivo',
      tipoSalario: 'Trabajadores',
      loteId: newLoteId,
      generadoPor: 'Producción',
    };

    setData((prev) => ({
      ...prev,
      produccion: [newLote, ...prev.produccion],
      gastos: [newSalaryGasto, ...prev.gastos],
    }));
  };

  const updateProduccion = (id: string, lote: Partial<ProduccionLote>) => {
    setData((prev) => {
      const updatedProduccion = prev.produccion.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...lote };
        const prodObj = prev.productos.find((prod) => prod.nombre === merged.producto);
        const precioVigente = prodObj ? getPrecioVigente(prodObj, merged.fecha) : 0;
        merged.costo = merged.cantidad * precioVigente;
        return merged;
      });

      const targetLote = updatedProduccion.find((p) => p.id === id);

      const updatedGastos = prev.gastos.map((g) => {
        if (g.loteId === id && targetLote) {
          const pagoUnit = getPagoPorDulce(targetLote.producto, prev.meta);
          return {
            ...g,
            fecha: targetLote.fecha,
            concepto: `Salario ${targetLote.producto}`,
            importe: targetLote.cantidad * pagoUnit,
          };
        }
        return g;
      });

      return {
        ...prev,
        produccion: updatedProduccion,
        gastos: updatedGastos,
      };
    });
  };

  const deleteProduccion = (id: string) => {
    setData((prev) => ({
      ...prev,
      produccion: prev.produccion.filter((p) => p.id !== id),
      gastos: prev.gastos.filter((g) => g.loteId !== id),
    }));
  };

  // ----------------------------------------------------
  // VENTAS
  // ----------------------------------------------------
  const getNextValeNumber = (): string => {
    let maxInt = 0;
    data.ventas.forEach((v) => {
      const match = v.vale.match(/^\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (!isNaN(val) && val > maxInt) {
          maxInt = val;
        }
      }
    });
    const nextInt = maxInt + 1;
    return String(nextInt);
  };

  const addVenta = (venta: Omit<VentaVale, 'id' | 'vale'>) => {
    const nextVale = getNextValeNumber();
    const newId = `vnt-${Date.now()}`;
    const cleanCliente = venta.cliente === 'Mostrador / Público general' ? 'Otros' : venta.cliente;

    const newVenta: VentaVale = {
      ...venta,
      id: newId,
      vale: nextVale,
      cliente: cleanCliente,
      formaPago: venta.formaPago || 'Efectivo',
    };

    const matchingFactura: FacturaItem = {
      id: `fac-vale-${nextVale}-${newId}`,
      numero: nextVale,
      cliente: cleanCliente,
      telefono: '',
      ci: '',
      direccion: '',
      fecha: newVenta.fecha,
      periodoVales: newVenta.fecha,
      valesIncluidos: [newId],
      valesDetalle: [
        {
          vale: nextVale,
          fecha: newVenta.fecha,
          detalle: newVenta.lineas.map((l) => `${l.producto} (${l.cantidad})`).join(', '),
          importe: newVenta.importeTotal,
        },
      ],
      productosConsolidados: newVenta.lineas.map((l) => ({
        producto: l.producto,
        cantidad: l.cantidad,
        precioUnitario: l.cantidad > 0 ? l.importe / l.cantidad : 0,
        importe: l.importe,
      })),
      importeTotal: newVenta.importeTotal,
      observaciones: `Factura correspondiente al vale ${nextVale}`,
    };

    setData((prev) => {
      const numericNext = parseInt(nextVale, 10);
      return {
        ...prev,
        meta: {
          ...prev.meta,
          siguienteVale: !isNaN(numericNext) ? numericNext + 1 : prev.meta.siguienteVale,
        },
        ventas: [newVenta, ...prev.ventas],
        facturas: [matchingFactura, ...(prev.facturas || [])],
      };
    });
  };

  const updateVenta = (id: string, patch: Partial<VentaVale>) => {
    setData((prev) => ({
      ...prev,
      ventas: prev.ventas.map((v) => {
        if (v.id !== id) return v;
        const updated = { ...v, ...patch };
        if (updated.cliente === 'Mostrador / Público general') {
          updated.cliente = 'Otros';
        }
        return updated;
      }),
    }));
  };

  const deleteVenta = (id: string) => {
    // Note: prompt specifies "no se reutilizan números al eliminar"
    setData((prev) => ({
      ...prev,
      ventas: prev.ventas.filter((v) => v.id !== id),
    }));
  };

  // ----------------------------------------------------
  // GASTOS
  // ----------------------------------------------------
  const addGasto = (gasto: Omit<GastoItem, 'id'>) => {
    const newId = `gst-${Date.now()}`;
    const newGasto: GastoItem = {
      ...gasto,
      id: newId,
    };
    setData((prev) => ({
      ...prev,
      gastos: [newGasto, ...prev.gastos],
    }));
  };

  const updateGasto = (id: string, patch: Partial<GastoItem>) => {
    setData((prev) => ({
      ...prev,
      gastos: prev.gastos.map((g) => {
        if (g.id !== id) return g;
        // Don't allow changing auto-generated linkage
        if (g.generadoPor) {
          return { ...g, fecha: patch.fecha || g.fecha, importe: patch.importe || g.importe };
        }
        return { ...g, ...patch };
      }),
    }));
  };

  const deleteGasto = (id: string) => {
    setData((prev) => ({
      ...prev,
      gastos: prev.gastos.filter((g) => g.id !== id),
    }));
  };

  // ----------------------------------------------------
  // CAJA & REPARTOS
  // ----------------------------------------------------
  const marcarRepartoPagado = (repartoId: string, fechaPago: string) => {
    setData((prev) => {
      const reparto = prev.repartos.find((r) => r.id === repartoId);
      if (!reparto) return prev;

      const adminExpense: GastoItem = {
        id: `gst-rep-${repartoId}-adm-${Date.now()}`,
        fecha: fechaPago,
        categoria: 'Salarios',
        concepto: 'Salario Administrador',
        importe: reparto.administrador,
        formaPago: 'Efectivo',
        tipoSalario: 'Administrador',
        repartoId: repartoId,
        generadoPor: 'Reparto',
      };

      const tataoExpense: GastoItem = {
        id: `gst-rep-${repartoId}-tat-${Date.now()}`,
        fecha: fechaPago,
        categoria: 'Salarios',
        concepto: 'Salario Tatao',
        importe: reparto.tatao,
        formaPago: 'Efectivo',
        tipoSalario: 'Dueños',
        repartoId: repartoId,
        generadoPor: 'Reparto',
      };

      const carlosExpense: GastoItem = {
        id: `gst-rep-${repartoId}-car-${Date.now()}`,
        fecha: fechaPago,
        categoria: 'Salarios',
        concepto: 'Salario Carlos',
        importe: reparto.carlos,
        formaPago: 'Efectivo',
        tipoSalario: 'Dueños',
        repartoId: repartoId,
        generadoPor: 'Reparto',
      };

      const updatedRepartos = prev.repartos.map((r) =>
        r.id === repartoId ? { ...r, estado: 'Pagado' as const, fechaPago } : r
      );

      return {
        ...prev,
        repartos: updatedRepartos,
        gastos: [adminExpense, tataoExpense, carlosExpense, ...prev.gastos],
      };
    });
  };

  const deshacerRepartoPagado = (repartoId: string) => {
    setData((prev) => {
      const updatedRepartos = prev.repartos.map((r) =>
        r.id === repartoId ? { ...r, estado: 'Pendiente' as const, fechaPago: null } : r
      );
      const filteredGastos = prev.gastos.filter((g) => g.repartoId !== repartoId);
      return {
        ...prev,
        repartos: updatedRepartos,
        gastos: filteredGastos,
      };
    });
  };

  const updateReglasReparto = (fondoPct: number, administradorPct: number, duenos: string[]) => {
    setData((prev) => {
      const newMeta = {
        ...prev.meta,
        reparto: {
          fondoPct,
          administradorPct,
          duenos,
        },
      };

      // Recalculate pending weekly repartos
      const updatedRepartos = prev.repartos.map((r) => {
        if (r.estado === 'Pendiente') {
          const calc = calculateReparto(r.ganancia, fondoPct, administradorPct, duenos.length);
          return {
            ...r,
            administrador: calc.administrador,
            tatao: calc.cadaDueno,
            carlos: calc.cadaDueno,
          };
        }
        return r;
      });

      return {
        ...prev,
        meta: newMeta,
        repartos: updatedRepartos,
      };
    });
  };

  // ----------------------------------------------------
  // ALMACÉN
  // ----------------------------------------------------
  const addAlmacenItem = (item: Omit<AlmacenItem, 'id' | 'codigo' | 'movimientos'>) => {
    const nextNum = data.almacen.length + 1;
    const codigo = `MP-${String(nextNum).padStart(4, '0')}`;
    const newId = `alm-${Date.now()}`;

    const initialMovement = {
      id: `mov-${Date.now()}-init`,
      fecha: item.fechaConteo,
      tipo: 'Entrada' as const,
      cantidad: item.existencia,
      saldoResultante: item.existencia,
      concepto: 'Inventario Inicial',
      comprobante: 'INICIAL',
    };

    const newItem: AlmacenItem = {
      ...item,
      id: newId,
      codigo,
      movimientos: [initialMovement],
    };

    setData((prev) => ({
      ...prev,
      almacen: [newItem, ...prev.almacen],
    }));
  };

  const updateAlmacenItem = (id: string, patch: Partial<AlmacenItem>) => {
    setData((prev) => ({
      ...prev,
      almacen: prev.almacen.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };

  const deleteAlmacenItem = (id: string) => {
    setData((prev) => ({
      ...prev,
      almacen: prev.almacen.filter((a) => a.id !== id),
    }));
  };

  const addMovimientoAlmacen = (
    itemId: string,
    tipo: 'Entrada' | 'Salida',
    cantidad: number,
    concepto: string,
    comprobante = '',
    fecha?: string
  ) => {
    setData((prev) => ({
      ...prev,
      almacen: prev.almacen.map((item) => {
        if (item.id !== itemId) return item;

        const newStock =
          tipo === 'Entrada'
            ? item.existencia + cantidad
            : Math.max(0, item.existencia - cantidad);

        const newMov = {
          id: `mov-${Date.now()}`,
          fecha: fecha || new Date().toISOString().slice(0, 10),
          tipo,
          cantidad,
          saldoResultante: newStock,
          concepto,
          comprobante,
        };

        return {
          ...item,
          existencia: newStock,
          movimientos: [newMov, ...item.movimientos],
        };
      }),
    }));
  };

  const revertirMovimientoAlmacen = (itemId: string, movId: string) => {
    setData((prev) => ({
      ...prev,
      almacen: prev.almacen.map((item) => {
        if (item.id !== itemId) return item;
        const targetMov = item.movimientos.find((m) => m.id === movId);
        if (!targetMov) return item;

        // Revert stock impact
        const newStock =
          targetMov.tipo === 'Entrada'
            ? Math.max(0, item.existencia - targetMov.cantidad)
            : item.existencia + targetMov.cantidad;

        return {
          ...item,
          existencia: newStock,
          movimientos: item.movimientos.filter((m) => m.id !== movId),
        };
      }),
    }));
  };

  // ----------------------------------------------------
  // CLIENTES
  // ----------------------------------------------------
  const addCliente = (cli: Omit<Cliente, 'id'>) => {
    const newId = `cli-${Date.now()}`;
    const cleanNombre = cli.nombre === 'Mostrador / Público general' ? 'Otros' : cli.nombre;
    const newCliente: Cliente = {
      ...cli,
      nombre: cleanNombre,
      id: newId,
    };
    setData((prev) => ({
      ...prev,
      clientes: [...prev.clientes, newCliente],
    }));
  };

  const updateCliente = (id: string, patch: Partial<Cliente>) => {
    setData((prev) => ({
      ...prev,
      clientes: prev.clientes.map((c) => {
        if (c.id !== id) return c;
        const merged = { ...c, ...patch };
        if (merged.nombre === 'Mostrador / Público general') {
          merged.nombre = 'Otros';
        }
        return merged;
      }),
    }));
  };

  const deleteCliente = (id: string) => {
    setData((prev) => ({
      ...prev,
      clientes: prev.clientes.filter((c) => c.id !== id),
    }));
  };

  // ----------------------------------------------------
  // PRODUCTOS & PRECIOS
  // ----------------------------------------------------
  const addProducto = (prod: {
    nombre: string;
    precioVenta: number;
    fechaInicio: string;
    vigenteHasta?: string | null;
  }) => {
    const newId = `prod-${Date.now()}`;
    const newProd: Producto = {
      id: newId,
      nombre: prod.nombre,
      costoUnitario: null,
      precioVigente: prod.precioVenta,
      historicoPrecios: [
        {
          precio: prod.precioVenta,
          desde: prod.fechaInicio,
          hasta: prod.vigenteHasta || null,
        },
      ],
    };
    setData((prev) => ({
      ...prev,
      productos: [...prev.productos, newProd],
    }));
  };

  const updatePrecioProducto = (
    id: string,
    nuevoPrecio: number,
    fechaInicio: string,
    vigenteHasta: string | null = null
  ) => {
    setData((prev) => ({
      ...prev,
      productos: prev.productos.map((prod) => {
        if (prod.id !== id) return prod;

        // Calculate day before fechaInicio for previous hasta
        const startDate = new Date(fechaInicio + 'T12:00:00');
        startDate.setDate(startDate.getDate() - 1);
        const y = startDate.getFullYear();
        const m = String(startDate.getMonth() + 1).padStart(2, '0');
        const d = String(startDate.getDate()).padStart(2, '0');
        const dayBefore = `${y}-${m}-${d}`;

        const updatedHistory = prod.historicoPrecios.map((h) => {
          if (h.hasta === null) {
            return { ...h, hasta: dayBefore };
          }
          return h;
        });

        updatedHistory.push({
          precio: nuevoPrecio,
          desde: fechaInicio,
          hasta: vigenteHasta || null,
        });

        return {
          ...prod,
          precioVigente: nuevoPrecio,
          historicoPrecios: updatedHistory,
        };
      }),
    }));
  };

  const updateCostoUnitario = (id: string, costoUnitario: number | null) => {
    setData((prev) => ({
      ...prev,
      productos: prev.productos.map((p) => (p.id === id ? { ...p, costoUnitario } : p)),
    }));
  };

  const updateParametrosProducto = (
    productoNombre: string,
    pagoTrabajador: number,
    gananciaUnidad: number,
    desde: string
  ) => {
    setData((prev) => {
      const newPagos = {
        ...prev.meta.pagoPorDulceTrabajador,
        [productoNombre]: pagoTrabajador,
      };

      const existingGanancias = prev.meta.gananciaPorUnidad || [];
      const newGananciaEntry = {
        producto: productoNombre,
        desde,
        valor: productoNombre === 'Masas' ? 0 : gananciaUnidad,
      };

      return {
        ...prev,
        meta: {
          ...prev.meta,
          pagoPorDulceTrabajador: newPagos,
          gananciaPorUnidad: [...existingGanancias, newGananciaEntry],
        },
      };
    });
  };

  // ----------------------------------------------------
  // FACTURAS
  // ----------------------------------------------------
  const getNextFacturaNumber = (): string => {
    const list = data.facturas || [];
    let max = 0;
    list.forEach((f) => {
      const match = f.numero.match(/FAC-(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return `FAC-${String(max + 1).padStart(3, '0')}`;
  };

  const addFactura = (factura: Omit<FacturaItem, 'id'>) => {
    const newId = `fac-${Date.now()}`;
    const newFactura: FacturaItem = {
      ...factura,
      id: newId,
    };
    setData((prev) => ({
      ...prev,
      facturas: [newFactura, ...(prev.facturas || [])],
    }));
  };

  const deleteFactura = (id: string) => {
    setData((prev) => ({
      ...prev,
      facturas: (prev.facturas || []).filter((f) => f.id !== id),
    }));
  };

  // ----------------------------------------------------
  // JUSTIFICACIONES DE CONCILIACIÓN
  // ----------------------------------------------------
  const addJustificacion = (fecha: string, nota: string, producto?: string) => {
    const newId = `just-${Date.now()}`;
    const newJust: JustificacionDiferencia = {
      id: newId,
      fecha,
      producto: producto || undefined,
      nota,
      fechaRegistro: new Date().toISOString(),
    };

    setData((prev) => {
      const existing = prev.justificaciones || [];
      const filtered = existing.filter(
        (j) => !(j.fecha === fecha && (j.producto || '') === (producto || ''))
      );
      const updated = [newJust, ...filtered];
      try {
        localStorage.setItem('dulceria_tatao_justificaciones', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving justificaciones', e);
      }
      return {
        ...prev,
        justificaciones: updated,
      };
    });
  };

  const updateJustificacion = (id: string, nota: string) => {
    setData((prev) => {
      const updated = (prev.justificaciones || []).map((j) =>
        j.id === id ? { ...j, nota, fechaRegistro: new Date().toISOString() } : j
      );
      try {
        localStorage.setItem('dulceria_tatao_justificaciones', JSON.stringify(updated));
      } catch (e) {
        console.error('Error updating justificaciones', e);
      }
      return { ...prev, justificaciones: updated };
    });
  };

  const deleteJustificacion = (id: string) => {
    setData((prev) => {
      const updated = (prev.justificaciones || []).filter((j) => j.id !== id);
      try {
        localStorage.setItem('dulceria_tatao_justificaciones', JSON.stringify(updated));
      } catch (e) {
        console.error('Error deleting justificacion', e);
      }
      return { ...prev, justificaciones: updated };
    });
  };

  // ----------------------------------------------------
  // SUBMENÚ 1: MATERIALES (RECETAS)
  // ----------------------------------------------------
  const addMaterialReceta = (mat: Omit<MaterialReceta, 'id'>) => {
    const newId = `mat-${Date.now()}`;
    const newMat: MaterialReceta = {
      ...mat,
      id: newId,
    };
    setData((prev) => ({
      ...prev,
      materialesReceta: [newMat, ...(prev.materialesReceta || [])],
    }));
  };

  const updateMaterialReceta = (id: string, patch: Partial<MaterialReceta>) => {
    setData((prev) => ({
      ...prev,
      materialesReceta: (prev.materialesReceta || []).map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    }));
  };

  const deleteMaterialReceta = (id: string) => {
    setData((prev) => ({
      ...prev,
      materialesReceta: (prev.materialesReceta || []).filter((m) => m.id !== id),
    }));
  };

  // ----------------------------------------------------
  // SUBMENÚ 2: RECETAS
  // ----------------------------------------------------
  const addReceta = (rec: Omit<Receta, 'id'>) => {
    const newId = `rec-${Date.now()}`;
    const newRec: Receta = {
      ...rec,
      id: newId,
      fechaCreacion: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      recetas: [newRec, ...(prev.recetas || [])],
    }));
  };

  const updateReceta = (id: string, patch: Partial<Receta>) => {
    setData((prev) => ({
      ...prev,
      recetas: (prev.recetas || []).map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    }));
  };

  const deleteReceta = (id: string) => {
    setData((prev) => ({
      ...prev,
      recetas: (prev.recetas || []).filter((r) => r.id !== id),
    }));
  };

  // ----------------------------------------------------
  // AJUSTES: USUARIOS AUTORIZADOS (GMAIL / CUENTAS)
  // ----------------------------------------------------
  const addUsuarioAutorizado = (usr: Omit<UsuarioAutorizado, 'id' | 'fechaAgregado'>) => {
    const newId = `usr-${Date.now()}`;
    const newUsr: UsuarioAutorizado = {
      ...usr,
      id: newId,
      fechaAgregado: new Date().toISOString().slice(0, 10),
    };
    setData((prev) => ({
      ...prev,
      usuariosAutorizados: [...(prev.usuariosAutorizados || []), newUsr],
    }));
  };

  const updateUsuarioAutorizado = (id: string, patch: Partial<UsuarioAutorizado>) => {
    setData((prev) => ({
      ...prev,
      usuariosAutorizados: (prev.usuariosAutorizados || []).map((u) =>
        u.id === id ? { ...u, ...patch } : u
      ),
    }));
  };

  const deleteUsuarioAutorizado = (id: string) => {
    setData((prev) => ({
      ...prev,
      usuariosAutorizados: (prev.usuariosAutorizados || []).filter((u) => u.id !== id),
    }));
  };

  // Exportar respaldo de datos compatible con localStorage y Vercel
  const exportBackup = () => {
    try {
      const dump: Record<string, string> = {
        [STORAGE_KEY]: JSON.stringify(data),
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo-datos-tatao-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exportando respaldo', e);
    }
  };

  // Importar y aplicar respaldo de datos
  const importBackup = (backupContent: string): boolean => {
    try {
      const parsed = JSON.parse(backupContent);
      let targetData: AppData | null = null;

      if (parsed && typeof parsed === 'object') {
        if (parsed[STORAGE_KEY]) {
          targetData = typeof parsed[STORAGE_KEY] === 'string'
            ? JSON.parse(parsed[STORAGE_KEY])
            : parsed[STORAGE_KEY];
        } else if (parsed.meta && parsed.ventas) {
          targetData = parsed;
        }
      }

      if (targetData) {
        const normalized = normalizeData(targetData);
        setData(normalized);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        } catch (e) {
          console.error('Error guardando en localStorage', e);
        }

        // Sincronizar de inmediato con PostgreSQL
        fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appData: normalized }),
        }).catch((err) => console.warn('Could not sync imported backup to Cloud SQL:', err));

        return true;
      }
      return false;
    } catch (e) {
      console.error('Error importando respaldo', e);
      return false;
    }
  };

  // Contador global de alertas pendientes
  const pendingAlertsCount = useMemo(() => {
    const conc = calculateReconciliation(
      data.produccion,
      data.ventas,
      data.justificaciones || []
    );
    return conc.totalPendientes;
  }, [data.produccion, data.ventas, data.justificaciones]);

  const value = {
    data,
    currentModule,
    setCurrentModule,
    fechaDesde,
    fechaHasta,
    setDateRange,
    applyQuickPreset,
    reconciliationNote,
    saveReconciliationNote,

    pendingAlertsCount,

    justificaciones: data.justificaciones || [],
    addJustificacion,
    updateJustificacion,
    deleteJustificacion,

    addProduccion,
    updateProduccion,
    deleteProduccion,

    getNextValeNumber,
    addVenta,
    updateVenta,
    deleteVenta,

    addGasto,
    updateGasto,
    deleteGasto,

    marcarRepartoPagado,
    deshacerRepartoPagado,
    updateReglasReparto,

    addAlmacenItem,
    updateAlmacenItem,
    deleteAlmacenItem,
    addMovimientoAlmacen,
    revertirMovimientoAlmacen,

    addCliente,
    updateCliente,
    deleteCliente,

    addProducto,
    updatePrecioProducto,
    updateCostoUnitario,
    updateParametrosProducto,

    addMaterialReceta,
    updateMaterialReceta,
    deleteMaterialReceta,

    addReceta,
    updateReceta,
    deleteReceta,

    usuariosAutorizados: data.usuariosAutorizados || [],
    addUsuarioAutorizado,
    updateUsuarioAutorizado,
    deleteUsuarioAutorizado,

    getNextFacturaNumber,
    addFactura,
    deleteFactura,

    importBackup,
    exportBackup,

    // Cloud Sync & Auto-sync
    isSyncing,
    lastCloudSync,
    syncStatusMessage,
    setSyncStatusMessage,
    autoSyncWarning,
    isAutoSyncEnabled,
    setIsAutoSyncEnabled,
    isCloudSyncModalOpen,
    setIsCloudSyncModalOpen,
    syncWithCloud,
    postponeAutoSync,
    dismissAutoSyncWarning,
    triggerManualAutoSyncTest,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
