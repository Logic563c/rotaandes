import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Marco } from './Marco';
import { ContextoSesion } from '../lib/useSesion';
import type { Sesion } from '../lib/useSesion';

const sesionPublica: Sesion = { usuario: undefined, token: null, estaValidando: false, error: null,
  confirmarSesion: async () => {}, cerrarSesion: () => {}, reintentar: () => {}, guardarPerfil: () => {}, esSesionActual: () => false };
function mostrar(ruta: string) {
  render(<MemoryRouter initialEntries={[ruta]}><ContextoSesion.Provider value={sesionPublica}><Marco>
    <h1>Contenido de prueba</h1><label>Campo de prueba<input /></label><button>Acción de prueba</button>
  </Marco></ContextoSesion.Provider></MemoryRouter>);
}
describe('Ambientación común y contenido accesible', () => {
  it.each(['/login', '/registro', '/perfil', '/terrenos', '/tecnico', '/glosario', '/fuentes'])('comparte el paisaje decorativo y sus créditos en %s sin reemplazar controles', (ruta) => {
    mostrar(ruta);
    const fondo = document.querySelector('.marco__ambiente');
    expect(fondo).toHaveAttribute('aria-hidden', 'true');
    expect(fondo?.querySelector('img')).toHaveAttribute('alt', '');
    expect(fondo?.querySelector('img')?.getAttribute('srcset')).toContain('1280w');
    expect(document.querySelector('.marco__credito')).toHaveTextContent('Foto: Arabsalam');
    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/deed.es');
    expect(screen.getByLabelText('Campo de prueba')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Acción de prueba' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute('href', '#contenido');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('deja la portada con su propia fotografía, sin duplicar fondos ni créditos ambientales', () => {
    mostrar('/');
    expect(document.querySelector('.marco__ambiente')).not.toBeInTheDocument();
    expect(document.querySelector('.marco__credito')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Contenido de prueba');
  });
});
