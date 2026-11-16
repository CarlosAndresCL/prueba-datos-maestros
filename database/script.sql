/* =====================================================================
    PRUEBA PRÁCTICA - Datos Maestros (Calidad & SAC)
    Script consolidado para SQL Server

    Contenido:
    1. Base de datos
    2. Catálogos (Anexo A.1, A.2 y A.3) y sus datos
    3. Tabla consolidada Solicitud (Anexo A.6)
    4. Restricciones de integridad (Anexo A.4 y A.5)
    5. Usuario de la aplicación (opcional)

    Ejecutar completo, en orden, sobre un servidor donde NO exista aún
    la base PruebasDatosMaestros.
   ===================================================================== */

-- =====================================================================
-- 1. BASE DE DATOS
-- =====================================================================
IF DB_ID(N'PruebasDatosMaestros') IS NULL
    CREATE DATABASE PruebasDatosMaestros;
GO

USE PruebasDatosMaestros;
GO

-- =====================================================================
-- 2. CATÁLOGOS
-- =====================================================================

-- 2.1 Catálogos independientes (una sola tabla, separada por Tipo)
CREATE TABLE CatalogoIndependiente (
    Id    INT IDENTITY(1,1) PRIMARY KEY,
    Tipo  VARCHAR(50)   NOT NULL,   -- 'Motivo', 'Material', 'Marca', etc.
    Valor NVARCHAR(100) NOT NULL
);
GO

INSERT INTO CatalogoIndependiente (Tipo, Valor) VALUES
-- Motivo
('Motivo', N'CREACIÓN'),
('Motivo', N'MODIFICACIÓN'),
('Motivo', N'REACTIVACIÓN'),
-- Producto sustituto
('ProductoSustituto', N'Producto Sustituto'),
('ProductoSustituto', N'Producto No sustituto'),
-- Material
('Material', N'Plástico'),
('Material', N'Metal'),
('Material', N'Vidrio'),
('Material', N'Madera'),
('Material', N'Tela'),
-- Marca
('Marca', N'Igloo'),
('Marca', N'PM Home'),
('Marca', N'Genérica'),
-- Clasificación
('Clasificacion', N'Descontinuado'),
('Clasificacion', N'E'),
('Clasificacion', N'Producción'),
('Clasificacion', N'Reorden'),
('Clasificacion', N'Stocks'),
('Clasificacion', N'Temporada'),
-- Temporada
('Temporada', N'Navideña'),
('Temporada', N'Escolar'),
('Temporada', N'Juguetes'),
('Temporada', N'Verano'),
('Temporada', N'Frutas y Verduras'),
-- País de origen
('Pais', N'Costa Rica'),
('Pais', N'China'),
('Pais', N'Estados Unidos'),
('Pais', N'México'),
('Pais', N'Guatemala'),
-- Registro sanitario
('RegistroSanitario', N'YES/SI'),
('RegistroSanitario', N'NO'),
-- Embalaje
('Embalaje', N'Nested / Anidado'),
('Embalaje', N'Stacked / Apilado'),
('Embalaje', N'Master Carton Multiple'),
('Embalaje', N'Master Carton'),
-- Cantidad de cajas
('CantidadCajas', N'1'),
('CantidadCajas', N'2'),
('CantidadCajas', N'3');
GO

-- 2.2 Catálogo dependiente: Motivo -> Categoría motivo (Anexo A.2)
CREATE TABLE CategoriaMotivo (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    Motivo    NVARCHAR(100) NOT NULL,
    Categoria NVARCHAR(150) NOT NULL
);
GO

INSERT INTO CategoriaMotivo (Motivo, Categoria) VALUES
(N'CREACIÓN', N'Producto nuevo'),
(N'CREACIÓN', N'Producto sustituto'),
(N'CREACIÓN', N'Producto con variantes'),

(N'REACTIVACIÓN', N'Reactivación por disponibilidad'),
(N'REACTIVACIÓN', N'Reactivación por cambio de proveedor'),
(N'REACTIVACIÓN', N'Reactivación por corrección de datos'),

