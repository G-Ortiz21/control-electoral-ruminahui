import {
  CrearUsuario,
  IniciarSesion,
  CompletarPrimerIngreso,
  RecuperarClave,
  DesactivarUsuario,
} from './index';
import type { AuthRepository } from './ports/auth-repository';
import type { UsuarioRepository } from './ports/usuario-repository';

function crearAuthMock(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    iniciarSesion: jest.fn().mockResolvedValue({ ok: true, valor: { accessToken: 't', refreshToken: null, userId: 'u1', email: 'a@b.com' } }),
    cerrarSesion: jest.fn().mockResolvedValue(undefined),
    enviarOtp: jest.fn().mockResolvedValue({ ok: true, valor: undefined }),
    verificarOtp: jest.fn().mockResolvedValue({ ok: true, valor: { accessToken: 't', refreshToken: null, userId: 'u1', email: 'a@b.com' } }),
    confirmarCorreoEnlace: jest.fn().mockResolvedValue({ ok: true, valor: { accessToken: 't', refreshToken: null, userId: 'u1', email: 'a@b.com' } }),
    reenviarConfirmacion: jest.fn().mockResolvedValue({ ok: true, valor: undefined }),
    cambiarClaveInicial: jest.fn().mockResolvedValue({ ok: true, valor: undefined }),
    recuperarClave: jest.fn().mockResolvedValue({ ok: true, valor: undefined }),
    obtenerSesionActual: jest.fn().mockResolvedValue(null),
    crearUsuario: jest.fn().mockResolvedValue({
      ok: true,
      valor: { userId: 'new', email: 'nuevo@x.com', rol: 'VEEDOR', estado: 'PENDIENTE', tempPassword: 'Tmp-abc' },
    }),
    activarPerfil: jest.fn().mockResolvedValue({ ok: true, valor: undefined }),
    ...overrides,
  };
}

function crearUsuariosMock(overrides: Partial<UsuarioRepository> = {}): UsuarioRepository {
  return {
    obtenerPerfilActual: jest.fn().mockResolvedValue({
      ok: true,
      valor: { id: 'p1', idAuth: 'u1', cedula: '1712345675', nombres: 'Ana', apellidos: 'Lopez', telefono: null, email: 'a@b.com', rol: 'COORDINADOR', estado: 'ACTIVO', provinciaId: null, creadoPor: null, creadoEn: '' },
    }),
    listarAMiCargo: jest.fn().mockResolvedValue({ ok: true, valor: [] }),
    desactivar: jest.fn().mockResolvedValue({ ok: true, valor: undefined }),
    ...overrides,
  };
}

describe('CrearUsuario (dominio)', () => {
  it('rechaza cédula inválida', async () => {
    const uc = new CrearUsuario(crearAuthMock());
    const res = await uc.ejecutar({ cedula: '1712345678', nombres: 'Juan', apellidos: 'Perez', telefono: null, email: 'j@x.com' });
    expect(res.ok).toBe(false);
  });

  it('rechaza nombres cortos', async () => {
    const uc = new CrearUsuario(crearAuthMock());
    const res = await uc.ejecutar({ cedula: '1712345675', nombres: 'J', apellidos: 'Perez', telefono: null, email: 'j@x.com' });
    expect(res.ok).toBe(false);
  });

  it('rechaza email inválido', async () => {
    const uc = new CrearUsuario(crearAuthMock());
    const res = await uc.ejecutar({ cedula: '1712345675', nombres: 'Juan', apellidos: 'Perez', telefono: null, email: 'no-es-email' });
    expect(res.ok).toBe(false);
  });

  it('rechaza teléfono inválido', async () => {
    const uc = new CrearUsuario(crearAuthMock());
    const res = await uc.ejecutar({ cedula: '1712345675', nombres: 'Juan', apellidos: 'Perez', telefono: 'abc', email: 'j@x.com' });
    expect(res.ok).toBe(false);
  });

  it('crea usuario válido', async () => {
    const auth = crearAuthMock();
    const uc = new CrearUsuario(auth);
    const res = await uc.ejecutar({ cedula: '17 1234567-5', nombres: 'Juan', apellidos: 'Perez', telefono: '0999999999', email: 'J@X.COM' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.valor.tempPassword).toBe('Tmp-abc');
      expect(auth.crearUsuario).toHaveBeenCalled();
    }
  });

  it('envía el recinto autorizado del coordinador al crear', async () => {
    const auth = crearAuthMock();
    const uc = new CrearUsuario(auth);
    const res = await uc.ejecutar({
      cedula: '1712345675', nombres: 'Juan', apellidos: 'Perez', telefono: null, email: 'j@x.com', recintoId: 'recinto-propio',
    });
    expect(res.ok).toBe(true);
    expect(auth.crearUsuario).toHaveBeenCalledWith(expect.objectContaining({ recintoId: 'recinto-propio' }));
  });
});

