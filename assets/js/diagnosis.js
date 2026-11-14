/* ==========================================================================
   SMARTFIX AI — diagnosis.js
   Controlador del asistente de diagnóstico e informe orientativo.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('diagnosisForm');
  if (!form) {
    return;
  }

  var UI = window.SFUI || {};
  var escapeHTML = UI.escapeHTML || function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  var toast = UI.toast || function () {};
  var confirmAction = UI.confirm || function (options) {
    return Promise.resolve(window.confirm((options && options.title) || '¿Continuar?'));
  };

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WIZARD_OFFSET = 92;

  var wizard = document.getElementById('diagnosisWizard');
  var panels = Array.prototype.slice.call(form.querySelectorAll('.step-panel'));
  var indicators = Array.prototype.slice.call(document.querySelectorAll('[data-step-indicator]'));
  var nextBtn = document.getElementById('nextStepBtn');
  var prevBtn = document.getElementById('prevStepBtn');
  var footHint = document.getElementById('footHint');
  var wizardFoot = document.getElementById('wizardFoot');
  var progressBar = document.getElementById('wizardProgressBar');

  var brandInput = document.getElementById('deviceBrand');
  var modelInput = document.getElementById('deviceModel');
  var ageInput = document.getElementById('deviceAge');
  var modelSuggestions = document.getElementById('modelSuggestions');
  var descriptionInput = document.getElementById('symptomDescription');
  var charCount = document.getElementById('charCount');
  var otherHelp = document.getElementById('otherHelp');
  var contextImpact = document.getElementById('contextImpact');
  var contextLiquid = document.getElementById('contextLiquid');
  var symptomInputs = Array.prototype.slice.call(form.querySelectorAll('input[name="symptoms"]'));
  var symptomCount = document.getElementById('symptomCount');
  var symptomsError = document.getElementById('symptomsError');

  var analysisLoading = document.getElementById('analysisLoading');
  var analysisStage = document.getElementById('analysisStage');
  var analysisProgress = document.getElementById('analysisProgress');
  var analysisLogItems = Array.prototype.slice.call(document.querySelectorAll('[data-load-step]'));
  var reportOutput = document.getElementById('reportOutput');
  var reportContent = document.getElementById('reportContent');
  var printDate = document.getElementById('printDate');
  var reportWhatsApp = document.getElementById('reportWhatsApp');
  var printReportBtn = document.getElementById('printReportBtn');
  var savePdfBtn = document.getElementById('savePdfBtn');
  var restartDiagnosisBtn = document.getElementById('restartDiagnosisBtn');

  var state = {
    step: 1,
    report: null,
    chart: null,
    timers: [],
    analyzing: false,
    runId: 0
  };

  var errorTargets = {
    deviceBrand: 'brandError',
    deviceModel: 'modelError',
    deviceAge: 'ageError',
    symptomDescription: 'descriptionError'
  };

  /* -----------------------------------------------------------------------
     Utilidades de formulario
     ----------------------------------------------------------------------- */
  function clearTimers() {
    state.timers.forEach(function (timer) {
      window.clearTimeout(timer);
    });
    state.timers = [];
  }

  function schedule(callback, delay) {
    var timer = window.setTimeout(callback, delay);
    state.timers.push(timer);
    return timer;
  }

  function setFieldError(field, message, errorElement) {
    if (!field) {
      return;
    }
    field.classList.toggle('is-invalid', Boolean(message));
    if (message) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
    if (errorElement) {
      errorElement.textContent = message || '';
    }
  }

  function getOsInputs() {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="os"]'));
  }

  function setOsError(message) {
    getOsInputs().forEach(function (input) {
      input.classList.toggle('is-invalid', Boolean(message));
      if (message) {
        input.setAttribute('aria-invalid', 'true');
      } else {
        input.removeAttribute('aria-invalid');
      }
    });
    var errorEl = document.getElementById('osError');
    if (errorEl) {
      errorEl.textContent = message || '';
    }
  }

  function clearFieldError(field) {
    if (!field) {
      return;
    }
    if (field.name === 'os') {
      setOsError('');
      return;
    }
    var errorId = errorTargets[field.id];
    setFieldError(field, '', errorId ? document.getElementById(errorId) : null);
    if (field.id === 'symptomDescription' && symptomsError) {
      symptomsError.textContent = '';
    }
  }

  function focusFirstError(panel) {
    if (!panel) {
      return;
    }
    var invalid = panel.querySelector('.is-invalid[aria-invalid="true"], .is-invalid');
    if (invalid) {
      try {
        invalid.focus({ preventScroll: false });
      } catch (error) {
        invalid.focus();
      }
      return;
    }
    if (panel.id === 'step-2') {
      var firstSymptom = panel.querySelector('input[name="symptoms"]');
      if (firstSymptom) {
        firstSymptom.focus();
      }
    }
  }

  function selectedSymptoms() {
    return symptomInputs.filter(function (input) {
      return input.checked;
    }).map(function (input) {
      return input.value;
    });
  }

  function updateSymptomSummary() {
    var count = selectedSymptoms().length;
    if (symptomCount) {
      symptomCount.innerHTML =
        '<i class="bi bi-check2-square" aria-hidden="true"></i> ' +
        count + ' síntoma' + (count === 1 ? '' : 's') + ' seleccionado' + (count === 1 ? '' : 's');
      symptomCount.classList.toggle('has-selection', count > 0);
    }
    if (otherHelp) {
      otherHelp.hidden = !symptomInputs.some(function (input) {
        return input.value === 'other' && input.checked;
      });
    }
    if (count > 0 && symptomsError) {
      symptomsError.textContent = '';
    }
  }

  function updateCharCount() {
    if (!descriptionInput || !charCount) {
      return;
    }
    charCount.textContent = String(descriptionInput.value.length);
  }

  function updateModelSuggestions() {
    if (!brandInput || !modelInput || !modelSuggestions) {
      return;
    }

    var diagnosis = window.SmartFixAIDiagnosis;
    if (!diagnosis || !diagnosis.config) {
      return;
    }

    var selected = diagnosis.config.brands.filter(function (brand) {
      return brand.name === brandInput.value;
    })[0];

    modelSuggestions.innerHTML = '';
    if (selected && selected.examples) {
      selected.examples.forEach(function (model) {
        var option = document.createElement('option');
        option.value = model;
        modelSuggestions.appendChild(option);
      });
      if (selected.examples.length) {
        modelInput.placeholder = 'Ej. ' + selected.examples[0];
      }
    } else {
      modelInput.placeholder = 'Ej. modelo del equipo';
    }
  }

  function readFormData() {
    var osChecked = form.querySelector('input[name="os"]:checked');
    return {
      brand: brandInput ? brandInput.value.trim() : '',
      model: modelInput ? modelInput.value.trim() : '',
      os: osChecked ? osChecked.value : '',
      age: ageInput ? ageInput.value : '',
      symptoms: selectedSymptoms(),
      description: descriptionInput ? descriptionInput.value.trim() : '',
      context: {
        impact: Boolean(contextImpact && contextImpact.checked),
        liquid: Boolean(contextLiquid && contextLiquid.checked)
      }
    };
  }

  /* -----------------------------------------------------------------------
     Validación
     ----------------------------------------------------------------------- */
  function validateStep(step) {
    var valid = true;

    if (step === 1) {
      if (!brandInput.value) {
        setFieldError(brandInput, 'Selecciona la marca de tu celular.', document.getElementById('brandError'));
        valid = false;
      } else {
        setFieldError(brandInput, '', document.getElementById('brandError'));
      }

      if (modelInput.value.trim().length < 2) {
        setFieldError(modelInput, 'Escribe el modelo, aunque sea de forma aproximada.', document.getElementById('modelError'));
        valid = false;
      } else {
        setFieldError(modelInput, '', document.getElementById('modelError'));
      }

      if (!form.querySelector('input[name="os"]:checked')) {
        setOsError('Selecciona el sistema operativo del equipo.');
        valid = false;
      } else {
        setOsError('');
      }

      if (!ageInput.value) {
        setFieldError(ageInput, 'Selecciona una antigüedad aproximada.', document.getElementById('ageError'));
        valid = false;
      } else {
        setFieldError(ageInput, '', document.getElementById('ageError'));
      }
    }

    if (step === 2) {
      if (!selectedSymptoms().length) {
        if (symptomsError) {
          symptomsError.textContent = 'Selecciona al menos un síntoma para continuar.';
        }
        valid = false;
      } else if (symptomsError) {
        symptomsError.textContent = '';
      }
    }

    if (step === 3) {
      var hasOther = selectedSymptoms().indexOf('other') !== -1;
      var text = descriptionInput.value.trim();

      if (hasOther && text.length < 5) {
        setFieldError(
          descriptionInput,
          'Describe brevemente el otro problema para poder orientarte.',
          document.getElementById('descriptionError')
        );
        valid = false;
      } else {
        setFieldError(descriptionInput, '', document.getElementById('descriptionError'));
      }
    }

    if (!valid) {
      focusFirstError(document.getElementById('step-' + step));
    }

    return valid;
  }

  /* -----------------------------------------------------------------------
     Navegación entre pasos
     ----------------------------------------------------------------------- */
  function setNextButtonForStep(step) {
    if (!nextBtn) {
      return;
    }
    if (step < 3) {
      nextBtn.innerHTML = 'Continuar <i class="bi bi-arrow-right" aria-hidden="true"></i>';
    } else {
      nextBtn.innerHTML = '<i class="bi bi-stars" aria-hidden="true"></i> Analizar mi celular';
    }
  }

  function scrollWizardToTop() {
    if (!wizard) {
      return;
    }
    var top = wizard.getBoundingClientRect().top + window.scrollY - WIZARD_OFFSET;
    window.scrollTo({ top: Math.max(top, 0), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  function goToStep(step, options) {
    options = options || {};
    if (step < 1 || step > 4) {
      return;
    }

    state.step = step;

    panels.forEach(function (panel) {
      var panelStep = Number(panel.getAttribute('data-step'));
      var active = panelStep === step;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });

    indicators.forEach(function (indicator) {
      var indicatorStep = Number(indicator.getAttribute('data-step-indicator'));
      indicator.classList.toggle('is-active', indicatorStep === step);
      indicator.classList.toggle('is-done', indicatorStep < step);
      if (indicatorStep === step) {
        indicator.setAttribute('aria-current', 'step');
      } else {
        indicator.removeAttribute('aria-current');
      }
    });

    if (wizardFoot) {
      wizardFoot.hidden = step === 4;
    }
    if (prevBtn) {
      prevBtn.hidden = step === 1;
    }
    if (footHint) {
      footHint.textContent = 'Paso ' + step + ' de 4';
    }
    setNextButtonForStep(step);

    var progress = step * 25;
    if (progressBar) {
      progressBar.value = progress;
      progressBar.textContent = progress + ' %';
    }

    if (options.focus !== false) {
      var activePanel = document.getElementById('step-' + step);
      var heading = activePanel ? activePanel.querySelector('h3') : null;
      window.requestAnimationFrame(function () {
        if (heading) {
          try {
            heading.focus({ preventScroll: true });
          } catch (error) {
            heading.focus();
          }
        }
        if (options.scroll !== false) {
          scrollWizardToTop();
        }
      });
    } else if (options.scroll) {
      scrollWizardToTop();
    }
  }

  function handleNext() {
    if (state.analyzing) {
      return;
    }

    if (!validateStep(state.step)) {
      return;
    }

    if (state.step < 3) {
      goToStep(state.step + 1, { focus: true, scroll: true });
    } else if (state.step === 3) {
      startAnalysis();
    }
  }

  /* -----------------------------------------------------------------------
     Análisis
     ----------------------------------------------------------------------- */
  function setLoadingProgress(percent, stage, activeLogIndex) {
    if (analysisProgress) {
      analysisProgress.value = percent;
      analysisProgress.textContent = percent + ' %';
    }
    if (analysisStage && stage) {
      analysisStage.textContent = stage;
    }
    analysisLogItems.forEach(function (item, index) {
      item.classList.toggle('is-active', index === activeLogIndex);
      item.classList.toggle('is-done', index < activeLogIndex || activeLogIndex === 'done');
    });
  }

  function prepareLoadingState() {
    if (analysisLoading) {
      analysisLoading.hidden = false;
    }
    if (reportOutput) {
      reportOutput.hidden = true;
    }
    setLoadingProgress(5, 'Revisando la información del dispositivo', 0);
  }

  function startAnalysis() {
    var diagnosis = window.SmartFixAIDiagnosis;
    if (!diagnosis || typeof diagnosis.analyze !== 'function') {
      toast('error', 'No se pudo cargar el motor de diagnóstico. Recarga la página e inténtalo de nuevo.');
      return;
    }

    state.analyzing = true;
    var runId = ++state.runId;
    var payload = readFormData();
    clearTimers();

    goToStep(4, { focus: false, scroll: true });
    prepareLoadingState();

    var timeline = prefersReducedMotion
      ? [
          { delay: 60, progress: 30, stage: 'Cruzando los síntomas con patrones conocidos', log: 1 },
          { delay: 220, progress: 65, stage: 'Preparando causas y recomendaciones', log: 2 },
          { delay: 420, progress: 90, stage: 'Generando tu informe orientativo…', log: 'done' }
        ]
      : [
          { delay: 520, progress: 30, stage: 'Cruzando los síntomas con patrones conocidos', log: 1 },
          { delay: 1040, progress: 64, stage: 'Preparando causas y recomendaciones', log: 2 },
          { delay: 1480, progress: 88, stage: 'Generando tu informe orientativo…', log: 'done' }
        ];

    timeline.forEach(function (moment) {
      schedule(function () {
        if (state.runId !== runId) {
          return;
        }
        setLoadingProgress(moment.progress, moment.stage, moment.log);
      }, moment.delay);
    });

    schedule(function () {
      if (state.runId !== runId) {
        return;
      }

      var report;
      try {
        report = diagnosis.analyze(payload);
      } catch (error) {
        window.console.error('[SMARTFIX AI] Error en el motor de diagnóstico:', error);
        state.analyzing = false;
        if (analysisLoading) {
          analysisLoading.hidden = true;
        }
        toast('error', 'No pudimos completar el análisis. Revisa los datos e inténtalo nuevamente.');
        goToStep(3, { focus: true, scroll: true });
        return;
      }

      if (!report || !report.ok) {
        state.analyzing = false;
        toast('error', 'El análisis no devolvió un informe válido. Inténtalo de nuevo.');
        goToStep(3, { focus: true, scroll: true });
        return;
      }

      state.analyzing = false;
      state.report = report;
      setLoadingProgress(100, 'Informe listo', 'done');
      renderReport(report);

      if (analysisLoading) {
        analysisLoading.hidden = true;
      }
      if (reportOutput) {
        reportOutput.hidden = false;
      }

      window.requestAnimationFrame(function () {
        var heading = document.getElementById('reportTitle');
        if (heading) {
          try {
            heading.focus({ preventScroll: true });
          } catch (error) {
            heading.focus();
          }
        }
        if (reportOutput) {
          var top = reportOutput.getBoundingClientRect().top + window.scrollY - WIZARD_OFFSET;
          window.scrollTo({ top: Math.max(top, 0), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }
      });
    }, prefersReducedMotion ? 700 : 1850);
  }

  /* -----------------------------------------------------------------------
     Render del informe
     ----------------------------------------------------------------------- */
  function formatReportDate(isoDate) {
    var date = isoDate ? new Date(isoDate) : new Date();
    if (isNaN(date.getTime())) {
      date = new Date();
    }
    try {
      return new Intl.DateTimeFormat('es-BO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function levelClass(level) {
    if (level === 'high') {
      return 'priority-high';
    }
    if (level === 'medium') {
      return 'priority-medium';
    }
    return 'priority-low';
  }

  function ringColor(level) {
    if (level === 'high') {
      return '#ef4444';
    }
    if (level === 'medium') {
      return '#e79a18';
    }
    return '#22c55e';
  }

  function buildTags(symptoms, signals) {
    var tags = symptoms.map(function (symptom) {
      return '<span class="report-tag"><i class="bi ' + escapeHTML(symptom.icon || 'bi-dot') +
        '" aria-hidden="true"></i> ' + escapeHTML(symptom.short || symptom.label) + '</span>';
    });

    (signals || []).forEach(function (signal) {
      tags.push(
        '<span class="report-tag report-tag-signal"><i class="bi bi-exclamation-diamond" aria-hidden="true"></i> ' +
        escapeHTML(signal) + '</span>'
      );
    });

    return tags.join('');
  }

  function buildCauses(causes) {
    if (!causes.length) {
      return '<p class="report-empty">No se identificaron causas específicas para los síntomas seleccionados.</p>';
    }
    return '<div class="causes-list">' + causes.map(function (cause) {
      var tagClass = cause.relationshipLevel === 'high'
        ? 'tag-high'
        : cause.relationshipLevel === 'medium'
          ? 'tag-medium'
          : '';
      return (
        '<div class="cause-item">' +
          '<div class="cause-head">' +
            '<strong>' + escapeHTML(cause.title) + '</strong>' +
            '<span class="cause-tag ' + tagClass + '">' + escapeHTML(cause.relationship) + '</span>' +
          '</div>' +
          '<p>' + escapeHTML(cause.detail) + '</p>' +
        '</div>'
      );
    }).join('') + '</div>';
  }

  function buildList(items, icon, extraClass) {
    return '<ul class="report-list ' + (extraClass || '') + '">' + items.map(function (item) {
      return '<li><i class="bi ' + escapeHTML(icon) + '" aria-hidden="true"></i><span>' +
        escapeHTML(item) + '</span></li>';
    }).join('') + '</ul>';
  }

  function buildChartFallback(categories) {
    if (!categories.length) {
      return '';
    }
    return categories.map(function (category) {
      return (
        '<div class="chart-fallback-row">' +
          '<span>' + escapeHTML(category.label) + '</span>' +
          '<span>' + category.percentage + ' %</span>' +
          '<span class="chart-fallback-bar"><span style="width: ' +
            Math.max(4, category.percentage) + '%"></span></span>' +
        '</div>'
      );
    }).join('');
  }

  function chartGroups(categories) {
    if (categories.length <= 5) {
      return categories.slice();
    }
    var visible = categories.slice(0, 4);
    var rest = categories.slice(4).reduce(function (total, category) {
      return total + category.weight;
    }, 0);
    if (rest > 0) {
      visible.push({ id: 'other-groups', label: 'Otras áreas', weight: rest });
    }
    return visible;
  }

  function renderChart(report) {
    var canvas = document.getElementById('reportChart');
    var fallback = document.getElementById('reportChartFallback');
    var wrap = canvas ? canvas.parentElement : null;
    if (!canvas || !wrap) {
      return;
    }

    if (state.chart && typeof state.chart.destroy === 'function') {
      state.chart.destroy();
      state.chart = null;
    }

    if (!window.Chart) {
      wrap.hidden = true;
      if (fallback) {
        fallback.hidden = false;
      }
      return;
    }

    wrap.hidden = false;
    if (fallback) {
      fallback.hidden = true;
    }

    var groups = chartGroups(report.categories);
    var total = groups.reduce(function (sum, category) {
      return sum + category.weight;
    }, 0);
    var rootStyles = getComputedStyle(document.documentElement);
    var textColor = (rootStyles.getPropertyValue('--sf-muted') || '#52627a').trim() || '#52627a';
    var cardColor = (rootStyles.getPropertyValue('--sf-card') || '#ffffff').trim() || '#ffffff';
    var palette = ['#2563eb', '#38bdf8', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6'];
    var labels = groups.map(function (category) { return category.label; });
    var data = groups.map(function (category) { return category.weight; });
    var colors = groups.map(function (category, index) {
      return palette[index % palette.length];
    });

    state.chart = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: cardColor,
          borderWidth: 2,
          hoverOffset: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: prefersReducedMotion ? false : { duration: 500 },
        cutout: '67%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              boxWidth: 7,
              boxHeight: 7,
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                family: "'Inter', 'Segoe UI', sans-serif",
                size: 10
              }
            }
          },
          tooltip: {
            backgroundColor: '#0b152b',
            titleColor: '#f4f9ff',
            bodyColor: '#dbeafe',
            padding: 9,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                var value = Number(context.raw) || 0;
                var percentage = total ? Math.round((value / total) * 100) : 0;
                return ' ' + context.label + ': ' + percentage + ' %';
              }
            }
          }
        }
      }
    });
  }

  function buildWhatsAppReport(report) {
    var symptoms = report.symptoms.map(function (symptom) {
      return symptom.short || symptom.label;
    }).join(', ');
    var device = report.device.displayName + (report.device.context || '');
    var lines = [
      'Hola SMARTFIX AI, completé el diagnóstico en línea y quisiera coordinar una revisión.',
      '',
      '*Dispositivo:* ' + device,
      '*Prioridad orientativa:* ' + report.priority.label,
      '*Síntomas:* ' + symptoms
    ];

    if (report.causes && report.causes.length) {
      lines.push('*Posible causa principal:* ' + report.causes[0].title);
    }

    lines.push('*Nivel de atención:* ' + report.attentionScore + '/100');
    lines.push('');
    lines.push('Entiendo que el diagnóstico es orientativo y no reemplaza una revisión presencial. ¿Me pueden ayudar a revisarlo?');

    return 'https://wa.me/59160404018?text=' + encodeURIComponent(lines.join('\n'));
  }

  function renderReport(report) {
    var generated = formatReportDate(report.generatedAt);
    var categories = report.categories || [];
    var fallbackMarkup = buildChartFallback(categories);
    var accessibleChart = categories.map(function (category) {
      return escapeHTML(category.label) + ': ' + category.percentage + ' %';
    }).join('; ');

    var overviewFacts = [
      { label: 'Marca', value: report.device.brand },
      { label: 'Modelo', value: report.device.model },
      { label: 'Sistema operativo', value: report.device.os },
      { label: 'Antigüedad', value: report.device.ageLabel }
    ].map(function (fact) {
      return '<div class="report-fact"><dt>' + escapeHTML(fact.label) + '</dt><dd>' +
        escapeHTML(fact.value) + '</dd></div>';
    }).join('');

    var safetyMarkup = '';
    if (report.safety && report.safety.length) {
      safetyMarkup =
        '<div class="report-callout report-callout-safety">' +
          '<span class="report-callout-icon"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i></span>' +
          '<div><h5>Señales de seguridad</h5><ul>' +
            report.safety.map(function (item) {
              return '<li>' + escapeHTML(item) + '</li>';
            }).join('') +
          '</ul></div>' +
        '</div>';
    }

    var descriptionMarkup = '';
    if (report.input && report.input.description) {
      descriptionMarkup =
        '<div class="report-section">' +
          '<h4><i class="bi bi-chat-left-text" aria-hidden="true"></i> Tu descripción</h4>' +
          '<p class="report-description">' + escapeHTML(report.input.description) + '</p>' +
        '</div>';
    }

    reportContent.innerHTML =
      '<div class="report-top">' +
        '<div>' +
          '<div class="report-kicker">Informe orientativo <span>· Generado el ' + escapeHTML(generated) + '</span></div>' +
          '<h3 id="reportTitle" tabindex="-1">Resultado de tu diagnóstico</h3>' +
          '<p class="report-summary">' + escapeHTML(report.summary) + '</p>' +
        '</div>' +
        '<span class="priority-badge ' + levelClass(report.priority.level) + '">' +
          escapeHTML(report.priority.label) +
        '</span>' +
      '</div>' +

      '<div class="report-overview">' +
        '<div class="report-score">' +
          '<div class="score-ring" style="--score: ' + report.attentionScore + '%; --ring-color: ' +
            ringColor(report.priority.level) + ';" role="img" aria-label="Nivel de atención orientativo: ' +
            report.attentionScore + ' de 100">' +
            '<div class="score-ring-inner"><strong>' + report.attentionScore + '</strong><span>/100</span></div>' +
          '</div>' +
          '<span class="score-caption">Nivel de atención orientativo</span>' +
        '</div>' +
        '<div class="report-overview-copy">' +
          '<h4>Qué significa esta prioridad</h4>' +
          '<p>' + escapeHTML(report.priority.description) + '</p>' +
          '<dl class="report-device-facts">' + overviewFacts + '</dl>' +
        '</div>' +
      '</div>' +

      '<div class="report-section">' +
        '<h4><i class="bi bi-list-check" aria-hidden="true"></i> Problemas identificados</h4>' +
        '<div class="report-tags">' + buildTags(report.symptoms, report.signals) + '</div>' +
      '</div>' +

      descriptionMarkup +
      safetyMarkup +

      '<div class="report-section report-two-col">' +
        '<div>' +
          '<h4><i class="bi bi-diagram-3" aria-hidden="true"></i> Posibles causas</h4>' +
          '<p class="report-section-note">Nivel de relación orientativo con los síntomas reportados.</p>' +
          buildCauses(report.causes) +
        '</div>' +
        '<div>' +
          '<h4><i class="bi bi-pie-chart" aria-hidden="true"></i> Distribución por área</h4>' +
          '<div class="chart-card">' +
            '<h5>Peso de los síntomas seleccionados</h5>' +
            '<p>Valores relativos; no representan una medición del hardware.</p>' +
            '<div class="chart-canvas-wrap">' +
              '<canvas id="reportChart" role="img" aria-label="Distribución de síntomas por área. ' +
                escapeHTML(accessibleChart) + '"></canvas>' +
            '</div>' +
            '<div class="chart-fallback" id="reportChartFallback" hidden>' + fallbackMarkup + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="report-section">' +
        '<h4><i class="bi bi-check2-circle" aria-hidden="true"></i> Recomendaciones iniciales</h4>' +
        buildList(report.recommendations, 'bi-check-lg') +
      '</div>' +

      '<div class="report-section">' +
        '<h4><i class="bi bi-shield-check" aria-hidden="true"></i> Recomendaciones preventivas</h4>' +
        buildList(report.preventive, 'bi-shield-check', 'report-list-shield') +
      '</div>' +

      '<div class="report-callout">' +
        '<span class="report-callout-icon"><i class="bi bi-tools" aria-hidden="true"></i></span>' +
        '<div><h5>Cuándo acudir al servicio técnico</h5><ul>' +
          report.serviceNotes.map(function (item) {
            return '<li>' + escapeHTML(item) + '</li>';
          }).join('') +
        '</ul></div>' +
      '</div>' +

      '<p class="report-disclaimer"><i class="bi bi-info-circle" aria-hidden="true"></i><span>' +
        escapeHTML(report.disclaimer) +
      '</span></p>';

    if (printDate) {
      printDate.textContent = 'Informe generado: ' + generated;
    }

    if (reportWhatsApp) {
      reportWhatsApp.href = buildWhatsAppReport(report);
    }

    window.requestAnimationFrame(function () {
      renderChart(report);
    });
  }

  /* -----------------------------------------------------------------------
     Imprimir / PDF
     ----------------------------------------------------------------------- */
  function printReport() {
    if (!state.report) {
      return;
    }
    document.body.classList.add('printing-report');
    window.setTimeout(function () {
      window.print();
    }, 80);
  }

  window.addEventListener('afterprint', function () {
    document.body.classList.remove('printing-report');
  });

  function openPdfInstructions() {
    if (!window.Swal) {
      printReport();
      return;
    }

    window.Swal.fire({
      title: 'Guardar como PDF',
      html: 'En la ventana de impresión, elige <strong>“Guardar como PDF”</strong> o una impresora PDF como destino. Después confirma la descarga.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Abrir impresión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      reverseButtons: true
    }).then(function (result) {
      if (result.isConfirmed) {
        printReport();
      }
    });
  }

  /* -----------------------------------------------------------------------
     Reinicio
     ----------------------------------------------------------------------- */
  function resetDiagnosis() {
    state.runId += 1;
    clearTimers();
    state.analyzing = false;
    state.report = null;

    if (state.chart && typeof state.chart.destroy === 'function') {
      state.chart.destroy();
    }
    state.chart = null;

    form.reset();

    Array.prototype.slice.call(form.querySelectorAll('.is-invalid')).forEach(function (field) {
      field.classList.remove('is-invalid');
      field.removeAttribute('aria-invalid');
    });
    Array.prototype.slice.call(form.querySelectorAll('.field-error')).forEach(function (error) {
      error.textContent = '';
    });

    if (reportOutput) {
      reportOutput.hidden = true;
    }
    if (analysisLoading) {
      analysisLoading.hidden = false;
    }
    if (reportContent) {
      reportContent.innerHTML = '';
    }
    if (prefersReducedMotion) {
      setLoadingProgress(5, 'Revisando la información del dispositivo', 0);
    }
    if (printDate) {
      printDate.textContent = '';
    }
    if (reportWhatsApp) {
      reportWhatsApp.href = 'https://wa.me/59160404018';
    }

    updateSymptomSummary();
    updateCharCount();
    updateModelSuggestions();
    if (otherHelp) {
      otherHelp.hidden = true;
    }
    if (symptomsError) {
      symptomsError.textContent = '';
    }

    goToStep(1, { focus: true, scroll: true });
  }

  function requestReset() {
    confirmAction({
      title: '¿Iniciar un nuevo análisis?',
      text: 'Se borrará el informe actual y los datos ingresados en el formulario.',
      icon: 'question',
      confirmText: 'Sí, reiniciar',
      cancelText: 'Cancelar'
    }).then(function (confirmed) {
      if (confirmed) {
        resetDiagnosis();
      }
    });
  }

  /* -----------------------------------------------------------------------
     Eventos
     ----------------------------------------------------------------------- */
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    handleNext();
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (state.step > 1 && !state.analyzing) {
        goToStep(state.step - 1, { focus: true, scroll: true });
      }
    });
  }

  if (brandInput) {
    brandInput.addEventListener('change', function () {
      clearFieldError(brandInput);
      updateModelSuggestions();
    });
  }

  if (modelInput) {
    modelInput.addEventListener('input', function () {
      clearFieldError(modelInput);
    });
  }

  if (ageInput) {
    ageInput.addEventListener('change', function () {
      clearFieldError(ageInput);
    });
  }

  getOsInputs().forEach(function (input) {
    input.addEventListener('change', function () {
      setOsError('');
    });
  });

  symptomInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      updateSymptomSummary();
    });
  });

  if (descriptionInput) {
    descriptionInput.addEventListener('input', function () {
      updateCharCount();
      clearFieldError(descriptionInput);
    });
  }

  if (printReportBtn) {
    printReportBtn.addEventListener('click', printReport);
  }

  if (savePdfBtn) {
    savePdfBtn.addEventListener('click', openPdfInstructions);
  }

  if (restartDiagnosisBtn) {
    restartDiagnosisBtn.addEventListener('click', requestReset);
  }

  document.addEventListener('sf:themechange', function () {
    if (state.report && reportOutput && !reportOutput.hidden) {
      renderChart(state.report);
    }
  });

  /* -----------------------------------------------------------------------
     Inicialización
     ----------------------------------------------------------------------- */
  updateModelSuggestions();
  updateSymptomSummary();
  updateCharCount();
  goToStep(1, { focus: false, scroll: false });
})();
