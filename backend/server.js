require('dotenv').config();
const express = require('express');
const cors = require('cors');

const catalogosRoutes = require('./routes/catalogos');
const dependientesRoutes = require('./routes/dependientes');
const solicitudesRoutes = require('./routes/solicitudes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/catalogos', catalogosRoutes);
app.use('/api', dependientesRoutes);
app.use('/api/solicitudes', solicitudesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));