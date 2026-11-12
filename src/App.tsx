import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ProductionView } from './components/ProductionView';
import { SalesView } from './components/SalesView';
import { BillingView } from './components/BillingView';
import { ExpensesView } from './components/ExpensesView';
import { CashView } from './components/CashView';
import { WarehouseView } from './components/WarehouseView';
import { PricesView } from './components/PricesView';
import { CustomersView } from './components/CustomersView';
import { ProductsView } from './components/ProductsView';
import { AlertsView } from './components/AlertsView';
import { UsersView } from './components/UsersView';
import { AlertReminder } from './components/AlertReminder';
import { SyncNotification } from './components/SyncNotification';
import { CloudSyncModal } from './components/CloudSyncModal';

const MainLayout: React.FC = () => {
  const { currentModule } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const renderModuleView = () => {
    switch (currentModule) {
      case 'Panel':
        return <DashboardView />;
      case 'Producción':
        return <ProductionView />;
      case 'Ventas':
        return <SalesView />;
      case 'Facturación':
        return <BillingView />;
      case 'Gastos':
        return <ExpensesView />;
      case 'Caja':
        return <CashView />;
      case 'Almacén':
        return <WarehouseView />;
      case 'Precios':
        return <PricesView />;
      case 'Clientes':
        return <CustomersView />;
      case 'Productos':
      case 'Materiales':
      case 'Recetas':
        return <ProductsView />;
      case 'Alertas':
        return <AlertsView />;
      case 'Usuarios':
      case 'Ajustes':
        return <UsersView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Sidebar (fijo en desktop, drawer en móvil) */}
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-200">
        <Header onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />

        <main className="flex-1 p-2 sm:p-3.5 max-w-7xl w-full mx-auto">
          {renderModuleView()}
        </main>

        {/* Floating and Periodic Alert Reminder */}
        <AlertReminder />

        {/* Notificaciones y Aviso Previo de Sincronización Automática */}
        <SyncNotification />

        {/* Modal de Configuración y Sincronización en la Nube */}
        <CloudSyncModal />

        <footer className="py-2.5 px-4 bg-white border-t border-gray-200 text-center text-xs text-gray-500 font-medium">
          Dulcería TATAO &copy; 2026
        </footer>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </AuthProvider>
  );
}
