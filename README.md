# 🌟 Marcinha VIP • Landing Page Mobile & Painel Admin

Página focada exclusivamente em experiência **mobile nativa de alta conversão**, com botão único para redirecionamento ao Telegram, foto de alta resolução da modelo de IA e um **Painel de Controle Administrativo completo** com analytics em tempo real, rastreamento de UTMs e editor visual.

---

## 📱 Recursos da Landing Page (Mobile First)

- **Design Cinematográfico:** Foto em alta resolução com vinheta de degradê que destaca o botão de ação.
- **Botão Único "Acessar agora":** Com animação contínua de pulso e efeito de brilho (*glow effect*) para maximizar o CTR (Taxa de Cliques).
- **Sensação Nativa no Celular:** Sem delay de 300ms, sem auto-zoom no Safari/Chrome, e suporte a `safe-area-inset` para iPhones com entalhe/Dynamic Island.
- **Rastreamento e Repasse Automático de UTMs:** Preserva parâmetros de campanha (`utm_source`, `utm_medium`, `utm_campaign`, etc.) direto no link de destino do Telegram para atribuição perfeita de leads nos anúncios.
- **Pixels de Tráfego:** Disparo de eventos `PageView` e `Lead`/`ClickButton` para Facebook Pixel (Meta Ads) e TikTok Pixel.

---

## ⚙️ Painel de Controle Admin (`/admin`)

- **Autenticação:** Protegido por senha (padrão: `marcinha2026`).
- **📊 Métricas & Tráfego:**
  - Visitantes Totais e Únicos.
  - Cliques no Botão e Taxa de Conversão real (CR %).
  - Detecção de Navegadores In-App (Instagram Ads, TikTok Ads, Facebook, Safari, Chrome).
  - Tabela com todas as origens de tráfego (UTMs) e conversão por campanha.
  - Localização geográfica aproximada (Cidade, UF, País).
  - Feed de acessos em tempo real com busca e botão de **Exportar CSV**.
- **🎨 Personalização & Editor Visual:**
  - **Simulador Mobile em Tempo Real:** Pré-visualize a página em uma moldura de celular enquanto faz alterações.
  - Alteração do Link de Destino do Telegram com botão de teste.
  - Upload de novas fotos ou inserção de URL externa.
  - Cores do botão: Presets prontos (Azul Telegram, Rosa Sexy, Vermelho Hot, Verde Neon, Dourado VIP, Roxo Cyber) ou seletor hexadecimal livre.
  - Textos: Altere o texto do botão, badge superior e ative/desative animações.
- **🛡️ Pixels & Configurações:**
  - Configuração de Facebook Pixel ID, TikTok Pixel ID e Google Analytics.
  - Alteração da senha de acesso ao painel.
  - Botão de limpeza de dados de teste.

---

## 🚀 Como Rodar Localmente

```bash
# 1. Instalar dependências
pnpm install
# ou: npm install

# 2. Rodar em modo de desenvolvimento
pnpm dev
# ou: npm run dev

# 3. Acessar
# Landing Page: http://localhost:3000
# Painel Admin: http://localhost:3000/admin (Senha: marcinha2026)
```

---

## ⚡ Deploy no Vercel

1. Suba este repositório no seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e clique em **"Add New Project"**.
3. Importe este repositório.
4. O framework Next.js será detectado automaticamente.
5. Clique em **"Deploy"** e pronto! Sua página estará no ar com HTTPS gratuito e CDN global ultrarrápida.
