import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatNumber, formatDate } from '../lib/calculations';
import { toISODate } from '../utils/dateUtils';
import { Producto, MaterialReceta, Receta, IngredienteReceta } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { useEscToClose } from '../hooks/useEscToClose';
import {
  Plus,
  Edit2,
  History,
  CheckCircle,
  Package,
  BookOpen,
  Cake,
  Trash2,
  Search,
  Layers,
  ArrowRight,
  Calculator,
  Percent,
  TrendingUp,
  Coins,
} from 'lucide-react';

type SubMenuTab = 'dulces' | 'materiales' | 'recetas';

// Helper to calculate portion cost with intelligent unit conversion
function calculatePortionCost(
  materialPrice: number,
  materialPackageSize: number,
  materialUnit: string,
  portionQuantity: number,
  portionUnit: string
): number {
  if (materialPackageSize <= 0 || materialPrice <= 0 || portionQuantity <= 0) return 0;

  const matUnit = materialUnit.trim().toLowerCase();
  const porUnit = portionUnit.trim().toLowerCase();

  // Same unit directly
  if (matUnit === porUnit) {
    return (portionQuantity / materialPackageSize) * materialPrice;
  }

  // Weight conversions: kg <-> g <-> lb
  if (matUnit === 'kg' && porUnit === 'g') {
    const portionInKg = portionQuantity / 1000;
    return (portionInKg / materialPackageSize) * materialPrice;
  }
  if (matUnit === 'g' && porUnit === 'kg') {
    const portionInG = portionQuantity * 1000;
    return (portionInG / materialPackageSize) * materialPrice;
  }
  if (matUnit === 'kg' && (porUnit === 'lb' || porUnit === 'libras' || porUnit === 'libra')) {
    const portionInKg = portionQuantity * 0.46; // Cuban pound standard
    return (portionInKg / materialPackageSize) * materialPrice;
  }
  if ((matUnit === 'lb' || matUnit === 'libras' || matUnit === 'libra') && porUnit === 'g') {
    const portionInLb = portionQuantity / 460;
    return (portionInLb / materialPackageSize) * materialPrice;
  }

  // Volume conversions: L <-> ml
  if (
    (matUnit === 'l' || matUnit === 'litro' || matUnit === 'litros') &&
    (porUnit === 'ml' || porUnit === 'mililitros')
  ) {
    const portionInL = portionQuantity / 1000;
    return (portionInL / materialPackageSize) * materialPrice;
  }
  if (matUnit === 'ml' && (porUnit === 'l' || porUnit === 'litro' || porUnit === 'litros')) {
    const portionInMl = portionQuantity * 1000;
    return (portionInMl / materialPackageSize) * materialPrice;
  }

  // Default proportional calculation
  return (portionQuantity / materialPackageSize) * materialPrice;
}

