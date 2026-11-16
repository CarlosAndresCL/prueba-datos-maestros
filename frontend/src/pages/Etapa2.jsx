import { useEffect, useState } from 'react';
import { Lista, Entrada, Unidad } from '../components/Campos';
import { useLista } from '../hooks/useLista';
import * as api from '../api';

const UNIDADES_MEDIDA = [['cm', 'cm'], ['in', 'pulgadas'], ['ft', 'pies']];
const UNIDADES_PESO = [['kg', 'kg'], ['lb', 'libras']];

const CAJA_VACIA = { profundo: '', ancho: '', alto: '', peso: '', unidadMedida: 'cm', unidadPeso: 'kg' };

const FORM_VACIO = {
    paisOrigen: ' ',
    requiereRegistroSanitario: ' ',
    numeroRegistroSanitario: '',
    fechaEmision: ' ',
    fechaVencimiento: ' ',
    embalaje: ' ',
    altoApilado: ' ',
    unidadAltoApilado: 'cm',
    unidadesApilado: ' ' ,
    cantidadCajas: ' ',
    cajas: [CAJA_VACIA, CAJA_VACIA, CAJA_VACIA],
};

function validar(f) {
    const e = [];
    if (!f.paisOrigen) e.push('El país de origen es obligatorio.');
    if (!f.requiereRegistroSanitario) e.push('Debe indicar si requiere registro sanitario.');

    if (f.requiereRegistroSanitario === 'YES/SI') {
        if (!f.numeroRegistroSanitario.trim()) e.push('El número de registro sanitario es obligatorio.');
        if (!f.fechaEmision) e.push('La fecha de emisión es obligatoria.');
        if (!f.fechaVencimiento) e.push('La fecha de vencimiento es obligatoria.');
        if (f.fechaEmision && f.fechaVencimiento && f.fechaVencimiento < f.fechaEmision) {
            e.push('La fecha de vencimiento no puede ser anterior a la fecha de emisión.');
        }
    }

    if (!f.embalaje) e.push('El embalaje es obligatorio.');
    if (f.embalaje === 'Stacked / Apilado') {
        if (!(Number(f.altoApilado) > 0)) e.push('El alto apilado debe ser un número mayor que 0.');
        const u = Number(f.unidadesApilado);
        if (!Number.isInteger(u) || u <= 0) e.push('Las unidades por apilado deben ser un entero mayor que 0.');
    }

    if (!f.cantidadCajas) {
        e.push('Debe seleccionar la cantidad de cajas.');
    } else {
        const etiquetas = { profundo: 'Profundo', ancho: 'Ancho', alto: 'Alto', peso: 'Peso' };
        for (let i = 0; i < Number(f.cantidadCajas); i++) {
            for (const [campo, etiqueta] of Object.entries(etiquetas)) {
                if (!(Number(f.cajas[i][campo]) > 0)) {
                    e.push(`Caja ${i + 1}: ${etiqueta} debe ser un número mayor que 0.`);
                }
            }
        }
    }
    return e;
}

// Datos de la Etapa 1, solo lectura
function Resumen({ s }) {
    const filas = [
        ['Código: ', s.Codigo],
        ['Creado por: ', s.CreadoPor],
        ['Fecha de creación: ', new Date(s.FechaCreacion).toLocaleString('es-CR')],
        ['Motivo: ', s.Motivo],
        ['Categoría motivo: ', s.CategoriaMotivo],
        ['Producto sustituto / no sustituto: ', s.ProductoSustituto],
        ['Material: ', s.Material],
        ['Marca: ', s.Marca],
        ['Clasificación: ', s.Clasificacion],
        ['Temporada: ', s.Temporada],
        ['Producto planificado: ', s.ProductoPlanificado],
        ['Departamento: ', s.Departamento],
        ['Categoría: ', s.Categoria],
        ['Subcategoría: ', s.Subcategoria],
        ['Tipo: ', s.Tipo],
        ['Precio sugerido sustituto: ', s.PrecioSugeridoSustituto],
        ['SKU referencia: ', s.SkuReferencia],
        ['Factor escalada: ', s.FactorEscalada],
        ['Promedio venta mensual: ', s.PromedioVentaMensual],
    ].filter(([, valor]) => valor !== null && valor !== undefined);

    return (
        <div className="resumen">
            {filas.map(([etiqueta, valor]) => (
                <div key={etiqueta}>
                    <span>{etiqueta}</span>
                    <strong>{String(valor)}</strong>
                </div>
            ))}
        </div>
    );
}

