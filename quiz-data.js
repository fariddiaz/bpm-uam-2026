/* Banco oficial de 8 preguntas BPM verificadas con artículo normativo exacto */
(function (global) {
  'use strict';

  const BPM_QUIZ_CONFIG = {
    pin: '2674',
    title: 'BPM Arena · Auditoría en Planta',
    subtitle: 'Resolución 2674 de 2013 · Gerencia de la Calidad UAM',
    presenters: ['Omar Farid Lascarro Díaz', 'Luis Fernando Beltrán'],
    basePoints: 500,
    speedBonus: 500,
    symbols: ['▲', '●', '■', '◆'],
    letters: ['A', 'B', 'C', 'D'],
    questions: [
      {
        id: 'Q1',
        timeSec: 20,
        speaker: 'Omar Farid',
        article: 'Res. 2674/2013 · Art. 55',
        prompt: '¿Qué norma rige hoy las BPM en alimentos en Colombia y derogó el Decreto 3075 de 1997?',
        options: [
          'Resolución 2674 de 2013',
          'Resolución 719 de 2015',
          'Decreto 3075 de 1997',
          'Resolución 3168 de 2015'
        ],
        correctIndex: 0,
        explanation: 'El Art. 55 de la Resolución 2674 de 2013 estableció su plena vigencia a los 12 meses de publicación y derogó formalmente el Decreto 3075 de 1997. La Res. 719 clasifica el riesgo y la Res. 3168 modifica el Art. 37.'
      },
      {
        id: 'Q2',
        timeSec: 20,
        speaker: 'Omar Farid',
        article: 'Res. 2674/2013 · Art. 12–13',
        prompt: 'Como mínimo, ¿cuántas horas al año debe tener el plan de capacitación del personal manipulador?',
        options: [
          '2 horas anuales',
          '5 horas anuales',
          '10 horas anuales',
          '40 horas anuales'
        ],
        correctIndex: 2,
        explanation: 'Los Art. 12 y 13 de la Res. 2674/2013 exigen un plan de capacitación continuo y permanente de por lo menos 10 horas anuales en higiene y Buenas Prácticas de Manufactura.'
      },
      {
        id: 'Q3',
        timeSec: 25,
        speaker: 'Omar Farid',
        article: 'Res. 2674/2013 · Art. 26',
        prompt: '¿Cuál de estas opciones NO es uno de los 4 programas obligatorios del Plan de Saneamiento?',
        options: [
          'Limpieza y desinfección',
          'Desechos sólidos y residuos',
          'Control integrado de plagas',
          'Calibración de básculas'
        ],
        correctIndex: 3,
        explanation: 'El Plan de Saneamiento (Art. 26) integra: (1) limpieza y desinfección, (2) desechos sólidos, (3) control integrado de plagas y (4) abastecimiento y calidad de agua potable. La calibración pertenece a equipos (Art. 8–10).'
      },
      {
        id: 'Q4',
        timeSec: 25,
        speaker: 'Omar Farid',
        article: 'Res. 2674/2013 · Art. 28',
        prompt: 'Al almacenar alimentos o materias primas sobre estibas, ¿qué separación mínima exige la norma?',
        options: [
          '≥ 15 cm del piso y ≥ 60 cm de las paredes',
          '5 cm del piso y 10 cm de las paredes',
          '30 cm del piso y 20 cm de las paredes',
          'No existe requisito numérico de separación'
        ],
        correctIndex: 0,
        explanation: 'El Art. 28 de la Res. 2674/2013 exige estibas elevadas mínimo 15 cm del piso y separadas al menos 60 cm respecto a las paredes perimetrales para limpieza, ventilación e inspección.'
      },
      {
        id: 'Q5',
        timeSec: 25,
        speaker: 'Luis Fernando',
        article: 'Res. 2674/2013 · Art. 7',
        prompt: '¿Qué pendiente mínima deben tener los pisos en las áreas húmedas de elaboración?',
        options: [
          '0 % (totalmente planos)',
          '≥ 1 % hacia drenajes',
          '≥ 2 % con sifón de 10 cm cada 40 m²',
          '≥ 10 % en toda la planta'
        ],
        correctIndex: 2,
        explanation: 'El Art. 7 exige pendiente mínima del 2 % en áreas húmedas (con al menos un sifón de 10 cm por cada 40 m²). En baja humedad y almacenes la pendiente mínima es del 1 % (1 sifón cada 90 m²).'
      },
      {
        id: 'Q6',
        timeSec: 25,
        speaker: 'Luis Fernando',
        article: 'Res. 2674/2013 · Art. 39 y 41',
        prompt: '¿Qué vigencia tiene el Registro Sanitario (RSA) para un alimento clasificado de alto riesgo?',
        options: [
          '3 años',
          '5 años',
          '7 años',
          '10 años'
        ],
        correctIndex: 1,
        explanation: 'Según el Art. 39 y 41: RSA (alto riesgo) = 5 años; PSA (riesgo medio) = 7 años; NSA (menor riesgo) = 10 años. Todos deben solicitar renovación mínimo 3 meses antes del vencimiento.'
      },
      {
        id: 'Q7',
        timeSec: 20,
        speaker: 'Luis Fernando',
        article: 'Res. 2674/2013 · Art. 28',
        prompt: 'Según los requisitos de almacenamiento en cadena de frío, ¿a qué temperatura debe mantenerse un alimento en congelación?',
        options: [
          '0 °C exactos',
          '−5 °C',
          '−10 °C',
          '≤ −18 °C'
        ],
        correctIndex: 3,
        explanation: 'El Art. 28 (cadena de frío) exige mantener los productos congelados a una temperatura de −18 °C o inferior (≤ −18 °C) para preservar su inocuidad.'
      },
      {
        id: 'Q8',
        timeSec: 25,
        speaker: 'Luis Fernando',
        article: 'Ley 9/1979 Art. 577 · DL 2106/2019 Art. 98',
        prompt: 'Según la Ley 9 de 1979 (modificada por el Decreto Ley 2106 de 2019), ¿hasta cuánto pueden llegar las multas sanitarias del INVIMA?',
        options: [
          '100 SMLMV',
          '10.000 SMLMV',
          '1.000 SMLMV',
          'No tienen tope legal definido'
        ],
        correctIndex: 1,
        explanation: 'El Art. 577 de la Ley 9 de 1979 (modificado por el Art. 98 del DL 2106/2019) contempla multas sucesivas hasta 10.000 SMLMV, además de amonestación, decomiso, suspensión/cancelación del registro y cierre temporal o definitivo.'
      }
    ]
  };

  global.BPM_QUIZ_CONFIG = BPM_QUIZ_CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
