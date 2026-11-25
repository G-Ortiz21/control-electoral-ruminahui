/**
 * Apertura y esquema base de SQLite (ADR-03, ADR-08).
 * Solo se usa en data/; el dominio no importa Expo.
 */
import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function obtenerDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('control-electoral.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS actas_locales (
          id TEXT PRIMARY KEY,
          operation_id TEXT NOT NULL UNIQUE,
          jrv_id TEXT NOT NULL,
          dignidad TEXT NOT NULL,
          estado TEXT NOT NULL,
          payload TEXT NOT NULL,
          foto_path TEXT,
          creado_en TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS outbox (
          operation_id TEXT PRIMARY KEY,
          jrv_id TEXT NOT NULL,
          recinto_id TEXT,
          dignidad TEXT NOT NULL,
          tipo TEXT NOT NULL,
          payload TEXT NOT NULL,
          foto_local_path TEXT,
          foto_remota_path TEXT,
          intentos INTEGER NOT NULL DEFAULT 0,
          estado TEXT NOT NULL DEFAULT 'GUARDADA_LOCAL',
          proximo_intento_en TEXT,
          ultimo_error TEXT,
          resultado TEXT,
          creado_en TEXT NOT NULL,
          actualizado_en TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS catalogo_version (
          version TEXT PRIMARY KEY,
          aplicado_en TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS catalogo_recintos (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          canton TEXT,
          parroquia TEXT,
          lat REAL,
          lon REAL,
          updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS catalogo_jrv (
          id TEXT PRIMARY KEY,
          recinto_id TEXT NOT NULL,
          numero INTEGER NOT NULL,
          updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS catalogo_organizaciones (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          color TEXT,
          updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS catalogo_candidatos (
          id TEXT PRIMARY KEY,
          organizacion_id TEXT NOT NULL,
          dignidad TEXT NOT NULL,
          nombre TEXT NOT NULL,
          updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS errores_pendientes (
          id TEXT PRIMARY KEY,
          codigo TEXT NOT NULL,
          pantalla TEXT NOT NULL,
          version_app TEXT NOT NULL,
          fecha TEXT NOT NULL,
          reintentos INTEGER NOT NULL DEFAULT 0,
          detalle TEXT
        );
      `);
      // Migración de vocabulario (V2-A): renombrar estados ya guardados.
      await db.runAsync("UPDATE outbox SET estado='EVIDENCIA_RESPALDADA' WHERE estado='RESPALDADA'");
      await db.runAsync("UPDATE outbox SET estado='PERMISO_REVOCADO' WHERE estado='NO_ACEPTADO_REVISION'");
      await db.runAsync("UPDATE actas_locales SET estado='EVIDENCIA_RESPALDADA' WHERE estado='RESPALDADA'");
      return db;
    });
  }
  return dbPromise;
}

export async function reiniciarDbParaTests(): Promise<void> {
  dbPromise = null;
}