describe('IniciarSesion (dominio)', () => {
  it('rechaza correo vacío', async () => {
    const uc = new IniciarSesion(crearAuthMock(), crearUsuariosMock());
    const res = await uc.ejecutar('', 'clave');
    expect(res.ok).toBe(false);
  });

  it('rechaza contraseña vacía', async () => {
    const uc = new IniciarSesion(crearAuthMock(), crearUsuariosMock());
    const res = await uc.ejecutar('a@b.com', '');
    expect(res.ok).toBe(false);
  });

  it('propaga error de credenciales', async () => {
    const auth = crearAuthMock({ iniciarSesion: jest.fn().mockResolvedValue({ ok: false, error: 'Correo o contraseña incorrectos.' }) });
    const uc = new IniciarSesion(auth, crearUsuariosMock());
    const res = await uc.ejecutar('a@b.com', 'clave');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('incorrectos');
  });

  it('falla si no hay perfil', async () => {
    const usuarios = crearUsuariosMock({ obtenerPerfilActual: jest.fn().mockResolvedValue({ ok: true, valor: null }) });
    const uc = new IniciarSesion(crearAuthMock(), usuarios);
    const res = await uc.ejecutar('a@b.com', 'clave');
    expect(res.ok).toBe(false);
  });

  it('inicia sesión válida', async () => {
    const uc = new IniciarSesion(crearAuthMock(), crearUsuariosMock());
    const res = await uc.ejecutar('a@b.com', 'clave');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.valor.usuario.rol).toBe('COORDINADOR');
  });
});

describe('CompletarPrimerIngreso (dominio)', () => {
  it('rechaza OTP inválido', async () => {
    const uc = new CompletarPrimerIngreso(crearAuthMock());
    const res = await uc.ejecutar('a@b.com', '12', 'ClaveDefinitiva-2026!');
    expect(res.ok).toBe(false);
  });

  it('rechaza contraseña corta', async () => {
    const uc = new CompletarPrimerIngreso(crearAuthMock());
    const res = await uc.ejecutar('a@b.com', '123456', 'corta');
    expect(res.ok).toBe(false);
  });

  it('completa primer ingreso válido', async () => {
    const auth = crearAuthMock();
    const uc = new CompletarPrimerIngreso(auth);
    const res = await uc.ejecutar('a@b.com', '123456', 'ClaveDefinitiva-2026!');
    expect(res.ok).toBe(true);
    expect(auth.verificarOtp).toHaveBeenCalled();
    expect(auth.cambiarClaveInicial).toHaveBeenCalled();
    expect(auth.activarPerfil).toHaveBeenCalled();
  });

  it('con correo verificado por enlace omite el OTP pero conserva cambio de clave y activación', async () => {
    const auth = crearAuthMock();
    const uc = new CompletarPrimerIngreso(auth);
    const res = await uc.ejecutar('a@b.com', '', 'ClaveDefinitiva-2026!', true);
    expect(res.ok).toBe(true);
    expect(auth.verificarOtp).not.toHaveBeenCalled();
    expect(auth.cambiarClaveInicial).toHaveBeenCalled();
    expect(auth.activarPerfil).toHaveBeenCalled();
  });

  it('propaga error de cambio de clave inicial', async () => {
    const auth = crearAuthMock({ cambiarClaveInicial: jest.fn().mockResolvedValue({ ok: false, error: 'password_invalida' }) });
    const uc = new CompletarPrimerIngreso(auth);
    const res = await uc.ejecutar('a@b.com', '123456', 'ClaveDefinitiva-2026!');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('password_invalida');
    expect(auth.activarPerfil).not.toHaveBeenCalled();
  });

  it('propaga error de activación', async () => {
    const auth = crearAuthMock({ activarPerfil: jest.fn().mockResolvedValue({ ok: false, error: 'email_no_verificado' }) });
    const uc = new CompletarPrimerIngreso(auth);
    const res = await uc.ejecutar('a@b.com', '123456', 'ClaveDefinitiva-2026!');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('email_no_verificado');
  });
});

describe('RecuperarClave (dominio)', () => {
  it('rechaza correo inválido', async () => {
    const uc = new RecuperarClave(crearAuthMock());
    const res = await uc.ejecutar('no-es-email');
    expect(res.ok).toBe(false);
  });

  it('recupera clave válida', async () => {
    const auth = crearAuthMock();
    const uc = new RecuperarClave(auth);
    const res = await uc.ejecutar('a@b.com');
    expect(res.ok).toBe(true);
    expect(auth.recuperarClave).toHaveBeenCalled();
  });
});

describe('DesactivarUsuario (dominio)', () => {
  it('rechaza id vacío', async () => {
    const uc = new DesactivarUsuario(crearUsuariosMock());
    const res = await uc.ejecutar('  ');
    expect(res.ok).toBe(false);
  });

  it('desactiva usuario válido', async () => {
    const usuarios = crearUsuariosMock();
    const uc = new DesactivarUsuario(usuarios);
    const res = await uc.ejecutar('p1');
    expect(res.ok).toBe(true);
    expect(usuarios.desactivar).toHaveBeenCalledWith('p1');
  });
});