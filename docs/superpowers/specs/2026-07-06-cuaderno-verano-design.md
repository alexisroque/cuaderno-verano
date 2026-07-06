# El Cuaderno de Verano — Documento de diseño

**Fecha:** 2026-07-06
**Estado:** Aprobado en brainstorming, pendiente de revisión de spec
**Usuarios:** Aira (9-10 años, 4º→5º de Primaria) y Leo (4-5 años, I4→I5)

## 1. Resumen

PWA para iPad, 100% offline, que Aira y Leo usan a diario durante el verano para practicar matemáticas (método Innovamat), lectura, escritura, ortografía, inglés, geografía y cultura general. Metáfora de "cuaderno de verano infinito": cada día genera una página nueva de contenido. Gamificación estilo Opal/Chess.com: gemas por habilidad que evolucionan por maestría, pasaporte de sellos (Aira) y mural de pegatinas (Leo). El contenido se ambienta según el calendario real del verano: viaje a Singapur–Borneo–Kuala Lumpur–Bali en julio, "verano en casa" en agosto.

**Objetivo:** que en septiembre ambos empiecen el curso sintiéndose por delante, habiendo trabajado sus puntos débiles concretos (informes escolares) sin que la app "suene a escuela".

## 2. Contexto: perfiles y prioridades

Fuente detallada: `docs/research/perfil-y-contenidos.md`.

### Aira (empieza 5º en septiembre)
- **Reforzar (prioridad):** resolución de problemas con enunciado (necesita andamiaje), multiplicación/división, cálculo mental, conexión mates–vida real (NA en diagnóstica), ortografía catalana, expresión escrita, comprensión oral/lectora crítica ("reflexionar y valorar").
- **Fortalezas:** inglés (excelente), razonamiento de patrones, comprensión lectora. Inglés = zona de éxito, no correctiva.
- **Gustos:** manga/kawaii, animales, LEGO Friends, música, historia e historias, curiosidades, anécdotas, chistes, Sistema Solar. Lectora de *Sapiens* (versión juvenil).
- **Recomendaciones del cole:** diario de verano, lectura diaria, operaciones y problemas cotidianos (dinero, horarios, medida).

### Leo (empieza I5 en septiembre)
- **Reforzar (prioridad):** control del trazo y motricidad fina (única recomendación explícita), números en espejo (normal a su edad).
- **Base actual:** números 0-10, descomposición de 4-6, patrones AB/ABC, formas, simetría, suma manipulativa, letra-sonido de letras trabajadas, copia palabras. NO lee frases.
- **Gustos:** animales, Dragon Ball, LEGO Ninjago, coches, construcciones, cuentos, humor, retos.
- **Estilo:** manipulativo, visual, narrativo; se sobreexcita en juego libre; sesiones cortas.

## 3. Decisiones de producto (aprobadas)

| Decisión | Elección |
|---|---|
| Plataforma | iPad, PWA instalable (Add to Home Screen), GitHub Pages |
| Offline | 100%: todo el contenido en el bundle, cero peticiones de red en uso |
| Idioma | Interfaz en castellano; ejercicios de lengua en catalán Y castellano; módulo de inglés |
| Sesión | Híbrido: página diaria corta + entrenamiento libre ("¿Quieres más?") |
| Duración | Ajustable por niño desde panel de padres (Leo ~10 min, Aira ~15-20 min) |
| Home | "Cuaderno infinito": página del día con tarjetas independientes (NO mapa de niveles) |
| Progresión | Gemas por habilidad estilo Chess.com (no XP global) |
| Desafíos | Contenido del curso siguiente marcado 🚀, ~1 de cada 5, solo si la base va bien |
| Tema | Capítulos como datos (JSON): Expedición (julio, sincronizada con itinerario real) → Verano en casa (agosto). Reutilizable otros veranos |
| Línea visual | Kawaii calmado (base) + celebraciones manga dosificadas (recompensas) |
| Dictados | Series culturales por episodios (NO frases vacías); chistes ocasionales (~1/6) |

