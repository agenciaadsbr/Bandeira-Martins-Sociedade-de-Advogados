# LP Trabalhista — Bandeira & Martins Sociedade de Advogados

Site estático (HTML + CSS + JS puro, sem build, sem bibliotecas). Pronto para Vercel.

## Estrutura
```
index.html              LP (9 seções)
redirect/index.html     /redirect — confirmação (~3s) → WhatsApp
assets/css/style.css    estilos (tokens de cor/tipografia no :root)
assets/js/config.js     site, Supabase, WhatsApp, delay do redirect
assets/js/main.js       menu, CTAs, botão flutuante, formulário, visitas
assets/js/redirect.js   lógica da página /redirect
dashboard/index.html    painel de leads (login Supabase Auth)
assets/img/             fotos AVIF/WebP em 2–3 larguras, logomarca, og.jpg
assets/fonts/           Bricolage Grotesque + Geist (self-hosted)
vercel.json             cleanUrls, cache e headers de segurança
```

## Leads
- Supabase **ADS BR CLIENTES** (`qxhnjzyhtllmtdrcyygi`), tabela `lp_leads`, `site = 'bandeira-martins-trabalhista'`.
- Campos gravados: `nome`, `whatsapp` (11 dígitos, sem 55), `origem` (utm_source / medium / campaign, `google-ads` se gclid, `meta-ads` se fbclid, senão `direto`), `servico` (preenchido quando o clique vem de um card de área).
- Visitas em `lp_visits` (1 por sessão).
- O redirecionamento só acontece **depois** do INSERT confirmado (201). Em falha: 1 nova tentativa; se persistir, mensagem de erro + link direto para o WhatsApp.
- Proteções: honeypot, tempo mínimo de 2,5s, validação de DDD/celular, bloqueio de duplicado (mesmo número em 15 min no mesmo navegador).
- Conversão: `dataLayer.push({event:'generate_lead'})` e `fbq('track','Lead')` se o Pixel estiver instalado. Colar Pixel/GTM no `<head>` (há um comentário marcando o local).

## Produção
- LP: https://lp-bandeira-martins-trabalhista.vercel.app
- Painel de leads: https://lp-bandeira-martins-trabalhista.vercel.app/dashboard (usuário `Admin`; e-mail no Supabase Auth `admin@bandeira-martins.adsbr.internal`; acesso ao site via `lp_acessos`)
- GitHub: agenciaadsbr/Bandeira-Martins-Sociedade-de-Advogados (raiz do repositório)
- Vercel: projeto `lp-bandeira-martins-trabalhista` (time ADS BR), deploy automático a cada push na main

## Deploy (Vercel)
1. `vercel deploy --prod` na pasta (ou arrastar a pasta em vercel.com/new). Framework: **Other**, sem build command.
2. Após definir o domínio: preencher `<link rel="canonical">` e trocar `og:image` para URL absoluta (`https://DOMINIO/assets/img/og.jpg`).
3. Teste: enviar um lead real → conferir em `lp_leads` → apagar o registro de teste.

## Pode ser adicionado depois (opcional)
- Fotografia e nomes dos advogados (seção "Sobre")
- Endereço e e-mail (opcional, rodapé)

Fotos: Freepik (banco de imagens) e imagens geradas por IA no Freepik com pessoas fictícias (carteira de trabalho, acidente, gestante, justa causa).