(N'MODIFICACIÓN', N'Modificación de Clasificación'),
(N'MODIFICACIÓN', N'Modificación de Lead Time'),
(N'MODIFICACIÓN', N'Modificación de Descripción'),
(N'MODIFICACIÓN', N'Modificación de código de barras y/o GTIN14'),
(N'MODIFICACIÓN', N'Modificación de UXB y/o medidas'),
(N'MODIFICACIÓN', N'Modificación de Proveedor'),
(N'MODIFICACIÓN', N'Modificación de Impuesto'),
(N'MODIFICACIÓN', N'Modificación de Departamento/Categoría'),
(N'MODIFICACIÓN', N'Modificación de Vida útil'),
(N'MODIFICACIÓN', N'Modificación de Unidad y/o Valor de medida'),
(N'MODIFICACIÓN', N'Modificación de Comprador'),
(N'MODIFICACIÓN', N'Modificación de Garantía'),
(N'MODIFICACIÓN', N'Modificación de Registro Sanitario'),
(N'MODIFICACIÓN', N'Modificación de Restricción alimenticia'),
(N'MODIFICACIÓN', N'Modificación de Información del almacenaje'),
(N'MODIFICACIÓN', N'Modificación de Aroma/Sabor/Tipo Aceite'),
(N'MODIFICACIÓN', N'Modificación de CABYS'),
(N'MODIFICACIÓN', N'Modificación de Tiempo de Producción'),
(N'MODIFICACIÓN', N'Modificación de Temporada'),
(N'MODIFICACIÓN', N'Modificación de Jerarquía');
GO

-- 2.3 Jerarquía de 4 niveles (Anexo A.3)
CREATE TABLE CatalogoJerarquia (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    Departamento NVARCHAR(100) NOT NULL,
    Categoria    NVARCHAR(100) NOT NULL,
    Subcategoria NVARCHAR(100) NOT NULL,
    Tipo         NVARCHAR(150) NOT NULL
);
GO

INSERT INTO CatalogoJerarquia (Departamento, Categoria, Subcategoria, Tipo) VALUES
(N'ABARROTES', N'ACEITES Y GRASAS', N'ACEITES EN SPRAY', N'ACEITE DE AGUACATE EN SPRAY'),
(N'ABARROTES', N'ACEITES Y GRASAS', N'ACEITES EN SPRAY', N'ACEITE DE CANOLA EN SPRAY'),
(N'ABARROTES', N'ACEITES Y GRASAS', N'ACEITES EN SPRAY', N'ACEITE DE COCO EN SPRAY'),
(N'ABARROTES', N'ACEITES Y GRASAS', N'ACEITES LÍQUIDOS', N'ACEITE DE AGUACATE'),
(N'ABARROTES', N'ACEITES Y GRASAS', N'ACEITES LÍQUIDOS', N'ACEITE DE CANOLA'),
(N'ABARROTES', N'ACEITES Y GRASAS', N'ACEITES LÍQUIDOS', N'ACEITE DE COCO'),
(N'BEBÉ', N'ALIMENTOS INFANTILES', N'CEREALES INFANTILES', N'CEREAL DE ARROZ INFANTIL'),
(N'BEBÉ', N'ALIMENTOS INFANTILES', N'CEREALES INFANTILES', N'CEREAL DE AVENA INFANTIL'),
(N'BEBÉ', N'ALIMENTOS INFANTILES', N'COLADOS INFANTILES', N'COLADO DE FRUTAS'),
(N'BEBÉ', N'ALIMENTOS INFANTILES', N'COLADOS INFANTILES', N'COLADO DE VEGETALES'),
(N'BEBÉ', N'BAÑO Y CUIDADO DEL BEBÉ', N'JABONES INFANTILES', N'JABÓN LÍQUIDO INFANTIL'),
(N'BEBÉ', N'BAÑO Y CUIDADO DEL BEBÉ', N'SHAMPOO INFANTIL', N'SHAMPOO SUAVE INFANTIL');
GO

