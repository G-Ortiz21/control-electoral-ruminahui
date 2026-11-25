import { err, ok, type Resultado } from '@/shared/domain/resultado';
import type { ActasRepository, DatosCorregirActa, ResultadoCorregirActa } from '../ports/actas-repository';
import { validarCuadratura } from '../validaciones';

export class CorregirActa {
  constructor(private readonly repo: ActasRepository) {}

  async ejecutar(datos: DatosCorregirActa): Promise<Resultado<ResultadoCorregirActa, string>> {
    if (!datos.motivo || datos.motivo.trim() === '') return err('El motivo de corrección es obligatorio.');
    if (!Number.isInteger(datos.expectedVersion) || datos.expectedVersion < 1) return err('Versión esperada inválida.');
    const cuadratura = validarCuadratura(
      datos.nuevosValores.votos.map((v) => v.votos),
      datos.nuevosValores.blancos,
      datos.nuevosValores.nulos,
      datos.nuevosValores.sufragantes,
    );
    if (!cuadratura.ok) return err(cuadratura.error);
    return this.repo.corregirActa(datos);
  }
}