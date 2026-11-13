// Registro de fotografías reales de Cotopaxi con licencia verificada (ver public/imagenes/CREDITOS.md).

export interface FotoRegistrada { archivo: string; anchos: readonly number[]; autor: string; licencia: 'CC BY 2.0' | 'CC BY-SA 4.0'; licenciaUrl: string; original: string; descripcion: string }

export const FOTOS = {
  portada: { archivo: 'portada-cotopaxi-campos', anchos: [1024, 1600], autor: 'David Ceballos', licencia: 'CC BY 2.0', licenciaUrl: 'https://creativecommons.org/licenses/by/2.0/deed.es', original: 'https://commons.wikimedia.org/wiki/File:Cotopaxi_se_cree_Fuji_(46655072001).jpg', descripcion: 'El volcán Cotopaxi sobre un mar de nubes, con potreros y una casa de campo en primer plano.' },
  invernaderos: { archivo: 'campos-invernaderos-cotopaxi', anchos: [720, 1200], autor: 'Arabsalam', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es', original: 'https://commons.wikimedia.org/wiki/File:Road_Hacienda_La_Cienega_to_Quito_Ecuador_1662.jpg', descripcion: 'Campos verdes e invernaderos cerca de la Hacienda La Ciénega, con el Cotopaxi al fondo entre nubes.' },
  valle: { archivo: 'valle-cotopaxi-cabecera', anchos: [800, 1600], autor: 'Arabsalam', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es', original: 'https://commons.wikimedia.org/wiki/File:Road_to_Quilotoa_Ecuador_1611.jpg', descripcion: 'El Cotopaxi asomando sobre las nubes que cubren el valle.' },
  laderas: { archivo: 'laderas-cultivadas-latacunga', anchos: [720, 1280], autor: 'Gideoraielgave', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es', original: 'https://commons.wikimedia.org/wiki/File:Valle_en_Latacunga_-_Cotopaxi_-_Ecuador_III.jpg', descripcion: 'Laderas cultivadas en parcelas en el valle de Latacunga.' },
  parcelas: { archivo: 'parcelas-cotopaxi', anchos: [720, 1280], autor: 'Arabsalam', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es', original: 'https://commons.wikimedia.org/wiki/File:Road_to_Quilotoa_Cotopaxi_view_Ecuador_1614.jpg', descripcion: 'Parcelas en las lomas con el Cotopaxi al fondo.' },
} as const satisfies Record<string, FotoRegistrada>;

export const fuenteFoto = (foto: FotoRegistrada) => `/imagenes/${foto.archivo}-${foto.anchos[0]}.webp`;
export const conjuntoFoto = (foto: FotoRegistrada) => foto.anchos.map((ancho) => `/imagenes/${foto.archivo}-${ancho}.webp ${ancho}w`).join(', ');
