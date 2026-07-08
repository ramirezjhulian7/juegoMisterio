# 🕵️ Juego de Misterio — Expedientes sin Resolver

App cooperativa en tiempo real para resolver casos de detective (*Unsolved Case Files*)
entre amigos. Un anfitrión crea una sala, comparte el código, y hasta **15 detectives**
investigan juntos: ven las mismas evidencias, comparten notas, clasifican sospechosos y
proponen la solución. Todo el avance se guarda en **SQLite**.

## Arquitectura

```
juegoMisterio/
├── PDF/                     # Los 3 casos originales (escaneos)
├── server/                  # Back: Express + Socket.IO + SQLite
│   ├── src/
│   │   ├── index.ts         # API REST + servidor de sockets
│   │   ├── sockets.ts       # Eventos en tiempo real (salas, notas, tablero)
│   │   ├── repo.ts          # Acceso a datos (better-sqlite3)
│   │   ├── db.ts            # Esquema SQLite
│   │   └── scripts/
│   │       ├── rasterize.py # Convierte los PDFs a imágenes + manifest.json
│   │       └── seed.ts      # Carga los casos en la base de datos
│   ├── data/misterio.db     # Base de datos (se crea sola)
│   └── uploads/             # Imágenes de evidencia (generadas)
└── client/                  # Front: React + Vite + socket.io-client
    └── src/
        ├── pages/           # Home (crear/unirse) y Room (tablero)
        └── components/      # Visor, Sospechosos, Notas, Galería, SolveBar
```

- **Tiempo real:** cada sala es un canal de Socket.IO. Notas, estado de sospechosos e
  intentos de solución se emiten al instante a todos los conectados.
- **Persistencia:** SQLite guarda casos, salas, jugadores, notas, tablero e intentos.
  Si alguien recarga o entra tarde, recibe el estado completo.
- **Evidencias:** los PDFs son escaneos, así que se rasterizan una vez a PNG y se sirven
  como imágenes. El tipo de cada documento (testigo, carta, llamada…) se detecta
  automáticamente del texto.

## Puesta en marcha

Requisitos: **Node 18+**, **Python 3** con **PyMuPDF** (`pip install PyMuPDF`).

```bash
# 1. Instalar dependencias (raíz + server + client)
npm run install:all

# 2. Rasterizar los PDFs a imágenes (solo la primera vez)
python server/src/scripts/rasterize.py

# 3. Cargar los casos en la base de datos
npm run seed

# 4. Arrancar back (:4000) y front (:5173) a la vez
npm run dev
```

Abre <http://localhost:5173>, crea una sala, comparte el código de 5 letras y a jugar.

## Notas de diseño

- **Soluciones:** las respuestas oficiales no vienen en los PDF (se verifican en la web
  del fabricante). El campo `objectives.answer` en la DB es opcional: si lo rellenas, la
  app valida sola; si lo dejas vacío, muestra el enlace de verificación oficial.
- **Añadir objetivos extra** (la versión completa trae 3 por caso): inserta filas en la
  tabla `objectives` con su `answer`.
- **Límite de jugadores:** configurable por sala (`rooms.max_players`, por defecto 15).
