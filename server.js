const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json());

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ijal-frontend-react.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));


app.get('/api/saludo', (req, res) => {
  res.json({ mensaje: '¡Hola desde el backend Node.js!' });
});

app.get('/api/eventos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expresion.eventos');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar eventos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

app.get('/api/eventos_geom', async (req, res) => {
  try {
    const result = await pool.query('SELECT ST_AsGeoJSON(geom)::json AS geometry, e.* FROM public.eventos_geom eg inner join expresion.eventos e on eg.id_e = e.id_e');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar eventos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

app.get('/api/getEvento', async (req, res) => {
  const { id_e } = req.query;

  if (!id_e) {
    return res.status(400).json({ error: 'Falta el parámetro id_e' });
  }

  try {
    const query = 'SELECT * FROM expresion.eventos WHERE id_e = $1';
    const values = [id_e];

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar eventos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

app.get('/api/getConsigna', async (req, res) => {
  const { id } = req.query;

  try {
    const query = `
      SELECT e.id_e, e.consigna_id, c.evento_id, c.consigna
      FROM expresion.eventos e
      INNER JOIN expresion.consigna c ON c.evento_id = e.id_e
      WHERE e.id_e = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.json("vacio"); // 👈 solo devuelve la palabra
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar eventos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

app.get('/api/getAccion', async (req, res) => {
  const { id } = req.query;

  try {
    const query = `
      select e.id_e ,e.consigna_id ,m.id_e  ,m.accion ,m.hora ,m.fecha  from expresion.eventos e
      inner join  expresion.mxm m  
      on m.id_e = e.id_e
      WHERE e.id_e = $1
      order by m.hora desc
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.json("vacio");
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar eventos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

app.get('/api/getPeticion', async (req, res) => {
  const { id } = req.query;

  try {
    const query = `
      select e.id_e ,e.consigna_id ,p.evento_id ,p.peticion  from expresion.eventos e
      inner join  expresion.peticion p  
      on p.evento_id = e.id_e
      WHERE e.id_e = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.json("vacio");
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar eventos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

app.get('/api/getData_contadores', async (req, res) => {
  try {
    const result = await pool.query(`SELECT 
  COUNT(*) AS totalEventos,
  COUNT(CASE WHEN tipo_expresion = 'MITIN POLÍTICO' THEN 1 END) AS mitin_politico,
  COUNT(CASE WHEN tipo_expresion = 'MANIFESTACIÓN' THEN 1 END) AS manifestacion,
  COUNT(CASE WHEN tipo_expresion = 'REUNIÓN MESA DE SEGUIMIENTO' THEN 1 END) AS mesa_seguimiento,
  COUNT(CASE WHEN tipo_expresion = 'RUEDA DE PRENSA' THEN 1 END) AS rueda_prensa,
  COUNT(CASE WHEN nivel_riesgo = 'ALTO' THEN 1 END) AS alto,
  COUNT(CASE WHEN nivel_riesgo = 'MEDIO' THEN 1 END) AS medio,
  COUNT(CASE WHEN nivel_riesgo = 'BAJO' THEN 1 END) AS bajo
FROM expresion.eventos`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar eventos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// POST /api/eventos/agrupados
app.post('/api/eventos/agrupados', async (req, res) => {
  const { tipo_expresion, fecha_inicio, fecha_fin } = req.body;

  if (!tipo_expresion || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Faltan datos en el body' });
  }

  try {
    const result = await pool.query(`
      SELECT fecha, COUNT(*) AS total
      FROM expresion.eventos
      WHERE tipo_expresion = $1
        AND fecha BETWEEN $2 AND $3
      GROUP BY fecha
      ORDER BY fecha;
    `, [tipo_expresion, fecha_inicio, fecha_fin]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error en la consulta");
  }
});

app.post('/api/eventos/agrupadosCategoria', async (req, res) => {
  const { tipo_expresion, fecha_inicio, fecha_fin } = req.body;

  if (!tipo_expresion || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Faltan datos en el body' });
  }

  try {
    const result = await pool.query(`
      SELECT categoria, COUNT(*) AS total
FROM expresion.eventos
      WHERE tipo_expresion = $1
        AND fecha BETWEEN $2 AND $3
   GROUP BY categoria
ORDER BY total DESC;
    `, [tipo_expresion, fecha_inicio, fecha_fin]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error en la consulta");
  }
});

app.post('/api/eventos/agrupadosSubtipo', async (req, res) => {
  const { tipo_expresion, fecha_inicio, fecha_fin } = req.body;

  if (!tipo_expresion || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Faltan datos en el body' });
  }

  try {
    const result = await pool.query(`
      SELECT sub_tipo, COUNT(*) AS total
FROM expresion.eventos
      WHERE tipo_expresion = $1
        AND fecha BETWEEN $2 AND $3
   GROUP BY sub_tipo
ORDER BY total DESC;
    `, [tipo_expresion, fecha_inicio, fecha_fin]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error en la consulta");
  }
});

app.post('/api/eventos/agrupadosLideres', async (req, res) => {
  const { tipo_expresion, fecha_inicio, fecha_fin } = req.body;

  if (!tipo_expresion || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Faltan datos en el body' });
  }

  try {
    const result = await pool.query(`
      select nombre, count(*) as total 
from expresion.p_lider l
inner join expresion.eventos e on e.id_e = l.id_e
      WHERE tipo_expresion = $1
        AND fecha BETWEEN $2 AND $3
 group by nombre
order by total desc;
    `, [tipo_expresion, fecha_inicio, fecha_fin]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error en la consulta");
  }
});

app.post('/api/eventos/agrupadosParticipantes', async (req, res) => {
  const { tipo_expresion, fecha_inicio, fecha_fin } = req.body;

  if (!tipo_expresion || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Faltan datos en el body' });
  }

  try {
    const result = await pool.query(`
select asunto, no_participante as participantes
from expresion.eventos
      WHERE tipo_expresion = $1
        AND fecha BETWEEN $2 AND $3
    `, [tipo_expresion, fecha_inicio, fecha_fin]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error en la consulta");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});