## 4. Experiencia diaria

### 4.1 Selección de perfil
Portada con los dos avatares. Cada perfil tiene su mundo visual y su estado. Sin comparación entre hermanos en ninguna pantalla.

### 4.2 La página de hoy — Aira
4 tarjetas que se regeneran a diario (deterministas por fecha):

1. **El problema del día** — problema con enunciado ambientado en el capítulo actual (dinero en SGD/MYR/IDR simplificado a €, horarios de vuelos, distancias, fauna). Formato Innovamat.
2. **El dictado del día** — episodio de una serie cultural (ver §6.2), audio TTS, en catalán o castellano (alternancia con más peso al catalán por la prioridad de ortografía).
3. **¿Sabías que...?** — lectura corta (serie cultural o viaje) + pregunta de comprensión reflexiva ("¿tú qué habrías hecho?", "¿por qué crees que...?").
4. **Mi diario** — pregunta-disparador del día para escribir 3-5 frases. Guarda borradores. Los textos viajan en la exportación JSON del panel de padres (§8) y además se pueden exportar como texto legible ("El diario de Aira — verano 2026") para conservarlo como recuerdo.

### 4.3 La página de hoy — Leo
3 tarjetas grandes con audio en todo + 1 rotatoria:

1. **Trazos** — letra o número del día: trazado con el dedo sobre canvas, guía animada de dirección, tolerancia generosa, estrellas por seguir el recorrido. Trabaja explícitamente inversiones en espejo.
2. **Contar** — conteo, descomposición (4-6 base; 7-9 como desafío I5), con fauna del capítulo. Manipulativo: arrastrar, tocar, agrupar.
3. **English** — escuchar palabra → tocar la imagen correcta. Vocabulario temático (animales, colores, comida, huerto). Solo oral.
4. **La sorpresa de hoy** — rota: patrones, formas, simetría, puzles, cuento con audio, clasificación.

### 4.4 Entrenamiento libre ("¿Quieres más?")
Acceso directo a cualquier habilidad con generación infinita (caso de uso: espera en el aeropuerto). Aquí viven también los desafíos del curso siguiente a demanda.

### 4.5 El calendario manda
La app lee la fecha del iPad y activa el capítulo correspondiente:

| Fechas | Capítulo | Ambientación |
|---|---|---|
| hasta 11 jul | Preparando la expedición | maleta, ruta, cuenta atrás, 29.422 km |
| 12 jul | Día de vuelo | SQ387, husos horarios, 13h15 de vuelo |
| 13–15 jul | Singapur 🇸🇬 | hawkers, MRT, SGD, ley del chicle, merlión |
| 15–20 jul | Borneo 🦧🌿 | orangutanes de Sepilok, safari Kinabatangan, elefantes pigmeos |
| 20–24 jul | Kuala Lumpur 🇲🇾 | Petronas (alturas, medidas), satay, ringgits |
| 24–27 jul | Ubud, Bali 🌾 | arrozales, templos, monos, rupias, +1h |
| 27–29 jul | Gili Air 🐢 | tortugas, isla sin coches, ferries |
| 29 jul–4 ago | Sanur 🏖️ | playa, snorkel, day-trips |
| 5 ago → | Verano en casa 🏖️👵 | playa local, abuelos, helados, chiringuito |

Convención de rangos: inicio inclusivo, fin exclusivo (el 15 jul pertenece a Borneo, no a Singapur); los días de vuelo/traslado pertenecen al capítulo de destino. Los capítulos son JSON (fechas, lugar, mascota, vocabulario de ambientación, curiosidades, pegatinas del mural). Cambiar el tema otro verano = editar datos, no código. El "Pasaporte de Exploradores" del travel-planner del padre cubre experiencias del viaje; el pasaporte del Cuaderno cubre logros de aprendizaje (complementarios, no duplicados).

## 5. Motor de ejercicios de matemáticas

