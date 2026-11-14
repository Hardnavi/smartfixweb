/* ==========================================================================
   Pruebas del motor de diagnóstico local.
   Ejecutar con: node --test tests/engine.test.cjs
   No requiere navegador ni conexión a internet.
   ========================================================================== */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const diagnosis = require('../assets/js/diagnosis-rules.js');

const BASE = {
  brand: 'Samsung',
  model: 'Galaxy A54',
  os: 'Android',
  age: 'lt1',
  description: '',
  context: { liquid: false, impact: false }
};

function analyze(overrides) {
  return diagnosis.analyze(Object.assign({}, BASE, overrides));
}

test('expone la versión, el aviso y la configuración pública', () => {
  assert.equal(diagnosis.version, '1.0.0');
  assert.match(diagnosis.disclaimer, /orientativo/i);
  assert.ok(Array.isArray(diagnosis.config.brands));
  assert.ok(diagnosis.config.brands.length >= 10);
  assert.equal(diagnosis.config.ages.length, 5);
  assert.equal(diagnosis.config.symptoms.length, 10);
});

test('un síntoma leve con equipo reciente produce prioridad baja', () => {
  const report = analyze({ symptoms: ['camera'] });

  assert.equal(report.ok, true);
  assert.equal(report.priority.level, 'low');
  assert.ok(report.attentionScore <= 35);
  assert.equal(report.symptoms.length, 1);
  assert.ok(report.causes.length > 0);
  assert.ok(report.recommendations.length > 0);
});

test('un síntoma de consumo con equipo de 1 a 2 años produce prioridad media', () => {
  const report = analyze({ symptoms: ['battery'], age: '1to2' });

  assert.equal(report.priority.level, 'medium');
  assert.ok(report.attentionScore >= 36);
  assert.ok(report.attentionScore <= 63);
  assert.match(report.summary, /prioridad media/i);
});

test('varios síntomas relevantes producen prioridad alta sin señal crítica', () => {
  const report = analyze({ symptoms: ['screen', 'heat'], age: '3to4' });

  assert.equal(report.priority.level, 'high');
  assert.equal(report.critical, false);
  assert.ok(report.attentionScore >= 64);
});

test('el contexto de líquido activa una señal crítica y recomendaciones de seguridad', () => {
  const report = analyze({
    symptoms: ['battery', 'charging'],
    context: { liquid: true, impact: false }
  });

  assert.equal(report.critical, true);
  assert.equal(report.priority.level, 'high');
  assert.ok(report.attentionScore >= 76);
  assert.ok(report.signals.some((signal) => /líquido|humedad/i.test(signal)));
  assert.ok(report.safety.length > 0);
  assert.ok(report.recommendations.some((item) => /no lo cargues/i.test(item)));
});

test('detecta un golpe y una pantalla rota en la descripción libre', () => {
  const report = analyze({
    symptoms: ['screen'],
    description: 'Se me cayó al piso y ahora la pantalla está rota.'
  });

  assert.ok(report.signals.some((signal) => /golpe|caída/i.test(signal)));
  assert.ok(report.causes.some((cause) => /golpe|caída/i.test(cause.title)));
});

test('detecta batería hinchada y olor a quemado como señales críticas', () => {
  const report = analyze({
    symptoms: ['battery', 'heat'],
    description: 'La batería está hinchada y huele a quemado.'
  });

  assert.equal(report.critical, true);
  assert.ok(report.signals.some((signal) => /hinchada/i.test(signal)));
  assert.ok(report.signals.some((signal) => /sobrecalentamiento|eléctrico/i.test(signal)));
  assert.ok(report.safety.some((item) => /no cargues/i.test(item)));
  assert.ok(report.safety.some((item) => /quemado/i.test(item)));
});

test('rechaza un análisis sin síntomas válidos', () => {
  assert.throws(() => diagnosis.analyze({ symptoms: [] }), /al menos un síntoma/i);
  assert.throws(() => diagnosis.analyze({ symptoms: ['inexistente'] }), /al menos un síntoma/i);
  assert.throws(() => diagnosis.analyze(), /al menos un síntoma/i);
});

test('usa valores de respaldo cuando faltan datos del dispositivo', () => {
  const report = diagnosis.analyze({ symptoms: ['other'], description: 'Hace un ruido extraño.' });

  assert.equal(report.device.brand, 'Marca no especificada');
  assert.equal(report.device.model, 'Modelo no especificado');
  assert.equal(report.device.os, 'No especificado');
  assert.equal(report.device.ageId, 'unknown');
  assert.match(report.summary, /^Tu dispositivo/);
});

test('elimina síntomas duplicados y conserva el orden de relevancia de causas', () => {
  const report = analyze({ symptoms: ['battery', 'battery', 'screen', 'screen'] });

  assert.equal(report.symptoms.length, 2);
  assert.equal(report.input.symptoms.length, 2);

  const weights = { high: 3, medium: 2, low: 1 };
  for (let index = 1; index < report.causes.length; index += 1) {
    const previous = weights[report.causes[index - 1].relationshipLevel];
    const current = weights[report.causes[index].relationshipLevel];
    assert.ok(previous >= current, 'las causas deben estar ordenadas por relación');
  }
});

test('calcula categorías con porcentajes coherentes', () => {
  const report = analyze({ symptoms: ['battery', 'heat', 'performance'] });
  const total = report.categories.reduce((sum, category) => sum + category.percentage, 0);

  assert.ok(report.categories.length >= 3);
  assert.ok(total >= 99 && total <= 101, 'los porcentajes redondeados deben sumar cerca de 100');
  report.categories.forEach((category) => {
    assert.ok(category.weight > 0);
    assert.ok(category.percentage >= 0 && category.percentage <= 100);
  });
});

test('el contrato del informe contiene todas las claves esperadas', () => {
  const report = analyze({
    symptoms: ['battery', 'charging', 'heat'],
    description: 'Se calienta al cargar y la batería dura poco.'
  });

  const expected = [
    'ok', 'version', 'generatedAt', 'device', 'input', 'priority', 'attentionScore',
    'critical', 'summary', 'symptoms', 'signals', 'causes', 'recommendations',
    'preventive', 'serviceNotes', 'safety', 'categories', 'disclaimer'
  ];

  expected.forEach((key) => {
    assert.ok(Object.prototype.hasOwnProperty.call(report, key), `falta la clave ${key}`);
  });

  assert.ok(!Number.isNaN(new Date(report.generatedAt).getTime()));
  assert.equal(report.disclaimer, diagnosis.disclaimer);
  assert.ok(report.attentionScore >= 1 && report.attentionScore <= 100);
  assert.ok(Array.isArray(report.recommendations));
  assert.ok(Array.isArray(report.preventive));
  assert.ok(Array.isArray(report.serviceNotes));
  assert.ok(report.serviceNotes.length >= 1);
  assert.ok(report.recommendations.length <= 8);
  assert.ok(report.preventive.length <= 6);
});

test('mantiene el puntaje dentro de 1 y 100 en combinaciones extremas', () => {
  const allSymptoms = diagnosis.config.symptoms.map((symptom) => symptom.id);
  const reports = [
    analyze({ symptoms: allSymptoms, age: 'gt4', description: 'Se mojó, se cayó, está hinchada y huele a quemado.' }),
    analyze({ symptoms: ['audio'], age: 'lt1' })
  ];

  reports.forEach((report) => {
    assert.ok(report.attentionScore >= 1 && report.attentionScore <= 100);
  });
});
