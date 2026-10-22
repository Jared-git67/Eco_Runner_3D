# Eco Runner 3D

Runner futurista en tercera persona construido con **Three.js** y **Vite**. Recorres una pista de neón dividida en tres carriles, esquivas obstáculos y recoges cristales de energía mientras la velocidad aumenta poco a poco. Toda la escena se genera con geometrías y materiales de Three.js: no usa modelos, imágenes ni sonidos externos.

## Objetivo

Consigue **15 cristales** sin quedarte sin vidas. Cada cristal suma puntos, igual que la distancia recorrida; chocar contra un obstáculo resta una vida y penaliza la puntuación. Si llegas a la meta de cristales, ganas la partida y recibes una bonificación por cada vida restante.

## Reglas

- Empiezas con **3 vidas** y **0 cristales**.
- Hay **15 cristales** repartidos por la pista. La partida termina en victoria al recoger el último.
- Los cristales aparecen espaciados y nunca en el carril de un obstáculo cercano, para que siempre se puedan recoger sin arriesgar una vida.
- Un impacto contra una barra o un bloque resta **1 vida**, aplica una penalización de **75 puntos** y concede **1,5 segundos de invulnerabilidad**. Durante ese tiempo el personaje parpadea y no puede recibir otro daño.
- Puedes saltar por encima de las barreras bajas. Los bloques altos deben esquivarse cambiando de carril.
- La velocidad base es de **24 m/s** y aumenta con la distancia hasta un máximo de **46 m/s**. Cuanto más avanzas, más seguidos aparecen los obstáculos.
- La puntuación combina metros recorridos (1,25 puntos por metro), cristales (100 puntos cada uno), penalizaciones por choque y una bonificación de **250 puntos por vida** al ganar.
- El récord se guarda en el almacenamiento local del navegador.
- Al reiniciar se restablecen vidas, puntuación, distancia, cristales, obstáculos, cámara y todos los objetos de la escena.

## Controles

### Teclado

| Acción | Teclas |
| --- | --- |
| Moverse al carril izquierdo | `←` o `A` |
| Moverse al carril derecho | `→` o `D` |
| Saltar | `Espacio`, `↑` o `W` |
| Pausar / reanudar | `Esc` o `P` |
| Reiniciar | `R` |
| Silenciar / activar sonido | `M` |
| Empezar o confirmar | `Espacio` o `Enter` |

### Móvil y tableta

- Desliza el dedo hacia la izquierda o la derecha sobre la pista para cambiar de carril.
- Desliza hacia arriba para saltar.
- También hay botones táctiles en pantalla para izquierda, derecha y salto.

## Victoria y derrota

- **Victoria:** recoges los 15 cristales. La pantalla final muestra la puntuación, los cristales, la distancia, el récord y la bonificación por vidas.
- **Derrota:** pierdes las 3 vidas. Puedes reiniciar la partida o volver al menú desde la pantalla final.

## Tecnologías

- [Three.js](https://threejs.org/) para el renderizado 3D, la iluminación, las partículas y las animaciones.
- [Vite](https://vite.dev/) como servidor de desarrollo y empaquetador.
- [Vitest](https://vitest.dev/) para las pruebas de la lógica del juego.
- **JavaScript** moderno con módulos ES, **HTML5** y **CSS3**.
- **Web Audio API** para los efectos de sonido sintetizados.
- **GitHub Actions** para probar, compilar y publicar en GitHub Pages.

La lógica de juego (`GameState`, `CollisionSystem`, `spawn`) está separada de Three.js para poder probarla sin WebGL.

## Ejecución local

Necesitas **Node.js 20 o superior** y npm.

```bash
npm install
npm run dev
```

Abre la dirección que muestra Vite, normalmente <http://localhost:5173/>.

### Pruebas

```bash
npm test
```

Ejecuta la suite de Vitest una vez. Para vigilar los cambios:

```bash
npm run test:watch
```

### Compilación de producción

```bash
npm run build
npm run preview
```

El resultado se genera en `dist/`. `npm run preview` sirve esa compilación en <http://localhost:4173/>.

## Publicación en GitHub Pages

El repositorio incluye el flujo de trabajo `.github/workflows/deploy.yml`. En cada push a `main` (o al lanzarlo manualmente desde la pestaña **Actions**):

1. Instala las dependencias con `npm ci`.
2. Ejecuta las pruebas con `npm test`.
3. Calcula la ruta base a partir de `GITHUB_REPOSITORY` y compila con `npm run build`.
4. Publica `dist/` con las acciones oficiales de GitHub Pages.

No hay que escribir el nombre de usuario ni del repositorio en la configuración: la ruta base se obtiene automáticamente. Para activarlo:

1. Crea un repositorio en GitHub y sube el contenido del proyecto.
2. En **Settings → Pages**, selecciona **GitHub Actions** como origen de la publicación.
3. Haz push a la rama `main` o ejecuta el flujo de trabajo desde **Actions**.

La dirección tendrá el formato `https://TU_USUARIO.github.io/TU_REPOSITORIO/`. Si el repositorio se llama `TU_USUARIO.github.io`, la ruta base será la raíz del dominio.

Para compilar manualmente con una ruta base concreta:

```bash
# Linux o macOS
VITE_BASE_PATH=/mi-repositorio/ npm run build

# PowerShell
$env:VITE_BASE_PATH="/mi-repositorio/"; npm run build
```

## Estructura del proyecto

```
.
├── .github/workflows/deploy.yml   # Pruebas, build y despliegue en GitHub Pages
├── index.html                     # Estructura del HUD, menús y controles táctiles
├── public/favicon.svg             # Icono del sitio
├── src
│   ├── main.js                    # Punto de entrada
│   ├── style.css                  # Estética neón y diseño responsive
│   └── game
│       ├── Game.js                # Bucle principal y orquestación
│       ├── GameState.js           # Vidas, puntuación, salto y estados
│       ├── CollisionSystem.js     # Colisiones y recogida de cristales
│       ├── spawn.js               # Patrones de obstáculos y dificultad
│       ├── World.js               # Escena, pista, cámara e iluminación
│       ├── PlayerModel.js         # Personaje y animaciones
│       ├── ObstacleManager.js     # Creación y reciclaje de obstáculos
│       ├── CrystalManager.js      # Formaciones y animación de cristales
│       ├── ParticleSystem.js      # Partículas de impacto y recogida
│       ├── AudioManager.js        # Sonido sintetizado con Web Audio
│       ├── InputManager.js        # Teclado y gestos táctiles
│       ├── UI.js                  # Pantallas, HUD y botones
│       ├── config.js              # Constantes de juego
│       ├── math.js                # Utilidades matemáticas
│       ├── utils.js               # Texturas y utilidades de Three.js
│       └── __tests__              # Pruebas con Vitest
├── package.json
├── vite.config.js
└── README.md
```

## Rendimiento

La escena reutiliza geometrías y materiales, agrupa la ciudad en una sola malla fusionada y dibuja pilares y arcos con `InstancedMesh`. En la versión actual el juego se renderiza en torno a 70 llamadas de dibujo, frente a las más de 300 de la primera versión, lo que mejora la fluidez en equipos modestos y dispositivos móviles.