### 5.1 Generadores paramétricos
Cada tipo de ejercicio es una plantilla generadora (TypeScript) que emite: enunciado (con ambientación del capítulo), respuesta(s) válida(s), **y resoluciones paso a paso en todas las estrategias Innovamat aplicables**, calculadas con los números generados.

Catálogo inicial de generadores (Aira, base 4º):
- Tablas y tablero multiplicativo (patrones)
- Multiplicación: modelo rectangular, descomposición, algoritmo, hechos derivados
- División: reparto/agrupación con resto, esquema vertical, cajitas multiplicativas, descomposición
- Cálculo mental y estimación ("¿me llega el dinero?", acotar resultados, detectar errores)
- Problemas con enunciado 1-2 pasos (dinero, tiempo/horarios, medida, reparto) con dato-trampa opcional
- Medida: cambios de unidad razonados, área/perímetro en cuadrícula
- Relaciones: series y patrones de crecimiento
- Números romanos (ocasional, lúdico)

Desafíos 5º 🚀: fracciones (parte de unidad/colección, comparación, equivalentes), decimales con dinero (4 operaciones), hechos derivados con decimales, proporcionalidad en cambios de unidad, números cuadrados.

Leo (base I4): conteo resultativo, descomposición 4-6, comparación, patrones, formas, simetría, posiciones. Desafíos I5 🚀: descomposición 7-9, símbolos +/−/=, dobles, contar hasta 20, ±1/±2, estimación con comprobación.

### 5.2 Flujo de respuesta (feedback estilo Chess.com)
1. **Acierto** → celebración breve + botón "¿Cómo lo resolvió [mascota]?": muestra UNA estrategia paso a paso con animación (rota entre estrategias en días distintos) + pregunta "¿Lo hiciste igual o de otra forma?".
2. **Fallo (1º)** → sin "incorrecto" punitivo. Andamiaje por fases Innovamat: releer → "¿Qué sabemos?" (tocar los datos en el enunciado) → "¿Qué nos preguntan?" → "¿Qué operación ayuda?" → reintento.
3. **Fallo (2º)** → resolución guiada completa. El ejercicio (mismo subtema, otros números) se re-encola con repetición espaciada (1, 3, 7 días).
4. En problemas con enunciado, paso previo de comprensión: identificar datos relevantes y descartar el dato-trampa tocando el texto.

### 5.3 Motor adaptativo
- Cada habilidad (gema) se desglosa en **subtemas etiquetados** (p. ej. Cálculo → tablas, ×1 cifra, ×2 cifras, división con resto, mental, estimación; Ortografía → regla por regla).
- Cada respuesta registra: subtema, acierto, pistas usadas, tiempo.
- **Selección ponderada** (valores por defecto): 60% subtemas flojos o vencidos (repetición espaciada), 25% consolidación, 15% novedad; los desafíos 🚀 del curso siguiente son adicionales y aparecen ~1 de cada 5 días vía el motor de sorpresas (§7.4), nunca dentro del cupo de novedad. Proporciones ajustables desde el panel de padres.
- **Dificultad auto-calibrada** por subtema según precisión en ventana móvil (últimas 15-20): zona de "difícil pero alcanzable".
- Los ajustes del panel de padres (§8) actúan como prioridades por encima del motor.

## 6. Contenido editorial

### 6.1 Principios
- Nada de "Peppa y Pepe fueron a comprar": todo enunciado enseña algo del mundo o conecta con su vida real/viaje.
- Generado en volumen durante la implementación (por Claude), empaquetado como JSON legible y revisable por el padre antes de publicar.
- Bilingüe según módulo: dictados y lecturas en catalán y castellano; interfaz castellano; inglés en módulo propio.

### 6.2 Series culturales (dictados + lecturas de Aira)
- 🔥 **La aventura de ser humanos** — evolución estilo Sapiens juvenil: el fuego, neandertales, la primera aldea, la escritura...
- 🧭 **Exploradoras y exploradores** — Magallanes-Elcano, Jeanne Baret, Amelia Earhart, Ibn Battuta...
- 💡 **Inventos que cambiaron todo** — la rueda, el papel, la brújula, la penicilina...
- 🐾 **Animales increíbles** — sincronizada con el viaje cuando toca.

