# SMARTFIX AI — Sitio web estático

Sitio web de SMARTFIX AI, servicio técnico de celulares y diagnóstico inteligente orientativo en Oruro, Bolivia. Está construido con HTML5, CSS3 y JavaScript moderno, sin backend, sin base de datos y sin proceso de compilación. Puede publicarse directamente en GitHub Pages.

> **Aviso:** el diagnóstico en línea es orientativo. No se conecta al celular, no identifica la falla con certeza y no reemplaza una revisión técnica presencial.

---

## 1. Contenido del sitio

- Página de inicio con presentación del servicio.
- Sección de servicios.
- Asistente de diagnóstico de 4 pasos:
  1. Datos del dispositivo.
  2. Selección de síntomas.
  3. Descripción y contexto.
  4. Informe orientativo.
- Informe con dispositivo, problemas identificados, posibles causas, recomendaciones, prioridad y señales de seguridad.
- Impresión del informe y opción de guardar como PDF desde el navegador.
- Apartado de cómo funciona, beneficios, misión, visión y valores.
- Preguntas frecuentes.
- Formulario de contacto que **no envía datos a un servidor**: prepara un mensaje para WhatsApp.
- Enlaces directos a WhatsApp: `+591 60404018` → `https://wa.me/59160404018`.
- Modo claro/oscuro con persistencia local.
- Diseño responsive, navegación móvil, animaciones discretas y estilos de impresión.
- Metadatos SEO, Open Graph, datos estructurados `LocalBusiness` y archivo `.nojekyll`.

Los datos del diagnóstico y del formulario se procesan únicamente en el navegador. No hay llamadas a APIs privadas ni almacenamiento de datos personales en el sitio.

---

## 2. Estructura del proyecto

```text
smartfixweb/
├── index.html
├── .nojekyll
├── README.md
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── img/
│   │   ├── logo-mark.svg
│   │   ├── favicon-32.png
│   │   ├── apple-touch-icon.png
│   │   └── og-image.png
│   └── js/
│       ├── main.js
│       ├── diagnosis-rules.js
│       ├── diagnosis.js
│       └── contact.js
└── tests/
    └── engine.test.cjs
```

### Responsabilidad de cada archivo

| Archivo | Función |
| --- | --- |
| `index.html` | Estructura, contenido, formularios, metadatos y carga de dependencias. |
| `assets/css/styles.css` | Sistema de diseño, componentes, responsive, modo oscuro e impresión. |
| `assets/js/main.js` | Utilidades compartidas, tema, navegación, scrollspy y animaciones de entrada. |
| `assets/js/diagnosis-rules.js` | Motor de reglas local. No depende del DOM y puede probarse con Node. |
| `assets/js/diagnosis.js` | Controlador del asistente, validaciones, informe, gráfico, impresión y WhatsApp. |
| `assets/js/contact.js` | Validación del formulario y generación del mensaje de WhatsApp. |
| `tests/engine.test.cjs` | Pruebas automáticas del motor de diagnóstico. |

### Dependencias externas (CDN)

- Bootstrap 5.3.3 (CSS y bundle JS).
- Bootstrap Icons 1.11.3.
- Google Fonts: Sora e Inter.
- Chart.js 4.4.3.
- SweetAlert2 11.12.0.

No hay paquetes npm necesarios para publicar el sitio. Las dependencias se cargan por HTTPS desde CDN.

---

## 3. Cómo verlo localmente

No abras `index.html` directamente con `file://` si quieres probar todos los enlaces y el portapapeles. Usa un servidor local simple:

### Opción A: Python

```bash
python -m http.server 4173
```

Abre `http://localhost:4173/`.

### Opción B: Node.js

```bash
npx serve .
```

Abre la URL que indique la herramienta.

### Opción C: Visual Studio Code

Usa la extensión **Live Server** y abre `index.html` con “Open with Live Server”.

---

## 4. Publicación en GitHub Pages

Sitio publicado en:

```text
https://hardnavi.github.io/smartfixweb/
```

Repositorio:

```text
https://github.com/Hardnavi/smartfixweb
```

### 4.1. Repositorio y publicación inicial (referencia)

El proyecto ya está vinculado al repositorio `Hardnavi/smartfixweb` y publicado con GitHub Pages desde la rama `main`, carpeta raíz. Para recrear el proceso desde cero:

