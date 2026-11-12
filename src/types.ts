export type ModuleName =
  | 'Panel'
  | 'Producción'
  | 'Ventas'
  | 'Facturación'
  | 'Gastos'
  | 'Caja'
  | 'Almacén'
  | 'Precios'
  | 'Clientes'
  | 'Productos'
  | 'Materiales'
  | 'Recetas'
  | 'Alertas'
  | 'Ajustes'
  | 'Usuarios';

export interface GananciaPorUnidadConfig {
  producto: string;
  desde: string; // YYYY-MM-DD
  valor: number;
}

export interface RepartoConfig {
  fondoPct: number; // e.g. 0.30
  administradorPct: number; // e.g. 0.20
  duenos: string[]; // ["Tatao", "Carlos"]
}

export interface MetaConfig {
  siguienteVale: number;
  periodo: {
    desde: string;
    hasta: string;
  };
  pagoPorDulceTrabajador: Record<string, number>;
  gananciaPorUnidad: GananciaPorUnidadConfig[];
  reparto: RepartoConfig;
}

export interface RepartoSemanal {
  id: string;
  desde: string;
  hasta: string;
  ganancia: number;
  administrador: number;
  tatao: number;
  carlos: number;
  fechaPago: string | null;
  estado: 'Pagado' | 'Pendiente';
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  ci?: string;
  direccion?: string;
}

export interface HistoricoPrecio {
  precio: number;
  desde: string;
  hasta: string | null;
}

export interface Producto {
  id: string;
  nombre: string;
  costoUnitario: number | null;
  precioVigente: number;
  historicoPrecios: HistoricoPrecio[];
}

export interface ProduccionLote {
  id: string;
  fecha: string;
  producto: string;
  cantidad: number;
  merma: number;
  costo: number;
}

export interface LineaVenta {
  producto: string;
  cantidad: number;
  importe: number;
  precioUnitario?: number;
}

export interface VentaVale {
  id: string;
  vale: string;
  fecha: string;
  cliente: string;
  lineas: LineaVenta[];
  importeTotal: number;
  formaPago?: 'Efectivo' | 'Transferencia';
}

export type CategoriaGasto =
  | 'Materias Primas'
  | 'Materiales'
  | 'Limpieza'
  | 'Electricidad'
  | 'Salarios'
  | 'Otros';

export type FormaPago = 'Efectivo' | 'Banco/Transferencia';

export interface GastoItem {
  id: string;
  fecha: string;
  categoria: CategoriaGasto;
  concepto: string;
  importe: number;
  formaPago: FormaPago;
  tipoSalario?: 'Trabajadores' | 'Administrador' | 'Dueños';
  loteId?: string;
  repartoId?: string;
  generadoPor?: 'Producción' | 'Reparto';
}

export interface MovimientoAlmacen {
  id: string;
  fecha: string;
  tipo: 'Entrada' | 'Salida';
  cantidad: number;
  saldoResultante: number;
  concepto: string;
  comprobante?: string;
}

export interface AlmacenItem {
  id: string;
  codigo: string;
  producto: string;
  unidad: string;
  existencia: number;
  fechaConteo: string;
  stockMinimo?: number;
  movimientos: MovimientoAlmacen[];
}

export interface FacturaItem {
  id: string;
  numero: string; // e.g. "FAC-001"
  cliente: string;
  telefono: string;
  ci: string;
  direccion: string;
  fecha: string;
  periodoVales: string;
  valesIncluidos: string[]; // ids of vales
  valesDetalle: {
    vale: string;
    fecha: string;
    detalle: string;
    importe: number;
  }[];
  productosConsolidados: {
    producto: string;
    cantidad: number;
    precioUnitario: number;
    importe: number;
  }[];
  importeTotal: number;
  observaciones?: string;
}

export interface CajaConfig {
  saldoInicial: number;
  fechaInicio: string;
}

export interface JustificacionDiferencia {
  id: string;
  fecha: string; // YYYY-MM-DD o 'General'
  producto?: string;
  nota: string;
  fechaRegistro: string;
}

export interface MaterialReceta {
  id: string;
  nombre: string;
  precio: number;
  contenidoTotal: number;
  unidadMedida: string; // 'Kg' | 'g' | 'L' | 'ml' | 'Unidades' | etc.
}

export interface IngredienteReceta {
  id: string;
  materialId: string;
  materialNombre: string;
  cantidad: number;
  unidadMedida: string;
  costoPorcion: number;
}

export interface UsuarioAutorizado {
  id: string;
  email: string;
  nombre?: string;
  rol: 'Administrador' | 'Operador' | 'Lector';
  fechaAgregado: string;
  activo: boolean;
}

export interface Receta {
  id: string;
  nombre: string;
  ingredientes: IngredienteReceta[];
  costoIngredientes?: number;
  unidadesRinde?: number; // Unidades que rinde la receta
  porcentajeAdicionalCostos?: number; // % Adicional sobre costos (mano de obra, agua, electricidad, etc)
  porcentajeBeneficioEsperado?: number; // % Beneficio esperado
  costoTotal: number; // Costo total incluyendo porcentaje adicional
  costoUnitario?: number; // Costo por unidad
  precioSugeridoUnitario?: number; // Precio con beneficio esperado
  fechaCreacion?: string;
  observaciones?: string;
  notas?: string; // Nombre alternativo Notas
}

export interface AppData {
  meta: MetaConfig;
  repartos: RepartoSemanal[];
  clientes: Cliente[];
  productos: Producto[];
  produccion: ProduccionLote[];
  ventas: VentaVale[];
  gastos: GastoItem[];
  almacen: AlmacenItem[];
  facturas?: FacturaItem[];
  caja: CajaConfig;
  justificaciones?: JustificacionDiferencia[];
  materialesReceta?: MaterialReceta[];
  recetas?: Receta[];
  usuariosAutorizados?: UsuarioAutorizado[];
}
