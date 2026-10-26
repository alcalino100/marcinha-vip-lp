-- ================================================================
-- TABELA DE CONFIGURAÇÃO DA LANDING PAGE
-- ================================================================
CREATE TABLE IF NOT EXISTS public.lp_config (
  id text PRIMARY KEY DEFAULT 'default',
  telegram_url text NOT NULL DEFAULT 'https://t.me/MarcinhaVip18_bot',
  forward_utms boolean NOT NULL DEFAULT true,
  photo_url text NOT NULL DEFAULT '/uploads/model-default.jpg',
  model_name text NOT NULL DEFAULT 'Marcinha',
  badge_text text NOT NULL DEFAULT 'Online agora • VIP',
  show_badge boolean NOT NULL DEFAULT true,
  button_text text NOT NULL DEFAULT 'Acessar agora',
  button_subtext text DEFAULT '',
  show_button_subtext boolean NOT NULL DEFAULT false,
  theme_preset text NOT NULL DEFAULT 'telegram-blue',
  button_bg_color text NOT NULL DEFAULT '#229ED9',
  button_text_color text NOT NULL DEFAULT '#ffffff',
  button_glow boolean NOT NULL DEFAULT true,
  admin_password text NOT NULL DEFAULT 'marcinha2026',
  facebook_pixel_id text DEFAULT '',
  google_analytics_id text DEFAULT '',
  tiktok_pixel_id text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insere linha inicial de configuração se não existir
INSERT INTO public.lp_config (id, telegram_url, photo_url, model_name, badge_text, button_text, button_bg_color, admin_password)
VALUES (
  'default',
  'https://t.me/MarcinhaVip18_bot',
  '/uploads/model-default.jpg',
  'Marcinha',
  'Online agora • VIP',
  'Acessar agora',
  '#229ED9',
  'marcinha2026'
)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- TABELA DE VISITAS & CLIQUES (DADOS REAIS DE CONVERSÃO)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.lp_visits (
  id text PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  ip text,
  country text DEFAULT 'Brasil',
  country_code text DEFAULT 'BR',
  region text,
  city text,
  device text DEFAULT 'Mobile',
  os text,
  browser text,
  is_in_app boolean DEFAULT false,
  in_app_name text,
  user_agent text,
  referrer text,
  utm_source text DEFAULT 'direto',
  utm_medium text DEFAULT 'nenhum',
  utm_campaign text DEFAULT 'geral',
  utm_content text,
  utm_term text,
  extra_params jsonb DEFAULT '{}'::jsonb,
  clicked boolean NOT NULL DEFAULT false,
  clicked_at timestamptz
);

-- Índices para relatórios rápidos e filtros de performance
CREATE INDEX IF NOT EXISTS idx_lp_visits_timestamp ON public.lp_visits (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lp_visits_utm_source ON public.lp_visits (utm_source);
CREATE INDEX IF NOT EXISTS idx_lp_visits_utm_campaign ON public.lp_visits (utm_campaign);
CREATE INDEX IF NOT EXISTS idx_lp_visits_clicked ON public.lp_visits (clicked);
CREATE INDEX IF NOT EXISTS idx_lp_visits_device ON public.lp_visits (device);

-- ================================================================
-- PERMISSÕES ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE public.lp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lp_visits ENABLE ROW LEVEL SECURITY;

-- Permite leitura pública da config
CREATE POLICY "Leitura pública de lp_config"
  ON public.lp_config FOR SELECT
  USING (true);

-- Permite gravação pública de visitas (para o rastreamento funcionar)
CREATE POLICY "Inserção pública de visitas"
  ON public.lp_visits FOR INSERT
  WITH CHECK (true);

-- Permite atualização do clique na visita
CREATE POLICY "Atualização pública de clique"
  ON public.lp_visits FOR UPDATE
  USING (true);

-- Permite leitura de visitas (para o admin autenticado com service role)
CREATE POLICY "Acesso total service role em visitas"
  ON public.lp_visits FOR ALL
  USING (true);

-- ================================================================
-- STORAGE BUCKET PARA FOTOS DA MODELO
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('marcinha-media', 'marcinha-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Permissão de leitura pública no bucket
CREATE POLICY "Objetos públicos em marcinha-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marcinha-media');

-- Permissão de inserção no bucket
CREATE POLICY "Upload permitido em marcinha-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marcinha-media');