export default function Etapa2({ usuario }) {
    const [pendientes, setPendientes] = useState([]);
    const [recarga, setRecarga] = useState(0);
    const [idBusqueda, setIdBusqueda] = useState('');
    const [solicitud, setSolicitud] = useState(null);
    const [form, setForm] = useState(FORM_VACIO);
    const [errores, setErrores] = useState([]);
    const [completada, setCompletada] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const mostrarError = (mensaje) => setErrores([mensaje]);

    // Lista de pendientes (se vuelve a pedir cuando "recarga" cambia)
    useEffect(() => {
        let activo = true;
        api.obtenerPendientes()
            .then((datos) => activo && setPendientes(datos))
            .catch((e) => activo && setErrores([e.message]));
        return () => {
            activo = false;
        };
    }, [recarga]);

    // Catálogos de la Etapa 2
    const paises = useLista(true, () => api.obtenerCatalogo('Pais'), [], mostrarError);
    const opcionesRegistro = useLista(true, () => api.obtenerCatalogo('RegistroSanitario'), [], mostrarError);
    const embalajes = useLista(true, () => api.obtenerCatalogo('Embalaje'), [], mostrarError);
    const cantidades = useLista(true, () => api.obtenerCatalogo('CantidadCajas'), [], mostrarError);

    const poner = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
    const ponerCaja = (i, campo) => (valor) =>
        setForm((f) => ({
            ...f,
            cajas: f.cajas.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)),
        }));

    // Cada cambio limpia lo que deja de aplicar
    const cambiarRegistro = (v) =>
        setForm((f) => ({
            ...f,
            requiereRegistroSanitario: v,
            numeroRegistroSanitario: '',
            fechaEmision: '',
            fechaVencimiento: '',
        }));
    const cambiarEmbalaje = (v) =>
        setForm((f) => ({ ...f, embalaje: v, altoApilado: '', unidadAltoApilado: 'cm', unidadesApilado: '' }));
    const cambiarCantidad = (v) => {
        const n = Number(v) || 0;
        setForm((f) => ({
            ...f,
            cantidadCajas: v,
            cajas: f.cajas.map((c, i) => (i < n ? c : CAJA_VACIA)),
        }));
    };

    async function abrir(id) {
        setErrores([]);
        setCompletada(null);
        if (!id) {
            setErrores(['Escriba el ID o código de la solicitud.']);
            return;
        }
        try {
            const s = await api.obtenerSolicitud(id);
            if (s.Estado !== 'Pendiente Etapa 2') {
                setSolicitud(null);
                setErrores([`La solicitud ${s.Codigo} ya fue completada y no se puede modificar.`]);
                return;
            }
            setForm(FORM_VACIO);
            setSolicitud(s);
        } catch (err) {
            setSolicitud(null);
            setErrores([err.message]);
        }
    }

    async function enviar(e) {
        e.preventDefault();
        const problemas = validar(form);
        if (problemas.length) {
            setErrores(problemas);
            return;
        }
        setErrores([]);
        setEnviando(true);
        try {
            const cantidad = Number(form.cantidadCajas);
            const resp = await api.completarSolicitud(solicitud.Id, {
                ...form,
                completadoPor: usuario,
                cajas: form.cajas.slice(0, cantidad),
            });
            setCompletada(resp.solicitud);
            setSolicitud(null);
            setForm(FORM_VACIO);
            setRecarga((r) => r + 1);
        } catch (err) {
            setErrores(err.errores?.length ? err.errores : [err.message]);
        } finally {
            setEnviando(false);
        }
    }

    const cantidadCajas = Number(form.cantidadCajas) || 0;

    return (
        <div>
            {completada && (
                <div className="aviso-ok">
                    Solicitud <strong>{completada.Codigo}</strong> completada por {completada.CompletadoPor}.
                    Estado: {completada.Estado}.
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

            {!solicitud ? (
                <>
                    <div className="tarjeta">
                        <h2>Buscar solicitud por ID</h2>
                        <div className="fila-busqueda">
                            <Entrada
                                etiqueta="ID o código (por ejemplo SKU-000003)"
                                valor={idBusqueda}
                                onChange={setIdBusqueda}
                            />
                            <button type="button" className="boton" onClick={() => abrir(idBusqueda.trim())}>
                                Buscar
                            </button>
                        </div>
                    </div>

                    <div className="tarjeta">
                        <h2>Solicitudes pendientes ({pendientes.length})</h2>
                        {pendientes.length === 0 ? (
                            <p>No hay solicitudes pendientes.</p>
                        ) : (
                            <div className="tabla-scroll">
                                <table className="tabla">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Creado por</th>
                                            <th>Fecha</th>
                                            <th>Motivo</th>
                                            <th>Tipo</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendientes.map((p) => (
                                            <tr key={p.Id}>
                                                <td>{p.Codigo}</td>
                                                <td>{p.CreadoPor}</td>
                                                <td>{new Date(p.FechaCreacion).toLocaleString('es-CR')}</td>
                                                <td>{p.Motivo}</td>
                                                <td>{p.Tipo}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="boton-sec"
                                                        onClick={() => abrir(p.Id)}
                                                    >
                                                        Abrir
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <form onSubmit={enviar} noValidate>
                    <div className="tarjeta">
                        <h2>Datos registrados en la Etapa 1 (solo lectura)</h2>
                        <Resumen s={solicitud} />
                    </div>

                    <div className="tarjeta">
                        <h2>Origen y registro sanitario</h2>
                        <div className="rejilla">
                            <Lista etiqueta="País de origen" valor={form.paisOrigen}
                                opciones={paises} onChange={poner('paisOrigen')} />
                            <Lista etiqueta="¿Requiere registro sanitario?" valor={form.requiereRegistroSanitario}
                                opciones={opcionesRegistro} onChange={cambiarRegistro} />
                            {form.requiereRegistroSanitario === 'YES/SI' && (
                                <>
                                    <Entrada etiqueta="Número de registro" valor={form.numeroRegistroSanitario}
                                        onChange={poner('numeroRegistroSanitario')} />
                                    <Entrada etiqueta="Fecha de emisión" tipo="date" valor={form.fechaEmision}
                                        onChange={poner('fechaEmision')} />
                                    <Entrada etiqueta="Fecha de vencimiento" tipo="date" valor={form.fechaVencimiento}
                                        onChange={poner('fechaVencimiento')} />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="tarjeta">
                        <h2>Embalaje</h2>
                        <div className="rejilla">
                            <Lista etiqueta="Embalaje" valor={form.embalaje}
                                opciones={embalajes} onChange={cambiarEmbalaje} />
                            {form.embalaje === 'Stacked / Apilado' && (
                                <>
                                    <Entrada etiqueta={`Alto apilado (${form.unidadAltoApilado})`} tipo="number"
                                        paso="any" min="0" valor={form.altoApilado} onChange={poner('altoApilado')} />
                                    <Unidad etiqueta="Unidad del alto apilado" valor={form.unidadAltoApilado}
                                        opciones={UNIDADES_MEDIDA} onChange={poner('unidadAltoApilado')} />
                                    <Entrada etiqueta="Unidades por apilado" tipo="number" paso="1" min="1"
                                        valor={form.unidadesApilado} onChange={poner('unidadesApilado')} />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="tarjeta">
                        <h2>Cajas por SKU</h2>
                        <p className="nota">
                            Las medidas y el peso se guardan siempre en cm y kg. Si ingresa pulgadas, pies o
                            libras, se convierten automáticamente.
                        </p>
                        <div className="rejilla">
                            <Lista etiqueta="Cantidad de cajas" valor={form.cantidadCajas}
                                opciones={cantidades} onChange={cambiarCantidad} />
                        </div>

                        {[0, 1, 2].map(
                            (i) =>
                                i < cantidadCajas && (
                                    <div className="caja" key={i}>
                                        <h3>Caja {i + 1}</h3>
                                        <div className="rejilla">
                                            <Unidad etiqueta="Unidad de medida" valor={form.cajas[i].unidadMedida}
                                                opciones={UNIDADES_MEDIDA} onChange={ponerCaja(i, 'unidadMedida')} />
                                            <Entrada etiqueta={`Profundo (${form.cajas[i].unidadMedida})`}
                                                tipo="number" paso="any" min="0" valor={form.cajas[i].profundo}
                                                onChange={ponerCaja(i, 'profundo')} />
                                            <Entrada etiqueta={`Ancho (${form.cajas[i].unidadMedida})`}
                                                tipo="number" paso="any" min="0" valor={form.cajas[i].ancho}
                                                onChange={ponerCaja(i, 'ancho')} />
                                            <Entrada etiqueta={`Alto (${form.cajas[i].unidadMedida})`}
                                                tipo="number" paso="any" min="0" valor={form.cajas[i].alto}
                                                onChange={ponerCaja(i, 'alto')} />
                                            <Unidad etiqueta="Unidad de peso" valor={form.cajas[i].unidadPeso}
                                                opciones={UNIDADES_PESO} onChange={ponerCaja(i, 'unidadPeso')} />
                                            <Entrada etiqueta={`Peso (${form.cajas[i].unidadPeso})`}
                                                tipo="number" paso="any" min="0" valor={form.cajas[i].peso}
                                                onChange={ponerCaja(i, 'peso')} />
                                        </div>
                                    </div>
                                )
                        )}
                    </div>

                    <div className="acciones">
                        <button className="boton" type="submit" disabled={enviando}>
                            {enviando ? 'Guardando...' : 'Completar solicitud'}
                        </button>
                        <button type="button" className="boton-sec" onClick={() => setSolicitud(null)}>
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}