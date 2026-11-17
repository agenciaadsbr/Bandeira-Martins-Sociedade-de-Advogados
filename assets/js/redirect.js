/* /redirect — confirmação (~3s) e abertura do WhatsApp do escritório */
(function () {
  'use strict';
  var CFG = window.LP_CONFIG || {};
  var DELAY = CFG.redirectDelayMs || 3000;

  function $(id) { return document.getElementById(id); }

  var lead = null;
  try { lead = JSON.parse(sessionStorage.getItem('bm_lead') || 'null'); } catch (e) {}
  // Lead válido por 30 min nesta aba (o envio já foi gravado no Supabase antes de chegar aqui)
  if (lead && (!lead.t || Date.now() - lead.t > 30 * 60 * 1000)) lead = null;

  if (!lead || !lead.nome) {
    $('rd-empty').hidden = false;
    return;
  }

  var primeiroNome = lead.nome.split(' ')[0];
  var msg = 'Olá! Meu nome é ' + lead.nome + '. Vim pela Landing Page Trabalhista do escritório Bandeira & Martins e gostaria de conversar sobre a minha situação.';
  if (lead.servico) msg += ' Assunto: ' + lead.servico + '.';
  var waUrl = 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(msg);

  $('rd-ok').hidden = false;
  $('rd-nome').textContent = primeiroNome ? ', ' + primeiroNome : '';
  $('rd-btn').href = waUrl;
  document.title = 'Recebemos seu contato, ' + primeiroNome + ' | Bandeira & Martins';

  var bar = $('rd-bar');
  bar.style.setProperty('--rd-ms', DELAY + 'ms');
  requestAnimationFrame(function () { bar.classList.add('is-running'); });

  var help = $('rd-help');
  var status = $('rd-status');

  setTimeout(function () {
    status.textContent = 'Abrindo o WhatsApp…';
    try { window.location.href = waUrl; } catch (e) {}

    // Se depois de alguns segundos a página continua visível, o app não abriu
    // (bloqueio do navegador, WhatsApp não instalado, navegador interno de app etc.)
    setTimeout(function () {
      if (document.visibilityState === 'visible') {
        status.textContent = 'O WhatsApp não abriu automaticamente.';
        help.classList.add('is-visible');
      }
    }, 2500);
  }, DELAY);

  // Ao voltar para a aba, exibe as opções manuais
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && bar.classList.contains('is-running')) {
      help.classList.add('is-visible');
      status.textContent = 'Se precisar, abra a conversa pelo botão abaixo.';
    }
  });

  $('rd-copy').addEventListener('click', function () {
    var btn = this;
    var done = function () { btn.textContent = 'Número copiado'; setTimeout(function () { btn.textContent = 'Copiar número'; }, 2500); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('11981716908').then(done, function () {});
    } else {
      var t = document.createElement('textarea'); t.value = '11981716908'; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(t);
    }
  });
})();
