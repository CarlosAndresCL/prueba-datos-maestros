require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: { encrypt: false, trustServerCertificate: true },
};

if (process.env.DB_INSTANCE) {
    config.options.instanceName = process.env.DB_INSTANCE;
} else {
    config.port = Number(process.env.DB_PORT || 1433);
}

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
        console.log('Conectado a SQL Server');
        return pool;
    })
    .catch((err) => {
        console.error('Error de conexión a la base de datos:', err.message);
        throw err;
    });

module.exports = { sql, poolPromise };