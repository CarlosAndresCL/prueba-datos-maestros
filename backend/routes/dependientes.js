const express = require('express');
const { sql, poolPromise } = require('../db');

const router = express.Router();

// Devuelve 400 si falta algún parámetro obligatorio
function faltan(req, res, campos) {
    const falta = campos.filter((c) => !req.query[c]);
    if (falta.length) {
        res.status(400).json({ mensaje: `Faltan parámetros: ${falta.join(', ')}.` });
        return true;
    }
    return false;
}

// Ejecuta una consulta parametrizada y responde con una lista simple de textos
async function listar(res, consulta, parametros = {}) {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        for (const [nombre, valor] of Object.entries(parametros)) {
            request.input(nombre, sql.NVarChar(150), valor);
        }
        const result = await request.query(consulta);
        res.json(result.recordset.map((fila) => fila.Valor));
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'No se pudo consultar la lista.' });
    }
}

// Motivo -> Categoría motivo
router.get('/categorias-motivo', (req, res) => {
    if (faltan(req, res, ['motivo'])) return;
    listar(
        res,
        'SELECT Categoria AS Valor FROM CategoriaMotivo WHERE Motivo = @motivo ORDER BY Id',
        { motivo: req.query.motivo }
    );
});

// Nivel 1: Departamentos
router.get('/jerarquia/departamentos', (req, res) => {
    listar(
        res,
        'SELECT DISTINCT Departamento AS Valor FROM CatalogoJerarquia ORDER BY Departamento'
    );
});

// Nivel 2: Categorías de un Departamento
router.get('/jerarquia/categorias', (req, res) => {
    if (faltan(req, res, ['departamento'])) return;
    listar(
        res,
        `SELECT DISTINCT Categoria AS Valor FROM CatalogoJerarquia
        WHERE Departamento = @departamento ORDER BY Categoria`,
        { departamento: req.query.departamento }
    );
});

// Nivel 3: Subcategorías de Departamento + Categoría
router.get('/jerarquia/subcategorias', (req, res) => {
    if (faltan(req, res, ['departamento', 'categoria'])) return;
    listar(
        res,
        `SELECT DISTINCT Subcategoria AS Valor FROM CatalogoJerarquia
        WHERE Departamento = @departamento AND Categoria = @categoria
        ORDER BY Subcategoria`,
        { departamento: req.query.departamento, categoria: req.query.categoria }
    );
});

// Nivel 4: Tipos de Departamento + Categoría + Subcategoría
router.get('/jerarquia/tipos', (req, res) => {
    if (faltan(req, res, ['departamento', 'categoria', 'subcategoria'])) return;
    listar(
        res,
        `SELECT DISTINCT Tipo AS Valor FROM CatalogoJerarquia
        WHERE Departamento = @departamento AND Categoria = @categoria
        AND Subcategoria = @subcategoria
        ORDER BY Tipo`,
        {
            departamento: req.query.departamento,
            categoria: req.query.categoria,
            subcategoria: req.query.subcategoria,
        }
    );
});

module.exports = router;