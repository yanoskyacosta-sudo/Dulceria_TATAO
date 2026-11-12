import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ModuleName } from '../types';
import {
  LayoutDashboard,
  Factory,
  ShoppingCart,
  FileText,
  CreditCard,
  Landmark,
  Package,
  Tag,
  Users,
  Cake,
  Bell,
  X,
  Settings,
  ChevronDown,
  ChevronRight,
  Boxes,
  BookOpen,
  UserCheck,
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface MenuItem {
  name: ModuleName;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_MENU_ITEMS: MenuItem[] = [
  { name: 'Panel', icon: LayoutDashboard },
  { name: 'Producción', icon: Factory },
  { name: 'Ventas', icon: ShoppingCart },
  { name: 'Facturación', icon: FileText },
  { name: 'Gastos', icon: CreditCard },
  { name: 'Caja', icon: Landmark },
  { name: 'Almacén', icon: Package },
  { name: 'Precios', icon: Tag },
  { name: 'Clientes', icon: Users },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, onCloseMobile }) => {
  const { currentModule, setCurrentModule, pendingAlertsCount } = useApp();

  // Track expanded state of collapsible menus
  const isProductosActive =
    currentModule === 'Productos' ||
    currentModule === 'Materiales' ||
    currentModule === 'Recetas';

  const isAjustesActive =
    currentModule === 'Ajustes' ||
    currentModule === 'Usuarios' ||
    currentModule === 'Alertas';

  const [isProductosOpen, setIsProductosOpen] = useState(isProductosActive);
  const [isAjustesOpen, setIsAjustesOpen] = useState(isAjustesActive);

  // Auto-expand if active module changes into one of their submodules
  useEffect(() => {
    if (isProductosActive) setIsProductosOpen(true);
  }, [isProductosActive]);

  useEffect(() => {
    if (isAjustesActive) setIsAjustesOpen(true);
  }, [isAjustesActive]);

  const handleSelect = (moduleName: ModuleName) => {
    setCurrentModule(moduleName);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-500 text-slate-950 font-black text-sm tracking-tighter shadow-sm">
              DT
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-wide text-white leading-tight">
                Dulcería TATAO
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Contabilidad y Control
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {PRIMARY_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentModule === item.name;

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSelect(item.name)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-slate-950' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}

          {/* Menú Desplegable: PRODUCTOS (con Submenús: Productos, Materiales, Recetas) */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => {
                if (!isProductosOpen) {
                  setIsProductosOpen(true);
                  if (!isProductosActive) handleSelect('Productos');
                } else {
                  setIsProductosOpen(false);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                isProductosActive && !isProductosOpen
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : isProductosActive
                  ? 'bg-slate-800/80 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Cake
                  className={`w-4 h-4 shrink-0 ${
                    isProductosActive && !isProductosOpen ? 'text-slate-950' : 'text-amber-400'
                  }`}
                />
                <span className="truncate">Productos</span>
              </div>
              {isProductosOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Submenús de Productos */}
            {isProductosOpen && (
              <div className="ml-4 pl-2 border-l border-slate-700/80 mt-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleSelect('Productos')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    currentModule === 'Productos'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Cake className="w-3.5 h-3.5 shrink-0" />
                  <span>Productos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelect('Materiales')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    currentModule === 'Materiales'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5 shrink-0" />
                  <span>Materiales</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelect('Recetas')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    currentModule === 'Recetas'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Recetas</span>
                </button>
              </div>
            )}
          </div>

          {/* Menú Desplegable: AJUSTES (con Submenús: Usuarios, Alertas) */}
          <div className="pt-1 mt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (!isAjustesOpen) {
                  setIsAjustesOpen(true);
                  if (!isAjustesActive) handleSelect('Usuarios');
                } else {
                  setIsAjustesOpen(false);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                isAjustesActive && !isAjustesOpen
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : isAjustesActive
                  ? 'bg-slate-800/80 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings
                  className={`w-4 h-4 shrink-0 ${
                    isAjustesActive && !isAjustesOpen ? 'text-slate-950' : 'text-amber-400'
                  }`}
                />
                <span className="truncate">Ajustes</span>
              </div>
              <div className="flex items-center gap-1.5">
                {pendingAlertsCount > 0 && !isAjustesOpen && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                    {pendingAlertsCount}
                  </span>
                )}
                {isAjustesOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Submenús de Ajustes */}
            {isAjustesOpen && (
              <div className="ml-4 pl-2 border-l border-slate-700/80 mt-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleSelect('Usuarios')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    currentModule === 'Usuarios' || currentModule === 'Ajustes'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Usuarios</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelect('Alertas')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    currentModule === 'Alertas'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-3.5 h-3.5 shrink-0" />
                    <span>Alertas</span>
                  </div>
                  {pendingAlertsCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        currentModule === 'Alertas'
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-amber-500 text-slate-950 animate-pulse'
                      }`}
                    >
                      {pendingAlertsCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-400 text-center">
          Dulcería TATAO &copy; 2026
        </div>
      </aside>
    </>
  );
};
