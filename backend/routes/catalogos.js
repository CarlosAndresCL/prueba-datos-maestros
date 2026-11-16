const express = require('express');
const { sql, poolPromise } = require('../db');

const router = express.Router();

// GET /api/catalogos/:tipo  -> devuelve los valores de ese catálogo
router.get('/:tipo', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input('tipo', sql.VarChar(50), req.params.tipo)
            .query('SELECT Valor FROM CatalogoIndependiente WHERE Tipo = @tipo ORDER BY Id');

        res.json(result.recordset.map((fila) => fila.Valor));
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'No se pudo consultar el catálogo.' });
    }
});

module.exports = router;