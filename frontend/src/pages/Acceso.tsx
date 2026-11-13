import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { iniciarSesion, registrarUsuario } from '../lib/api';
import { useSesion } from '../lib/useSesion';
import { Marco } from '../components/Marco';
import { Icono, Marca } from '../components/Iconos';
import { CreditoFoto } from '../components/Fotografia';
import { conjuntoFoto, FOTOS, fuenteFoto } from '../lib/fotografias';

export function Acceso({ esRegistro }: { esRegistro: boolean }) {
  const sesion = useSesion();
  const navegar = useNavigate();
  const [mostrarPassword, establecerMostrar] = useState(false);
  const [errorValidacion, establecerError] = useState('');
  const acceso = useMutation({ mutationFn: async (formulario: FormData) => {
    const email = String(formulario.get('email') ?? '').trim();
    const password = String(formulario.get('password') ?? '');
    const respuesta = esRegistro ? await registrarUsuario({ email, password, nombre: String(formulario.get('nombre') ?? ''), parroquia: String(formulario.get('parroquia') ?? '') }) : await iniciarSesion({ email, password });
    await sesion.confirmarSesion(respuesta.token);
  }, onSuccess: () => { void navegar('/inicio', { replace: true }); } });
  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const password = String(formulario.get('password') ?? '');
    if (new TextEncoder().encode(password).length > 72 || password.includes('\0') || (esRegistro && Array.from(password).length < 15)) {
      establecerError('Usa al menos 15 caracteres y hasta 72 bytes UTF-8 (las tildes pueden ocupar más de un byte).'); return;
    }
    establecerError(''); acceso.mutate(formulario);
  }
  if (sesion.usuario) return <Navigate to="/inicio" replace />;
  return <Marco><div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
    <section className="py-3 lg:py-12"><p className="etiqueta-seccion">Cultivamos confianza</p><h1 className="mt-5 font-campo text-4xl leading-tight sm:text-5xl">{esRegistro ? 'Tu próximo paso empieza aquí.' : 'Qué bueno volver a encontrarnos.'}</h1><p className="mt-6 max-w-md text-lg leading-relaxed text-oliva">{esRegistro ? 'Crea tu cuenta de agricultor y cuéntanos qué es importante para ti.' : 'Ingresa a tu espacio y mantén tu perfil y tus prioridades al día.'}</p><div className="relative mt-9 overflow-hidden rounded-3xl bg-pino p-6 text-crema"><img className="banner-foto__imagen" src={fuenteFoto(FOTOS.laderas)} srcSet={conjuntoFoto(FOTOS.laderas)} sizes="(min-width: 1024px) 40vw, 100vw" alt="" aria-hidden="true" decoding="async" /><div aria-hidden="true" className="banner-foto__velo banner-foto__velo--uniforme" /><div className="relative flex items-center gap-3"><Marca className="size-12 shrink-0" /><p className="font-campo text-xl">Con raíces en Cotopaxi</p></div><p className="relative mt-3 text-sm leading-relaxed text-crema/90">Un espacio pensado para las personas que cuidan nuestra tierra.</p>
      <ul className="relative mt-4 space-y-2 text-sm">{([['nube', 'Clima de tu zona con datos de la NASA'], ['calendario', 'Calendario de siembra con sus motivos'], ['rotacion', 'Tres rotaciones para comparar']] as const).map(([icono, texto]) => <li key={texto} className="flex items-center gap-2"><Icono nombre={icono} className="size-5 shrink-0 text-maiz" />{texto}</li>)}</ul><div className="relative mt-4"><CreditoFoto foto={FOTOS.laderas} claro /></div></div></section>
    <section aria-label={esRegistro ? 'Registro de agricultor' : 'Acceso a tu cuenta'} className="tarjeta tarjeta--acento p-6 sm:p-9">
      <h2 className="text-2xl font-semibold">{esRegistro ? 'Crear mi cuenta' : 'Iniciar sesión'}</h2>
      <p className="mt-2 text-sm text-oliva">{esRegistro ? 'Los campos con * son obligatorios.' : 'Usa el correo con el que te registraste.'}</p>
      <form className="mt-7 space-y-5" onSubmit={manejarEnvio} aria-busy={acceso.isPending} aria-describedby={errorValidacion || acceso.isError ? 'error-acceso' : undefined}>
        {esRegistro && <><label className="campo">Nombre completo *<input name="nombre" autoComplete="name" required minLength={2} maxLength={120} /></label><label className="campo">Parroquia <span className="font-normal text-oliva">(opcional)</span><input name="parroquia" autoComplete="address-level3" maxLength={100} /></label></>}
        <label className="campo">Correo electrónico *<input name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} /></label>
        <div><label className="campo" htmlFor="password">Contraseña *</label><div className="mt-2 flex items-center gap-2"><input className="min-w-0 flex-1" id="password" name="password" type={mostrarPassword ? 'text' : 'password'} autoComplete={esRegistro ? 'new-password' : 'current-password'} required aria-describedby="ayuda-password" /><button className="enlace-nav shrink-0" type="button" aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={mostrarPassword} aria-controls="password" onClick={() => establecerMostrar(!mostrarPassword)}>{mostrarPassword ? 'Ocultar' : 'Mostrar'}<span className="sr-only"> contraseña</span></button></div><p id="ayuda-password" className="mt-2 text-xs leading-relaxed text-oliva">{esRegistro ? 'Al menos 15 caracteres. Puedes usar una frase; máximo 72 bytes UTF-8.' : 'Tu sesión dura hasta 15 minutos en esta pestaña.'}</p></div>
        {(errorValidacion || acceso.isError) && <p id="error-acceso" role="alert" className="aviso-error">{errorValidacion || acceso.error?.message}</p>}
        <button className="boton-primario w-full" disabled={acceso.isPending || sesion.estaValidando} type="submit">{acceso.isPending ? 'Confirmando tu acceso…' : esRegistro ? 'Registrarme' : 'Ingresar a mi cuenta'}</button>
      </form><p className="mt-6 text-sm text-oliva">{esRegistro ? '¿Ya tienes una cuenta?' : '¿Es tu primera visita?'} <Link className="font-semibold text-pino underline underline-offset-4" to={esRegistro ? '/login' : '/registro'}>{esRegistro ? 'Inicia sesión' : 'Crea tu cuenta'}</Link></p>
    </section></div></Marco>;
}
