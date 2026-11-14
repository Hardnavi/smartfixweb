/* ==========================================================================
   SMARTFIX AI — main.js
   Navegación, tema, animaciones de entrada y utilidades compartidas.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     Utilidades compartidas (usadas por diagnosis.js y contact.js)
     --------------------------------------------------------------------- */
  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(icon, title) {
    if (!window.Swal) {
      return;
    }
    window.Swal.fire({
      toast: true,
      position: 'top-end',
      icon: icon || 'info',
      title: title || '',
      showConfirmButton: false,
      timer: 2800,
      timerProgressBar: true,
      customClass: { popup: 'sf-swal-toast' }
    });
  }

  function confirmAction(options) {
    options = options || {};
    if (!window.Swal) {
      return Promise.resolve(window.confirm(options.text || options.title || '¿Continuar?'));
    }
    return window.Swal.fire({
      title: options.title || '¿Continuar?',
      text: options.text || '',
      icon: options.icon || 'question',
      showCancelButton: true,
      confirmButtonText: options.confirmText || 'Continuar',
      cancelButtonText: options.cancelText || 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
      focusCancel: true
    }).then(function (result) {
      return result.isConfirmed;
    });
  }

  window.SFUI = {
    escapeHTML: escapeHTML,
    toast: toast,
    confirm: confirmAction
  };

  /* ---------------------------------------------------------------------
     Tema claro / oscuro
     --------------------------------------------------------------------- */
  var themeToggle = document.getElementById('themeToggle');
  var themeIcon = document.getElementById('themeIcon');

  function currentTheme() {
    return root.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
  }

  function paintThemeControl() {
    if (!themeToggle || !themeIcon) {
      return;
    }
    var dark = currentTheme() === 'dark';
    themeIcon.className = dark ? 'bi bi-sun' : 'bi bi-moon-stars';
    themeToggle.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    themeToggle.setAttribute('title', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }

  function setTheme(theme, persist) {
    var next = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-bs-theme', next);
    paintThemeControl();
    if (persist) {
      try {
        localStorage.setItem('sf-theme', next);
      } catch (error) { /* El tema funciona sin almacenamiento. */ }
    }
    document.dispatchEvent(new CustomEvent('sf:themechange', { detail: { theme: next } }));
  }

  paintThemeControl();

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ---------------------------------------------------------------------
     Navegación fija
     --------------------------------------------------------------------- */
  var siteNav = document.getElementById('siteNav');
  var backToTop = document.getElementById('backToTop');
  var ticking = false;

  function updateScrollUI() {
    var y = window.scrollY || window.pageYOffset;

    if (siteNav) {
      siteNav.classList.toggle('scrolled', y > 24);
    }

    if (backToTop) {
      var visible = y > 620;
      backToTop.classList.toggle('is-visible', visible);
      backToTop.setAttribute('aria-hidden', visible ? 'false' : 'true');
      backToTop.tabIndex = visible ? 0 : -1;
    }

    updateActiveNavLink(y);
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  if (backToTop) {
    backToTop.tabIndex = -1;
    backToTop.setAttribute('aria-hidden', 'true');
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------------------
     Enlace activo según la sección visible
     --------------------------------------------------------------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav-link]'));
  var watchedSections = navLinks
    .map(function (link) {
      var id = link.getAttribute('href');
      return id && id.charAt(0) === '#' ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  function updateActiveNavLink(scrollY) {
    if (!navLinks.length || !watchedSections.length) {
      return;
    }

    var probe = scrollY + (siteNav ? siteNav.offsetHeight : 72) + 130;
    var activeId = watchedSections[0].id;
    var atBottom = scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;

    watchedSections.forEach(function (section) {
      var start = section.offsetTop;
      if (probe >= start) {
        activeId = section.id;
      }
    });

    if (atBottom) {
      activeId = watchedSections[watchedSections.length - 1].id;
    }

    navLinks.forEach(function (link) {
      var isActive = link.getAttribute('href') === '#' + activeId;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  /* ---------------------------------------------------------------------
     Desplazamiento suave + cierre del menú móvil
     --------------------------------------------------------------------- */
  var mobileNav = document.getElementById('mobileNav');
  var scrollTimer = null;

  function closeMobileMenu(done) {
    if (!mobileNav || !mobileNav.classList.contains('show') || !window.bootstrap) {
      done();
      return;
    }

    var finished = false;
    var finish = function () {
      if (finished) {
        return;
      }
      finished = true;
      window.clearTimeout(scrollTimer);
      done();
    };

    mobileNav.addEventListener('hidden.bs.offcanvas', finish, { once: true });
    scrollTimer = window.setTimeout(finish, 500);

    try {
      window.bootstrap.Offcanvas.getOrCreateInstance(mobileNav).hide();
    } catch (error) {
      finish();
    }
  }

  function scrollToTarget(target) {
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var href = link.getAttribute('href');
      if (!href || href === '#') {
        return;
      }

      var target;
      try {
        target = document.querySelector(href);
      } catch (error) {
        return;
      }

      if (!target) {
        return;
      }

      event.preventDefault();

      closeMobileMenu(function () {
        scrollToTarget(target);
        try {
          window.history.replaceState(null, '', href);
        } catch (error) { /* Entornos que bloquean history: la navegación sigue funcionando. */ }
      });
    });
  });

  /* ---------------------------------------------------------------------
     Animaciones de entrada discretas
     --------------------------------------------------------------------- */
  function initRevealAnimations() {
    var elements = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!elements.length || prefersReducedMotion || !('IntersectionObserver' in window)) {
      return;
    }

    // Pequeño escalonado visual en rejillas de tarjetas.
    ['.services-grid', '.why-grid', '.process-grid', '.mv-grid'].forEach(function (selector) {
      var grid = document.querySelector(selector);
      if (!grid) {
        return;
      }
      Array.prototype.slice.call(grid.querySelectorAll(':scope > .reveal')).forEach(function (el, index) {
        el.style.setProperty('--reveal-delay', Math.min(index * 65, 260) + 'ms');
      });
    });

    root.classList.add('reveal-ready');

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );

    elements.forEach(function (element) {
      observer.observe(element);
    });

    // Salvaguarda: si algo falla, el contenido nunca queda oculto.
    window.setTimeout(function () {
      elements.forEach(function (element) {
        var rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          element.classList.add('is-visible');
        }
      });
    }, 1600);
  }

  /* ---------------------------------------------------------------------
     Varios
     --------------------------------------------------------------------- */
  var yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  updateScrollUI();
  initRevealAnimations();
})();
