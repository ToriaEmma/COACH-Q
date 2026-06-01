(function () {
  function bindRegistrationModal() {
    const modal = document.querySelector('.registration-modal');
    if (!modal) {
      return;
    }

    const dialog = modal.querySelector('.registration-dialog');
    const form = modal.querySelector('.registration-form');
    const openers = document.querySelectorAll('.js-open-registration');
    const closers = modal.querySelectorAll('[data-close-registration]');
    let lastFocus = null;

    function openModal(event) {
      event?.preventDefault();
      lastFocus = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('registration-lock');
      modal.querySelector('input, select, textarea, button')?.focus();

      if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.gsap.fromTo(dialog, { y: 34, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'power3.out' });
      }
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('registration-lock');
      lastFocus?.focus?.();
    }

    openers.forEach((opener) => opener.addEventListener('click', openModal));
    closers.forEach((closer) => closer.addEventListener('click', closeModal));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    form?.addEventListener('submit', (event) => {
      // Intercept submission. If action is external FormSubmit, perform AJAX post to avoid redirecting to formsubmit.co.
      let actionUrl;
      try {
        actionUrl = new URL(form.action, window.location.href);
      } catch (e) {
        actionUrl = null;
      }

      if (actionUrl && actionUrl.hostname && actionUrl.hostname.includes('formsubmit.co')) {
        event.preventDefault();

        const submitButton = form.querySelector('.registration-submit');
        const status = form.querySelector('.form-status');
        const data = new FormData(form);

        if (status) {
          status.textContent = 'Envoi de l\'inscription...';
          status.className = 'form-status';
        }
        if (submitButton) submitButton.disabled = true;

        // Extract destination email from action path: /cakpojulia7@gmail.com
        const pathParts = actionUrl.pathname.split('/').filter(Boolean);
        const destEmail = pathParts[0] || '';
        const ajaxUrl = `${actionUrl.origin}/ajax/${encodeURIComponent(destEmail)}`;

        fetch(ajaxUrl, {
          method: 'POST',
          body: data,
        })
          .then(async (resp) => {
            if (!resp.ok) {
              const text = await resp.text().catch(() => 'Erreur lors de la requête.');
              throw new Error(text || 'Erreur lors de la requête FormSubmit');
            }
            return resp.json().catch(() => ({}));
          })
          .then(() => {
            form.reset();
            // Redirect to thank-you page if provided via hidden _next, otherwise to /merci.html
            const nextField = form.querySelector('input[name="_next"]');
            const nextUrl = (nextField && nextField.value) || '/merci.html';
            window.location.href = nextUrl;
          })
          .catch((err) => {
            if (status) {
              status.textContent = 'Impossible d\'envoyer via FormSubmit AJAX. Redirection...';
              status.classList.add('is-error');
            }
            // fallback: open normal formsubmit submission page
            window.location.href = form.action;
          })
          .finally(() => {
            if (submitButton) submitButton.disabled = false;
          });

        return;
      }

      event.preventDefault();

      const submitButton = form.querySelector('.registration-submit');
      const status = form.querySelector('.form-status');
      const data = new FormData(form);
      const payload = {};
      const lines = ['Nouvelle inscription Coach Q Camp', ''];

      data.forEach((value, key) => {
        payload[key] = value;
        lines.push(`${key}: ${value || 'Non renseigné'}`);
      });

      function openMailFallback() {
        const subject = encodeURIComponent('Nouvelle inscription Coach Q Camp');
        const body = encodeURIComponent(lines.join('\n'));
        window.location.href = `mailto:cakpojulia7@gmail.com?subject=${subject}&body=${body}`;
      }

      if (status) {
        status.textContent = "Envoi de l'inscription...";
        status.className = 'form-status';
      }

      if (submitButton) {
        submitButton.disabled = true;
      }

      fetch(form.action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          if (!response.ok) {
            const error = await response.json().catch(() => ({
              message: "Le serveur d'envoi n'est pas actif ici. Testez sur Vercel avec Resend configuré.",
            }));
            throw new Error(error.message || "L'envoi a échoué.");
          }
          return response.json();
        })
        .then(() => {
          form.reset();
          if (status) {
            status.textContent = "Inscription envoyée avec succès.";
            status.classList.add('is-success');
          }
        })
        .catch((error) => {
          if (status) {
            status.textContent = `${error.message || "Le serveur d'envoi n'est pas actif ici."} Ouverture d'un e-mail prêt à envoyer...`;
            status.classList.add('is-error');
          }
          openMailFallback();
        })
        .finally(() => {
          if (submitButton) {
            submitButton.disabled = false;
          }
        });
    });
  }

  if (!window.gsap) {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', bindRegistrationModal, { once: true });
    } else {
      bindRegistrationModal();
    }
    return;
  }

  const gsap = window.gsap;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (window.ScrollTrigger) {
    gsap.registerPlugin(window.ScrollTrigger);
  }

  if (reduceMotion) {
    const footerTrigger = document.querySelector('.site-footer');
    if (footerTrigger && window.ScrollTrigger) {
      window.ScrollTrigger.create({
        trigger: footerTrigger,
        start: 'top 85%',
        onEnter: () => window.CoachQFooterPhysics?.start(),
        onEnterBack: () => window.CoachQFooterPhysics?.start(),
      });
    }
    return;
  }

  function heroIntro() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.site-header', {
      y: -24,
      opacity: 0,
      duration: 0.7,
    })
      .from(
        '.hero h1',
        {
          y: 70,
          opacity: 0,
          duration: 0.9,
        },
        '-=0.35'
      )
      .from(
        '.hero-card',
        {
          y: 42,
          scale: 0.97,
          opacity: 0,
          duration: 0.9,
        },
        '-=0.45'
      )
      .from(
        '.service-tag, .hero-copy, .stat',
        {
          y: 24,
          opacity: 0,
          duration: 0.55,
          stagger: 0.09,
        },
        '-=0.35'
      );

    gsap.to('.hero-media video', {
      scale: 1.05,
      duration: 8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  function revealOnScroll() {
    if (!window.ScrollTrigger) {
      return;
    }

    gsap.utils.toArray('.intro-section, .club-section, .programs-section, .offer-section').forEach((section) => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 82%',
            end: 'bottom 18%',
            toggleActions: 'play reverse play reverse',
          },
        })
        .fromTo(
          section.children,
          { y: 42, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.72,
            ease: 'power3.out',
            stagger: 0.1,
          }
        );
    });

    gsap
      .timeline({
        scrollTrigger: {
          trigger: '.training-section',
          start: 'top 82%',
          end: 'bottom 18%',
          toggleActions: 'play reverse play reverse',
        },
      })
      .fromTo(
        '.section-head > *',
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          ease: 'power3.out',
          stagger: 0.1,
        }
      );

    gsap.utils.toArray('.training-card').forEach((card, index) => {
      gsap.fromTo(
        card,
        { x: index % 2 === 0 ? -70 : 70, opacity: 0 },
        {
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            end: 'bottom 12%',
            toggleActions: 'play reverse play reverse',
          },
          x: 0,
          opacity: 1,
          duration: 0.78,
          ease: 'power3.out',
        }
      );
    });

    gsap
      .timeline({
        scrollTrigger: {
          trigger: '.programs-grid',
          start: 'top 82%',
          end: 'bottom 18%',
          toggleActions: 'play reverse play reverse',
        },
      })
      .fromTo(
        '.program-card, .program-copy',
        { y: 46, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.78,
          ease: 'power3.out',
          stagger: 0.09,
        }
      );

    gsap
      .timeline({
        scrollTrigger: {
          trigger: '.site-footer',
          start: 'top 84%',
          end: 'bottom 16%',
          toggleActions: 'play reverse play reverse',
          onEnter: () => window.CoachQFooterPhysics?.start(),
          onEnterBack: () => window.CoachQFooterPhysics?.start(),
        },
      })
      .fromTo(
        '.footer-brand, .footer-links, .footer-legal, .footer-social, .footer-copy',
        { y: 42, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.08,
        }
      );
  }

  function bindHoverMotion() {
    const hoverables = gsap.utils.toArray('.contact-btn, .pill-btn, .offer-form button, .program-meta a, .club-panel a');

    hoverables.forEach((el) => {
      el.addEventListener('mouseenter', () => gsap.to(el, { scale: 1.04, duration: 0.18, ease: 'power2.out' }));
      el.addEventListener('mouseleave', () => gsap.to(el, { scale: 1, duration: 0.2, ease: 'power2.out' }));
    });

    gsap.utils.toArray('.training-card, .program-card').forEach((card) => {
      const media = card.querySelector('video, img');
      card.addEventListener('mouseenter', () => {
        gsap.to(card, { y: -6, duration: 0.28, ease: 'power2.out' });
        if (media) {
          gsap.to(media, { scale: 1.06, duration: 0.4, ease: 'power2.out' });
        }
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { y: 0, duration: 0.28, ease: 'power2.out' });
        if (media) {
          gsap.to(media, { scale: 1, duration: 0.4, ease: 'power2.out' });
        }
      });
    });
  }

  function bindAccordionMotion() {
    document.querySelectorAll('.club-item').forEach((item) => {
      const panel = item.querySelector('.club-panel');
      if (!panel) {
        return;
      }

      if (!item.open) {
        gsap.set(panel, { height: 0, opacity: 0, overflow: 'hidden' });
      }

      item.addEventListener('toggle', () => {
        if (item.open) {
          gsap.fromTo(
            panel,
            { height: 0, opacity: 0, overflow: 'hidden' },
            {
              height: 'auto',
              opacity: 1,
              duration: 0.36,
              ease: 'power2.out',
              onComplete: () => gsap.set(panel, { overflow: 'visible' }),
            }
          );
        } else {
          gsap.to(panel, {
            height: 0,
            opacity: 0,
            overflow: 'hidden',
            duration: 0.28,
            ease: 'power2.inOut',
          });
        }
      });
    });
  }

  function bindMediaOpenMotion() {
    document.querySelectorAll('.media-open').forEach((link) => {
      link.addEventListener('click', () => {
        gsap.fromTo(link, { scale: 0.98 }, { scale: 1, duration: 0.22, ease: 'power2.out' });
      });
    });
  }

  function boot() {
    heroIntro();
    revealOnScroll();
    bindHoverMotion();
    bindAccordionMotion();
    bindMediaOpenMotion();
    bindRegistrationModal();
    window.ScrollTrigger?.refresh();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
