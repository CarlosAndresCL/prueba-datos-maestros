const express = require('express');
const { sql, poolPromise } = require('../db');

const router = express.Router();

// ---------- Utilidades ----------
const textoONulo = (v) =>
    v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim();

// Devuelve null si está vacío, un número si es válido, o NaN si no es numérico
const numeroONulo = (v) => {
    if (v === undefined || v === null || String(v).trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
};

async function existeEnCatalogo(pool, tipo, valor) {
    const r = await pool
        .request()
        .input('tipo', sql.VarChar(50), tipo)
        .input('valor', sql.NVarChar(100), valor)
        .query('SELECT 1 AS ok FROM CatalogoIndependiente WHERE Tipo = @tipo AND Valor = @valor');
    return r.recordset.length > 0;
}

// ---------- POST /api/solicitudes  (Etapa 1) ----------
router.post('/', async (req, res) => {
    const b = req.body || {};
    const errores = [];

    // 1) Campos obligatorios de la Etapa 1
    const obligatorios = {
        creadoPor: 'Usuario creador',
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

    const d = {};
    for (const [campo, etiqueta] of Object.entries(obligatorios)) {
        d[campo] = textoONulo(b[campo]);
        if (!d[campo]) errores.push(`El campo "${etiqueta}" es obligatorio.`);
    }

    // 2) Temporada: solo aplica si Clasificación = Temporada
    if (d.clasificacion === 'Temporada') {
        d.temporada = textoONulo(b.temporada);
        if (!d.temporada) errores.push('Debe seleccionar la Temporada.');
    } else {
        d.temporada = null; // el valor anterior no se conserva
    }

    // 3) Producto planificado: automático
    d.productoPlanificado = d.clasificacion === 'Stocks' ? 'No planificado' : 'Planificado';

    // 4) Sustitución
    d.precio = d.sku = d.factor = d.promedio = null;
    if (d.productoSustituto === 'Producto Sustituto') {
        d.precio = numeroONulo(b.precioSugeridoSustituto);
        d.sku = textoONulo(b.skuReferencia);
        d.factor = numeroONulo(b.factorEscalada);
        if (!(d.precio > 0)) errores.push('El precio sugerido del sustituto debe ser un número mayor que 0.');
        if (!d.sku) errores.push('El SKU de referencia es obligatorio.');
        if (!(d.factor > 0)) errores.push('El factor de escalada debe ser un número mayor que 0.');
    } else if (d.productoSustituto === 'Producto No sustituto') {
        d.promedio = numeroONulo(b.promedioVentaMensual);
        if (d.promedio === null || Number.isNaN(d.promedio) || d.promedio < 0 || !Number.isInteger(d.promedio)) {
            errores.push('El promedio de venta mensual debe ser un número entero mayor o igual a 0.');
        }
    }

    // Si ya hay errores básicos, no vale la pena consultar la base
    if (errores.length) {
        return res.status(400).json({ mensaje: 'Hay campos por corregir.', errores });
    }

    try {
        const pool = await poolPromise;

        // 5) Que los valores existan en los catálogos
        const catalogos = [
            ['Motivo', d.motivo, 'Motivo'],
            ['ProductoSustituto', d.productoSustituto, 'Producto sustituto / no sustituto'],
            ['Material', d.material, 'Material'],
            ['Marca', d.marca, 'Marca'],
            ['Clasificacion', d.clasificacion, 'Clasificación'],
        ];
        if (d.temporada) catalogos.push(['Temporada', d.temporada, 'Temporada']);

        for (const [tipo, valor, etiqueta] of catalogos) {
            if (!(await existeEnCatalogo(pool, tipo, valor))) {
                errores.push(`El valor "${valor}" no es válido para ${etiqueta}.`);
            }
        }

        // 6) Categoría motivo debe pertenecer al Motivo
        const cm = await pool
            .request()
            .input('motivo', sql.NVarChar(100), d.motivo)
            .input('cat', sql.NVarChar(150), d.categoriaMotivo)
            .query('SELECT 1 AS ok FROM CategoriaMotivo WHERE Motivo = @motivo AND Categoria = @cat');
        if (!cm.recordset.length) {
            errores.push('La categoría motivo no corresponde al motivo seleccionado.');
        }

        // 7) La ruta de la jerarquía debe existir completa
        const jr = await pool
            .request()
            .input('dep', sql.NVarChar(100), d.departamento)
            .input('cat', sql.NVarChar(100), d.categoria)
            .input('sub', sql.NVarChar(100), d.subcategoria)
            .input('tipo', sql.NVarChar(150), d.tipo)
            .query(`SELECT 1 AS ok FROM CatalogoJerarquia
                    WHERE Departamento = @dep AND Categoria = @cat
                    AND Subcategoria = @sub AND Tipo = @tipo`);
        if (!jr.recordset.length) {
            errores.push('La combinación Departamento / Categoría / Subcategoría / Tipo no es válida.');
        }

        if (errores.length) {
            return res.status(400).json({ mensaje: 'Hay campos por corregir.', errores });
        }

        // 8) Guardar: ID, fecha y estado los genera la base de datos
        const result = await pool
            .request()
            .input('creadoPor', sql.NVarChar(100), d.creadoPor)
            .input('motivo', sql.NVarChar(100), d.motivo)
            .input('categoriaMotivo', sql.NVarChar(150), d.categoriaMotivo)
            .input('productoSustituto', sql.NVarChar(100), d.productoSustituto)
            .input('material', sql.NVarChar(100), d.material)
            .input('marca', sql.NVarChar(100), d.marca)
            .input('clasificacion', sql.NVarChar(100), d.clasificacion)
            .input('temporada', sql.NVarChar(100), d.temporada)
            .input('productoPlanificado', sql.NVarChar(30), d.productoPlanificado)
            .input('departamento', sql.NVarChar(100), d.departamento)
            .input('categoria', sql.NVarChar(100), d.categoria)
            .input('subcategoria', sql.NVarChar(100), d.subcategoria)
            .input('tipo', sql.NVarChar(150), d.tipo)
            .input('precio', sql.Decimal(12, 2), d.precio)
            .input('sku', sql.NVarChar(50), d.sku)
            .input('factor', sql.Decimal(8, 2), d.factor)
            .input('promedio', sql.Int, d.promedio)
            .query(`
                INSERT INTO Solicitud
                (CreadoPor, Motivo, CategoriaMotivo, ProductoSustituto, Material, Marca,
                Clasificacion, Temporada, ProductoPlanificado, Departamento, Categoria,
                Subcategoria, Tipo, PrecioSugeridoSustituto, SkuReferencia,
                FactorEscalada, PromedioVentaMensual)
                OUTPUT INSERTED.Id, INSERTED.Codigo, INSERTED.FechaCreacion, INSERTED.Estado
                VALUES
                (@creadoPor, @motivo, @categoriaMotivo, @productoSustituto, @material, @marca,
                @clasificacion, @temporada, @productoPlanificado, @departamento, @categoria,
                @subcategoria, @tipo, @precio, @sku, @factor, @promedio)
            `);

        res.status(201).json({
            mensaje: 'Solicitud creada correctamente.',
            solicitud: result.recordset[0],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'No se pudo guardar la solicitud.' });
    }
});

// ---------- Utilidades de la Etapa 2 ----------
const FACTOR_MEDIDA = { cm: 1, in: 2.54, ft: 30.48 };
const FACTOR_PESO = { kg: 1, lb: 0.45359237 };
const redondear = (n) => Math.round(n * 1000) / 1000;

// Acepta "1" o "SKU-000001" y devuelve el número, o null si no es válido
function leerId(valor) {
    const m = String(valor).trim().match(/^(?:SKU-)?(\d+)$/i);
    return m ? parseInt(m[1], 10) : null;
}

// Fecha en formato AAAA-MM-DD y que exista de verdad (no 2026-02-31)
function fechaValida(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    const t = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === s;
}

// Convierte una medida a cm. Devuelve null si no es un número > 0 o la unidad no existe
function aCm(valor, unidad) {
    const n = numeroONulo(valor);
    const f = FACTOR_MEDIDA[String(unidad || 'cm').toLowerCase()];
    if (n === null || Number.isNaN(n) || !f) return null;
    const r = redondear(n * f);
    return r > 0 ? r : null;
}

// Convierte un peso a kg. Misma lógica que aCm
function aKg(valor, unidad) {
    const n = numeroONulo(valor);
    const f = FACTOR_PESO[String(unidad || 'kg').toLowerCase()];
    if (n === null || Number.isNaN(n) || !f) return null;
    const r = redondear(n * f);
    return r > 0 ? r : null;
}

// ---------- GET /api/solicitudes/pendientes ----------
router.get('/pendientes', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT Id, Codigo, FechaCreacion, CreadoPor, Motivo, CategoriaMotivo, Tipo, Estado
            FROM Solicitud
            WHERE Estado = N'Pendiente Etapa 2'
            ORDER BY Id`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'No se pudo consultar las solicitudes pendientes.' });
    }
});

// ---------- GET /api/solicitudes/:id ----------
router.get('/:id', async (req, res) => {
    const id = leerId(req.params.id);
    if (!id) return res.status(400).json({ mensaje: 'El ID de la solicitud no es válido.' });

    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Solicitud WHERE Id = @id');

        if (!result.recordset.length) {
            return res.status(404).json({ mensaje: 'No se encontró la solicitud.' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'No se pudo consultar la solicitud.' });
    }
});

// ---------- PUT /api/solicitudes/:id/completar  (Etapa 2) ----------
router.put('/:id/completar', async (req, res) => {
    const id = leerId(req.params.id);
    if (!id) return res.status(400).json({ mensaje: 'El ID de la solicitud no es válido.' });

    const b = req.body || {};
    const errores = [];
    const d = {};

    // 1) Campos obligatorios
    d.completadoPor = textoONulo(b.completadoPor);
    if (!d.completadoPor) errores.push('El usuario que completa la solicitud es obligatorio.');

    d.paisOrigen = textoONulo(b.paisOrigen);
    if (!d.paisOrigen) errores.push('El país de origen es obligatorio.');

    d.requiereRegistro = textoONulo(b.requiereRegistroSanitario);
    if (!d.requiereRegistro) errores.push('Debe indicar si requiere registro sanitario.');

    // 2) Registro sanitario: solo se guarda si es YES/SI; si no, queda vacío
    d.numeroRegistro = d.fechaEmision = d.fechaVencimiento = null;
    if (d.requiereRegistro === 'YES/SI') {
        d.numeroRegistro = textoONulo(b.numeroRegistroSanitario);
        d.fechaEmision = textoONulo(b.fechaEmision);
        d.fechaVencimiento = textoONulo(b.fechaVencimiento);

        if (!d.numeroRegistro) errores.push('El número de registro sanitario es obligatorio.');
        if (!fechaValida(d.fechaEmision)) errores.push('La fecha de emisión es obligatoria (formato AAAA-MM-DD).');
        if (!fechaValida(d.fechaVencimiento)) errores.push('La fecha de vencimiento es obligatoria (formato AAAA-MM-DD).');
        if (fechaValida(d.fechaEmision) && fechaValida(d.fechaVencimiento) && d.fechaVencimiento < d.fechaEmision) {
            errores.push('La fecha de vencimiento no puede ser anterior a la fecha de emisión.');
        }
    }

    // 3) Embalaje: Alto apilado y Unidades por apilado solo con Stacked / Apilado
    d.embalaje = textoONulo(b.embalaje);
    d.altoApilado = d.unidadesApilado = null;
    if (!d.embalaje) {
        errores.push('El embalaje es obligatorio.');
    } else if (d.embalaje === 'Stacked / Apilado') {
        d.altoApilado = aCm(b.altoApilado, b.unidadAltoApilado);
        d.unidadesApilado = numeroONulo(b.unidadesApilado);
        if (d.altoApilado === null) errores.push('El alto apilado debe ser un número mayor que 0.');
        if (!Number.isInteger(d.unidadesApilado) || d.unidadesApilado <= 0) {
            errores.push('Las unidades por apilado deben ser un número entero mayor que 0.');
        }
    }

    // 4) Cajas: solo se guardan las activas, convertidas a cm y kg
    d.cantidadCajas = numeroONulo(b.cantidadCajas);
    const cajasOk = Number.isInteger(d.cantidadCajas) && d.cantidadCajas >= 1 && d.cantidadCajas <= 3;
    if (!cajasOk) errores.push('La cantidad de cajas debe ser 1, 2 o 3.');

    const cajas = [null, null, null];
    if (cajasOk) {
        const entrada = Array.isArray(b.cajas) ? b.cajas : [];
        const etiquetas = { profundo: 'Profundo', ancho: 'Ancho', alto: 'Alto', peso: 'Peso' };
        for (let i = 0; i < d.cantidadCajas; i++) {
            const c = entrada[i] || {};
            const caja = {
                profundo: aCm(c.profundo, c.unidadMedida),
                ancho: aCm(c.ancho, c.unidadMedida),
                alto: aCm(c.alto, c.unidadMedida),
                peso: aKg(c.peso, c.unidadPeso),
            };
            for (const [campo, etiqueta] of Object.entries(etiquetas)) {
                if (caja[campo] === null) {
                    errores.push(
                        `Caja ${i + 1}: ${etiqueta} debe ser un número mayor que 0 (medidas en cm, in o ft; peso en kg o lb).`
                    );
                }
            }
            cajas[i] = caja;
        }
    }

    if (errores.length) {
        return res.status(400).json({ mensaje: 'Hay campos por corregir.', errores });
    }

    try {
        const pool = await poolPromise;

        // 5) La solicitud debe existir y seguir pendiente
        const actual = await pool
            .request()
            .input('id', sql.Int, id)
            .query('SELECT Estado FROM Solicitud WHERE Id = @id');
        if (!actual.recordset.length) {
            return res.status(404).json({ mensaje: 'No se encontró la solicitud.' });
        }
        if (actual.recordset[0].Estado !== 'Pendiente Etapa 2') {
            return res.status(409).json({ mensaje: 'Esta solicitud ya fue completada y no se puede modificar.' });
        }

        // 6) Los valores deben existir en los catálogos
        const catalogos = [
            ['Pais', d.paisOrigen, 'País de origen'],
            ['RegistroSanitario', d.requiereRegistro, 'Registro sanitario'],
            ['Embalaje', d.embalaje, 'Embalaje'],
        ];
        for (const [tipo, valor, etiqueta] of catalogos) {
            if (!(await existeEnCatalogo(pool, tipo, valor))) {
                errores.push(`El valor "${valor}" no es válido para ${etiqueta}.`);
            }
        }
        if (errores.length) {
            return res.status(400).json({ mensaje: 'Hay campos por corregir.', errores });
        }

        // 7) Actualizar el MISMO registro (nunca se inserta uno nuevo)
        const request = pool
            .request()
            .input('id', sql.Int, id)
            .input('completadoPor', sql.NVarChar(100), d.completadoPor)
            .input('pais', sql.NVarChar(100), d.paisOrigen)
            .input('requiere', sql.NVarChar(10), d.requiereRegistro)
            .input('numReg', sql.NVarChar(50), d.numeroRegistro)
            .input('emision', sql.VarChar(10), d.fechaEmision)
            .input('vencimiento', sql.VarChar(10), d.fechaVencimiento)
            .input('embalaje', sql.NVarChar(100), d.embalaje)
            .input('altoApilado', sql.Decimal(10, 3), d.altoApilado)
            .input('unidadesApilado', sql.Int, d.unidadesApilado)
            .input('cantidadCajas', sql.TinyInt, d.cantidadCajas);

        for (let i = 0; i < 3; i++) {
            const c = cajas[i];
            request.input(`c${i + 1}p`, sql.Decimal(10, 3), c ? c.profundo : null);
            request.input(`c${i + 1}a`, sql.Decimal(10, 3), c ? c.ancho : null);
            request.input(`c${i + 1}h`, sql.Decimal(10, 3), c ? c.alto : null);
            request.input(`c${i + 1}w`, sql.Decimal(10, 3), c ? c.peso : null);
        }

        const result = await request.query(`
            UPDATE Solicitud SET
                PaisOrigen = @pais,
                RequiereRegistroSanitario = @requiere,
                NumeroRegistroSanitario = @numReg,
                FechaEmision = CAST(@emision AS DATE),
                FechaVencimiento = CAST(@vencimiento AS DATE),
                Embalaje = @embalaje,
                AltoApilado = @altoApilado,
                UnidadesApilado = @unidadesApilado,
                CantidadCajas = @cantidadCajas,
                Caja1_Profundo = @c1p, Caja1_Ancho = @c1a, Caja1_Alto = @c1h, Caja1_Peso = @c1w,
                Caja2_Profundo = @c2p, Caja2_Ancho = @c2a, Caja2_Alto = @c2h, Caja2_Peso = @c2w,
                Caja3_Profundo = @c3p, Caja3_Ancho = @c3a, Caja3_Alto = @c3h, Caja3_Peso = @c3w,
                Estado = N'Completado',
                CompletadoPor = @completadoPor,
                FechaFinalizacion = SYSDATETIME()
            OUTPUT INSERTED.Id, INSERTED.Codigo, INSERTED.Estado, INSERTED.CreadoPor,
            INSERTED.CompletadoPor, INSERTED.FechaCreacion, INSERTED.FechaFinalizacion
            WHERE Id = @id AND Estado = N'Pendiente Etapa 2'
        `);

        // Si nadie salió en el OUTPUT, otra persona la completó justo antes
        if (!result.recordset.length) {
            return res.status(409).json({ mensaje: 'Esta solicitud ya fue completada y no se puede modificar.' });
        }

        res.json({ mensaje: 'Solicitud completada correctamente.', solicitud: result.recordset[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'No se pudo completar la solicitud.' });
    }
});

module.exports = router;