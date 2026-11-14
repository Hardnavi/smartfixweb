/* ==========================================================================
   SMARTFIX AI — contact.js
   Valida el formulario y prepara un mensaje para WhatsApp.
   No envía datos a ningún servidor ni utiliza servicios de backend.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('contactForm');
  if (!form) {
    return;
  }

  var UI = window.SFUI || {};
  var toast = UI.toast || function () {};

  var WA_NUMBER = '59160404018';
  var WA_BASE_URL = 'https://wa.me/' + WA_NUMBER;

  var nameInput = document.getElementById('contactName');
  var phoneInput = document.getElementById('contactPhone');
  var emailInput = document.getElementById('contactEmail');
  var reasonInput = document.getElementById('contactReason');
  var messageInput = document.getElementById('contactMessage');
  var consentInput = document.getElementById('contactConsent');

  var messageCount = document.getElementById('contactCharCount');
  var submitBtn = document.getElementById('contactSubmitBtn');
  var submitLabel = submitBtn ? submitBtn.querySelector('.btn-submit-label') : null;
  var submitLoading = submitBtn ? submitBtn.querySelector('.btn-submit-loading') : null;

  var result = document.getElementById('waResult');
  var preview = document.getElementById('waPreview');
  var openLink = document.getElementById('waOpenLink');
  var copyBtn = document.getElementById('waCopyBtn');
  var resultNote = document.getElementById('waResultNote');

  var state = {
    message: '',
    signature: '',
    generated: false
  };

  var errors = {
    contactName: 'contactNameError',
    contactPhone: 'contactPhoneError',
    contactEmail: 'contactEmailError',
    contactReason: 'contactReasonError',
    contactMessage: 'contactMessageError',
    contactConsent: 'contactConsentError'
  };

  var fieldOrder = [nameInput, phoneInput, reasonInput, messageInput, consentInput].filter(Boolean);

  /* -----------------------------------------------------------------------
     Utilidades
     ----------------------------------------------------------------------- */
  function setError(field, message) {
    if (!field) {
      return;
    }

    var errorId = errors[field.id];
    var errorEl = errorId ? document.getElementById(errorId) : null;

    if (field.type !== 'checkbox') {
      field.classList.toggle('is-invalid', Boolean(message));
    }
    if (message) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }

    if (errorEl) {
      errorEl.textContent = message || '';
    }
  }

  function clearError(field) {
    if (!field) {
      return;
    }
    setError(field, '');
  }

  function focusFirstInvalid() {
    for (var i = 0; i < fieldOrder.length; i += 1) {
      var field = fieldOrder[i];
      var invalid = field.getAttribute('aria-invalid') === 'true' ||
        field.classList.contains('is-invalid');
      if (invalid) {
        try {
          field.focus({ preventScroll: false });
        } catch (error) {
          field.focus();
        }
        return;
      }
    }
  }

  function normalizePhone(value) {
    var raw = String(value == null ? '' : value).trim();
    var digits = raw.replace(/\D/g, '');
    var hasPlus = raw.charAt(0) === '+';

    if (!digits) {
      return null;
    }

    // Número boliviano con código de país.
    if (digits.indexOf('591') === 0 && digits.length === 11) {
      var national = digits.slice(3);
      if (/^[67]\d{7}$/.test(national)) {
        return {
          national: national,
          display: '+591 ' + national
        };
      }
      return null;
    }

    // Celular boliviano local de 8 dígitos.
    if (digits.length === 8 && /^[67]\d{7}$/.test(digits)) {
      return {
        national: digits,
        display: '+591 ' + digits
      };
    }

    // Otros números internacionales escritos con el prefijo +.
    if (hasPlus && digits.length >= 8 && digits.length <= 15) {
      return {
        national: '',
        display: '+' + digits
      };
    }

    return null;
  }

  function isValidEmail(value) {
    if (!value) {
      return true;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  function valueOf(field) {
    return field ? String(field.value || '').trim() : '';
  }

  function currentSignature() {
    return [
      valueOf(nameInput),
      valueOf(phoneInput),
      valueOf(emailInput),
      valueOf(reasonInput),
      valueOf(messageInput),
      consentInput && consentInput.checked ? '1' : '0'
    ].join('|');
  }

  function setSubmitting(isSubmitting) {
    if (!submitBtn) {
      return;
    }
    submitBtn.disabled = Boolean(isSubmitting);
    if (submitLabel) {
      submitLabel.hidden = Boolean(isSubmitting);
    }
    if (submitLoading) {
      submitLoading.hidden = !isSubmitting;
    }
  }

  /* -----------------------------------------------------------------------
     Validación
     ----------------------------------------------------------------------- */
  function validate() {
    var valid = true;
    var name = valueOf(nameInput);
    var phone = normalizePhone(valueOf(phoneInput));
    var email = valueOf(emailInput);
    var reason = valueOf(reasonInput);
    var message = valueOf(messageInput);

    if (name.length < 2) {
      setError(nameInput, 'Escribe tu nombre (al menos 2 caracteres).');
      valid = false;
    } else {
      clearError(nameInput);
    }

    if (!phone) {
      setError(
        phoneInput,
        'Ingresa un celular válido. En Bolivia son 8 dígitos y empieza por 6 o 7 (ej. 70012345).'
      );
      valid = false;
    } else {
      clearError(phoneInput);
    }

    if (!isValidEmail(email)) {
      setError(emailInput, 'Revisa el correo electrónico o déjalo vacío.');
      valid = false;
    } else {
      clearError(emailInput);
    }

    if (!reason) {
      setError(reasonInput, 'Selecciona el motivo de tu consulta.');
      valid = false;
    } else {
      clearError(reasonInput);
    }

    if (message.length < 10) {
      setError(messageInput, 'Cuéntanos un poco más: escribe al menos 10 caracteres.');
      valid = false;
    } else {
      clearError(messageInput);
    }

    if (!consentInput || !consentInput.checked) {
      setError(consentInput, 'Debes confirmar que entiendes cómo se comparte el mensaje.');
      valid = false;
    } else {
      clearError(consentInput);
    }

    return {
      valid: valid,
      data: {
        name: name,
        phone: phone,
        email: email,
        reason: reason,
        message: message
      }
    };
  }

  /* -----------------------------------------------------------------------
     Mensaje de WhatsApp
     ----------------------------------------------------------------------- */
  function buildMessage(data) {
    var lines = [
      'Hola SMARTFIX AI, escribo desde la web para coordinar una consulta.',
      '',
      '*Nombre:* ' + data.name,
      '*Celular:* ' + data.phone.display,
      '*Motivo:* ' + data.reason
    ];

    if (data.email) {
      lines.push('*Correo:* ' + data.email);
    }

    lines.push('');
    lines.push('*Mensaje:*');
    lines.push(data.message);
    lines.push('');
    lines.push('Entiendo que la orientación en línea es referencial y no reemplaza una revisión presencial.');

    return lines.join('\n');
  }

  function showResult(message) {
    state.message = message;
    state.signature = currentSignature();
    state.generated = true;

    if (preview) {
      preview.textContent = message;
    }
    if (openLink) {
      openLink.href = WA_BASE_URL + '?text=' + encodeURIComponent(message);
    }
    if (resultNote) {
      resultNote.textContent = 'Si cambias los datos del formulario, vuelve a generar el mensaje para actualizarlo.';
    }
    if (result) {
      result.hidden = false;
      result.classList.remove('is-stale');
    }

    var heading = result ? result.querySelector('h3') : null;
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      try {
        heading.focus({ preventScroll: true });
      } catch (error) {
        heading.focus();
      }
    }

    if (result) {
      var top = result.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({
        top: Math.max(top, 0),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }

    toast('success', 'Mensaje preparado. Revísalo antes de enviarlo.');
  }

  function markResultStale() {
    if (!state.generated || !result || result.hidden) {
      return;
    }

    if (currentSignature() === state.signature) {
      result.classList.remove('is-stale');
      if (resultNote) {
        resultNote.textContent = 'Si cambias los datos del formulario, vuelve a generar el mensaje para actualizarlo.';
      }
      return;
    }

    result.classList.add('is-stale');
    if (resultNote) {
      resultNote.textContent = 'Los datos del formulario cambiaron. Vuelve a preparar el mensaje para actualizarlo antes de enviarlo.';
    }
  }

  function updateMessageCount() {
    if (messageCount && messageInput) {
      messageCount.textContent = String(messageInput.value.length);
    }
  }

  /* -----------------------------------------------------------------------
     Copiar
     ----------------------------------------------------------------------- */
  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }

    document.body.removeChild(area);
    return copied;
  }

  function copyMessage() {
    if (!state.message) {
      return;
    }

    var done = function (copied) {
      if (copied) {
        if (copyBtn) {
          copyBtn.innerHTML = '<i class="bi bi-check2" aria-hidden="true"></i> Mensaje copiado';
          window.setTimeout(function () {
            copyBtn.innerHTML = '<i class="bi bi-clipboard" aria-hidden="true"></i> Copiar mensaje';
          }, 2600);
        }
        toast('success', 'Mensaje copiado al portapapeles.');
      } else {
        selectPreview();
        toast('error', 'No se pudo copiar automáticamente. El mensaje quedó seleccionado para que lo copies.');
      }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(state.message).then(function () {
        done(true);
      }).catch(function () {
        done(fallbackCopy(state.message));
      });
      return;
    }

    done(fallbackCopy(state.message));
  }

  function selectPreview() {
    if (!preview) {
      return;
    }
    try {
      var range = document.createRange();
      range.selectNodeContents(preview);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) { /* La selección manual sigue disponible. */ }
  }

  /* -----------------------------------------------------------------------
     Eventos
     ----------------------------------------------------------------------- */
  [nameInput, phoneInput, emailInput, reasonInput, messageInput].forEach(function (field) {
    if (!field) {
      return;
    }
    field.addEventListener('input', function () {
      clearError(field);
      if (field === messageInput) {
        updateMessageCount();
      }
      markResultStale();
    });
    field.addEventListener('change', function () {
      clearError(field);
      markResultStale();
    });
  });

  if (consentInput) {
    consentInput.addEventListener('change', function () {
      clearError(consentInput);
      markResultStale();
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var validation = validate();
    if (!validation.valid) {
      focusFirstInvalid();
      toast('error', 'Revisa los campos marcados antes de continuar.');
      return;
    }

    setSubmitting(true);
    try {
      showResult(buildMessage(validation.data));
    } catch (error) {
      window.console.error('[SMARTFIX AI] No se pudo preparar el mensaje:', error);
      toast('error', 'No se pudo preparar el mensaje. Inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', copyMessage);
  }

  form.addEventListener('reset', function () {
    window.setTimeout(function () {
      state.message = '';
      state.signature = '';
      state.generated = false;
      if (result) {
        result.hidden = true;
        result.classList.remove('is-stale');
      }
      if (preview) {
        preview.textContent = '';
      }
      if (openLink) {
        openLink.href = WA_BASE_URL;
      }
      updateMessageCount();
    }, 0);
  });

  updateMessageCount();
})();
