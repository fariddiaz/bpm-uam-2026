/* Guion del expositor (tecla N) y fuente única de Guion_Exposicion_BPM.md (tools/guion.mjs).
   Fuentes: 02_Planificacion_y_Arquitectura_UX_UI.md, Res. 719/2015 y texto de la Res. 2674/2013
   (normograma.invima.gov.co/compilacion/docs/resolucion_minsaludps_2674_2013.htm).
   Presupuesto fijo: 20:00. Omar abre y presenta la primera mitad (0:00–10:00, láminas 1–10);
   Luis presenta la segunda mitad (10:00–20:00, láminas 11–18) y conduce el juego y el quiz.
   Ritmo de referencia: ~140 palabras por minuto. */
(function (global) {
  'use strict';

  global.BPM_NOTES = [
    {
      time: '0:00 – 0:30', speaker: 'Omar',
      script: 'Buenos días, profe; buenos días a todos. Soy Omar Farid Lascarro y con mi compañero Luis Fernando Beltrán les vamos a hablar de algo que tocan todos los días sin darse cuenta: las Buenas Prácticas de Manufactura, las BPM. Son la razón por la que pueden comprarse una empanada, una leche o un pan sin pensar que se van a enfermar.',
      cues: ['Señalar el modelo 3D: así se ve un equipo sanitario (inox, vidrio, cero rincones).', 'Clic en "Iniciar exposición": arranca el cronómetro de 20:00.']
    },
    {
      time: '0:30 – 0:50', speaker: 'Omar',
      script: 'Son 20 minutos y 6 paradas. Yo hago la primera mitad: qué son las BPM, qué norma las exige y cómo se ven en una planta. En el minuto 10 sigue Luis, con un video, el riesgo, un juego por equipos y el cierre.',
      cues: ['No leer la agenda: señalar los 6 bloques con la mano.', 'Pedir desde ya que tengan el celular a mano para el final.']
    },
    {
      time: '0:50 – 1:50', speaker: 'Omar',
      script: '¿Qué separa un alimento seguro de una intoxicación masiva? Tres tipos de peligro. Biológico: bacterias como la Salmonella, que no se ven, no huelen y enferman. Químico: un residuo de desinfectante o de plaguicida que quedó en la superficie. Físico: un pedazo de vidrio, de metal o un anillo que cae en la masa. Las BPM existen para cerrarles el paso a los tres, y se apoyan en tres ejes: inocuidad, calidad y trazabilidad. Miren esta escalera: las BPM son el primer peldaño. Encima vienen HACCP, después ISO 22000 y arriba FSSC 22000, una certificación reconocida por la GFSI. Sin BPM, nada de lo de arriba se sostiene.',
      cues: ['Un ejemplo cotidiano por foto (la Salmonella en el huevo, el cloro mal enjuagado, el vidrio de un bombillo).', 'Clic en "Subir peldaño" mientras se nombra cada nivel.']
    },
    {
      time: '1:50 – 2:30', speaker: 'Omar',
      script: 'Y así lo dice la ley, en el artículo 3 de la Resolución 2674: las BPM son "los principios básicos y prácticos generales de higiene en la manipulación, preparación, elaboración, envasado, almacenamiento, transporte y distribución de alimentos para consumo humano". En palabras simples: reglas de higiene para toda la cadena. Inocuidad es la garantía de que el alimento no le hará daño a quien se lo come. Y manipulador es cualquier persona que toca el alimento, aunque sea de vez en cuando. Ojo: el mesero que sirve también es manipulador.',
      cues: ['Leer en voz alta solo la cita grande; las otras dos se resumen.']
    },
    {
      time: '2:30 – 3:50', speaker: 'Omar',
      script: '¿Qué norma manda hoy? La Resolución 2674 de 2013 del Ministerio de Salud: 55 artículos organizados en 4 títulos. Se expidió el 22 de julio de 2013 y se publicó en el Diario Oficial 48.862 el 25 de julio. El artículo 53 dio 12 meses para adaptarse, así que la plena vigencia llegó el 25 de julio de 2014. Y algo importante: el artículo 55 derogó el Decreto 3075 de 1997. No lo actualizó: lo dejó sin efecto. Dos resoluciones la complementan: la 719 de 2015, que clasifica los alimentos según su riesgo, y la 3168 de 2015, que modificó el artículo 37 para que el trámite sea automático y se revise después. En lo internacional, el referente es el Codex, CXC 1 de 1969, revisado en 2020 y 2022. Aclaro: medicamentos y cosméticos tienen sus propias BPM; hoy hablamos solo de alimentos.',
      cues: ['Señalar la línea de tiempo 1997 → 2013 → 2014 → 2015.', 'Insistir: el 3075 NO se "actualizó", se derogó (vuelve en el quiz).']
    },
    {
      time: '3:50 – 4:30', speaker: 'Omar',
      script: '¿A quién obliga? Según el artículo 2, a todo el que fabrica, procesa, prepara, envasa, almacena, transporta, distribuye, importa, exporta o vende alimentos en Colombia; al personal manipulador; a quien produce materias primas e insumos, y a las propias autoridades sanitarias. El corazón técnico es el Título II, con 8 capítulos. Este es el mapa: los capítulos resaltados son los que vamos a ver ahora.',
      cues: ['Señalar los capítulos I, II, III, VI y VII.', 'Si preguntan por la carne: tiene su propio sistema de inspección, Decreto 1500 de 2007 (parágrafo del Art. 2).']
    },
    {
      time: '4:30 – 6:00', speaker: 'Omar',
      script: 'Entremos a la planta. Primera regla, artículo 6: el producto avanza en una sola dirección, de lo sucio a lo limpio, y nunca se devuelve. Por eso el área sucia y el área limpia están separadas. Artículo 7, los pisos: impermeables, antideslizantes y con pendiente de por lo menos 2 % hacia el sifón, con un sifón de 10 centímetros por cada 40 metros cuadrados en áreas húmedas; en zonas de baja humedad, 1 % y uno cada 90 metros cuadrados. Paredes de colores claros, lisas, con la unión piso-pared redondeada, lo que llamamos curva sanitaria. Techos sin condensación, ventanas con malla contra insectos. Y la iluminación: adecuada, que no cambie los colores, con lámparas protegidas por si se rompen. Un dato que casi todos dicen mal: la norma no fija lux. Los valores en lux vienen de las normas de seguridad y salud en el trabajo.',
      cues: ['Clic en los puntos 1 → 4 de la maqueta (la cámara se acerca sola).', 'Activar "Simular cruce sucio/limpio" y leer la alerta en voz alta.']
    },
    {
      time: '6:00 – 7:20', speaker: 'Omar',
      script: 'Los equipos, artículos 8 a 10: el acero que toca el alimento no puede contaminarlo. Materiales inertes, no tóxicos y resistentes a la corrosión; superficies lisas, sin rincones donde se esconda la suciedad; separados de la pared para poder limpiar por detrás; calibrados, y con lubricantes de grado alimentario. Y las personas, que son el mayor riesgo de una planta. Artículo 11: certificado médico de aptitud, como mínimo una vez al año. Artículo 12: capacitación continua de por lo menos 10 horas al año. Y el artículo 24 exige personal técnico idóneo que responda por el proceso. A ver, una pregunta rápida: ¿quién ha visto a alguien cocinando con anillo? Esos son los 5 NO de la línea: anillos, reloj, esmalte, comer y fumar.',
      cues: ['Tocar los "5 NO" uno por uno mientras se nombran.', 'Esperar 2 segundos de respuesta a la pregunta; no más.']
    },
    {
      time: '7:20 – 8:00', speaker: 'Omar',
      script: 'El artículo 14 tiene 14 numerales y los agrupamos en tres. Lo que me pongo: dotación de color claro, sin botones ni bolsillos por encima de la cintura, cabello totalmente cubierto, tapabocas según el riesgo y calzado cerrado. Lo que me quito: joyas, reloj, esmalte y maquillaje. Y lo que hago: lavarme las manos con agua y jabón desinfectante, no comer ni fumar en la zona y no salir a la calle con la dotación. Dato que sorprende: los guantes no reemplazan el lavado de manos.',
      cues: ['Leer solo los títulos de las 3 columnas y un ejemplo de cada una.']
    },
    {
      time: '8:00 – 10:00', speaker: 'Omar',
      script: 'Cerramos mi parte en la bodega. El artículo 26 exige un Plan de Saneamiento escrito, a disposición de la autoridad, con 4 programas: limpieza y desinfección; manejo de residuos sólidos; control integrado de plagas, y abastecimiento y calidad del agua potable. Ahora miren esta bodega con un error típico: la mercancía pegada al piso y a la pared. La humedad sube por los sacos, y detrás se forma una zona ciega donde se esconden las plagas. El artículo 28 lo corrige: estibas a por lo menos 15 centímetros del piso y a 60 centímetros de las paredes, rotación PEPS, primero en entrar, primero en salir, y congelación a menos 18 grados o menos. ¿Cuántos programas tiene el Plan de Saneamiento? Cuatro. Guárdenlo, porque vuelve en el quiz. Hasta aquí la teoría de la planta; Luis les trae un video y después los vamos a poner a inspeccionar a ustedes.',
      cues: ['Mostrar primero "Error típico"; luego clic en "Cumple Art. 28" para ver las cotas y girar la cámara.', 'RELEVO en 10:00: Omar da un paso atrás y Luis toma el control.']
    },
    {
      time: '10:00 – 13:00', speaker: 'Luis',
      script: 'Gracias, Omar. Buenos días; soy Luis Fernando Beltrán y me quedo con la segunda mitad. Vamos a ver un video corto, de 2 minutos y 24 segundos, del canal Alimentos con Calidad. Mírenlo con una pregunta en mente: ¿qué dos ideas básicas de BPM aparecen? [Reproducir el video.] ¿Qué vieron? Exacto: higiene del personal y limpieza de equipos y superficies, lo mismo que Omar mostró en la planta. Ahora pasamos de la teoría al riesgo.',
      cues: ['Clic en el cronómetro grande al dar play.', 'Sin internet o sin audio: botón "Plan B offline" (fotogramas reales) y narrarlo en 30 s.', 'No descargar el video de YouTube (condiciones de uso); el enlace se abre directo.']
    },
    {
      time: '13:00 – 14:00', speaker: 'Luis',
      script: 'No todos los alimentos son igual de peligrosos. La Resolución 719 de 2015 los clasifica por su riesgo en salud pública: alto, medio y menor. Esa clasificación define el permiso que pide el INVIMA, según los artículos 39 y 41 de la 2674. Riesgo alto, como la leche líquida, la carne o los huevos: Registro Sanitario, RSA, por 5 años. Riesgo medio, como el pan, las galletas o la pasta: Permiso Sanitario, PSA, por 7 años. Riesgo menor, como el azúcar, la panela o el café instantáneo: Notificación Sanitaria, NSA, por 10 años. Se renueva 3 meses antes de vencer. Y un dato que nadie se espera: la sal para consumo humano es de riesgo alto.',
      cues: ['Clic en las pestañas Alto → Medio → Menor mientras se nombran.', 'Códigos del Anexo Técnico de la Res. 719: leche 1.1.1 · carne 8.1.1 · huevos 10.1.1 · panes 7.1.1 · azúcar 11.1.1 · panela 11.3.2 · sal 13.1.1.']
    },
    {
      time: '14:00 – 17:00', speaker: 'Luis',
      script: 'Ahora los inspectores son ustedes. Vamos a dividir el salón en dos: de la mitad hacia acá es el Equipo A, azul; de la mitad hacia allá, el Equipo B, naranja. En esta sala de proceso hay 14 fallas reales y 13 trampas: cosas que parecen malas pero sí cumplen la norma. Por turnos, cada equipo me señala un solo elemento y yo hago clic. Si es una falla, gana un punto. Si es una trampa, pierde un punto. Tienen 12 segundos por turno y 2 minutos en total. ¿Listos? Empieza el Equipo A. [Juego: 2 minutos.] ¡Tiempo! Las fallas con signo de admiración nadie las encontró, y las marcas verdes eran trampas. Fíjense: la lámpara con protector cumple; el tubo desnudo no. La dotación blanca cumple; la gris no, porque el artículo 14 prohíbe el gris. La estiba azul cumple; los sacos en el piso no. Y si un inspector encuentra esto en la vida real, la Ley 9 de 1979, en su artículo 577, modificado por el Decreto Ley 2106 de 2019, permite amonestación, multas de hasta 10.000 salarios mínimos, decomiso, suspensión o cancelación del registro y cierre temporal o definitivo.',
      cues: ['Antes de empezar: dividir el salón con el brazo, en voz alta.', 'Clic en "Iniciar 2:00"; tras cada clic el turno pasa solo al otro equipo. Si un equipo no decide en 12 s, pierde el turno.', 'Si dos personas gritan a la vez, vale la primera que se entiende; "Pasar turno" si un equipo no quiere arriesgar.', 'Si sobra tiempo o hay que cortar: "Revelar" muestra todo y declara al ganador.', 'Las 14 fallas: sacos en el piso y cajas contra el muro (Art. 28.4) · anillo y uñas pintadas (Art. 14, 7 y 8) · grifo manual y jabón de barra (Art. 6, 6.3) · tubo sin protector (Art. 7, 7.3) · agua empozada (Art. 7) · cloro junto al pan (Art. 28.7) · ratón (Art. 6, 2.7 y Art. 26) · ventana sin malla (Art. 7, 4.2) · caneca abierta rebosando (Art. 6, 5.1 y 5.3) · café y arepa en la mesa (Art. 14, 11) · pared agrietada (Art. 7, 2.1) · frasco de vidrio (Art. 18, 10) · dotación gris (Art. 14, 2).', 'Las 13 trampas: lámpara con protector · rejilla del sifón · unión piso-pared redondeada · estiba azul separada · trampa de luz UV · caneca verde con tapa · lavamanos de pedal con aviso · extintor (no es tema BPM) · guantes · planilla de registros · botas blancas · marmita inox · dotación blanca.']
    },
    {
      time: '17:00 – 17:20', speaker: 'Luis',
      script: 'Si mañana abrieran un negocio de alimentos, estas son las seis preguntas que deberían hacerse antes de que llegue el INVIMA. Cada una es una lámina que ya vimos: el flujo, los equipos, el personal, el saneamiento, la bodega y el registro según el riesgo.',
      cues: ['Leer las 6 preguntas rápido, sin explicarlas de nuevo.']
    },
    {
      time: '17:20 – 18:15', speaker: 'Luis',
      script: 'Y esto no es teoría: así lo aplican cuatro empresas colombianas, según sus propios sitios oficiales. CasaLuker, con plantas en Manizales y Bogotá: BPM, HACCP, FSSC 22000 y BASC. Grupo Nutresa, que también tiene plantas en Manizales: usa las BPM como prerrequisito para FSSC 22000, BRCGS e IFS. Alpina, en Sopó y Entrerríos: BPM y HACCP, con laboratorios acreditados ante el ONAC en ISO/IEC 17025. Y Colombina, en La Paila, Valle: BPM, FSSC 22000, BRCGS y FSMA Ready, alineado con la ley de inocuidad de Estados Unidos. El mensaje: las BPM son el pasaporte para exportar.',
      cues: ['Clic en cada tarjeta para encender su punto en el mapa.', 'Enfatizar las dos con presencia en Manizales: es el contexto de la UAM.']
    },
    {
      time: '18:15 – 18:35', speaker: 'Luis',
      script: 'Antes del quiz, seis palabras. Si entienden estas seis, entienden la exposición: BPM, inocuidad, manipulador, Plan de Saneamiento, PEPS y HACCP.',
      cues: ['No leer las definiciones: decir solo la palabra y señalarla.']
    },
    {
      time: '18:35 – 19:25', speaker: 'Luis',
      script: 'Para cerrar, tres mitos que hoy desmontamos. Uno: "hay que tener 540 o 220 lux". Falso: el artículo 7 no fija lux; exige luz adecuada y protegida. Dos: "el Decreto 3075 sigue vigente". Falso: lo derogó el artículo 55 de la Resolución 2674. Tres: "todos los registros duran igual". Falso: 5, 7 y 10 años según el riesgo. En resumen, las BPM son obligatorias, las vigila el INVIMA, se sancionan y son el cimiento de HACCP y de ISO 22000.',
      cues: ['Pausa breve antes de los 4 pilares.']
    },
    {
      time: '19:25 – 20:00', speaker: 'Luis',
      script: 'Y ahora sí, saquen el celular. Escaneen el código QR o entren a la dirección que ven en pantalla, el PIN de la sala es 2674, y escriban su apodo. Son 8 preguntas de 20 a 25 segundos cada una. Suma más quien acierta y responde más rápido. Muchas gracias.',
      cues: ['Esperar el contador de conectados y abrir la consola del anfitrión.', 'Actividad (8–10 min): Luis opera la consola; Omar explica las respuestas de Q1–Q4 y Luis las de Q5–Q8.', 'Sin red: cartulinas A/B/C/D a mano alzada con quiz.html?role=host proyectado.']
    },
    {
      time: 'Reserva', speaker: 'Ambos',
      script: 'Solo si el docente pregunta por fuentes o hay contingencias técnicas.',
      cues: ['Plan B de red: compartir zona Wi-Fi del celular con el portátil o usar el túnel (Iniciar_Actividad_BPM.bat).']
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
