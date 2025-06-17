const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'dbdijal.ctwsuim8qdti.us-east-2.rds.amazonaws.com',
    database: 'datos_aws',
    password: 'admingasa',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('Conectado a la base de datos PostgreSQL');
});

pool.on('error', (err) => {
    console.error('Error en el pool de conexiones:', err);
});

module.exports = pool;
