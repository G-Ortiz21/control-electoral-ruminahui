import { crearZodResolver } from '@/shared/ui/zod-resolver';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View, FlatList, Pressable } from 'react-native';
import { z } from 'zod';

import { contenedor } from '@/composition';
import { useSessionStore } from './session-store';
import { Boton } from '@/shared/ui/boton';
import { CampoFormulario } from '@/shared/ui/campo-formulario';
import { CampoTexto } from '@/shared/ui/campo-texto';
import { LottieFeedback } from '@/shared/ui/lottie-feedback';
import type { Usuario } from '../domain/entities/usuario';

const esquema = z.object({
  cedula: z.string().min(1, 'La cédula es obligatoria.'),
  nombres: z.string().min(2, 'Los nombres son obligatorios.'),
  apellidos: z.string().min(2, 'Los apellidos son obligatorios.'),
  telefono: z.string().optional(),
  email: z.string().min(1, 'El correo es obligatorio.').email('El correo no es válido.'),
});

type Formulario = z.infer<typeof esquema>;

export function GestionUsuarios({
  titulo = 'Alta de usuario',
  encabezado,
  pie,
}: {
  titulo?: string;
  /** Contenido previo al formulario (p. ej. aviso de la pantalla del coordinador). */
  encabezado?: ReactNode;
  /** Contenido posterior a la lista (p. ej. acción para volver). */
  pie?: ReactNode;
}) {
  const setOperacion = useSessionStore((s) => s.setOperacion);
  const operacion = useSessionStore((s) => s.operacion);
  const mensaje = useSessionStore((s) => s.mensajeOperacion);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [claveTemporal, setClaveTemporal] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, touchedFields },
  } = useForm<Formulario>({ resolver: crearZodResolver(esquema) as never, defaultValues: { cedula: '', nombres: '', apellidos: '', telefono: '', email: '' } });

  const cargar = async () => {
    setCargando(true);
    const res = await contenedor.usuarios.listarAMiCargo();
    setCargando(false);
    if (res.ok) setUsuarios(res.valor);
    else setErrorGeneral(res.error);
  };

  useEffect(() => {
    (async () => { await cargar(); })();
  }, []);

  const onSubmit = async (data: Formulario) => {
    setErrorGeneral(null);
    setClaveTemporal(null);
    setOperacion('cargando', 'Creando usuario…');
    const res = await contenedor.casos.crearUsuario.ejecutar({
      cedula: data.cedula,
      nombres: data.nombres,
      apellidos: data.apellidos,
      telefono: data.telefono?.trim() ? data.telefono.trim() : null,
      email: data.email,
    });
    if (!res.ok) {
      setOperacion('error', res.error);
      setErrorGeneral(res.error);
      return;
    }
    setClaveTemporal(res.valor.tempPassword);
    setOperacion('exito', 'Usuario creado.');
    reset();
    await cargar();
  };

  const desactivar = async (id: string) => {
    setErrorGeneral(null);
    const res = await contenedor.casos.desactivarUsuario.ejecutar(id);
    if (!res.ok) {
      setErrorGeneral(res.error);
      return;
    }
    await cargar();
  };

  const reenviar = async (email: string | null) => {
    setErrorGeneral(null);
    setOperacion('cargando', 'Reenviando confirmación…');
    const res = await contenedor.auth.reenviarConfirmacion(email ?? '');
    if (!res.ok) {
      setOperacion('error', res.error);
      setErrorGeneral(res.error);
      return;
    }
    setOperacion('exito', 'Correo de confirmación reenviado.');
  };

  // Un único contenedor virtualizado: el formulario y los estados van en la
  // cabecera y el pie de la lista, para no anidar FlatList en un ScrollView.
  return (
    <FlatList
      className="flex-1"
      data={usuarios}
      keyExtractor={(u) => u.id}
      renderItem={({ item }) => (
        <View className="px-6">
          <View className="mb-2 flex-row items-center justify-between rounded-xl border border-foreground px-4 py-2">
            <View>
              <Text className="font-semibold text-foreground">{item.nombres} {item.apellidos}</Text>
              <Text className="text-sm text-foreground">{item.cedula} · {item.rol}</Text>
              <Text className="text-sm text-foreground">Estado: {item.estado}</Text>
            </View>
            <View className="items-end gap-2">
              {item.estado === 'PENDIENTE' && item.email ? (
                <Pressable onPress={() => void reenviar(item.email)} accessibilityRole="button" accessibilityLabel="Reenviar confirmación">
                  <Text className="text-xs font-semibold text-accent">Reenviar confirmación</Text>
                </Pressable>
              ) : null}
              {item.estado !== 'DESACTIVADO' && (
                <Pressable onPress={() => desactivar(item.id)}>
                  <Text className="text-error">Desactivar</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
      ListHeaderComponent={
        <View className="gap-4 px-6 pt-4">
          {encabezado}
          {operacion === 'cargando' && <LottieFeedback tipo="carga" mensaje={mensaje ?? 'Cargando…'} />}

          {errorGeneral && (
            <View className="rounded-xl bg-error px-4 py-2">
              <Text className="text-white">{errorGeneral}</Text>
            </View>
          )}

          {operacion === 'exito' && mensaje && (
            <View className="rounded-xl bg-success/15 px-4 py-2">
              <Text className="text-sm font-semibold text-success">{mensaje}</Text>
            </View>
          )}

          {claveTemporal && (
            <View className="rounded-xl bg-secondary px-4 py-2">
              <Text className="font-semibold text-foreground">Clave temporal (comunicar al titular):</Text>
              <Text className="text-foreground">{claveTemporal}</Text>
            </View>
          )}

          <Text className="text-lg font-bold text-foreground">{titulo}</Text>

          <CampoFormulario
            etiqueta="Cédula"
            pista="Obligatorio · cédula ecuatoriana válida"
            error={errors.cedula?.message}
            valido={Boolean(touchedFields.cedula && !errors.cedula)}
          >
            <Controller control={control} name="cedula" render={({ field: { onChange, onBlur, value } }) => (
              <CampoTexto etiqueta="Cédula" valor={value} onChangeText={onChange} onBlur={onBlur} teclado="number-pad"
                error={errors.cedula?.message} valido={Boolean(touchedFields.cedula && !errors.cedula)} />
            )} />
          </CampoFormulario>

          <CampoFormulario
            etiqueta="Nombres"
            pista="Obligatorio · mínimo 2 caracteres"
            error={errors.nombres?.message}
            valido={Boolean(touchedFields.nombres && !errors.nombres)}
          >
            <Controller control={control} name="nombres" render={({ field: { onChange, onBlur, value } }) => (
              <CampoTexto etiqueta="Nombres" valor={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="words"
                error={errors.nombres?.message} valido={Boolean(touchedFields.nombres && !errors.nombres)} />
            )} />
          </CampoFormulario>

          <CampoFormulario
            etiqueta="Apellidos"
            pista="Obligatorio · mínimo 2 caracteres"
            error={errors.apellidos?.message}
            valido={Boolean(touchedFields.apellidos && !errors.apellidos)}
          >
            <Controller control={control} name="apellidos" render={({ field: { onChange, onBlur, value } }) => (
              <CampoTexto etiqueta="Apellidos" valor={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="words"
                error={errors.apellidos?.message} valido={Boolean(touchedFields.apellidos && !errors.apellidos)} />
            )} />
          </CampoFormulario>

          <CampoFormulario
            etiqueta="Teléfono"
            pista="Opcional · 7 a 15 dígitos"
            error={errors.telefono?.message}
            valido={Boolean(touchedFields.telefono && !errors.telefono)}
          >
            <Controller control={control} name="telefono" render={({ field: { onChange, onBlur, value } }) => (
              <CampoTexto etiqueta="Teléfono" valor={value ?? ''} onChangeText={onChange} onBlur={onBlur} teclado="phone-pad"
                error={errors.telefono?.message} valido={Boolean(touchedFields.telefono && !errors.telefono)} />
            )} />
          </CampoFormulario>

          <CampoFormulario
            etiqueta="Correo"
            pista="Obligatorio · correo electrónico válido"
            error={errors.email?.message}
            valido={Boolean(touchedFields.email && !errors.email)}
          >
            <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
              <CampoTexto etiqueta="Correo" valor={value} onChangeText={onChange} onBlur={onBlur} teclado="email-address"
                error={errors.email?.message} valido={Boolean(touchedFields.email && !errors.email)} />
            )} />
          </CampoFormulario>

          <Boton titulo="Crear usuario" onPress={handleSubmit(onSubmit)} />

          <Text className="mt-4 text-lg font-bold text-foreground">Usuarios a mi cargo</Text>
          {cargando && <LottieFeedback tipo="carga" mensaje="Cargando…" />}
        </View>
      }
      ListEmptyComponent={
        <Text className="px-6 py-4 text-center text-sm text-texto-secundario">
          No hay usuarios a tu cargo.
        </Text>
      }
      ListFooterComponent={pie ? <View className="px-6 pb-8 pt-2">{pie}</View> : <View className="pb-8" />}
    />
  );
}