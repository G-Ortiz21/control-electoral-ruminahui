import { err, ok, type Resultado } from '@/shared/domain/resultado';
import { validarCedula } from '@/shared/domain/validador-cedula';
import type { AuthRepository } from '../ports/auth-repository';
import type { DatosCrearUsuario, ResultadoCrearUsuario } from '../entities/usuario';

export class CrearUsuario {
  constructor(private readonly auth: AuthRepository) {}

  async ejecutar(datos: DatosCrearUsuario): Promise<Resultado<ResultadoCrearUsuario, string>> {
    const ced = validarCedula(datos.cedula);
    if (!ced.ok) return err(ced.error);

    const nombres = (datos.nombres ?? '').trim();
    const apellidos = (datos.apellidos ?? '').trim();
    const email = (datos.email ?? '').trim().toLowerCase();
    const telefono = datos.telefono === null ? null : (datos.telefono ?? '').trim();

    if (nombres.length < 2 || nombres.length > 100) return err('Los nombres son obligatorios.');
    if (apellidos.length < 2 || apellidos.length > 100) return err('Los apellidos son obligatorios.');
    if (telefono !== null && telefono !== '' && !/^[0-9]{7,15}$/.test(telefono)) {
      return err('El teléfono debe tener entre 7 y 15 dígitos.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('El correo no es válido.');

    return this.auth.crearUsuario({
      cedula: ced.valor,
      nombres,
      apellidos,
      telefono: telefono === '' ? null : telefono,
      email,
      recintoId: datos.recintoId ?? null,
    });
  }
}