-- =====================================================================
-- 3. TABLA CONSOLIDADA: UNA FILA POR SOLICITUD, PARA LAS DOS ETAPAS
-- =====================================================================
CREATE TABLE Solicitud (
    -- ===== CONTROL Y TRAZABILIDAD =====
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    Codigo            AS (N'SKU-' + RIGHT(N'000000' + CAST(Id AS NVARCHAR(10)), 6)) PERSISTED,
    FechaCreacion     DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CreadoPor         NVARCHAR(100) NOT NULL,
    Estado            NVARCHAR(30)  NOT NULL DEFAULT N'Pendiente Etapa 2'
                      CHECK (Estado IN (N'Pendiente Etapa 2', N'Completado')),
    CompletadoPor     NVARCHAR(100) NULL,
    FechaFinalizacion DATETIME2 NULL,

    -- ===== ETAPA 1 =====
    Motivo               NVARCHAR(100) NOT NULL,
    CategoriaMotivo      NVARCHAR(150) NOT NULL,
    ProductoSustituto    NVARCHAR(100) NOT NULL,
    Material             NVARCHAR(100) NOT NULL,
    Marca                NVARCHAR(100) NOT NULL,
    Clasificacion        NVARCHAR(100) NOT NULL,
    Temporada            NVARCHAR(100) NULL,
    ProductoPlanificado  NVARCHAR(30)  NOT NULL
                         CHECK (ProductoPlanificado IN (N'Planificado', N'No planificado')),
    Departamento         NVARCHAR(100) NOT NULL,
    Categoria            NVARCHAR(100) NOT NULL,
    Subcategoria         NVARCHAR(100) NOT NULL,
    Tipo                 NVARCHAR(150) NOT NULL,

    -- Datos de sustitución (dependen de ProductoSustituto)
    PrecioSugeridoSustituto DECIMAL(12,2) NULL CHECK (PrecioSugeridoSustituto > 0),
    SkuReferencia           NVARCHAR(50)  NULL,
    FactorEscalada          DECIMAL(8,2)  NULL CHECK (FactorEscalada > 0),
    PromedioVentaMensual    INT           NULL CHECK (PromedioVentaMensual >= 0),

    -- ===== ETAPA 2 =====
    PaisOrigen                  NVARCHAR(100) NULL,
    RequiereRegistroSanitario   NVARCHAR(10)  NULL,
    NumeroRegistroSanitario     NVARCHAR(50)  NULL,
    FechaEmision                DATE NULL,
    FechaVencimiento            DATE NULL,
    Embalaje                    NVARCHAR(100) NULL,
    AltoApilado                 DECIMAL(10,3) NULL CHECK (AltoApilado > 0),
    UnidadesApilado             INT NULL CHECK (UnidadesApilado > 0),
    CantidadCajas               TINYINT NULL CHECK (CantidadCajas BETWEEN 1 AND 3),

    -- Medidas en cm y peso en kg (siempre se guardan ya convertidas)
    Caja1_Profundo DECIMAL(10,3) NULL CHECK (Caja1_Profundo > 0),
    Caja1_Ancho    DECIMAL(10,3) NULL CHECK (Caja1_Ancho > 0),
    Caja1_Alto     DECIMAL(10,3) NULL CHECK (Caja1_Alto > 0),
    Caja1_Peso     DECIMAL(10,3) NULL CHECK (Caja1_Peso > 0),
    Caja2_Profundo DECIMAL(10,3) NULL CHECK (Caja2_Profundo > 0),
    Caja2_Ancho    DECIMAL(10,3) NULL CHECK (Caja2_Ancho > 0),
    Caja2_Alto     DECIMAL(10,3) NULL CHECK (Caja2_Alto > 0),
    Caja2_Peso     DECIMAL(10,3) NULL CHECK (Caja2_Peso > 0),
    Caja3_Profundo DECIMAL(10,3) NULL CHECK (Caja3_Profundo > 0),
    Caja3_Ancho    DECIMAL(10,3) NULL CHECK (Caja3_Ancho > 0),
    Caja3_Alto     DECIMAL(10,3) NULL CHECK (Caja3_Alto > 0),
    Caja3_Peso     DECIMAL(10,3) NULL CHECK (Caja3_Peso > 0)
);
GO

-- =====================================================================
-- 4. REGLAS CONDICIONALES (ANEXO A.4) COMO RESTRICCIONES DE LA BASE
--    Cada regla tiene dos ramas: cuando aplica (campos obligatorios)
--    y cuando no aplica (campos obligatoriamente vacíos).
-- =====================================================================
ALTER TABLE Solicitud ADD

-- Clasificación = Temporada -> Temporada obligatoria; si no, vacía
CONSTRAINT CK_Sol_Temporada CHECK (
    (Clasificacion = N'Temporada' AND Temporada IS NOT NULL)
 OR (Clasificacion <> N'Temporada' AND Temporada IS NULL)
),

-- Stocks -> No planificado; cualquier otra clasificación -> Planificado
CONSTRAINT CK_Sol_Planificado CHECK (
    (Clasificacion = N'Stocks' AND ProductoPlanificado = N'No planificado')
 OR (Clasificacion <> N'Stocks' AND ProductoPlanificado = N'Planificado')
),

-- Sustitución
CONSTRAINT CK_Sol_Sustitucion CHECK (
    (ProductoSustituto = N'Producto Sustituto'
        AND PrecioSugeridoSustituto IS NOT NULL
        AND SkuReferencia IS NOT NULL
        AND FactorEscalada IS NOT NULL
        AND PromedioVentaMensual IS NULL)
 OR (ProductoSustituto = N'Producto No sustituto'
        AND PromedioVentaMensual IS NOT NULL
        AND PrecioSugeridoSustituto IS NULL
        AND SkuReferencia IS NULL
        AND FactorEscalada IS NULL)
),

-- Registro sanitario: solo valores válidos
CONSTRAINT CK_Sol_ValorRegistro CHECK (
    RequiereRegistroSanitario IN (N'YES/SI', N'NO')
),