1. Crea un repositorio nuevo en GitHub, por ejemplo `smartfixweb`.
2. No es necesario inicializarlo con README si ya tienes estos archivos.
3. Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Sitio web SMARTFIX AI"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/smartfixweb.git
git push -u origin main
```

### 4.2. Configuración de GitHub Pages

1. Entra al repositorio en GitHub.
2. Ve a **Settings → Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**.
4. Selecciona la rama `main` y la carpeta `/ (root)`.
5. Pulsa **Save**.
6. Espera uno o dos minutos. La URL publicada es:

```text
https://hardnavi.github.io/smartfixweb/
```

El archivo `.nojekyll` evita que GitHub Pages procese el sitio con Jekyll y ayuda a servir correctamente todos los archivos.

### 4.3. Actualizar el sitio

Cada cambio se publica al hacer commit y push:

```bash
git add .
git commit -m "Actualiza contenido del sitio"
git push
```

GitHub Pages volverá a desplegar automáticamente.

### 4.4. Dominio propio (opcional)

Si usas un dominio propio:

1. Configura el dominio en **Settings → Pages → Custom domain**.
2. Crea los registros DNS indicados por GitHub.
3. Activa **Enforce HTTPS** cuando el certificado esté disponible.
4. Actualiza las URLs absolutas de Open Graph y, si corresponde, añade una etiqueta `canonical`.

---

## 5. Ajustes antes de publicar

### 5.1. URL absoluta para Open Graph

Las etiquetas `og:image`, `twitter:image`, `og:url` y `canonical` ya apuntan a la URL publicada:

```html
<meta property="og:image" content="https://hardnavi.github.io/smartfixweb/assets/img/og-image.png">
<meta name="twitter:image" content="https://hardnavi.github.io/smartfixweb/assets/img/og-image.png">
```

Si publicas en un dominio propio o cambias el nombre del repositorio, actualiza esas URLs y el bloque JSON-LD. Verifica la vista previa con el depurador de Open Graph de la red social que vayas a utilizar.

### 5.2. Número de WhatsApp

El número debe permanecer en formato internacional y sin el signo `+` dentro de la URL:

```text
https://wa.me/59160404018
```

Si cambia, actualiza todas las apariciones en `index.html`, `assets/js/diagnosis.js` y `assets/js/contact.js`.

### 5.3. Contenido del negocio

El sitio evita inventar certificaciones, dirección exacta, años de experiencia, precios, plazos o garantías. Si agregas información real, hazlo también en:

- el bloque JSON-LD de `index.html`;
- la sección “Nosotros”;
- las preguntas frecuentes;
- el pie de página.

### 5.4. Dependencias CDN

El sitio funciona con conexión a internet porque Bootstrap, Bootstrap Icons, Chart.js, SweetAlert2 y las fuentes se cargan desde CDN. Si necesitas funcionamiento sin conexión o mayor control de disponibilidad, descarga esas dependencias y sirve los archivos localmente. En ese caso, actualiza las rutas en `index.html`.

---

## 6. Cómo funciona el diagnóstico

El motor `assets/js/diagnosis-rules.js` es un sistema de reglas transparente, no un modelo generativo:

1. Suma el peso de los síntomas seleccionados y la antigüedad del equipo.
2. Detecta señales adicionales en la descripción y en el contexto (líquido, golpe, batería hinchada, olor a quemado, etc.).
3. Calcula un nivel de atención orientativo de 1 a 100.
4. Clasifica la prioridad como baja, media o alta.
5. Ordena posibles causas, recomendaciones y notas de seguridad.
6. Devuelve un objeto de informe que el frontend muestra e imprime.

Contrato público:

```js
SmartFixAIDiagnosis.analyze({
  brand: 'Samsung',
  model: 'Galaxy A54',
  os: 'Android',
  age: '3to4',
  symptoms: ['battery', 'charging', 'heat'],
  description: 'Se calienta al cargar.',
  context: { impact: false, liquid: false }
});
```

El resultado incluye, entre otros campos:

```js
{
  ok: true,
  version: '1.0.0',
  generatedAt: '2026-01-01T00:00:00.000Z',
  device: { brand, model, os, ageLabel, displayName },
  priority: { level, label, description },
  attentionScore: 84,
  critical: false,
  symptoms: [],
  signals: [],
  causes: [],
  recommendations: [],
  preventive: [],
  serviceNotes: [],
  safety: [],
  categories: [],
  disclaimer: '...'
}
```

El aviso orientativo está siempre visible en el informe y en el pie del sitio. Las señales críticas (líquido, batería hinchada, humo u olor a quemado) elevan la prioridad y muestran recomendaciones de seguridad.

### Pruebas del motor

Requiere Node.js 18 o superior:

```bash
node --test tests/engine.test.cjs
```

Las pruebas cubren prioridades baja/media/alta, señales críticas, detección de palabras clave, datos faltantes, duplicados, contrato de salida y límites del puntaje.

---

## 7. Formulario de contacto

El formulario **no envía datos a un servidor**. Al validar:

1. Comprueba nombre, celular boliviano o internacional, correo opcional, motivo, mensaje y consentimiento.
2. Construye un mensaje de texto.
3. Genera un enlace `wa.me` con el mensaje codificado.
4. Muestra una vista previa y permite copiar el texto.

El usuario decide si abre WhatsApp y envía el mensaje. No hay almacenamiento, cookies de seguimiento ni envío silencioso de datos.

Validación del celular:

- Celular boliviano de 8 dígitos que empieza por 6 o 7: `70012345`.
- Con código de país: `+591 70012345`.
- Números internacionales escritos con `+` y entre 8 y 15 dígitos.

---

## 8. Accesibilidad y compatibilidad

- Idioma declarado: `es`.
- Enlace para saltar al contenido.
- Navegación con teclado y foco visible.
- Formularios con etiquetas, mensajes de error y atributos `aria-invalid`.
- Regiones dinámicas con `aria-live` para el análisis y el mensaje de WhatsApp.
- Respeto a `prefers-reduced-motion`.
- Contraste cuidado en modo claro y oscuro.
- Diseño responsive desde pantallas pequeñas hasta escritorio.
- Estilos de impresión A4 para el informe.

Navegadores recomendados: versiones recientes de Chrome, Edge, Firefox y Safari. Chart.js y SweetAlert2 tienen mecanismos de respaldo parcial si no cargan, aunque se recomienda conexión a internet para la experiencia completa.

---

## 9. Limitaciones conocidas

- **No es IA generativa real.** Es un motor de reglas local; la interfaz lo explica de forma transparente.
- **No hay backend.** No se guardan solicitudes, no se envían correos automáticos y no se agenda una cita desde la web.
- **No hay diagnóstico remoto del hardware.** El informe solo se basa en los síntomas que el usuario describe.
- **El PDF depende del navegador.** “Guardar PDF” abre el diálogo de impresión; el usuario debe elegir “Guardar como PDF”.
- **Dependencia de CDN y conexión.** Bootstrap, iconos, fuentes, Chart.js y SweetAlert2 se cargan desde internet.
- **Sin dirección física ni precios.** No se publican datos que no hayan sido confirmados por el negocio.
- **Open Graph requiere URL absoluta.** GitHub Pages no puede resolver una imagen relativa para los rastreadores sociales.

---

## 10. Integración futura con IA real

El motor local puede sustituirse sin rehacer la interfaz. Para una integración real y segura:

1. **No coloques claves API en el navegador.** Usa una función serverless (Cloudflare Workers, Netlify Functions, Vercel Functions u otro servicio equivalente).
2. **Mantén el contrato de `analyze()`.** El backend debe devolver la misma estructura (`priority`, `causes`, `recommendations`, `safety`, etc.) para que `diagnosis.js` siga funcionando.
3. **Valida y limita la entrada.** Longitud máxima, lista cerrada de síntomas, rate limiting y protección contra abuso.
4. **Añade privacidad.** Informa qué se envía a un proveedor de IA, evita datos sensibles y define retención.
5. **Incluye un fallback local.** Si la API falla, el motor de reglas actual puede seguir generando un informe orientativo.
6. **Mantén el aviso.** La IA real tampoco puede garantizar la causa exacta sin revisión presencial.
7. **Revisa sesgos y mensajes de seguridad.** Las señales críticas deben seguir mostrando instrucciones claras y prudentes.

Ejemplo de flujo futuro:

```text
Navegador → función serverless (clave secreta) → proveedor de IA
          ← respuesta validada y normalizada
Navegador ← informe con el mismo contrato actual
```

Nunca expongas una clave privada en `assets/js/*.js`, en el HTML ni en un repositorio público.

---

## 11. Créditos y mantenimiento

- Marca, contenido y dirección de producto: SMARTFIX AI.
- Diseño y desarrollo: sitio estático propio.
- Logotipo e imágenes: recursos SVG/CSS originales incluidos en el proyecto; no se usan fotografías de stock.
- Fuentes: Google Fonts (Sora e Inter), sujetas a sus propias licencias.
- Iconos: Bootstrap Icons.
- Componentes: Bootstrap, Chart.js y SweetAlert2.

Para actualizar contenido, edita `index.html` y los archivos de `assets/`. Para cambiar reglas de diagnóstico, edita `assets/js/diagnosis-rules.js` y vuelve a ejecutar las pruebas antes de publicar.

---

## 12. Contacto

WhatsApp: [+591 60404018](https://wa.me/59160404018)  
Ubicación: Oruro, Bolivia  
Atención coordinada por WhatsApp.
