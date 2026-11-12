import { pgTable, serial, text, timestamp, real, integer } from 'drizzle-orm/pg-core';

// Users table managed via Firebase Auth integration
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Central synced state for Dulcería TATAO
export const tataoStore = pgTable('tatao_store', {
  id: text('id').primaryKey(), // 'current_state'
  data: text('data').notNull(), // JSON string representation of AppData
  version: integer('version').default(1).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

// Structured table for Clientes
export const clientesTable = pgTable('clientes', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  telefono: text('telefono').default(''),
  email: text('email').default(''),
  ci: text('ci').default(''),
  direccion: text('direccion').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// Structured table for Producción
export const produccionTable = pgTable('produccion', {
  id: text('id').primaryKey(),
  fecha: text('fecha').notNull(),
  producto: text('producto').notNull(),
  cantidad: integer('cantidad').notNull(),
  costo: real('costo').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Structured table for Ventas
export const ventasTable = pgTable('ventas', {
  id: text('id').primaryKey(),
  numeroVale: integer('numero_vale').notNull(),
  fecha: text('fecha').notNull(),
  cliente: text('cliente').notNull(),
  total: real('total').notNull(),
  tipoPago: text('tipo_pago').default('Efectivo'),
  lineasJson: text('lineas_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Structured table for Gastos
export const gastosTable = pgTable('gastos', {
  id: text('id').primaryKey(),
  fecha: text('fecha').notNull(),
  categoria: text('categoria').notNull(),
  concepto: text('concepto').notNull(),
  importe: real('importe').notNull(),
  tipoSalario: text('tipo_salario'),
  loteId: text('lote_id'),
  repartoId: text('reparto_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Structured table for Materiales de Recetas
export const materialesTable = pgTable('materiales_receta', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  precio: real('precio').notNull(),
  contenidoPaquete: real('contenido_paquete').notNull(),
  unidadMedida: text('unidad_medida').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Structured table for Recetas
export const recetasTable = pgTable('recetas', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  costoTotal: real('costo_total').notNull(),
  ingredientesJson: text('ingredientes_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
