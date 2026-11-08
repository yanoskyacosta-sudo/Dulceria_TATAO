import React from 'react';
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
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface MenuItem {
  name: ModuleName;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_ITEMS: MenuItem[] = [
  { name: 'Panel', icon: LayoutDashboard },
  { name: 'Producción', icon: Factory },
  { name: 'Ventas', icon: ShoppingCart },
  { name: 'Facturación', icon: FileText },
  { name: 'Gastos', icon: CreditCard },
  { name: 'Caja', icon: Landmark },
  { name: 'Almacén', icon: Package },
  { name: 'Precios', icon: Tag },
  { name: 'Clientes', icon: Users },
  { name: 'Productos', icon: Cake },
  { name: 'Alertas', icon: Bell },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, onCloseMobile }) => {
  const { currentModule, setCurrentModule } = useApp();

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
          {MENU_ITEMS.map((item) => {
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
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-400 text-center">
          Dulcería TATAO &copy; 2026
        </div>
      </aside>
    </>
  );
};