-- YES/SI -> 3 campos obligatorios y vencimiento >= emisión; si no, vacíos
CONSTRAINT CK_Sol_RegistroSanitario CHECK (
    (ISNULL(RequiereRegistroSanitario, N'') = N'YES/SI'
        AND NumeroRegistroSanitario IS NOT NULL
        AND FechaEmision IS NOT NULL
        AND FechaVencimiento IS NOT NULL
        AND FechaVencimiento >= FechaEmision)
 OR (ISNULL(RequiereRegistroSanitario, N'') <> N'YES/SI'
        AND NumeroRegistroSanitario IS NULL
        AND FechaEmision IS NULL
        AND FechaVencimiento IS NULL)
),

-- Stacked / Apilado -> Alto apilado y Unidades obligatorios; si no, vacíos
CONSTRAINT CK_Sol_Apilado CHECK (
    (ISNULL(Embalaje, N'') = N'Stacked / Apilado'
        AND AltoApilado IS NOT NULL AND UnidadesApilado IS NOT NULL)
 OR (ISNULL(Embalaje, N'') <> N'Stacked / Apilado'
        AND AltoApilado IS NULL AND UnidadesApilado IS NULL)
),

-- Cajas: Caja 1 si hay >= 1, Caja 2 si hay >= 2, Caja 3 si hay 3
CONSTRAINT CK_Sol_Caja1 CHECK (
    (ISNULL(CantidadCajas, 0) >= 1
        AND Caja1_Profundo IS NOT NULL AND Caja1_Ancho IS NOT NULL
        AND Caja1_Alto IS NOT NULL AND Caja1_Peso IS NOT NULL)
 OR (ISNULL(CantidadCajas, 0) < 1
        AND Caja1_Profundo IS NULL AND Caja1_Ancho IS NULL
        AND Caja1_Alto IS NULL AND Caja1_Peso IS NULL)
),
CONSTRAINT CK_Sol_Caja2 CHECK (
    (ISNULL(CantidadCajas, 0) >= 2
        AND Caja2_Profundo IS NOT NULL AND Caja2_Ancho IS NOT NULL
        AND Caja2_Alto IS NOT NULL AND Caja2_Peso IS NOT NULL)
 OR (ISNULL(CantidadCajas, 0) < 2
        AND Caja2_Profundo IS NULL AND Caja2_Ancho IS NULL
        AND Caja2_Alto IS NULL AND Caja2_Peso IS NULL)
),
CONSTRAINT CK_Sol_Caja3 CHECK (
    (ISNULL(CantidadCajas, 0) = 3
        AND Caja3_Profundo IS NOT NULL AND Caja3_Ancho IS NOT NULL
        AND Caja3_Alto IS NOT NULL AND Caja3_Peso IS NOT NULL)
 OR (ISNULL(CantidadCajas, 0) < 3
        AND Caja3_Profundo IS NULL AND Caja3_Ancho IS NULL
        AND Caja3_Alto IS NULL AND Caja3_Peso IS NULL)
),

-- Estado coherente con la finalización
CONSTRAINT CK_Sol_Completado CHECK (
    (Estado = N'Pendiente Etapa 2'
        AND CompletadoPor IS NULL AND FechaFinalizacion IS NULL)
 OR (Estado = N'Completado'
        AND CompletadoPor IS NOT NULL AND FechaFinalizacion IS NOT NULL
        AND PaisOrigen IS NOT NULL AND RequiereRegistroSanitario IS NOT NULL
        AND Embalaje IS NOT NULL AND CantidadCajas IS NOT NULL)
);
GO

-- =====================================================================
-- 5. USUARIO DE LA APLICACIÓN (OPCIONAL)
--    El backend se conecta con autenticación SQL. Quite los comentarios,
--    cambie la contraseña y use el mismo valor en backend/.env.
--    El servidor debe permitir "SQL Server and Windows Authentication".
-- =====================================================================
/*
USE master;
GO
CREATE LOGIN app_prueba WITH PASSWORD = 'CambiarEstaClave123', CHECK_POLICY = OFF;
GO
USE PruebasDatosMaestros;
GO
CREATE USER app_prueba FOR LOGIN app_prueba;
ALTER ROLE db_datareader ADD MEMBER app_prueba;
ALTER ROLE db_datawriter ADD MEMBER app_prueba;
GO
*/

-- =====================================================================
-- VERIFICACIÓN RÁPIDA (valores esperados)
--   CatalogoIndependiente: 38 filas | CategoriaMotivo: 26 | CatalogoJerarquia: 12
--   Solicitud: 0 filas y 10 restricciones CK_Sol_*
-- =====================================================================
-- SELECT COUNT(*) FROM CatalogoIndependiente;
-- SELECT COUNT(*) FROM CategoriaMotivo;
-- SELECT COUNT(*) FROM CatalogoJerarquia;
-- SELECT COUNT(*) FROM sys.check_constraints
--   WHERE parent_object_id = OBJECT_ID('Solicitud') AND name LIKE 'CK_Sol_%';
