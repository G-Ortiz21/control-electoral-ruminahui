import { sesionSimulada } from '@/modules/auth/data/sesion-simulada';
import { SupabaseAuthRepository } from '@/modules/auth/data/supabase-auth-repository';
import { SupabaseUsuarioRepository } from '@/modules/auth/data/supabase-usuario-repository';
import {
  IniciarSesion,
  CompletarPrimerIngreso,
  RecuperarClave,
  CrearUsuario,
  DesactivarUsuario,
} from '@/modules/auth/domain';
import { SupabaseActasRepository } from '@/modules/actas/data';
import { RegistrarActa, CorregirActa } from '@/modules/actas/domain';
import { SqliteOutboxRepository, ExpoArchivos, NetInfoConectividad, SupabaseActasRemoto } from '@/modules/sync/data';
import { MotorSync } from '@/modules/sync/domain';
import { SupabaseTerritorioRepository } from '@/modules/territorio/data';

const auth = new SupabaseAuthRepository();
const usuarios = new SupabaseUsuarioRepository(auth);
const actas = new SupabaseActasRepository();
const territorio = new SupabaseTerritorioRepository(auth);

const outbox = new SqliteOutboxRepository();
const archivos = new ExpoArchivos();
const conectividad = new NetInfoConectividad();
const remoto = new SupabaseActasRemoto(actas);
const motorSync = new MotorSync({
  outbox,
  remoto,
  archivos,
  conectividad,
});

export const contenedor = {
  sesion: sesionSimulada,
  auth,
  usuarios,
  actas,
  territorio,
  sync: {
    outbox,
    archivos,
    conectividad,
    remoto,
    motor: motorSync,
  },
  casos: {
    iniciarSesion: new IniciarSesion(auth, usuarios),
    completarPrimerIngreso: new CompletarPrimerIngreso(auth),
    recuperarClave: new RecuperarClave(auth),
    crearUsuario: new CrearUsuario(auth),
    desactivarUsuario: new DesactivarUsuario(usuarios),
    registrarActa: new RegistrarActa(actas),
    corregirActa: new CorregirActa(actas),
  },
};

export type Contenedor = typeof contenedor;