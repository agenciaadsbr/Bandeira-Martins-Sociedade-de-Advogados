/* LP Trabalhista — Bandeira & Martins
   Sem dependências. Formulário → Supabase (lp_leads) → /redirect → WhatsApp */
(function () {
  'use strict';

  var CFG = window.LP_CONFIG || {};
  var LOADED_AT = Date.now();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- utilidades ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function safeStorage(type) {
    try { var s = window[type]; var k = '__t'; s.setItem(k, k); s.removeItem(k); return s; } catch (e) { return null; }
  }
  var local = safeStorage('localStorage');
  var session = safeStorage('sessionStorage');

  /* ---------- origem do tráfego (persistida na sessão) ---------- */
  function getParams() {
    var p = {};
    try { new URLSearchParams(location.search).forEach(function (v, k) { p[k] = v; }); } catch (e) {}
    return p;
  }
  function detectOrigem() {
    var stored = session && session.getItem('bm_origem');
    var p = getParams();
    var o = null;
    if (p.gclid || p.gbraid || p.wbraid) o = 'google-ads';
    else if (p.fbclid) o = 'meta-ads';
    if (p.utm_source) {
      o = [p.utm_source, p.utm_medium, p.utm_campaign].filter(Boolean).join(' / ').slice(0, 180);
    }
    if (o) { session && session.setItem('bm_origem', o); return o; }
    return stored || 'direto';
  }
  var ORIGEM = detectOrigem();

  /* ---------- Supabase (REST, sem SDK) ---------- */
  function sbInsert(table, payload, timeoutMs) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 10000) : null;
    return fetch(CFG.supabaseUrl + '/rest/v1/' + table, {
      method: 'POST',
      headers: {
        'apikey': CFG.supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) {
        var err = new Error('HTTP ' + res.status);
        err.status = res.status;
        throw err;
      }
      return true;
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }

  function insertWithRetry(table, payload) {
    return sbInsert(table, payload).catch(function (err) {
      // Repetir uma vez em falha de rede ou erro de servidor (não em 4xx)
      if (err && err.status && err.status < 500) throw err;
      return new Promise(function (r) { setTimeout(r, 1200); }).then(function () {
        return sbInsert(table, payload);
      });
    });
  }

  /* ---------- registro de visita (painel de LPs) ---------- */
  function trackVisit() {
    if (session && session.getItem('bm_visit')) return;
    var run = function () {
      sbInsert('lp_visits', {
        site: CFG.site,
        referrer: (document.referrer || '').slice(0, 300) || null,
        path: (location.pathname + location.search).slice(0, 300)
      }, 6000).then(function () { session && session.setItem('bm_visit', '1'); }).catch(function () {});
    };
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 2500);
  }

  /* ---------- header: sombra ao rolar ---------- */
  var header = $('.site-header');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- menu mobile ---------- */
  var toggle = $('.menu-toggle');
  var menu = $('#menu');
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    $all('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('is-open') && !menu.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
  }

  /* ---------- CTAs: levam ao formulário e registram o assunto ---------- */
  var form = $('#lead-form');
  var inputNome = $('#nome');
  var inputTel = $('#whatsapp');
  var inputServico = $('#servico');

  $all('a[href="#contato"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = $('#contato');
      if (!target) return;
      e.preventDefault();
      if (a.dataset.servico && inputServico) inputServico.value = a.dataset.servico;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#contato');
      // foco no primeiro campo depois da rolagem (sem abrir teclado no meio da animação)
      setTimeout(function () { if (inputNome) inputNome.focus({ preventScroll: true }); }, reduceMotion ? 50 : 650);
    });
  });

  /* ---------- aviso de privacidade ---------- */
  $all('[data-open-privacy]').forEach(function (a) {
    a.addEventListener('click', function () {
      var d = $('#privacidade');
      if (d) d.open = true;
    });
  });

  /* ---------- botão flutuante ---------- */
  var fab = $('.fab');
  if (fab && 'IntersectionObserver' in window) {
    var heroVisible = true, contatoVisible = false;
    var update = function () { fab.classList.toggle('is-visible', !heroVisible && !contatoVisible); };
    var hero = $('.hero'), contato = $('#contato');
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === hero) heroVisible = en.isIntersecting;
        if (en.target === contato) contatoVisible = en.isIntersecting;
      });
      update();
    }, { threshold: 0.05 }).observe(hero);
    new IntersectionObserver(function (entries) {
      contatoVisible = entries[0].isIntersecting; update();
    }, { threshold: 0.15 }).observe(contato);
  } else if (fab) {
    fab.classList.add('is-visible');
  }

  /* ---------- animações de entrada ---------- */
  var reveals = $all('[data-reveal]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- ano no rodapé ---------- */
  var ano = $('#ano');
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---------- formulário ---------- */
  function onlyDigits(v) { return (v || '').replace(/\D/g, ''); }

  function formatPhone(d) {
    d = d.slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  var VALID_DDD = [11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99];

  function normalizePhone(raw) {
    var d = onlyDigits(raw);
    if (d.length === 13 && d.indexOf('55') === 0) d = d.slice(2); // colou com +55
    if (d.length === 12 && d.indexOf('0') === 0) d = d.slice(1);  // 0 + DDD
    return d;
  }

  function isValidPhone(raw) {
    var d = normalizePhone(raw);
    if (d.length !== 11) return false;                 // WhatsApp: celular com 9 dígitos
    if (VALID_DDD.indexOf(parseInt(d.slice(0, 2), 10)) === -1) return false;
    if (d.charAt(2) !== '9') return false;
    if (/^(\d)\1+$/.test(d.slice(2))) return false;     // 999999999, 000000000...
    return true;
  }

  function cleanName(v) {
    return (v || '').replace(/\s+/g, ' ').trim();
  }
  function isValidName(v) {
    var n = cleanName(v);
    if (n.length < 2 || n.length > 80) return false;
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'´`\-\. ]+$/.test(n)) return false;
    return /[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/.test(n);
  }

  function setInvalid(input, invalid) {
    input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  if (inputTel) {
    inputTel.addEventListener('input', function () {
      var pos = inputTel.selectionStart, before = inputTel.value.length;
      var d = normalizePhone(inputTel.value);
      inputTel.value = formatPhone(d);
      // mantém o cursor no fim quando digitando no fim
      if (pos !== null && pos < before) {
        try { inputTel.setSelectionRange(pos, pos); } catch (e) {}
      }
      if (inputTel.getAttribute('aria-invalid') === 'true' && isValidPhone(inputTel.value)) setInvalid(inputTel, false);
    });
    inputTel.addEventListener('blur', function () {
      if (inputTel.value) setInvalid(inputTel, !isValidPhone(inputTel.value));
    });
  }
  if (inputNome) {
    inputNome.addEventListener('input', function () {
      if (inputNome.getAttribute('aria-invalid') === 'true' && isValidName(inputNome.value)) setInvalid(inputNome, false);
    });
    inputNome.addEventListener('blur', function () {
      if (inputNome.value) setInvalid(inputNome, !isValidName(inputNome.value));
    });
  }

  var statusBox = $('#form-status');
  var btn = $('#submit-btn');
  var btnLabel = btn ? btn.querySelector('.btn__label') : null;
  var submitting = false;

  function showError(html) {
    if (!statusBox) return;
    statusBox.innerHTML = html;
    statusBox.className = 'form-status is-error';
  }
  function clearStatus() {
    if (!statusBox) return;
    statusBox.innerHTML = '';
    statusBox.className = 'form-status';
  }
  function setLoading(on) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    if (btnLabel) btnLabel.textContent = on ? 'Enviando…' : 'Conversar com um advogado';
  }

  function goToRedirect(lead) {
    if (session) session.setItem('bm_lead', JSON.stringify({ nome: lead.nome, servico: lead.servico || '', t: Date.now() }));
    location.assign(CFG.redirectPath + '?n=' + encodeURIComponent(lead.nome.split(' ')[0]));
  }

  function fireConversion(lead) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'generate_lead', lead_site: CFG.site, lead_servico: lead.servico || 'geral' });
      if (typeof window.fbq === 'function') window.fbq('track', 'Lead');
      if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead');
    } catch (e) {}
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitting) return;
      clearStatus();

      var nome = cleanName(inputNome.value);
      var tel = normalizePhone(inputTel.value);
      var okNome = isValidName(nome);
      var okTel = isValidPhone(tel);
      setInvalid(inputNome, !okNome);
      setInvalid(inputTel, !okTel);
      if (!okNome) { inputNome.focus(); return; }
      if (!okTel) { inputTel.focus(); return; }

      // Proteções contra envios automáticos/duplicados
      var hp = $('#website');
      if (hp && hp.value) return;                                       // robô preencheu o honeypot
      if (Date.now() - LOADED_AT < 2500) {                               // envio instantâneo = robô
        showError('Por favor, confira seus dados e tente novamente.');
        return;
      }

      var lead = {
        site: CFG.site,
        nome: nome,
        whatsapp: tel,
        origem: ORIGEM,
        servico: (inputServico && inputServico.value) || null
      };

      // Mesmo número enviado há menos de 15 minutos neste navegador: não duplica o lead
      var last = null;
      try { last = local && JSON.parse(local.getItem('bm_last_lead') || 'null'); } catch (err) {}
      if (last && last.w === tel && Date.now() - last.t < 15 * 60 * 1000) {
        goToRedirect(lead);
        return;
      }

      submitting = true;
      setLoading(true);

      // O redirecionamento só acontece DEPOIS de o lead ser gravado.
      insertWithRetry('lp_leads', lead).then(function () {
        if (local) local.setItem('bm_last_lead', JSON.stringify({ w: tel, t: Date.now() }));
        fireConversion(lead);
        goToRedirect(lead);
      }).catch(function () {
        submitting = false;
        setLoading(false);
        var msg = 'Olá! Meu nome é ' + nome + '. Vim pela Landing Page Trabalhista e gostaria de atendimento.';
        showError('Não conseguimos enviar seus dados agora. Verifique sua conexão e tente novamente, ou <a href="https://wa.me/' +
          CFG.whatsapp + '?text=' + encodeURIComponent(msg) + '" rel="noopener">fale direto pelo WhatsApp</a>.');
      });
    });
  }

  trackVisit();
})();
