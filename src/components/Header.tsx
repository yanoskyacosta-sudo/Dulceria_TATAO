import React from 'react';
import { useApp } from '../context/AppContext';
import { Menu } from 'lucide-react';

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
  Alertas: {
    title: 'ALERTAS',
    desc: 'Control de conciliaciones, mermas e incidencias operativas',
  },
};

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  row1RightAction,
  row2Content,
}) => {
  const { currentModule } = useApp();
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

        {row1RightAction && (
          <div className="flex items-center gap-2 shrink-0">
            {row1RightAction}
          </div>
        )}
      </div>

      {/* Renglón 2: Filtros específicos del módulo + botón de acción principal verde. Si no tiene filtros, se oculta */}
      {row2Content && (
        <div className="px-3 sm:px-4 py-2 bg-slate-50 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 text-xs">
          {row2Content}
        </div>
      )}
    </header>
  );
};
