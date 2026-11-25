import { err, ok, type Resultado } from '@/shared/domain/resultado';
import type { ActasRepository, DatosRegistrarActa, ResultadoRegistrarActa } from '../ports/actas-repository';
import { validarCuadratura } from '../validaciones';

export class RegistrarActa {
  constructor(private readonly repo: ActasRepository) {}

  async ejecutar(datos: DatosRegistrarActa): Promise<Resultado<ResultadoRegistrarActa, string>> {
    const cuadratura = validarCuadratura(
      datos.votos.map((v) => v.votos),
      datos.blancos,
      datos.nulos,
      datos.sufragantes,
    );
    if (!cuadratura.ok) return err(cuadratura.error);
    if (datos.votos.length !== 5) return err('Se exigen votos de 5 organizaciones.');
    for (const v of datos.votos) {
      if (!Number.isInteger(v.votos) || v.votos < 0) return err('Los votos deben ser enteros no negativos.');
    }
    return this.repo.registrarActa(datos);
  }
}