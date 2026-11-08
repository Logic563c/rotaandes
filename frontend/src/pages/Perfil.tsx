import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { actualizarPerfil, ErrorApi } from '../lib/api';
import { useSesion } from '../lib/useSesion';
import type { UsuarioPublico } from '../types/api';
import { Marco } from '../components/Marco';
function FormularioPerfil({ usuario }: { usuario: UsuarioPublico }) {
  const sesion = useSesion();
  const [prioridades, establecerPrioridades] = useState({ prioridad_agua: usuario.prioridad_agua ?? 3, prioridad_suelo: usuario.prioridad_suelo ?? 3, prioridad_ingresos: usuario.prioridad_ingresos ?? 3 });
  const cambio = useMutation({ mutationFn: async (formulario: FormData) => {
    if (!sesion.token) throw new ErrorApi('Inicia sesión de nuevo.', 401);
    const tokenSolicitud = sesion.token;
    try {
      const nuevoUsuario = await actualizarPerfil(tokenSolicitud, { nombre: String(formulario.get('nombre') ?? ''), parroquia: String(formulario.get('parroquia') ?? '').trim() || null, telefono: String(formulario.get('telefono') ?? '').trim() || null, ...prioridades });
      return { nuevoUsuario, tokenSolicitud };
    } catch (error: unknown) {
      if (error instanceof ErrorApi && error.codigoHttp === 401) sesion.cerrarSesion(tokenSolicitud);
      throw error;
    }
  }, onSuccess: ({ nuevoUsuario, tokenSolicitud }) => { sesion.guardarPerfil(nuevoUsuario, tokenSolicitud); } });
  function manejarGuardado(evento: FormEvent<HTMLFormElement>) { evento.preventDefault(); cambio.mutate(new FormData(evento.currentTarget)); }
  return <form onSubmit={manejarGuardado} className="grid gap-7 lg:grid-cols-2" aria-busy={cambio.isPending}>
    <section className="tarjeta space-y-5 p-6 sm:p-8"><h2 className="text-xl font-semibold">Datos personales</h2><label className="campo">Nombre completo *<input name="nombre" required minLength={2} maxLength={120} defaultValue={usuario.nombre} autoComplete="name" /></label><label className="campo">Parroquia<input name="parroquia" maxLength={100} defaultValue={usuario.parroquia ?? ''} autoComplete="address-level3" /></label><label className="campo">Teléfono <span className="font-normal text-oliva">(opcional)</span><input name="telefono" type="tel" maxLength={25} defaultValue={usuario.telefono ?? ''} autoComplete="tel" /></label><p className="break-all text-sm text-oliva">Correo: {usuario.email}</p><p className="text-xs text-oliva">El correo y el tipo de cuenta se conservan.</p></section>
    <section className="tarjeta p-6 sm:p-8"><h2 className="text-xl font-semibold">Mis prioridades</h2><p className="mt-2 text-sm leading-relaxed text-oliva">Del 1 (menor importancia) al 5 (mayor importancia). Puedes dar la misma importancia a varias prioridades.</p><div className="mt-7 space-y-8">{([{ clave: 'prioridad_agua', titulo: 'Cuidar el agua', simbolo: '◉' }, { clave: 'prioridad_suelo', titulo: 'Cuidar el suelo', simbolo: '❧' }, { clave: 'prioridad_ingresos', titulo: 'Mejorar los ingresos', simbolo: '$' }] as const).map(({ clave, titulo, simbolo }) => <div key={clave}><label className="flex items-center justify-between gap-3 font-semibold" htmlFor={clave}><span><span aria-hidden="true" className="mr-2 text-arcilla">{simbolo}</span>{titulo}</span><span className="rounded-lg bg-arena px-3 py-1">{prioridades[clave]} / 5</span></label><input className="mt-4 w-full accent-pino" id={clave} name={clave} type="range" min={1} max={5} step={1} value={prioridades[clave]} onChange={(evento) => { establecerPrioridades({ ...prioridades, [clave]: Number(evento.target.value) }); cambio.reset(); }} /><div className="mt-1 flex justify-between text-xs text-oliva"><span>Menor importancia</span><span>Mayor importancia</span></div></div>)}</div></section>
    <div className="lg:col-span-2"><div aria-live="polite">{cambio.isSuccess && <p role="status" className="mb-4 rounded-xl border border-pino/20 bg-white p-4">Tu perfil se guardó correctamente.</p>}{cambio.isError && <p role="alert" className="aviso-error mb-4">{cambio.error.message}</p>}</div><button className="boton-primario w-full sm:w-auto" disabled={cambio.isPending} type="submit">{cambio.isPending ? 'Guardando cambios…' : 'Guardar cambios'}</button></div>
  </form>;
}
export function Perfil() {
  const { usuario } = useSesion();
  if (!usuario) return null;
  return <Marco><p className="etiqueta-seccion">Mi perfil</p><h1 className="mt-4 font-campo text-4xl sm:text-5xl">Tus datos, tus prioridades.</h1><p className="mt-4 mb-9 text-oliva">Mantén tu información al día. Los campos con * son obligatorios.</p><FormularioPerfil key={usuario.id} usuario={usuario} /></Marco>;
}
