/* ==========================================================================
   SMARTFIX AI — diagnosis-rules.js
   Motor de diagnóstico orientativo basado en reglas y patrones de síntomas.
   No usa APIs externas ni envía datos: se ejecuta completamente en el navegador.

   Contrato público:
   SmartFixAIDiagnosis.analyze({ brand, model, os, age, symptoms, description, context })
   Devuelve un objeto de informe. Para sustituirlo por una IA real, conserva
   este contrato y reemplaza la implementación de analyze() por una llamada a
   un servicio seguro (nunca coloques claves privadas en el frontend).
   ========================================================================== */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SmartFixAIDiagnosis = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  var DISCLAIMER =
    'Este diagnóstico es orientativo y se basa en los síntomas proporcionados. ' +
    'No reemplaza una revisión técnica presencial ni garantiza la identificación exacta de la falla.';

  var PRIORITY_LEVELS = {
    low: {
      level: 'low',
      label: 'Prioridad baja',
      description:
        'Los síntomas reportados no sugieren una urgencia inmediata. Puedes aplicar las recomendaciones y observar la evolución del equipo.'
    },
    medium: {
      level: 'medium',
      label: 'Prioridad media',
      description:
        'Conviene revisar la configuración y los hábitos de uso. Si el problema persiste o empeora, es recomendable coordinar una revisión técnica.'
    },
    high: {
      level: 'high',
      label: 'Prioridad alta',
      description:
        'Los síntomas sugieren que el equipo necesita atención. Evita el uso prolongado y coordina una revisión técnica para confirmar la causa.'
    }
  };

  var BRANDS = [
    { name: 'Samsung', examples: ['Galaxy A54', 'Galaxy S23', 'Galaxy A14'] },
    { name: 'Xiaomi', examples: ['Redmi Note 13', 'Redmi 12', 'Xiaomi 14'] },
    { name: 'Motorola', examples: ['Moto G54', 'Moto E13', 'Edge 40'] },
    { name: 'Apple (iPhone)', examples: ['iPhone 15', 'iPhone 13', 'iPhone 11'] },
    { name: 'Huawei', examples: ['P30 Lite', 'Nova 11i', 'Y9'] },
    { name: 'Tecno', examples: ['Spark 20', 'Camon 20', 'Pova 6'] },
    { name: 'Infinix', examples: ['Hot 40', 'Note 30', 'Smart 8'] },
    { name: 'Realme', examples: ['C67', '11 Pro', 'Narzo 60'] },
    { name: 'Oppo', examples: ['A78', 'Reno 11F', 'A58'] },
    { name: 'Honor', examples: ['X7b', 'X8a', 'Magic 6 Lite'] },
    { name: 'Nokia', examples: ['G22', 'C32'] },
    { name: 'Otra marca', examples: [] }
  ];

  var AGES = [
    { id: 'lt1', label: 'Menos de 1 año', short: 'menos de 1 año', risk: 0 },
    { id: '1to2', label: 'Entre 1 y 2 años', short: '1 a 2 años', risk: 3 },
    { id: '3to4', label: 'Entre 3 y 4 años', short: '3 a 4 años', risk: 8 },
    { id: 'gt4', label: 'Más de 4 años', short: 'más de 4 años', risk: 13 },
    { id: 'unknown', label: 'No estoy seguro', short: 'antigüedad no confirmada', risk: 4 }
  ];

  var CATEGORY_LABELS = {
    battery: 'Batería',
    thermal: 'Temperatura',
    display: 'Pantalla',
    performance: 'Rendimiento',
    charging: 'Carga',
    connectivity: 'Conectividad',
    stability: 'Estabilidad',
    audio: 'Sonido',
    camera: 'Cámara',
    other: 'Otros'
  };

  var SYMPTOMS = {
    battery: {
      id: 'battery',
      label: 'La batería se descarga rápidamente',
      short: 'Batería',
      icon: 'bi-battery-half',
      category: 'battery',
      weight: 24,
      causes: [
        {
          title: 'Desgaste natural de la batería',
          detail: 'La capacidad de una batería disminuye con el tiempo y con los ciclos de carga.',
          strength: 32
        },
        {
          title: 'Aplicaciones activas en segundo plano',
          detail: 'Algunos procesos consumen energía aunque la pantalla esté apagada.',
          strength: 24
        },
        {
          title: 'Configuración de pantalla y conexiones',
          detail: 'El brillo alto y las conexiones permanentes pueden acelerar el consumo.',
          strength: 18
        }
      ],
      recommendations: [
        'Revisa el consumo de batería por aplicación en los ajustes del sistema.',
        'Reduce el brillo y desactiva Wi-Fi, Bluetooth o ubicación cuando no los uses.',
        'Activa el modo de ahorro de energía y observa si la duración mejora.',
        'Evita dejar el equipo conectado al cargador durante muchas horas si no es necesario.'
      ],
      preventive: [
        'Usa cargadores y cables compatibles, en buen estado.',
        'Evita exponer el celular al calor mientras se carga.',
        'No dejes que la batería llegue siempre al 0 % antes de cargar.'
      ],
      technician:
        'Si la batería se agota en pocas horas sin uso intenso, se hincha o el equipo se apaga antes de llegar al 0 %, conviene una revisión.'
    },

    heat: {
      id: 'heat',
      label: 'El celular se calienta demasiado',
      short: 'Temperatura',
      icon: 'bi-thermometer-half',
      category: 'thermal',
      weight: 27,
      causes: [
        {
          title: 'Carga o uso intenso',
          detail: 'Cargar y usar el equipo al mismo tiempo, o ejecutar tareas exigentes, puede elevar la temperatura.',
          strength: 30
        },
        {
          title: 'Ventilación limitada',
          detail: 'Una funda gruesa o apoyar el equipo sobre superficies blandas puede dificultar la disipación del calor.',
          strength: 24
        },
        {
          title: 'Aplicaciones o procesos en segundo plano',
          detail: 'Algunas apps pueden mantener el procesador activo más tiempo del esperado.',
          strength: 22
        },
        {
          title: 'Batería o componente interno',
          detail: 'En menos casos, el calor puede relacionarse con la batería o con un componente que requiere revisión.',
          strength: 18
        }
      ],
      recommendations: [
        'Retira la funda mientras cargas el equipo y colócalo sobre una superficie dura y ventilada.',
        'Evita usar el celular mientras se carga, especialmente con juegos o videos en alta calidad.',
        'Cierra las aplicaciones que no estés usando y observa si la temperatura baja.',
        'Si está muy caliente, apágalo y deja que se enfríe a temperatura ambiente; no lo pongas en el refrigerador.'
      ],
      preventive: [
        'Evita dejarlo al sol o dentro de un vehículo cerrado.',
        'No lo cargues durante largos periodos si no es necesario.',
        'Mantén actualizadas las aplicaciones que más consumen recursos.'
      ],
      technician:
        'Si se calienta demasiado sin estar cargando o sin apps exigentes, si notas olor a quemado o el equipo se apaga por temperatura, busca una revisión.'
    },

    screen: {
      id: 'screen',
      label: 'La pantalla presenta problemas',
      short: 'Pantalla',
      icon: 'bi-display',
      category: 'display',
      weight: 34,
      causes: [
        {
          title: 'Daño físico del panel o del vidrio',
          detail: 'Golpes, caídas o presión sobre la pantalla pueden afectar la visualización o el táctil.',
          strength: 35
        },
        {
          title: 'Falla del táctil o del conector interno',
          detail: 'El flex o el conector de la pantalla puede haberse aflojado o dañado.',
          strength: 24
        },
        {
          title: 'Ajustes o software del sistema',
          detail: 'En algunos casos, un problema de software puede afectar el brillo, la sensibilidad o la imagen.',
          strength: 14
        }
      ],
      recommendations: [
        'No presiones la zona afectada ni intentes reparar la pantalla por tu cuenta.',
        'Reinicia el equipo y verifica si el problema aparece en todas las aplicaciones o solo en una.',
        'Evita exponer el equipo a humedad o a cambios bruscos de temperatura.',
        'Si hay vidrio roto, usa un protector temporal y evita el contacto con las esquinas dañadas.'
      ],
      preventive: [
        'Usa una funda y un protector de pantalla adecuados.',
        'Evita guardar el celular con llaves u objetos que puedan rayarlo.',
        'No lo expongas a presión en bolsillos ajustados.'
      ],
      technician:
        'Si hay grietas, líneas, manchas, zonas que no responden al tacto o la imagen se ve distorsionada, se recomienda una evaluación.'
    },

    performance: {
      id: 'performance',
      label: 'El celular funciona lentamente',
      short: 'Rendimiento',
      icon: 'bi-hourglass-split',
      category: 'performance',
      weight: 22,
      causes: [
        {
          title: 'Almacenamiento casi lleno',
          detail: 'Cuando queda poco espacio libre, el sistema puede tener dificultades para gestionar archivos y procesos.',
          strength: 30
        },
        {
          title: 'Aplicaciones en segundo plano o caché acumulada',
          detail: 'Las apps y sus datos temporales pueden ocupar recursos con el tiempo.',
          strength: 24
        },
        {
          title: 'Sistema o aplicaciones desactualizadas',
          detail: 'Las versiones recientes suelen incluir correcciones de rendimiento y compatibilidad.',
          strength: 18
        },
        {
          title: 'Limitaciones por antigüedad del hardware',
          detail: 'Un equipo con varios años de uso puede tener menos margen para aplicaciones actuales.',
          strength: 14
        }
      ],
      recommendations: [
        'Libera almacenamiento: elimina archivos, capturas y aplicaciones que no uses.',
        'Cierra aplicaciones en segundo plano y reinicia el equipo.',
        'Busca actualizaciones del sistema y de las aplicaciones principales.',
        'Evita instalar aplicaciones de “limpieza” que prometen acelerar el teléfono sin garantías.'
      ],
      preventive: [
        'Mantén al menos una parte del almacenamiento libre.',
        'Reinicia el celular de forma periódica.',
        'Revisa los permisos de las aplicaciones que no utilizas.'
      ],
      technician:
        'Si la lentitud continúa después de liberar espacio y actualizar, o si aparece junto con reinicios y calentamiento, conviene revisar el equipo.'
    },

    charging: {
      id: 'charging',
      label: 'No carga correctamente',
      short: 'Carga',
      icon: 'bi-lightning-charge',
      category: 'charging',
      weight: 30,
      causes: [
        {
          title: 'Cargador o cable en mal estado',
          detail: 'Un accesorio dañado o incompatible puede impedir una carga estable.',
          strength: 32
        },
        {
          title: 'Puerto de carga con residuos o desgaste',
          detail: 'Polvo, pelusa u oxidación en el conector pueden afectar el contacto.',
          strength: 28
        },
        {
          title: 'Batería o gestión de carga',
          detail: 'La batería o el sistema de carga pueden necesitar una revisión si el problema es constante.',
          strength: 20
        },
        {
          title: 'Circuito de carga interno',
          detail: 'Una falla interna puede requerir diagnóstico técnico; no conviene forzar el conector.',
          strength: 16
        }
      ],
      recommendations: [
        'Prueba con otro cargador y cable compatible que estén en buen estado.',
        'Revisa visualmente el puerto sin introducir objetos metálicos ni líquidos.',
        'Conecta el cargador directamente a una toma de pared y evita adaptadores dudosos.',
        'Si el equipo se calienta en la zona de carga, desconéctalo y no insistas.'
      ],
      preventive: [
        'No dobles bruscamente el cable cerca del conector.',
        'Evita cargar el equipo con accesorios de dudosa procedencia.',
        'Mantén el puerto libre de polvo sin usar objetos punzantes.'
      ],
      technician:
        'Si no carga con varios cargadores, el conector está flojo, hay calor en la zona de carga o el porcentaje no avanza, se recomienda una revisión.'
    },

    connectivity: {
      id: 'connectivity',
      label: 'Presenta problemas de conexión',
      short: 'Conectividad',
      icon: 'bi-wifi',
      category: 'connectivity',
      weight: 18,
      causes: [
        {
          title: 'Cobertura o red del operador',
          detail: 'La señal puede variar por ubicación, hora o condiciones de la red.',
          strength: 26
        },
        {
          title: 'Configuración de red o tarjeta SIM',
          detail: 'Ajustes de datos, modo avión o una SIM mal colocada pueden afectar la conexión.',
          strength: 24
        },
        {
          title: 'Software o aplicaciones',
          detail: 'Un fallo del sistema o de una app puede interferir con Wi-Fi o datos móviles.',
          strength: 18
        },
        {
          title: 'Antena o componente de conectividad',
          detail: 'Si varias funciones inalámbricas fallan al mismo tiempo, puede requerir revisión.',
          strength: 14
        }
      ],
      recommendations: [
        'Activa y desactiva el modo avión, luego reinicia el equipo.',
        'Comprueba si el problema ocurre en Wi-Fi y en datos móviles por separado.',
        'Revisa que la tarjeta SIM esté bien colocada y que el plan tenga datos disponibles.',
        'Como último recurso, restablece los ajustes de red; esto borra contraseñas Wi-Fi guardadas.'
      ],
      preventive: [
        'Evita cambiar configuraciones de red sin saber qué hacen.',
        'Mantén el sistema actualizado.',
        'No fuerces la tarjeta SIM ni el soporte del equipo.'
      ],
      technician:
        'Si el Wi-Fi y el Bluetooth fallan al mismo tiempo, el equipo no detecta ninguna red o la señal es muy inestable, conviene una revisión.'
    },

    restarts: {
      id: 'restarts',
      label: 'El dispositivo se reinicia solo',
      short: 'Reinicios',
      icon: 'bi-arrow-repeat',
      category: 'stability',
      weight: 31,
      causes: [
        {
          title: 'Software inestable o aplicación incompatible',
          detail: 'Una actualización o app reciente puede provocar bloqueos y reinicios.',
          strength: 30
        },
        {
          title: 'Problema de energía o batería',
          detail: 'Una batería desgastada o un contacto irregular puede cortar la alimentación.',
          strength: 26
        },
        {
          title: 'Sobrecalentamiento',
          detail: 'El sistema puede protegerse y reiniciarse cuando alcanza cierta temperatura.',
          strength: 22
        },
        {
          title: 'Almacenamiento insuficiente o falla interna',
          detail: 'Menos frecuente, pero puede requerir revisión del sistema o del hardware.',
          strength: 16
        }
      ],
      recommendations: [
        'Reinicia el equipo y observa si los reinicios ocurren en momentos concretos.',
        'Desinstala temporalmente aplicaciones instaladas o actualizadas poco antes del problema.',
        'Libera espacio de almacenamiento y actualiza el sistema si hay una versión disponible.',
        'Respalda tus datos antes de realizar cambios importantes en el sistema.'
      ],
      preventive: [
        'Evita instalar aplicaciones de fuentes no oficiales.',
        'Mantén una copia de seguridad actualizada.',
        'No intentes reinstalar el sistema por tu cuenta si el equipo se reinicia constantemente.'
      ],
      technician:
        'Si los reinicios son frecuentes, el equipo se apaga solo o no logra completar el arranque, suspende el uso y busca una revisión.'
    },

    audio: {
      id: 'audio',
      label: 'Tiene problemas de sonido',
      short: 'Sonido',
      icon: 'bi-volume-up',
      category: 'audio',
      weight: 15,
      causes: [
        {
          title: 'Altavoz obstruido',
          detail: 'Polvo o residuos en la rejilla pueden reducir el volumen o distorsionar el sonido.',
          strength: 28
        },
        {
          title: 'Humedad o suciedad en el componente',
          detail: 'La exposición a humedad puede afectar el altavoz con el tiempo.',
          strength: 22
        },
        {
          title: 'Configuración o software',
          detail: 'El modo silencio, un volumen bajo o una app con error pueden parecer una falla.',
          strength: 18
        },
        {
          title: 'Altavoz o componente dañado',
          detail: 'Un golpe o una falla del componente puede requerir revisión.',
          strength: 16
        }
      ],
      recommendations: [
        'Prueba el sonido con otra aplicación, con auriculares y por el altavoz externo.',
        'Revisa el volumen, el modo silencio y la configuración de cada aplicación.',
        'Limpia la rejilla del altavoz suavemente con un cepillo seco; no introduzcas objetos.',
        'Evita usar aire a presión directamente sobre la rejilla.'
      ],
      preventive: [
        'Mantén el equipo alejado de polvo y humedad.',
        'Evita subir el volumen al máximo durante periodos largos.',
        'No uses líquidos para limpiar las rejillas.'
      ],
      technician:
        'Si el sonido es distorsionado, muy bajo o no se escucha después de revisar la configuración, conviene una evaluación del altavoz.'
    },

    camera: {
      id: 'camera',
      label: 'Presenta problemas de cámara',
      short: 'Cámara',
      icon: 'bi-camera',
      category: 'camera',
      weight: 19,
      causes: [
        {
          title: 'Lente sucia, rayada o con protector inadecuado',
          detail: 'Los residuos o un protector de mala calidad pueden afectar la nitidez y el enfoque.',
          strength: 28
        },
        {
          title: 'Aplicación o caché de la cámara',
          detail: 'Un error temporal de la app puede impedir que la cámara abra o enfoque.',
          strength: 22
        },
        {
          title: 'Software del sistema',
          detail: 'Una actualización o configuración puede afectar el funcionamiento.',
          strength: 18
        },
        {
          title: 'Módulo de cámara dañado por golpe',
          detail: 'Una caída o presión puede dañar el módulo o su conexión interna.',
          strength: 16
        }
      ],
      recommendations: [
        'Limpia la lente con un paño de microfibra seco.',
        'Cierra y vuelve a abrir la aplicación de cámara; si persiste, reinicia el equipo.',
        'Prueba con otra aplicación de cámara y revisa si el problema aparece en fotos y videos.',
        'Retira protectores o fundas que puedan cubrir el lente.'
      ],
      preventive: [
        'Evita exponer la cámara a golpes o presión.',
        'Mantén la lente limpia y sin residuos.',
        'No uses productos abrasivos en el cristal de la cámara.'
      ],
      technician:
        'Si la cámara no abre, la imagen está borrosa de forma constante o hay vidrio dañado después de un golpe, conviene una revisión.'
    },

    other: {
      id: 'other',
      label: 'Otro problema',
      short: 'Otro',
      icon: 'bi-three-dots',
      category: 'other',
      weight: 14,
      causes: [
        {
          title: 'Situación no clasificada',
          detail: 'Los síntomas descritos no coinciden con un patrón específico de esta herramienta.',
          strength: 20
        }
      ],
      recommendations: [
        'Anota cuándo ocurre el problema y qué acciones lo provocan.',
        'Respalda tus datos importantes antes de realizar cambios en el equipo.',
        'Evita instalar aplicaciones o modificar el sistema para intentar solucionarlo sin orientación.',
        'Describe el caso por WhatsApp para recibir una orientación más ajustada.'
      ],
      preventive: [
        'Mantén el sistema actualizado y evita aplicaciones de fuentes desconocidas.',
        'Realiza copias de seguridad periódicas.'
      ],
      technician:
        'Si el problema afecta el uso diario, se repite con frecuencia o apareció después de un daño, coordina una revisión.'
    }
  };

  /* Señales detectadas en la descripción libre o en el contexto adicional.
     Los patrones se evalúan sobre texto normalizado (sin tildes y en minúsculas). */
  var KEYWORDS = [
    {
      id: 'liquid',
      pattern: /(mojad|agua|lluvia|derram|humedad|lavad|inundad|se cayo al agua)/,
      contextFlag: 'liquid',
      weight: 28,
      critical: true,
      signal: 'Posible contacto con líquido o humedad',
      cause: {
        title: 'Contacto con líquido o humedad',
        detail: 'La humedad puede afectar componentes internos incluso cuando el equipo parece funcionar.',
        strength: 40
      },
      recommendation:
        'Si el equipo tuvo contacto con líquido, apágalo, no lo cargues y no intentes secarlo con calor. Llévalo a revisión.',
      safety:
        'No enciendas ni cargues el equipo si estuvo en contacto con líquido. No uses secadora ni arroz; busca revisión técnica.'
    },
    {
      id: 'impact',
      pattern: /(golpe|caid|se me cay|pantalla rota|esta rota|esta roto|quebr|impacto)/,
      contextFlag: 'impact',
      weight: 18,
      signal: 'Golpe o caída mencionados',
      cause: {
        title: 'Daño por golpe o caída',
        detail: 'Un impacto puede afectar la pantalla, la carcasa, la cámara o conexiones internas.',
        strength: 30
      },
      recommendation:
        'Evita presionar las zonas dañadas y no intentes abrir el equipo. Un golpe puede requerir revisión aunque el celular siga encendiendo.'
    },
    {
      id: 'swollen',
      pattern: /(hinchad|inflad|abultad|tapa levantada|pantalla levantada|bateria abultada)/,
      weight: 40,
      critical: true,
      signal: 'Posible batería hinchada',
      cause: {
        title: 'Batería hinchada o con presión interna',
        detail: 'Una batería deformada requiere atención y no debe seguir usándose.',
        strength: 48
      },
      recommendation:
        'No uses, cargues ni presiones el equipo. Mantenlo en un lugar seguro, alejado de materiales inflamables, y busca revisión técnica.',
      safety:
        'Seguridad: no cargues el equipo ni presiones la batería. Si la tapa o la pantalla se están levantando, acude a un servicio técnico.'
    },
    {
      id: 'burning',
      pattern: /(quemad|olor a quemado|chispa|humo|se quemo)/,
      weight: 34,
      critical: true,
      signal: 'Posible sobrecalentamiento o daño eléctrico',
      cause: {
        title: 'Calor anormal o daño eléctrico',
        detail: 'El olor a quemado o el humo son señales de seguridad que requieren atención inmediata.',
        strength: 45
      },
      recommendation:
        'Desconecta el cargador, no uses el equipo y manténlo alejado de materiales inflamables.',
      safety:
        'Si notas olor a quemado, humo o chispas, desconecta el equipo y no lo uses. Busca atención técnica de inmediato.'
    },
    {
      id: 'noPower',
      pattern: /(no enciende|no prende|no da imagen|pantalla negra|no responde|no arranca)/,
      weight: 28,
      signal: 'El equipo no enciende o no responde',
      cause: {
        title: 'Falla de arranque o alimentación',
        detail: 'Puede estar relacionada con la batería, la carga o el sistema; requiere diagnóstico presencial.',
        strength: 36
      },
      recommendation:
        'No insistas en encenderlo ni lo cargues por periodos largos. Coordina una revisión para revisar batería y carga.',
      safety:
        'Si el equipo no enciende y estuvo mojado o muy caliente, no intentes cargarlo. Busca revisión técnica.'
    },
    {
      id: 'storage',
      pattern: /(almacenamiento|espacio|memoria llena|sin memoria|lleno|gb libres)/,
      weight: 8,
      signal: 'Posible falta de almacenamiento',
      cause: {
        title: 'Almacenamiento insuficiente',
        detail: 'La falta de espacio puede afectar el rendimiento y algunas actualizaciones.',
        strength: 22
      },
      recommendation:
        'Revisa cuánto espacio libre queda y elimina archivos o aplicaciones que no uses.'
    },
    {
      id: 'software',
      pattern: /(actualiz|update|version del sistema|modo seguro|se traba|se cuelga)/,
      weight: 7,
      signal: 'Cambios o fallos de software mencionados',
      cause: {
        title: 'Software o actualización reciente',
        detail: 'Un cambio de versión o una app incompatible puede alterar el comportamiento del equipo.',
        strength: 22
      },
      recommendation:
        'Anota qué aplicación o actualización coincidió con el problema y respalda tus datos antes de hacer cambios.'
    },
    {
      id: 'malware',
      pattern: /(virus|publicidad|pop.?up|popup|hacke|malware|spam)/,
      weight: 12,
      signal: 'Posible aplicación no deseada o software invasivo',
      cause: {
        title: 'Aplicaciones no deseadas',
        detail: 'El software invasivo puede mostrar publicidad o consumir recursos, pero requiere evaluación.',
        strength: 24
      },
      recommendation:
        'Evita instalar “antivirus” milagrosos. Revisa las aplicaciones instaladas recientemente y respalda tus datos.'
    },
    {
      id: 'speaker',
      pattern: /(altavoz|parlante|bocina|sonido distorsionado|no se escucha)/,
      weight: 6,
      signal: 'Problema de altavoz mencionado',
      cause: {
        title: 'Altavoz obstruido o dañado',
        detail: 'La suciedad o un daño del componente pueden alterar el sonido.',
        strength: 20
      },
      recommendation:
        'Prueba el altavoz con otra app y evita introducir objetos en la rejilla.'
    },
    {
      id: 'display',
      pattern: /(pantalla|tactil|touch|mancha|linea en la pantalla|brillo)/,
      weight: 8,
      signal: 'Problema de pantalla mencionado',
      cause: {
        title: 'Pantalla o táctil afectado',
        detail: 'La descripción menciona síntomas relacionados con la pantalla o el táctil.',
        strength: 24
      },
      recommendation:
        'Evita presionar la pantalla y no uses líquidos para limpiarla. Si hay daño visible, busca revisión.'
    }
  ];

  /* -----------------------------------------------------------------------
     Utilidades internas
     ----------------------------------------------------------------------- */
  function normalizeText(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanText(value, maxLength) {
    var text = String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, maxLength);
  }

  function uniqueList(items) {
    var seen = Object.create(null);
    return items.filter(function (item) {
      var key = normalizeText(item);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function findAge(ageId) {
    for (var i = 0; i < AGES.length; i += 1) {
      if (AGES[i].id === ageId) {
        return AGES[i];
      }
    }
    return { id: 'unknown', label: 'No especificada', short: 'antigüedad no confirmada', risk: 4 };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function likelihoodFor(strength) {
    if (strength >= 30) {
      return { label: 'Relación alta', level: 'high' };
    }
    if (strength >= 20) {
      return { label: 'Relación media', level: 'medium' };
    }
    return { label: 'Relación posible', level: 'low' };
  }

  /* -----------------------------------------------------------------------
     Motor de análisis
     ----------------------------------------------------------------------- */
  function analyze(input) {
    input = input || {};

    var requestedSymptoms = Array.isArray(input.symptoms) ? input.symptoms : [];
    var symptomIds = uniqueList(requestedSymptoms).filter(function (id) {
      return Object.prototype.hasOwnProperty.call(SYMPTOMS, id);
    });

    if (!symptomIds.length) {
      throw new Error('Selecciona al menos un síntoma para realizar el análisis.');
    }

    var brand = cleanText(input.brand, 60) || 'Marca no especificada';
    var model = cleanText(input.model, 60) || 'Modelo no especificado';
    var os = input.os === 'iOS' || input.os === 'Android' ? input.os : 'No especificado';
    var age = findAge(input.age);
    var description = cleanText(input.description, 600);
    var normalizedDescription = normalizeText(description);
    var context = {
      liquid: Boolean(input.context && input.context.liquid),
      impact: Boolean(input.context && input.context.impact)
    };

    var symptomDefs = symptomIds.map(function (id) {
      return SYMPTOMS[id];
    });
    var rankedSymptoms = symptomDefs.slice().sort(function (a, b) {
      return b.weight - a.weight;
    });

    var rawScore = age.risk;
    var categories = Object.create(null);
    var causesMap = Object.create(null);
    var generalRecommendations = [];
    var urgentRecommendations = [];
    var preventive = [];
    var serviceNotes = [];
    var safety = [];
    var signals = [];
    var critical = false;

    function addCause(cause, strength) {
      if (!cause || !cause.title) {
        return;
      }
      var key = normalizeText(cause.title);
      if (!causesMap[key] || causesMap[key].strength < strength) {
        causesMap[key] = {
          title: cause.title,
          detail: cause.detail,
          strength: strength
        };
      }
    }

    rankedSymptoms.forEach(function (symptom) {
      rawScore += symptom.weight;
      categories[symptom.category] = (categories[symptom.category] || 0) + symptom.weight;

      symptom.causes.forEach(function (cause) {
        addCause(cause, cause.strength);
      });
      symptom.recommendations.forEach(function (recommendation) {
        generalRecommendations.push(recommendation);
      });
      symptom.preventive.forEach(function (item) {
        preventive.push(item);
      });
      serviceNotes.push(symptom.technician);
    });

    // Señales escritas por la persona usuaria o marcadas en el contexto.
    KEYWORDS.forEach(function (keyword) {
      var matchesPattern = normalizedDescription && keyword.pattern.test(normalizedDescription);
      var matchesContext = keyword.contextFlag && context[keyword.contextFlag];
      if (!matchesPattern && !matchesContext) {
        return;
      }

      rawScore += keyword.weight;
      signals.push(keyword.signal);
      if (keyword.critical) {
        critical = true;
      }
      addCause(keyword.cause, keyword.cause.strength);

      if (keyword.recommendation) {
        if (keyword.critical) {
          urgentRecommendations.push(keyword.recommendation);
        } else {
          generalRecommendations.push(keyword.recommendation);
        }
      }
      if (keyword.safety) {
        safety.push(keyword.safety);
      }
    });

    // Notas de seguridad generales que no dependen de una palabra crítica.
    if (symptomIds.indexOf('heat') !== -1) {
      safety.push(
        'Si el equipo está muy caliente, apágalo, desconéctalo y déjalo enfriar en un lugar ventilado. No lo pongas en el refrigerador ni lo cargues hasta que baje la temperatura.'
      );
    }
    if (
      symptomIds.indexOf('charging') !== -1 &&
      symptomIds.indexOf('heat') !== -1 &&
      !critical
    ) {
      safety.push(
        'Evita cargar el equipo si el conector o la zona de carga está demasiado caliente; usa primero otro cargador y cable en buen estado.'
      );
    }

    var categoryList = Object.keys(categories).map(function (categoryId) {
      return {
        id: categoryId,
        label: CATEGORY_LABELS[categoryId] || categoryId,
        weight: categories[categoryId]
      };
    }).sort(function (a, b) {
      return b.weight - a.weight;
    });

    var categoryTotal = categoryList.reduce(function (total, category) {
      return total + category.weight;
    }, 0);

    categoryList = categoryList.map(function (category) {
      return {
        id: category.id,
        label: category.label,
        weight: category.weight,
        percentage: categoryTotal ? Math.round((category.weight / categoryTotal) * 100) : 0
      };
    });

    var topCategories = categoryList.slice(0, 2).map(function (category) {
      return category.label.toLocaleLowerCase('es');
    });

    var score = Math.round(100 * (1 - Math.exp(-rawScore / 48)));
    score = clamp(score, 1, 100);

    var level = critical ? 'high' : score >= 64 ? 'high' : score >= 36 ? 'medium' : 'low';
    if (critical) {
      score = Math.max(score, 76);
    }
    if (level === 'high') {
      score = Math.max(score, 64);
    } else if (level === 'medium') {
      score = clamp(score, 36, 63);
    } else {
      score = Math.min(score, 35);
    }

    var priorityBase = PRIORITY_LEVELS[level];
    var priority = {
      level: priorityBase.level,
      label: priorityBase.label,
      description: priorityBase.description
    };

    if (critical) {
      priority.description =
        'El análisis detectó una o más señales de atención prioritaria. Evita cargar o usar el equipo y busca una revisión técnica. ' +
        priorityBase.description;
    }

    var causes = Object.keys(causesMap).map(function (key) {
      var cause = causesMap[key];
      var likelihood = likelihoodFor(cause.strength);
      return {
        title: cause.title,
        detail: cause.detail,
        relationship: likelihood.label,
        relationshipLevel: likelihood.level
      };
    }).sort(function (a, b) {
      var order = { high: 3, medium: 2, low: 1 };
      return order[b.relationshipLevel] - order[a.relationshipLevel];
    }).slice(0, 7);

    var recommendations = uniqueList(urgentRecommendations.concat(generalRecommendations)).slice(0, 8);

    if (age.risk >= 8) {
      preventive.unshift(
        'Con el tiempo de uso, revisa el estado de la batería, el almacenamiento disponible y la fluidez general del equipo.'
      );
    }
    preventive = preventive.concat([
      'Mantén el sistema y las aplicaciones actualizadas cuando sea posible.',
      'Usa cargadores y cables en buen estado, compatibles con el equipo.',
      'Realiza copias de seguridad periódicas de tus datos importantes.',
      'Evita exponer el equipo a temperaturas extremas, humedad o polvo.',
      'Libera espacio de almacenamiento de forma periódica.'
    ]);
    preventive = uniqueList(preventive).slice(0, 6);

    if (critical) {
      serviceNotes.unshift(
        'Si hay líquido, batería hinchada, humo u olor a quemado, no uses el equipo y solicita una revisión técnica lo antes posible.'
      );
    } else if (level === 'high') {
      serviceNotes.push(
        'Si el problema empeora, el equipo se apaga o no permite un uso normal, suspende la pruebas y coordina una revisión técnica.'
      );
    } else if (level === 'medium') {
      serviceNotes.push(
        'Si las recomendaciones iniciales no mejoran la situación o el problema se repite, coordina una revisión técnica.'
      );
    } else {
      serviceNotes.push(
        'Si el síntoma persiste, se repite o aparecen nuevos problemas, conviene una revisión técnica.'
      );
    }
    serviceNotes = uniqueList(serviceNotes).slice(0, 5);

    var brandForLabel = brand === 'Marca no especificada' || brand === 'Otra marca' ? '' : brand;
    var modelForLabel = model === 'Modelo no especificado' ? '' : model;
    var deviceName = [brandForLabel, modelForLabel].filter(Boolean).join(' ') || 'dispositivo';
    var deviceDetails = [];
    if (os !== 'No especificado') {
      deviceDetails.push(os);
    }
    if (age.id !== 'unknown') {
      deviceDetails.push(age.short);
    }
    var deviceContext = deviceDetails.length ? ' (' + deviceDetails.join(', ') + ')' : '';

    var symptomCount = symptomDefs.length;
    var categoryPhrase = topCategories.length
      ? ' relacionado' + (symptomCount > 1 ? 's' : '') + ' principalmente con ' + topCategories.join(' y ')
      : '';

    var summary =
      'Tu ' + deviceName + deviceContext + ' presenta ' + symptomCount +
      ' síntoma' + (symptomCount > 1 ? 's' : '') + categoryPhrase +
      '. La prioridad orientativa de revisión es ' + priority.label.toLocaleLowerCase('es') + '.';

    if (signals.length) {
      summary += ' La descripción y el contexto añaden señales compatibles con: ' +
        uniqueList(signals).map(function (signal) { return signal.toLocaleLowerCase('es'); }).join('; ') + '.';
    }

    if (critical) {
      summary += ' Se recomienda atención prioritaria y evitar el uso del equipo.';
    }

    safety = uniqueList(safety).slice(0, 4);

    return {
      ok: true,
      version: VERSION,
      generatedAt: new Date().toISOString(),
      device: {
        brand: brand,
        model: model,
        os: os,
        ageId: age.id,
        ageLabel: age.label,
        displayName: deviceName,
        context: deviceContext.trim()
      },
      input: {
        brand: brand,
        model: model,
        os: os,
        age: age.id,
        symptoms: symptomIds,
        description: description,
        context: { liquid: context.liquid, impact: context.impact }
      },
      priority: priority,
      attentionScore: score,
      critical: critical,
      summary: summary,
      symptoms: symptomDefs.map(function (symptom) {
        return {
          id: symptom.id,
          label: symptom.label,
          short: symptom.short,
          icon: symptom.icon,
          category: symptom.category,
          categoryLabel: CATEGORY_LABELS[symptom.category]
        };
      }),
      signals: uniqueList(signals),
      causes: causes,
      recommendations: recommendations,
      preventive: preventive,
      serviceNotes: serviceNotes,
      safety: safety,
      categories: categoryList,
      disclaimer: DISCLAIMER
    };
  }


  return {
    version: VERSION,
    disclaimer: DISCLAIMER,
    config: {
      brands: BRANDS,
      ages: AGES,
      symptoms: Object.keys(SYMPTOMS).map(function (key) {
        var symptom = SYMPTOMS[key];
        return {
          id: symptom.id,
          label: symptom.label,
          short: symptom.short,
          icon: symptom.icon,
          category: symptom.category,
          categoryLabel: CATEGORY_LABELS[symptom.category]
        };
      }),
      priorityLevels: PRIORITY_LEVELS,
      categoryLabels: CATEGORY_LABELS
    },
    analyze: analyze
  };
});