export const ProductsView: React.FC = () => {
  const {
    data,
    currentModule,
    addProducto,
    updatePrecioProducto,
    addMaterialReceta,
    updateMaterialReceta,
    deleteMaterialReceta,
    addReceta,
    updateReceta,
    deleteReceta,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SubMenuTab>(() => {
    if (currentModule === 'Materiales') return 'materiales';
    if (currentModule === 'Recetas') return 'recetas';
    return 'dulces';
  });

  // Keep activeTab in sync with sidebar navigation
  useEffect(() => {
    if (currentModule === 'Materiales') setActiveTab('materiales');
    else if (currentModule === 'Recetas') setActiveTab('recetas');
    else if (currentModule === 'Productos') setActiveTab('dulces');
  }, [currentModule]);

  useEscToClose(() => {
    if (viewingReceta) setViewingReceta(null);
    else if (historyModalProd) setHistoryModalProd(null);
    else if (isAddQtyMiniModalOpen) setIsAddQtyMiniModalOpen(false);
    else if (isRecetaModalOpen) setIsRecetaModalOpen(false);
    else if (isMaterialModalOpen) setIsMaterialModalOpen(false);
    else if (isNewProdModalOpen) setIsNewProdModalOpen(false);
  });

  // ==========================================
  // TAB 1: DULCES / PRODUCTOS TERMINADOS STATE
  // ==========================================
  const [isNewProdModalOpen, setIsNewProdModalOpen] = useState<boolean>(false);
  const [newNombre, setNewNombre] = useState<string>('');
  const [newPrecio, setNewPrecio] = useState<string>('');
  const [newFechaInicio, setNewFechaInicio] = useState<string>(toISODate(new Date()));
  const [newVigenteHasta, setNewVigenteHasta] = useState<string>('');

  const [editingPrecioProd, setEditingPrecioProd] = useState<Producto | null>(null);
  const [nuevoPrecioInput, setNuevoPrecioInput] = useState<string>('');
  const [nuevoFechaInicio, setNuevoFechaInicio] = useState<string>(toISODate(new Date()));
  const [historyModalProd, setHistoryModalProd] = useState<Producto | null>(null);

  // ==========================================
  // TAB 2: SUBMENÚ MATERIALES STATE
  // ==========================================
  const [searchMaterial, setSearchMaterial] = useState<string>('');
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState<boolean>(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [matNombre, setMatNombre] = useState<string>('');
  const [matPrecio, setMatPrecio] = useState<string>('');
  const [matContenido, setMatContenido] = useState<string>('');
  const [matUnidad, setMatUnidad] = useState<string>('Kg');
  const [matUnidadCustom, setMatUnidadCustom] = useState<string>('');
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null);

  // ==========================================
  // TAB 3: SUBMENÚ RECETAS STATE
  // ==========================================
  const [searchReceta, setSearchReceta] = useState<string>('');
  const [isRecetaModalOpen, setIsRecetaModalOpen] = useState<boolean>(false);
  const [editingRecetaId, setEditingRecetaId] = useState<string | null>(null);
  const [recetaNombre, setRecetaNombre] = useState<string>('');
  const [recetaNotas, setRecetaNotas] = useState<string>('');
  const [recetaUnidadesRinde, setRecetaUnidadesRinde] = useState<string>('100');
  const [recetaPorcentajeAdicional, setRecetaPorcentajeAdicional] = useState<string>('20');
  const [recetaPorcentajeBeneficio, setRecetaPorcentajeBeneficio] = useState<string>('30');
  const [recetaIngredientes, setRecetaIngredientes] = useState<IngredienteReceta[]>([]);
  const [deletingRecetaId, setDeletingRecetaId] = useState<string | null>(null);
  const [viewingReceta, setViewingReceta] = useState<Receta | null>(null);

  // Mini-modal "Añadir Cantidades" de Material a la Receta
  const [isAddQtyMiniModalOpen, setIsAddQtyMiniModalOpen] = useState<boolean>(false);
  const [miniSearchMaterial, setMiniSearchMaterial] = useState<string>('');
  const [selectedMatForRecipe, setSelectedMatForRecipe] = useState<MaterialReceta | null>(null);
  const [portionQtyInput, setPortionQtyInput] = useState<string>('');
  const [portionUnitInput, setPortionUnitInput] = useState<string>('Kg');

  // Materials list from AppContext
  const materiales = useMemo(() => {
    return data.materialesReceta || [];
  }, [data.materialesReceta]);

  const recetas = useMemo(() => {
    return data.recetas || [];
  }, [data.recetas]);

  // Filtered materials
  const filteredMateriales = useMemo(() => {
    if (!searchMaterial.trim()) return materiales;
    const q = searchMaterial.toLowerCase();
    return materiales.filter(
      (m) => m.nombre.toLowerCase().includes(q) || m.unidadMedida.toLowerCase().includes(q)
    );
  }, [materiales, searchMaterial]);

  // Filtered recetas
  const filteredRecetas = useMemo(() => {
    if (!searchReceta.trim()) return recetas;
    const q = searchReceta.toLowerCase();
    return recetas.filter((r) => r.nombre.toLowerCase().includes(q));
  }, [recetas, searchReceta]);

  // ==========================================
  // DULCES HANDLERS
  // ==========================================
  const handleOpenNewProd = () => {
    setNewNombre('');
    setNewPrecio('');
    setNewFechaInicio(toISODate(new Date()));
    setNewVigenteHasta('');
    setIsNewProdModalOpen(true);
  };

  const handleSaveNewProd = (e: React.FormEvent) => {
    e.preventDefault();
    const pVal = parseFloat(newPrecio);
    if (!newNombre.trim() || isNaN(pVal) || pVal <= 0) return;

    addProducto({
      nombre: newNombre.trim(),
      precioVenta: pVal,
      fechaInicio: newFechaInicio || toISODate(new Date()),
      vigenteHasta: newVigenteHasta.trim() || null,
    });
    setIsNewProdModalOpen(false);
  };

  const handleOpenUpdatePrecio = (prod: Producto) => {
    setEditingPrecioProd(prod);
    setNuevoPrecioInput(String(prod.precioVigente));
    setNuevoFechaInicio(toISODate(new Date()));
  };

  const handleSaveUpdatePrecio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrecioProd) return;
    const pVal = parseFloat(nuevoPrecioInput);
    if (isNaN(pVal) || pVal <= 0) return;

    updatePrecioProducto(editingPrecioProd.id, pVal, nuevoFechaInicio || toISODate(new Date()));
    setEditingPrecioProd(null);
  };

  // ==========================================
  // MATERIALES HANDLERS
  // ==========================================
  const handleOpenNewMaterial = () => {
    setEditingMaterialId(null);
    setMatNombre('');
    setMatPrecio('');
    setMatContenido('');
    setMatUnidad('Kg');
    setMatUnidadCustom('');
    setIsMaterialModalOpen(true);
  };

  const handleOpenEditMaterial = (m: MaterialReceta) => {
    setEditingMaterialId(m.id);
    setMatNombre(m.nombre);
    setMatPrecio(String(m.precio));
    setMatContenido(String(m.contenidoTotal));
    const standardUnits = ['Unidades', 'Kg', 'g', 'L', 'ml'];
    if (standardUnits.includes(m.unidadMedida)) {
      setMatUnidad(m.unidadMedida);
      setMatUnidadCustom('');
    } else {
      setMatUnidad('Otra');
      setMatUnidadCustom(m.unidadMedida);
    }
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const prNum = parseFloat(matPrecio);
    const contNum = parseFloat(matContenido);
    if (!matNombre.trim() || isNaN(prNum) || prNum <= 0 || isNaN(contNum) || contNum <= 0) return;

    const finalUnit = matUnidad === 'Otra' ? matUnidadCustom.trim() || 'Unidad' : matUnidad;

    if (editingMaterialId) {
      updateMaterialReceta(editingMaterialId, {
        nombre: matNombre.trim(),
        precio: prNum,
        contenidoTotal: contNum,
        unidadMedida: finalUnit,
      });
    } else {
      addMaterialReceta({
        nombre: matNombre.trim(),
        precio: prNum,
        contenidoTotal: contNum,
        unidadMedida: finalUnit,
      });
    }
    setIsMaterialModalOpen(false);
  };

  // ==========================================
  // RECETAS HANDLERS
  // ==========================================
  const handleOpenNewReceta = () => {
    setEditingRecetaId(null);
    setRecetaNombre('');
    setRecetaNotas('');
    setRecetaUnidadesRinde('100');
    setRecetaPorcentajeAdicional('20');
    setRecetaPorcentajeBeneficio('30');
    setRecetaIngredientes([]);
    setIsRecetaModalOpen(true);
  };

  const handleOpenEditReceta = (r: Receta) => {
    setEditingRecetaId(r.id);
    setRecetaNombre(r.nombre);
    setRecetaNotas(r.notas || r.observaciones || '');
    setRecetaUnidadesRinde(String(r.unidadesRinde || 100));
    setRecetaPorcentajeAdicional(String(r.porcentajeAdicionalCostos ?? 20));
    setRecetaPorcentajeBeneficio(String(r.porcentajeBeneficioEsperado ?? 30));
    setRecetaIngredientes([...r.ingredientes]);
    setIsRecetaModalOpen(true);
  };

  // Open mini-modal to pick a material and quantity
  const handleOpenAddQtyMiniModal = () => {
    setMiniSearchMaterial('');
    setSelectedMatForRecipe(materiales[0] || null);
    setPortionQtyInput('');
    setPortionUnitInput(materiales[0]?.unidadMedida || 'Kg');
    setIsAddQtyMiniModalOpen(true);
  };

  const handleSelectMaterialInMiniModal = (mat: MaterialReceta) => {
    setSelectedMatForRecipe(mat);
    setPortionQtyInput('');
    setPortionUnitInput(mat.unidadMedida);
  };

  // Calculated portion cost in mini-modal
  const livePortionCost = useMemo(() => {
    if (!selectedMatForRecipe) return 0;
    const qty = parseFloat(portionQtyInput);
    if (isNaN(qty) || qty <= 0) return 0;

    return calculatePortionCost(
      selectedMatForRecipe.precio,
      selectedMatForRecipe.contenidoTotal,
      selectedMatForRecipe.unidadMedida,
      qty,
      portionUnitInput
    );
  }, [selectedMatForRecipe, portionQtyInput, portionUnitInput]);

  const handleAddPortionToRecipe = () => {
    if (!selectedMatForRecipe) return;
    const qty = parseFloat(portionQtyInput);
    if (isNaN(qty) || qty <= 0) return;

    const newIngrediente: IngredienteReceta = {
      id: `ing-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      materialId: selectedMatForRecipe.id,
      materialNombre: selectedMatForRecipe.nombre,
      cantidad: qty,
      unidadMedida: portionUnitInput,
      costoPorcion: livePortionCost,
    };

    setRecetaIngredientes((prev) => [...prev, newIngrediente]);
    setIsAddQtyMiniModalOpen(false);
  };

  const handleRemoveIngrediente = (id: string) => {
    setRecetaIngredientes((prev) => prev.filter((i) => i.id !== id));
  };

  // Cost calculations for recipes
  const costoIngredientes = useMemo(() => {
    return recetaIngredientes.reduce((sum, item) => sum + item.costoPorcion, 0);
  }, [recetaIngredientes]);

  const unidadesRindeNum = useMemo(() => {
    const val = parseFloat(recetaUnidadesRinde);
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [recetaUnidadesRinde]);

  const pctAdicionalNum = useMemo(() => {
    const val = parseFloat(recetaPorcentajeAdicional);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [recetaPorcentajeAdicional]);

  const pctBeneficioNum = useMemo(() => {
    const val = parseFloat(recetaPorcentajeBeneficio);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [recetaPorcentajeBeneficio]);

  // Costo Adicional sobre costos indirectos (mano de obra, agua, electricidad, etc)
  const costoAdicional = useMemo(() => {
    return costoIngredientes * (pctAdicionalNum / 100);
  }, [costoIngredientes, pctAdicionalNum]);

  // Costo Total acumulado
  const totalCostoReceta = useMemo(() => {
    return costoIngredientes + costoAdicional;
  }, [costoIngredientes, costoAdicional]);

  // Costo Unitario por dulce producido
  const costoUnitarioPorDulce = useMemo(() => {
    if (unidadesRindeNum <= 0) return 0;
    return totalCostoReceta / unidadesRindeNum;
  }, [totalCostoReceta, unidadesRindeNum]);

  // Beneficio esperado por dulce
  const beneficioEsperadoPorDulce = useMemo(() => {
    return costoUnitarioPorDulce * (pctBeneficioNum / 100);
  }, [costoUnitarioPorDulce, pctBeneficioNum]);

  // Precio de venta sugerido por dulce
  const precioSugeridoUnitario = useMemo(() => {
    return costoUnitarioPorDulce + beneficioEsperadoPorDulce;
  }, [costoUnitarioPorDulce, beneficioEsperadoPorDulce]);

  const handleSaveReceta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recetaNombre.trim() || recetaIngredientes.length === 0) return;

    const payload = {
      nombre: recetaNombre.trim(),
      observaciones: recetaNotas.trim(),
      notas: recetaNotas.trim(),
      ingredientes: recetaIngredientes,
      costoIngredientes,
      unidadesRinde: unidadesRindeNum,
      porcentajeAdicionalCostos: pctAdicionalNum,
      porcentajeBeneficioEsperado: pctBeneficioNum,
      costoTotal: totalCostoReceta,
      costoUnitario: costoUnitarioPorDulce,
      precioSugeridoUnitario,
    };

    if (editingRecetaId) {
      updateReceta(editingRecetaId, payload);
    } else {
      addReceta(payload);
    }
    setIsRecetaModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Sub-navegación: 3 Submenús (Productos, Materiales, Recetas) sin números */}
      <div className="bg-white border border-gray-200 rounded-lg p-1.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('dulces')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'dulces'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-slate-100'
            }`}
          >
            <Cake className="w-4 h-4" />
            <span>Productos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/70 text-gray-800">
              {data.productos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('materiales')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'materiales'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Materiales</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/70 text-gray-800">
              {materiales.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recetas')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'recetas'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Recetas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/70 text-gray-800">
              {recetas.length}
            </span>
          </button>
        </div>

        {/* Action Button depending on active tab */}
        <div>
          {activeTab === 'dulces' && (
            <button
              type="button"
              onClick={handleOpenNewProd}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Dulce</span>
            </button>
          )}

          {activeTab === 'materiales' && (
            <button
              type="button"
              onClick={handleOpenNewMaterial}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Material</span>
            </button>
          )}

          {activeTab === 'recetas' && (
            <button
              type="button"
              onClick={handleOpenNewReceta}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Receta</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: DULCES TERMINADOS Y PRECIOS VIGENTES              */}
      {/* ========================================================= */}
      {activeTab === 'dulces' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <th className="py-2 px-3 w-12 text-center">No.</th>
                  <th className="py-2 px-3">Nombre de producto</th>
                  <th className="py-2 px-3 text-right w-36">Precio de venta</th>
                  <th className="py-2 px-3 text-center w-32">Fecha de inicio</th>
                  <th className="py-2 px-3 text-center w-32">Vigente hasta</th>
                  <th className="py-2 px-3 text-center w-36">Histórico de precios</th>
                  <th className="py-2 px-3 text-center w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.productos.map((prod, index) => {
                  const activeRecord =
                    prod.historicoPrecios.find((h) => h.hasta === null) ||
                    prod.historicoPrecios[prod.historicoPrecios.length - 1];

                  const fechaInicio = activeRecord?.desde || '—';
                  const fechaHasta = activeRecord?.hasta;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-900">{prod.nombre}</td>
                      <td className="py-2 px-3 text-right">
                        <span className="font-black text-emerald-800 text-sm">
                          {formatNumber(prod.precioVigente)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-gray-700">
                        {fechaInicio !== '—' ? formatDate(fechaInicio) : '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {!fechaHasta ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3" /> Vigente
                          </span>
                        ) : (
                          <span className="text-gray-600">{formatDate(fechaHasta)}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setHistoryModalProd(prod)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1 transition-colors"
                          title="Ver línea de tiempo de precios"
                        >
                          <History className="w-3 h-3 text-amber-600" />
                          <span>{prod.historicoPrecios.length} registro(s)</span>
                        </button>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenUpdatePrecio(prod)}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded inline-flex items-center gap-1 transition-colors"
                          title="Actualizar precio de venta"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Cambiar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: SUBMENÚ 1. MATERIALES                            */}
      {/* ========================================================= */}
      {activeTab === 'materiales' && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar material..."
                value={searchMaterial}
                onChange={(e) => setSearchMaterial(e.target.value)}
                className="w-56 h-7 pl-8 pr-2 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="text-xs text-gray-500">
              Total: <strong className="text-gray-900">{filteredMateriales.length}</strong>{' '}
              material(es) registrado(s)
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                    <th className="py-2 px-3 w-12 text-center">No.</th>
                    <th className="py-2 px-3">Nombre del Material</th>
                    <th className="py-2 px-3 text-right w-36">Precio del Paquete</th>
                    <th className="py-2 px-3 text-right w-36">Contenido del Paquete</th>
                    <th className="py-2 px-3 text-center w-28">Unidad</th>
                    <th className="py-2 px-3 text-right w-36">Costo Unitario Base</th>
                    <th className="py-2 px-3 text-center w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMateriales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        <Package className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-xs">No hay materiales registrados.</p>
                        <button
                          type="button"
                          onClick={handleOpenNewMaterial}
                          className="mt-2 text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir primer material
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredMateriales.map((mat, index) => {
                      const costoBase =
                        mat.contenidoTotal > 0 ? mat.precio / mat.contenidoTotal : 0;
                      return (
                        <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-gray-900">{mat.nombre}</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">
                            {formatNumber(mat.precio)}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-800">
                            {mat.contenidoTotal} {mat.unidadMedida}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {mat.unidadMedida}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-amber-900">
                            {formatNumber(costoBase)} / {mat.unidadMedida}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditMaterial(mat)}
                                className="p-1 text-gray-500 hover:text-amber-600 rounded transition-colors"
                                title="Editar material"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingMaterialId(mat.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                title="Eliminar material"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 3: SUBMENÚ 2. RECETAS                               */}
      {/* ========================================================= */}
      {activeTab === 'recetas' && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar receta..."
                value={searchReceta}
                onChange={(e) => setSearchReceta(e.target.value)}
                className="w-56 h-7 pl-8 pr-2 text-xs border border-gray-300 rounded bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="text-xs text-gray-500">
              Total: <strong className="text-gray-900">{filteredRecetas.length}</strong> receta(s)
              creada(s)
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                    <th className="py-2 px-3 w-10 text-center">No.</th>
                    <th className="py-2 px-3">Nombre de la Receta</th>
                    <th className="py-2 px-3">Ingredientes Incluidos</th>
                    <th className="py-2 px-3 text-center">Rendimiento</th>
                    <th className="py-2 px-3 text-right">Costo Total Lote</th>
                    <th className="py-2 px-3 text-right">Costo / Sugerido</th>
                    <th className="py-2 px-3 text-center w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecetas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        <BookOpen className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-xs">No hay recetas registradas todavía.</p>
                        <button
                          type="button"
                          onClick={handleOpenNewReceta}
                          className="mt-2 text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar primera receta
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredRecetas.map((rec, index) => {
                      const resumenIngredientes = rec.ingredientes
                        .map((i) => `${i.materialNombre} (${i.cantidad} ${i.unidadMedida})`)
                        .join(', ');

                      const rinde = rec.unidadesRinde || 100;
                      const cUnit = rec.costoUnitario || (rinde > 0 ? rec.costoTotal / rinde : 0);
                      const pSug = rec.precioSugeridoUnitario || cUnit * 1.3;

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-gray-900 block">{rec.nombre}</span>
                            {(rec.notas || rec.observaciones) && (
                              <span className="text-[11px] text-gray-500 italic block">
                                {rec.notas || rec.observaciones}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-gray-700">
                            <div className="truncate max-w-xs" title={resumenIngredientes}>
                              {resumenIngredientes}
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {rec.ingredientes.length} ingrediente(s)
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-gray-800">
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-900 border border-amber-200">
                              {rinde} u.
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-black text-amber-900 text-sm font-mono">
                            {formatNumber(rec.costoTotal)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="text-gray-700 font-mono text-xs">
                              {formatNumber(cUnit)} <span className="text-[10px] text-gray-400">/u</span>
                            </div>
                            <div className="text-emerald-700 font-bold font-mono text-[11px]">
                              Sug: {formatNumber(pSug)}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingReceta(rec)}
                                className="p-1 text-gray-500 hover:text-indigo-600 rounded transition-colors"
                                title="Ver detalle de receta"
                              >
                                <Layers className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditReceta(rec)}
                                className="p-1 text-gray-500 hover:text-amber-600 rounded transition-colors"
                                title="Editar receta"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingRecetaId(rec.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                title="Eliminar receta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AÑADIR / EDITAR MATERIAL                           */}
      {/* ========================================================= */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">
                {editingMaterialId ? 'Editar Material' : 'Añadir Material'}
              </h3>
              <button
                type="button"
                onClick={() => setIsMaterialModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-3">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nombre del material <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Azúcar, Harina de Trigo, Manteca..."
                  value={matNombre}
                  onChange={(e) => setMatNombre(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Precio del material <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00 (ej. 26000.00)"
                  value={matPrecio}
                  onChange={(e) => setMatPrecio(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Contenido total <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="Ej. 25, 50, 10..."
                    value={matContenido}
                    onChange={(e) => setMatContenido(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Unidad de medida:
                  </label>
                  <select
                    value={matUnidad}
                    onChange={(e) => setMatUnidad(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    <option value="Kg">Kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="Unidades">Unidades</option>
                    <option value="Otra">Otra...</option>
                  </select>
                </div>
              </div>

              {matUnidad === 'Otra' && (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Especifique la unidad personalizada:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Barra, Saco, Pomo, Cubo..."
                    value={matUnidadCustom}
                    onChange={(e) => setMatUnidadCustom(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Vista previa de costo base */}
              {parseFloat(matPrecio) > 0 && parseFloat(matContenido) > 0 && (
                <div className="p-2 bg-slate-50 border border-gray-200 rounded text-gray-600 flex justify-between items-center text-[11px]">
                  <span>Costo calculado por unidad base:</span>
                  <span className="font-bold text-gray-900">
                    {formatNumber(parseFloat(matPrecio) / parseFloat(matContenido))} /{' '}
                    {matUnidad === 'Otra' ? matUnidadCustom || 'Unidad' : matUnidad}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                >
                  {editingMaterialId ? 'Guardar Cambios' : 'Añadir Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AGREGAR / EDITAR RECETA                            */}
      {/* ========================================================= */}
      {isRecetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 space-y-3 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">
                {editingRecetaId ? 'Editar Receta' : 'Agregar Receta'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRecetaModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReceta} className="space-y-3.5">
              {/* 1. Nombre de la receta en la parte superior */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nombre de la receta <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Masa de Conos, Panqué, Masarreal..."
                  value={recetaNombre}
                  onChange={(e) => setRecetaNombre(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>

              {/* 2. Botón Añadir Cantidades */}
              <div>
                <button
                  type="button"
                  onClick={handleOpenAddQtyMiniModal}
                  className="w-full py-2 px-3 text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Plus className="w-4 h-4 text-amber-800" />
                  <span>Añadir Cantidades (Seleccionar Materiales)</span>
                </button>
              </div>

              {/* Contenedor de Ingredientes añadidos a la receta */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-700">
                    Ingredientes añadidos a la receta ({recetaIngredientes.length}):
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Calculados proporcionalmente por porción
                  </span>
                </div>

                <div className="border border-gray-200 rounded-md overflow-hidden bg-white max-h-44 overflow-y-auto">
                  {recetaIngredientes.length === 0 ? (
                    <div className="py-5 text-center text-gray-400">
                      <p className="text-xs">
                        Aún no has añadido ingredientes. Pulsa en{' '}
                        <strong className="text-amber-800">"Añadir Cantidades"</strong> para comenzar.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-gray-200 text-gray-600">
                        <tr>
                          <th className="py-1.5 px-2">Material</th>
                          <th className="py-1.5 px-2 text-right">Porción Usada</th>
                          <th className="py-1.5 px-2 text-right">Importe de la Porción</th>
                          <th className="py-1.5 px-1 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {recetaIngredientes.map((ing) => (
                          <tr key={ing.id} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2 font-semibold text-gray-900">
                              {ing.materialNombre}
                            </td>
                            <td className="py-1.5 px-2 text-right text-gray-700 font-medium">
                              {ing.cantidad} {ing.unidadMedida}
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold text-amber-900">
                              {formatNumber(ing.costoPorcion)}
                            </td>
                            <td className="py-1.5 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveIngrediente(ing.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 rounded"
                                title="Eliminar de la receta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* 3. RECUADRO ENMARCADO: Unidades que rinde, % adicional y % beneficio esperado con cálculos inteligentes */}
              <div className="border-2 border-amber-300 bg-amber-50/50 rounded-xl p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-amber-200/80 pb-2">
                  <Calculator className="w-4 h-4 text-amber-800" />
                  <span className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                    Rendimiento, Costos Adicionales y Margen de Beneficio
                  </span>
                </div>

                {/* Unidades que rinde la receta */}
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">
                    Unidades que rinde la receta <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="Ej. 100"
                    value={recetaUnidadesRinde}
                    onChange={(e) => setRecetaUnidadesRinde(e.target.value)}
                    className="w-full h-8 px-2 border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 bg-white text-gray-900 font-medium"
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Cantidad estimada de dulces o porciones terminadas por cada lote de esta receta.
                  </p>
                </div>

                {/* Porcentaje adicional sobre costos (mano de obra, agua, electricidad, etc) */}
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">
                    Porcentaje adicional sobre costos (mano de obra, agua, electricidad, etc):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Ej. 20"
                      value={recetaPorcentajeAdicional}
                      onChange={(e) => setRecetaPorcentajeAdicional(e.target.value)}
                      className="w-full h-8 pl-2 pr-8 border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 bg-white text-gray-900 font-medium"
                    />
                    <div className="absolute right-0 top-0 bottom-0 px-2.5 bg-amber-100 border-l border-amber-300 rounded-r flex items-center justify-center font-bold text-amber-900 select-none text-xs">
                      %
                    </div>
                  </div>
                </div>

                {/* Porcentaje de beneficio esperado */}
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">
                    Porcentaje de beneficio esperado:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Ej. 30"
                      value={recetaPorcentajeBeneficio}
                      onChange={(e) => setRecetaPorcentajeBeneficio(e.target.value)}
                      className="w-full h-8 pl-2 pr-8 border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 bg-white text-gray-900 font-medium"
                    />
                    <div className="absolute right-0 top-0 bottom-0 px-2.5 bg-amber-100 border-l border-amber-300 rounded-r flex items-center justify-center font-bold text-amber-900 select-none text-xs">
                      %
                    </div>
                  </div>
                </div>

                {/* Desglose de Cálculos Inteligentes en Tiempo Real */}
                <div className="pt-2 border-t border-amber-200/90 space-y-2 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200">
                      <span className="text-[10px] text-gray-500 block">Costo Ingredientes:</span>
                      <span className="font-bold text-gray-900 font-mono">
                        {formatNumber(costoIngredientes)}
                      </span>
                    </div>

                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200">
                      <span className="text-[10px] text-gray-500 block">
                        Costo Adic. (+{pctAdicionalNum}%):
                      </span>
                      <span className="font-bold text-amber-900 font-mono">
                        +{formatNumber(costoAdicional)}
                      </span>
                    </div>

                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-gray-500 block">Costo Total Lote:</span>
                      <span className="font-black text-amber-950 font-mono">
                        {formatNumber(totalCostoReceta)}
                      </span>
                    </div>
                  </div>

                  {unidadesRindeNum > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div className="bg-amber-100/70 p-2 rounded-lg border border-amber-300">
                        <span className="text-[10px] text-amber-900 font-medium block">
                          Costo Unitario por Dulce:
                        </span>
                        <span className="font-bold text-amber-950 font-mono text-sm">
                          {formatNumber(costoUnitarioPorDulce)}
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          ({unidadesRindeNum} unidades)
                        </span>
                      </div>

                      <div className="bg-amber-100/70 p-2 rounded-lg border border-amber-300">
                        <span className="text-[10px] text-amber-900 font-medium block">
                          Beneficio ({pctBeneficioNum}%):
                        </span>
                        <span className="font-bold text-amber-950 font-mono text-sm">
                          +{formatNumber(beneficioEsperadoPorDulce)}
                        </span>
                        <span className="text-[10px] text-gray-500 block">por dulce</span>
                      </div>

                      <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-300">
                        <span className="text-[10px] text-emerald-800 font-bold block">
                          Precio Sugerido Venta:
                        </span>
                        <span className="font-black text-emerald-950 font-mono text-sm">
                          {formatNumber(precioSugeridoUnitario)}
                        </span>
                        <span className="text-[10px] text-emerald-700 block">por dulce</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Campo Notas al final del modal */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Notas (opcional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Dejar reposar la masa 20 minutos, hornear a 180°C..."
                  value={recetaNotas}
                  onChange={(e) => setRecetaNotas(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRecetaModalOpen(false)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={recetaIngredientes.length === 0}
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded transition-colors"
                >
                  {editingRecetaId ? 'Guardar Receta' : 'Crear Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MINI-MODAL: AÑADIR CANTIDADES DE MATERIAL A LA RECETA     */}
      {/* ========================================================= */}
      {isAddQtyMiniModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-600" />
                <span>Seleccionar Material y Porción</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddQtyMiniModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Selector de material con buscador */}
            <div className="space-y-2">
              <label className="font-semibold text-gray-700 block">
                1. Selecciona el material del submenú Materiales:
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar en lista..."
                  value={miniSearchMaterial}
                  onChange={(e) => setMiniSearchMaterial(e.target.value)}
                  className="w-full h-7 pl-7 pr-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="border border-gray-200 rounded max-h-36 overflow-y-auto divide-y divide-gray-100 bg-slate-50/50">
                {materiales
                  .filter((m) =>
                    !miniSearchMaterial.trim()
                      ? true
                      : m.nombre.toLowerCase().includes(miniSearchMaterial.toLowerCase())
                  )
                  .map((mat) => {
                    const isSelected = selectedMatForRecipe?.id === mat.id;
                    return (
                      <div
                        key={mat.id}
                        onClick={() => handleSelectMaterialInMiniModal(mat)}
                        className={`p-2 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-100/70 border-l-4 border-amber-600' : 'hover:bg-white'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-gray-900">{mat.nombre}</span>
                          <div className="text-[10px] text-gray-500">
                            Paquete: {mat.contenidoTotal} {mat.unidadMedida} —{' '}
                            {formatNumber(mat.precio)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? 'bg-amber-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Configurar cantidad a usar en la receta */}
            {selectedMatForRecipe && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2.5">
                <div className="font-bold text-gray-900 text-xs flex items-center justify-between">
                  <span>Material seleccionado: {selectedMatForRecipe.nombre}</span>
                  <span className="text-[10px] font-normal text-gray-600">
                    Paquete: {selectedMatForRecipe.contenidoTotal}{' '}
                    {selectedMatForRecipe.unidadMedida}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Cantidad a usar <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      autoFocus
                      placeholder="Ej. 5"
                      value={portionQtyInput}
                      onChange={(e) => setPortionQtyInput(e.target.value)}
                      className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Unidad de medida:
                    </label>
                    <select
                      value={portionUnitInput}
                      onChange={(e) => setPortionUnitInput(e.target.value)}
                      className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                    >
                      {/* Ofrecer unidades compatibles según el material */}
                      {selectedMatForRecipe.unidadMedida === 'Kg' ? (
                        <>
                          <option value="Kg">Kg</option>
                          <option value="g">g (gramos)</option>
                          <option value="lb">lb (libras)</option>
                        </>
                      ) : selectedMatForRecipe.unidadMedida === 'g' ? (
                        <>
                          <option value="g">g (gramos)</option>
                          <option value="Kg">Kg</option>
                        </>
                      ) : selectedMatForRecipe.unidadMedida === 'L' ? (
                        <>
                          <option value="L">L (litros)</option>
                          <option value="ml">ml (mililitros)</option>
                        </>
                      ) : (
                        <>
                          <option value={selectedMatForRecipe.unidadMedida}>
                            {selectedMatForRecipe.unidadMedida}
                          </option>
                          <option value="Unidades">Unidades</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Importe proporcional calculado en tiempo real */}
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">
                    Importe de la porción añadida:
                  </span>
                  <span className="font-black text-amber-950 text-sm font-mono">
                    {formatNumber(livePortionCost)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsAddQtyMiniModalOpen(false)}
                className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedMatForRecipe || !portionQtyInput || parseFloat(portionQtyInput) <= 0}
                onClick={handleAddPortionToRecipe}
                className="px-4 py-1.5 font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>Añadir cantidad a la receta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VER DETALLE DE RECETA                              */}
      {/* ========================================================= */}
      {viewingReceta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>{viewingReceta.nombre}</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewingReceta(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            {(viewingReceta.notas || viewingReceta.observaciones) && (
              <p className="text-gray-700 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                <span className="font-bold text-amber-900 not-italic block text-[11px] mb-0.5">Notas:</span>
                {viewingReceta.notas || viewingReceta.observaciones}
              </p>
            )}

            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="py-1.5 px-2.5">Material</th>
                    <th className="py-1.5 px-2.5 text-right">Porción</th>
                    <th className="py-1.5 px-2.5 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewingReceta.ingredientes.map((ing, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 font-medium text-gray-900">{ing.materialNombre}</td>
                      <td className="py-2 px-2.5 text-right text-gray-700">
                        {ing.cantidad} {ing.unidadMedida}
                      </td>
                      <td className="py-2 px-2.5 text-right font-bold text-gray-900 font-mono">
                        {formatNumber(ing.costoPorcion)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen Financiero y de Rendimiento */}
            <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Costo Materiales:</span>
                <span className="font-bold text-gray-900 font-mono">
                  {formatNumber(viewingReceta.costoIngredientes || viewingReceta.ingredientes.reduce((s, x) => s + x.costoPorcion, 0))}
                </span>
              </div>

              {Boolean(viewingReceta.porcentajeAdicionalCostos) && (
                <div className="flex justify-between items-center text-amber-900">
                  <span>Adicional Costos (+{viewingReceta.porcentajeAdicionalCostos}%):</span>
                  <span className="font-bold font-mono">
                    +{formatNumber((viewingReceta.costoTotal || 0) - (viewingReceta.costoIngredientes || 0))}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-1 border-t border-amber-200 font-bold">
                <span className="text-amber-950">Costo Total del Lote:</span>
                <span className="text-sm font-black text-amber-950 font-mono">
                  {formatNumber(viewingReceta.costoTotal)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200">
                <div className="bg-white/90 p-2 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-gray-500 block">Rendimiento:</span>
                  <span className="font-bold text-amber-950 font-mono">
                    {viewingReceta.unidadesRinde || 100} unidades
                  </span>
                </div>

                <div className="bg-white/90 p-2 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-gray-500 block">Costo Unitario:</span>
                  <span className="font-bold text-amber-950 font-mono">
                    {formatNumber(viewingReceta.costoUnitario || (viewingReceta.costoTotal / (viewingReceta.unidadesRinde || 100)))}
                  </span>
                </div>
                
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-300">
                  <span className="text-[10px] text-emerald-800 font-bold block">
                    Valor de venta unitario:
                  </span>
                  <span className="font-black text-rose-600 font-mono text-sm">
                    {formatNumber(viewingReceta.precioSugeridoUnitario || ((viewingReceta.costoUnitario || (viewingReceta.costoTotal / (viewingReceta.unidadesRinde || 100))) * 1.3))}
                  </span>
                </div>

                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-300">
                  <span className="text-[10px] text-emerald-800 font-bold block">
                    Ingresos totales (utilidad):
                  </span>
                  <span className="font-bold text-emerald-950 font-mono">
                    {formatNumber((viewingReceta.precioSugeridoUnitario || 0) - (viewingReceta.costoUnitario || 0))}
                  </span>
                </div>

                <div className="col-span-2 bg-emerald-100 p-2 rounded-lg border border-emerald-400">
                  <span className="text-[10px] text-emerald-900 font-bold block">
                    Ganancia total del lote:
                  </span>
                  <span className="font-black text-emerald-950 font-mono text-sm">
                    {formatNumber(((viewingReceta.precioSugeridoUnitario || 0) - (viewingReceta.costoUnitario || 0)) * (viewingReceta.unidadesRinde || 100))}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewingReceta(null)}
                className="px-3 py-1.5 font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: HISTORIAL DE PRECIOS DEL DULCE                     */}
      {/* ========================================================= */}
      {historyModalProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <span>Historial de Precios — {historyModalProd.nombre}</span>
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModalProd(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-1.5 px-2.5">Desde</th>
                    <th className="py-1.5 px-2.5">Hasta</th>
                    <th className="py-1.5 px-2.5 text-right">Precio de Venta</th>
                    <th className="py-1.5 px-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyModalProd.historicoPrecios.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 text-gray-900 font-medium">
                        {formatDate(h.desde)}
                      </td>
                      <td className="py-2 px-2.5 text-gray-600">
                        {h.hasta ? formatDate(h.hasta) : 'Actualidad'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-black text-gray-900">
                        {formatNumber(h.precio)}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        {!h.hasta ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Vigente
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                            Archivado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setHistoryModalProd(null)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NUEVO DULCE                                        */}
      {/* ========================================================= */}
      {isNewProdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">Nuevo Producto (Dulce)</h3>
              <button
                type="button"
                onClick={() => setIsNewProdModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewProd} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nombre del Dulce <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Torta de Chocolate, Polvorón..."
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Precio de Venta <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={newPrecio}
                  onChange={(e) => setNewPrecio(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Fecha de Inicio:
                  </label>
                  <input
                    type="date"
                    required
                    value={newFechaInicio}
                    onChange={(e) => setNewFechaInicio(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Vigente Hasta:
                  </label>
                  <input
                    type="date"
                    placeholder="Opcional"
                    value={newVigenteHasta}
                    onChange={(e) => setNewVigenteHasta(e.target.value)}
                    className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewProdModalOpen(false)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                >
                  Crear Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ACTUALIZAR PRECIO DEL DULCE                        */}
      {/* ========================================================= */}
      {editingPrecioProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-4 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-sm text-gray-900">
                Cambiar Precio — {editingPrecioProd.nombre}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPrecioProd(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUpdatePrecio} className="space-y-3 text-xs">
              <div className="p-2 bg-slate-50 border border-gray-200 rounded text-gray-600 flex justify-between">
                <span>Precio actual:</span>
                <span className="font-bold text-gray-900">
                  {formatNumber(editingPrecioProd.precioVigente)}
                </span>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nuevo Precio de Venta:
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  value={nuevoPrecioInput}
                  onChange={(e) => setNuevoPrecioInput(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Fecha Inicio de Vigencia:
                </label>
                <input
                  type="date"
                  required
                  value={nuevoFechaInicio}
                  onChange={(e) => setNewFechaInicio(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10px] text-gray-500 block mt-1">
                  El precio previo se cerrará automáticamente el día anterior.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPrecioProd(null)}
                  className="px-3 py-1.5 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                >
                  Guardar Nuevo Precio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation modal for material deletion */}
      <ConfirmModal
        isOpen={!!deletingMaterialId}
        title="Eliminar Material"
        message="¿Estás seguro de que deseas eliminar este material? Podría afectar a recetas existentes."
        onConfirm={() => {
          if (deletingMaterialId) {
            deleteMaterialReceta(deletingMaterialId);
            setDeletingMaterialId(null);
          }
        }}
        onCancel={() => setDeletingMaterialId(null)}
      />

      {/* Confirmation modal for receta deletion */}
      <ConfirmModal
        isOpen={!!deletingRecetaId}
        title="Eliminar Receta"
        message="¿Estás seguro de que deseas eliminar esta receta?"
        onConfirm={() => {
          if (deletingRecetaId) {
            deleteReceta(deletingRecetaId);
            setDeletingRecetaId(null);
          }
        }}
        onCancel={() => setDeletingRecetaId(null)}
      />
    </div>
  );
};
