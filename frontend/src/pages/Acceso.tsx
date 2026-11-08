import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { iniciarSesion, registrarUsuario } from '../lib/api';
import { useSesion } from '../lib/useSesion';
import { Marco } from '../components/Marco';

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
    <section className="py-3 lg:py-12"><p className="etiqueta-seccion">Cultivamos confianza</p><h1 className="mt-5 font-campo text-4xl leading-tight sm:text-5xl">{esRegistro ? 'Tu próximo paso empieza aquí.' : 'Qué bueno volver a encontrarnos.'}</h1><p className="mt-6 max-w-md text-lg leading-relaxed text-oliva">{esRegistro ? 'Crea tu cuenta de agricultor y cuéntanos qué es importante para ti.' : 'Ingresa a tu espacio y mantén tu perfil y tus prioridades al día.'}</p><div className="mt-9 rounded-2xl border border-pino/15 bg-arena/60 p-6"><p className="font-campo text-xl">Con raíces en Cotopaxi</p><p className="mt-2 text-sm leading-relaxed text-oliva">Un espacio pensado para las personas que cuidan nuestra tierra.</p></div></section>
    <section aria-label={esRegistro ? 'Registro de agricultor' : 'Acceso a tu cuenta'} className="tarjeta p-6 sm:p-9">
      <h2 className="text-2xl font-semibold">{esRegistro ? 'Crear mi cuenta' : 'Iniciar sesión'}</h2>
      <p className="mt-2 text-sm text-oliva">{esRegistro ? 'Los campos con * son obligatorios.' : 'Usa el correo con el que te registraste.'}</p>
      <form className="mt-7 space-y-5" onSubmit={manejarEnvio} aria-busy={acceso.isPending}>
        {esRegistro && <><label className="campo">Nombre completo *<input name="nombre" autoComplete="name" required minLength={2} maxLength={120} /></label><label className="campo">Parroquia <span className="font-normal text-oliva">(opcional)</span><input name="parroquia" autoComplete="address-level3" maxLength={100} /></label></>}
        <label className="campo">Correo electrónico *<input name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} /></label>
        <div><label className="campo" htmlFor="password">Contraseña *</label><div className="mt-2 flex items-center gap-2"><input className="min-w-0 flex-1" id="password" name="password" type={mostrarPassword ? 'text' : 'password'} autoComplete={esRegistro ? 'new-password' : 'current-password'} required aria-describedby="ayuda-password" /><button className="enlace-nav shrink-0" type="button" aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={mostrarPassword} aria-controls="password" onClick={() => establecerMostrar(!mostrarPassword)}>{mostrarPassword ? 'Ocultar' : 'Mostrar'}<span className="sr-only"> contraseña</span></button></div><p id="ayuda-password" className="mt-2 text-xs leading-relaxed text-oliva">{esRegistro ? 'Al menos 15 caracteres. Puedes usar una frase; máximo 72 bytes UTF-8.' : 'Tu sesión dura hasta 15 minutos en esta pestaña.'}</p></div>
        {(errorValidacion || acceso.isError) && <p role="alert" className="aviso-error">{errorValidacion || acceso.error?.message}</p>}
        <button className="boton-primario w-full" disabled={acceso.isPending || sesion.estaValidando} type="submit">{acceso.isPending ? 'Confirmando tu acceso…' : esRegistro ? 'Registrarme' : 'Ingresar a mi cuenta'}</button>
      </form><p className="mt-6 text-sm text-oliva">{esRegistro ? '¿Ya tienes una cuenta?' : '¿Es tu primera visita?'} <Link className="font-semibold text-pino underline underline-offset-4" to={esRegistro ? '/login' : '/registro'}>{esRegistro ? 'Inicia sesión' : 'Crea tu cuenta'}</Link></p>
    </section></div></Marco>;
}