Formato episodio: 2-4 frases dictadas (TTS) → escritura → autocorrección con diff resaltando faltas → dato extra final → gancho del próximo episodio. Chistes: ~1 de cada 6-7 dictados y como recompensa de cofre.

### 6.3 Otros contenidos
- **¿Sabías que...?**: lecturas cortas con pregunta reflexiva final (trabaja "reflexionar y valorar").
- **Geografía** (tipo Seterra): mapas, países, capitales, banderas; el sudeste asiático destacado en julio.
- **Mundo** (cultura general): Sistema Solar, cómo funcionan las cosas, récords.
- **English Aira**: mini-lecturas, vocabulario, listening TTS en-US/en-GB.
- **English Leo**: palabra oída → imagen; canciones referenciadas (Scratch Garden y las del cole).
- **Cuentos Leo**: audio-cuentos cortos con pregunta visual.

## 7. Gamificación

### 7.1 Gemas por habilidad
7 niveles: Piedra → Cuarzo → Ámbar → Esmeralda → Rubí → Diamante → Ópalo.
- Suben por **maestría** (precisión sostenida a dificultad creciente), no por volumen. Sin descensos. Los umbrales concretos por nivel (p. ej. ≥80% en las últimas 20 respuestas a la dificultad del nivel) se fijan en la fase de planificación, calibrados para el objetivo de 1-2 subidas/semana.
- Aira: Cálculo, Problemas, Ortografía, Escritura, Lectura, English, Geografía, Mundo.
- Leo: Trazos, Números, English, Lógica — presentadas como estrellas que crecen (mismo sistema interno).
- Subida de gema = EL momento: pantalla completa, ráfaga manga, transformación. Frecuencia objetivo: 1-2/semana.
- La vitrina hace visible el desequilibrio; la gema floja "pide jugar" suavemente (empuje a compensar).

### 7.2 Colecciones
- **Pasaporte (Aira)**: sello diario del capítulo, hitos por gema, logros especiales.
- **Mural (Leo)**: pegatina por día completado, colocable libremente en la escena del capítulo (selva de Borneo, fondo del mar...). Galería de murales pasados.

### 7.3 Economía
- **Gemas pequeñas 💎** (moneda) por tarjeta completada → desbloquean chistes, datos premium, pegatinas extra, accesorios de mascota.
- **Racha 🔥** tolerante: 1 tarjeta/día la mantiene, con días de gracia automáticos. Da bonus, nunca castiga.
- **Cofre del día** al completar la página: recompensa variable.

### 7.4 Motor de sorpresas
~30% de días con evento aleatorio controlado (semilla = fecha):
- 🚀 Día de desafío (curso siguiente, anunciado con orgullo; solo si la gema base ≥ Ámbar)
- ⚡ Reto relámpago (60s de cálculo mental)
- 💎 Día de gema doble (sesgado hacia la habilidad más floja)
- 🎭 Mascota invitada
- 🎁 Cofre misterioso mejorado

### 7.5 Anti-patrones excluidos
Sin vidas/corazones, sin timers punitivos (salvo el reto relámpago opcional), sin comparación entre hermanos, sin notificaciones, sin compras ni anuncios (obvio: app familiar).

## 8. Panel de padres

Acceso con PIN. Contenido:
- **Actividad**: qué hizo cada niño cada día, tiempo, tarjetas completadas.
- **Mapa de calor por subtema**: precisión por subtema con código de color (p. ej. "×2 cifras: 55% 🔴").
- **Controles por subtema**: Reforzar (×2 frecuencia, 1 semana), dificultad (−1/auto/+1), modo foco semanal ("esta semana, fracciones").
- **Ajustes por niño**: duración de misión, proporción de desafíos, módulos on/off.
- **Exportar/importar progreso** (JSON descargable).

## 9. Arquitectura técnica

