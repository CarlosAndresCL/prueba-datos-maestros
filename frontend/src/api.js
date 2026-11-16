const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Llama al backend y convierte los errores en un Error con mensaje legible
async function pedir(ruta, opciones) {
    const resp = await fetch(`${API}${ruta}`, opciones);
    const datos = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const error = new Error(datos.mensaje || 'Ocurrió un error inesperado.');
        error.errores = datos.errores || [];
        throw error;
    }
    return datos;
}

// URLSearchParams codifica bien tildes, espacios y "/"
const q = (params) => new URLSearchParams(params).toString();

export const obtenerCatalogo = (tipo) => pedir(`/catalogos/${tipo}`);
export const obtenerCategoriasMotivo = (motivo) => pedir(`/categorias-motivo?${q({ motivo })}`);

export const obtenerDepartamentos = () => pedir('/jerarquia/departamentos');
export const obtenerCategorias = (departamento) =>
    pedir(`/jerarquia/categorias?${q({ departamento })}`);
export const obtenerSubcategorias = (departamento, categoria) =>
    pedir(`/jerarquia/subcategorias?${q({ departamento, categoria })}`);
export const obtenerTipos = (departamento, categoria, subcategoria) =>
    pedir(`/jerarquia/tipos?${q({ departamento, categoria, subcategoria })}`);

export const crearSolicitud = (datos) =>
    pedir('/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });

export const obtenerPendientes = () => pedir('/solicitudes/pendientes');

export const obtenerSolicitud = (id) => pedir(`/solicitudes/${encodeURIComponent(id)}`);

export const completarSolicitud = (id, datos) =>
    pedir(`/solicitudes/${encodeURIComponent(id)}/completar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });