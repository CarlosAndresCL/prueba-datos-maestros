import { useState } from 'react';
import { useLista } from '../hooks/useLista';
import { Lista, Entrada } from '../components/Campos';
import * as api from '../api';

const FORM_VACIO = {
    motivo: '', categoriaMotivo: '', productoSustituto: '', material: '', marca: '',
    clasificacion: '', temporada: '',
    departamento: '', categoria: '', subcategoria: '', tipo: '',
    precioSugeridoSustituto: '', skuReferencia: '', factorEscalada: '', promedioVentaMensual: '',
};

const OBLIGATORIOS = {
    motivo: 'Motivo',
    categoriaMotivo: 'Categoría motivo',
    productoSustituto: 'Producto sustituto / no sustituto',
    material: 'Material',
    marca: 'Marca',
    clasificacion: 'Clasificación',
    departamento: 'Departamento',
    categoria: 'Categoría',
    subcategoria: 'Subcategoría',
    tipo: 'Tipo',
};

function validar(f) {
    const errores = [];
    for (const [campo, etiqueta] of Object.entries(OBLIGATORIOS)) {
        if (!f[campo]) errores.push(`El campo "${etiqueta}" es obligatorio.`);
    }
    if (f.clasificacion === 'Temporada' && !f.temporada) {
        errores.push('Debe seleccionar la Temporada.');
    }
    if (f.productoSustituto === 'Producto Sustituto') {
        if (!(Number(f.precioSugeridoSustituto) > 0)) errores.push('El precio sugerido del sustituto debe ser mayor que 0.');
        if (!f.skuReferencia.trim()) errores.push('El SKU de referencia es obligatorio.');
        if (!(Number(f.factorEscalada) > 0)) errores.push('El factor de escalada debe ser mayor que 0.');
    }
    if (f.productoSustituto === 'Producto No sustituto') {
        const n = Number(f.promedioVentaMensual);
        if (f.promedioVentaMensual === '' || !Number.isInteger(n) || n < 0) {
            errores.push('El promedio de venta mensual debe ser un número entero mayor o igual a 0.');
        }
    }
    return errores;
}



export default function Etapa1({ usuario }) {
    const [form, setForm] = useState(FORM_VACIO);
    const [errores, setErrores] = useState([]);
    const [enviando, setEnviando] = useState(false);
    const [creada, setCreada] = useState(null);
    const mostrarError = (mensaje) => setErrores([mensaje]);

    // Catálogos independientes
    const motivos = useLista(true, () => api.obtenerCatalogo('Motivo'), [], mostrarError);
    const sustitutos = useLista(true, () => api.obtenerCatalogo('ProductoSustituto'), [], mostrarError);
    const materiales = useLista(true, () => api.obtenerCatalogo('Material'), [], mostrarError);
    const marcas = useLista(true, () => api.obtenerCatalogo('Marca'), [], mostrarError);
    const clasificaciones = useLista(true, () => api.obtenerCatalogo('Clasificacion'), [], mostrarError);
    const temporadas = useLista(true, () => api.obtenerCatalogo('Temporada'), [], mostrarError);
    const departamentos = useLista(true, () => api.obtenerDepartamentos(), [], mostrarError);

    // Listas dependientes
    const categoriasMotivo = useLista(
        form.motivo, () => api.obtenerCategoriasMotivo(form.motivo), [form.motivo], mostrarError);
    const categorias = useLista(
        form.departamento, () => api.obtenerCategorias(form.departamento), [form.departamento], mostrarError);
    const subcategorias = useLista(
        form.departamento && form.categoria,
        () => api.obtenerSubcategorias(form.departamento, form.categoria),
        [form.departamento, form.categoria], mostrarError);
    const tipos = useLista(
        form.departamento && form.categoria && form.subcategoria,
        () => api.obtenerTipos(form.departamento, form.categoria, form.subcategoria),
        [form.departamento, form.categoria, form.subcategoria], mostrarError);

    const poner = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

    // Cada cambio vacía los campos que dependen de él
    const cambiarMotivo = (v) => setForm((f) => ({ ...f, motivo: v, categoriaMotivo: '' }));
    const cambiarClasificacion = (v) => setForm((f) => ({ ...f, clasificacion: v, temporada: '' }));
    const cambiarSustituto = (v) =>
        setForm((f) => ({
            ...f, productoSustituto: v,
            precioSugeridoSustituto: '', skuReferencia: '', factorEscalada: '', promedioVentaMensual: '',
        }));
    const cambiarDepartamento = (v) =>
        setForm((f) => ({ ...f, departamento: v, categoria: '', subcategoria: '', tipo: '' }));
    const cambiarCategoria = (v) => setForm((f) => ({ ...f, categoria: v, subcategoria: '', tipo: '' }));
    const cambiarSubcategoria = (v) => setForm((f) => ({ ...f, subcategoria: v, tipo: '' }));

    const planificado = !form.clasificacion
        ? '—'
        : form.clasificacion === 'Stocks' ? 'No planificado' : 'Planificado';

    async function enviar(e) {
        e.preventDefault();
        setCreada(null);
        const problemas = validar(form);
        if (problemas.length) {
            setErrores(problemas);
            return;
        }
        setErrores([]);
        setEnviando(true);
        try {
            const resp = await api.crearSolicitud({ ...form, creadoPor: usuario });
            setCreada(resp.solicitud);
            setForm(FORM_VACIO);
        } catch (err) {
            setErrores(err.errores?.length ? err.errores : [err.message]);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <form onSubmit={enviar} noValidate>
            {creada && (
                <div className="aviso-ok">
                    Solicitud <strong>{creada.Codigo}</strong> creada. Estado: {creada.Estado}.
                    Queda pendiente para el Usuario 2.
                </div>
            )}
            {errores.length > 0 && (
                <div className="aviso-error">
                    Revise lo siguiente:
                    <ul>
                        {errores.map((m) => (
                            <li key={m}>{m}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="tarjeta">
                <h2>Motivo</h2>
                <div className="rejilla">
                    <Lista etiqueta="Motivo" valor={form.motivo} opciones={motivos} onChange={cambiarMotivo} />
                    <Lista etiqueta="Categoría motivo" valor={form.categoriaMotivo}
                        opciones={categoriasMotivo} onChange={poner('categoriaMotivo')}
                        deshabilitado={!form.motivo} />
                </div>
            </div>

            <div className="tarjeta">
                <h2>Producto</h2>
                <div className="rejilla">
                    <Lista etiqueta="Producto sustituto / no sustituto" valor={form.productoSustituto}
                        opciones={sustitutos} onChange={cambiarSustituto} />
                    <Lista etiqueta="Material" valor={form.material} opciones={materiales} onChange={poner('material')} />
                    <Lista etiqueta="Marca" valor={form.marca} opciones={marcas} onChange={poner('marca')} />
                    {form.productoSustituto === 'Producto Sustituto' && (
                        <>
                            <Entrada etiqueta="Precio sugerido sustituto" tipo="number" paso="0.01" min="0"
                                valor={form.precioSugeridoSustituto} onChange={poner('precioSugeridoSustituto')} />
                            <Entrada etiqueta="SKU referencia" valor={form.skuReferencia}
                                onChange={poner('skuReferencia')} />
                            <Entrada etiqueta="Factor escalada" tipo="number" paso="0.01" min="0"
                                valor={form.factorEscalada} onChange={poner('factorEscalada')} />
                        </>
                    )}
                    {form.productoSustituto === 'Producto No sustituto' && (
                        <Entrada etiqueta="Promedio venta mensual" tipo="number" paso="1" min="0"
                            valor={form.promedioVentaMensual} onChange={poner('promedioVentaMensual')} />
                    )}
                </div>
            </div>

            <div className="tarjeta">
                <h2>Clasificación</h2>
                <div className="rejilla">
                    <Lista etiqueta="Clasificación" valor={form.clasificacion}
                        opciones={clasificaciones} onChange={cambiarClasificacion} />
                    {form.clasificacion === 'Temporada' && (
                        <Lista etiqueta="Temporada" valor={form.temporada}
                            opciones={temporadas} onChange={poner('temporada')} />
                    )}
                    <div className="campo">
                        <label>Producto planificado (automático)</label>
                        <div className="solo-lectura">{planificado}</div>
                    </div>
                </div>
            </div>

            <div className="tarjeta">
                <h2>Jerarquía</h2>
                <div className="rejilla">
                    <Lista etiqueta="Departamento" valor={form.departamento}
                        opciones={departamentos} onChange={cambiarDepartamento} />
                    <Lista etiqueta="Categoría" valor={form.categoria} opciones={categorias}
                        onChange={cambiarCategoria} deshabilitado={!form.departamento} />
                    <Lista etiqueta="Subcategoría" valor={form.subcategoria} opciones={subcategorias}
                        onChange={cambiarSubcategoria} deshabilitado={!form.categoria} />
                    <Lista etiqueta="Tipo" valor={form.tipo} opciones={tipos}
                        onChange={poner('tipo')} deshabilitado={!form.subcategoria} />
                </div>
            </div>

            <button className="boton" type="submit" disabled={enviando}>
                {enviando ? 'Guardando...' : 'Crear solicitud'}
            </button>
        </form>
    );
}