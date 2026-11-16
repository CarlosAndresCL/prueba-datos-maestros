# Prueba práctica: formulario y flujo de Datos Maestros

Prototipo funcional para la creación de SKU en **dos etapas**. El Usuario 1 crea la solicitud, el Usuario 2 completa **el mismo registro** y todo queda en una base consolidada con ID, fechas, estado y trazabilidad.

**Autor:** Carlos Andrés Calderón Leiva
**Correo:** calderonleivacarlosandres@gmail.com

## Tecnologías

| Capa | Herramienta |
|---|---|
| Base de datos | SQL Server |
| Backend | Node.js + Express, paquete `mssql` |
| Frontend | React + Vite |

## Arquitectura

```
React (Vite)  ──HTTP/JSON──▶  Express API  ──consultas parametrizadas──▶  SQL Server
 formularios                   validaciones                                 una tabla Solicitud
 listas dependientes           reglas de negocio                            restricciones CHECK
 mostrar / ocultar             conversión de unidades                       catálogos
```

Las reglas de negocio se aplican en **tres niveles**, para que ningún dato inválido llegue a guardarse:

1. **Frontend:** respuesta inmediata, campos que se muestran u ocultan, listas que se vacían al cambiar el nivel anterior.
2. **Backend:** vuelve a validar todo, limpia lo que no aplica, valida contra los catálogos y convierte las unidades.
3. **Base de datos:** restricciones `CHECK` como última barrera de integridad.

## Estructura del repositorio

```
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── .env.example
│   └── routes/
│       ├── catalogos.js
│       ├── dependientes.js
│       └── solicitudes.js
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── components/Campos.jsx
│       ├── hooks/useLista.js
│       └── pages/ (Etapa1.jsx, Etapa2.jsx)
├── database/
│   └── script.sql
└── evidencia/
```

## Modelo de datos

- **CatalogoIndependiente:** listas simples (Motivo, Material, Marca, Clasificación, Temporada, País, Embalaje, etc.), separadas por la columna `Tipo`.
- **CategoriaMotivo:** relación Motivo → Categoría motivo.
- **CatalogoJerarquia:** Departamento → Categoría → Subcategoría → Tipo.
- **Solicitud:** una sola fila por solicitud, usada por las dos etapas. Los campos de la Etapa 2 y los condicionales son `NULL` hasta que aplican.

## Flujo de dos etapas

| Etapa | Usuario | Operación | Resultado |
|---|---|---|---|
| 1 | Usuario 1 | `POST /api/solicitudes` (INSERT) | ID `SKU-000001`, fecha/hora y creador automáticos, estado `Pendiente Etapa 2` |
| 2 | Usuario 2 | `PUT /api/solicitudes/:id/completar` (UPDATE) | Misma fila, estado `Completado`, `CompletadoPor` y `FechaFinalizacion` automáticos |

La Etapa 2 **nunca inserta**: solo actualiza la fila original, y solo si sigue en `Pendiente Etapa 2`. Si ya fue completada, responde 409.

## Reglas de negocio (Anexo A.4)

| Regla | Dónde se aplica |
|---|---|
| Motivo → Categoría motivo | `GET /api/categorias-motivo`; el frontend vacía la categoría al cambiar el motivo |
| Departamento → Categoría → Subcategoría → Tipo | `GET /api/jerarquia/*`; cada nivel filtra por todos los anteriores y vacía los hijos |
| Clasificación = Temporada exige Temporada | Frontend, backend y `CK_Sol_Temporada` |
| Stocks → No planificado; otra clasificación → Planificado | Calculado en el backend; `CK_Sol_Planificado` |
| Sustituto / No sustituto | Frontend, backend y `CK_Sol_Sustitucion` |
| Registro sanitario (YES/SI exige número y fechas; vencimiento ≥ emisión) | Frontend, backend y `CK_Sol_RegistroSanitario` |
| Stacked / Apilado exige alto apilado y unidades | Frontend, backend y `CK_Sol_Apilado` |
| 1 a 3 cajas, solo las activas se guardan | Frontend, backend y `CK_Sol_Caja1/2/3` |
| Conversión a cm y kg (pulgadas, pies, libras) | Backend: ×2.54, ×30.48 y ×0.45359237 |

## Cómo ejecutarlo

**1. Base de datos.** Abra `database/script.sql` en SSMS y ejecútelo completo. Si usará autenticación SQL, active el bloque opcional final y cree el usuario `app_prueba`.

**2. Backend**

```bash
cd backend
npm install
```

Copie `.env.example` a `.env`, complete `DB_PASSWORD` y ejecute:

```bash
npm run dev
```

Debe aparecer `API escuchando en http://localhost:3000` y `Conectado a SQL Server`.

**3. Frontend** (en otra terminal)

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. El selector de la parte superior alterna entre **Usuario 1** (crea la solicitud) y **Usuario 2** (completa una pendiente).

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/catalogos/:tipo` | Listas independientes |
| GET | `/api/categorias-motivo?motivo=` | Categorías del motivo |
| GET | `/api/jerarquia/departamentos` | Nivel 1 |
| GET | `/api/jerarquia/categorias?departamento=` | Nivel 2 |
| GET | `/api/jerarquia/subcategorias?departamento=&categoria=` | Nivel 3 |
| GET | `/api/jerarquia/tipos?departamento=&categoria=&subcategoria=` | Nivel 4 |
| POST | `/api/solicitudes` | Crear (Etapa 1) |
| GET | `/api/solicitudes/pendientes` | Lista de pendientes |
| GET | `/api/solicitudes/:id` | Abrir por ID o código (`SKU-000001`) |
| PUT | `/api/solicitudes/:id/completar` | Completar (Etapa 2) |

## Datos de prueba

Los dos casos del Anexo A.7 están creados con la aplicación:

- **Caso 1** (`SKU-000001`): creado por el Usuario 1 y **completado** por el Usuario 2.
- **Caso 2** (`SKU-000002`): creado por el Usuario 1 y **pendiente** de Etapa 2.

Las capturas están en la carpeta `evidencia/`.

## Uso de IA

Utilicé Claude (Anthropic) como herramienta de apoyo durante el desarrollo, principalmente para orientar el diseño de la solución paso a paso, revisar código y corregir pequeños errores.

Cada etapa fue ejecutada, planificada y probada por mi cuenta, tomando como referencia el documento adjunto **Prueba_practica_formulario_datos_maestros**. Esto incluyó la creación de la base de datos y sus catálogos, la definición de las restricciones de las tablas, el desarrollo de las rutas del backend y la implementación de las pantallas del frontend.

Quedo a disposición para atender cualquier consulta relacionada con el funcionamiento de cada apartado, así como para recibir sugerencias de mejora o cambios específicos. Con mucho gusto estaría dispuesto a revisarlos y trabajar en ellos.