### 9.1 Stack
- **React + TypeScript + Vite**, `vite-plugin-pwa` (precache total del bundle y contenido).
- **Hosting**: GitHub Pages. Instalación vía Add to Home Screen (standalone).
- **Persistencia**: IndexedDB (progreso, historial de respuestas, diario, murales) + `navigator.storage.persist()`. Mitigación de pérdida: exportación/importación manual desde panel de padres.
- **Audio**: Web Speech API (voces locales del iPad; es-ES, ca-ES, en-US funcionan offline). Chequeo de voces al arrancar con instrucciones si falta alguna.
- **Trazos**: canvas + Pointer Events.

### 9.2 Estructura de datos
```
/content
  /chapters/*.json      → capítulos (fechas, lugar, mascota, ambientación, pegatinas)
  /series/*.json        → episodios de series culturales (por idioma)
  /curiosities/*.json   → datos, chistes, recompensas
  /geography/*.json     → países, capitales, banderas
  /english/*.json       → vocabulario con imágenes
/src/generators/*.ts    → generadores paramétricos (ejercicio + solución + estrategias)
/src/engine/            → motor del día, motor adaptativo, sorpresas, gemas
```

### 9.3 Determinismo
El motor del día compone la página con semilla (fecha + perfil + estado): reabrir el mismo día muestra la misma página. La aleatoriedad de sorpresas usa la misma semilla.

### 9.4 Módulos y aislamiento
- `generators` no conocen UI: entrada (subtema, dificultad, ambientación) → salida (ejercicio estructurado). Testeables en aislamiento.
- `engine` no conoce contenido concreto: opera sobre etiquetas y pesos.
- `content` es JSON validado por esquema; la UI lo renderiza genéricamente por tipo de tarjeta.
- Tipos de tarjeta = componentes UI independientes (problema, dictado, lectura, diario, trazos, conteo, tap-imagen...).

## 10. Manejo de errores y casos límite
- **Voz TTS ausente** → aviso en panel de padres con pasos de descarga; los dictados muestran el texto para que un adulto lo lea si no hay voz.
- **iOS purga IndexedDB** → `storage.persist()` + recordatorio periódico de exportar respaldo (icono discreto en panel de padres).
- **Cambio de fecha/zona horaria en viaje** (Bali +7h) → el capítulo se decide por fecha local del dispositivo; los días de vuelo tienen capítulo propio para evitar ambigüedad.
- **Página del día incompleta ayer** → no se acumula deuda: cada día es página nueva (el motor adaptativo ya re-encola lo fallado).
- **Dos niños, un iPad** → perfiles con estado separado en IndexedDB; cambio de perfil desde portada.

## 11. Testing
- **Generadores**: tests de propiedad con cientos de semillas (respuesta correcta, dificultad en rango, estrategias válidas paso a paso).
- **Motor adaptativo**: tests unitarios de selección ponderada y repetición espaciada con historiales sintéticos.
- **Contenido**: script de validación por esquema en CI (fechas de capítulos sin huecos ni solapes, episodios ordenados, campos completos, ortografía de los textos catalanes/castellanos revisada).
- **PWA/offline**: test manual guiado en iPad (instalar, modo avión, sesión completa de cada niño).

## 12. Fuera de alcance (v1)
- Cuentas en la nube, sincronización multi-dispositivo (la exportación manual cubre el caso).
- Reconocimiento de escritura a mano para Aira (teclado táctil en v1).
- Reconocimiento de voz (speaking) en inglés.
- Modo multijugador/colaborativo entre hermanos.
- Editor visual de temas (los capítulos se editan como JSON).

## 13. Criterios de éxito
- Uso diario sostenido en julio y agosto sin insistencia parental (la métrica honesta: ¿la abren solos?).
- Aira: mejora visible en el mapa de calor de problemas con enunciado y ortografía entre julio y septiembre.
- Leo: trazos con mayor precisión (puntuación interna) y sin frustración.
- Cero dependencias de red en uso real (verificado en modo avión durante el viaje).
