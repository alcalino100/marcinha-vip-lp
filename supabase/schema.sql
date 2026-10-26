-- ================================================================
-- TABELA DE CONFIGURAÇÃO DA LANDING PAGE
-- ================================================================
CREATE TABLE IF NOT EXISTS public.lp_config (
  id text PRIMARY KEY DEFAULT 'default',
  telegram_url text NOT NULL DEFAULT 'https://t.me/MarcinhaVip18_bot',
  forward_utms boolean NOT NULL DEFAULT true,
  photo_url text NOT NULL DEFAULT '/uploads/model-default.jpg',
  saved_photos jsonb DEFAULT '["/uploads/model-default.jpg"]'::jsonb,
  model_name text NOT NULL DEFAULT 'Marcinha',
  badge_text text NOT NULL DEFAULT 'Online agora • VIP',
  show_badge boolean NOT NULL DEFAULT true,
  hook_headline text DEFAULT 'Conteúdo exclusivo liberado no Telegram',
  show_hook_headline boolean NOT NULL DEFAULT false,
  urgency_badge text DEFAULT '🔥 142 pessoas online agora',
  show_urgency_badge boolean NOT NULL DEFAULT false,
  button_text text NOT NULL DEFAULT 'Acessar agora',
  button_subtext text DEFAULT '',
  show_button_subtext boolean NOT NULL DEFAULT false,
  cta_icon text NOT NULL DEFAULT 'telegram',
  theme_preset text NOT NULL DEFAULT 'telegram-blue',
  button_bg_color text NOT NULL DEFAULT '#229ED9',
  button_text_color text NOT NULL DEFAULT '#ffffff',
  button_glow boolean NOT NULL DEFAULT true,
  overlay_style text NOT NULL DEFAULT 'cinematic',
  footer_disclaimer text DEFAULT 'Acesso 100% seguro e anônimo • +18',
  show_footer_disclaimer boolean NOT NULL DEFAULT true,
  admin_password text NOT NULL DEFAULT 'marcinha2026',
  facebook_pixel_id text DEFAULT '',
  google_analytics_id text DEFAULT '',
  tiktok_pixel_id text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Adiciona novas colunas caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.lp_config ADD COLUMN IF NOT EXISTS saved_photos jsonb DEFAULT '["/uploads/model-default.jpg"]'::jsonb;
ALTER TABLE public.lp_config ADD COLUMN IF NOT EXISTS hook_headline text DEFAULT 'Conteúdo exclusivo liberado no Telegram';
ALTER TABLE public.lp_config ADD COLUMN IF NOT EXISTS show_hook_headline boolean DEFAULT false;
ALTER TABLE public.lp_config ADD COLUMN IF NOT EXISTS urgency_badge text DEFAULT '🔥 142 pessoas online agora';
ALTER TABLE public.lp_config ADD COLUMN IF NOT EXISTS show_urgency_badge boolean DEFAULT false;
ALTER TABLE public.lp_config ADD COLUMN IF NOT EXISTS cta_icon text DEFAULT 'telegram';
ALTER TABLE public.lp_config ADD COLUMN IF NOT EXISTS overlay_style text DEFAULT 'cinematic';
ALTER TABLE public.lp_config ADD COLUMN IF NOT EXISTS footer_disclaimer text DEFAULT 'Acesso 100% seguro e anônimo • +18';
ALTER TABLE public.lp_config ADD COLUMN IF NOT EXISTS show_footer_disclaimer boolean DEFAULT true;

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
CREATE INDEX IF NOT EXISTS idx_lp_visits_region ON public.lp_visits (region);

-- ================================================================
-- PERMISSÕES TOTALMENTE LIBERADAS (RLS TOTAL PARA CLIENTE E ADMIN)
-- ================================================================
ALTER TABLE public.lp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lp_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total lp_config" ON public.lp_config;
DROP POLICY IF EXISTS "Acesso total lp_visits" ON public.lp_visits;

CREATE POLICY "Acesso total lp_config"
  ON public.lp_config FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Acesso total lp_visits"
  ON public.lp_visits FOR ALL
  USING (true)
  WITH CHECK (true);

-- ================================================================
-- TABELA DE VENDAS & WEBHOOKS (FIREBOT / PIX GERADO & PAGO)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.lp_orders (
  id text PRIMARY KEY,
  platform text NOT NULL DEFAULT 'firebot',
  event text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'paid', 'pending', 'expired', 'refunded'
  amount numeric(10,2) NOT NULL DEFAULT 0.00,
  customer_name text DEFAULT '',
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  telegram_id text DEFAULT '',
  telegram_username text DEFAULT '',
  product_name text DEFAULT 'Acesso VIP',
  utm_source text DEFAULT 'direto',
  utm_medium text DEFAULT 'nenhum',
  utm_campaign text DEFAULT 'geral',
  utm_content text DEFAULT '',
  utm_term text DEFAULT '',
  src text DEFAULT '',
  sck text DEFAULT '',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta de vendas
CREATE INDEX IF NOT EXISTS idx_lp_orders_status ON public.lp_orders (status);
CREATE INDEX IF NOT EXISTS idx_lp_orders_event ON public.lp_orders (event);
CREATE INDEX IF NOT EXISTS idx_lp_orders_created_at ON public.lp_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lp_orders_utm_source ON public.lp_orders (utm_source);
CREATE INDEX IF NOT EXISTS idx_lp_orders_telegram_id ON public.lp_orders (telegram_id);

ALTER TABLE public.lp_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total lp_orders" ON public.lp_orders;
CREATE POLICY "Acesso total lp_orders"
  ON public.lp_orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- ================================================================
-- STORAGE BUCKET PARA FOTOS DA MODELO
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('marcinha-media', 'marcinha-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Acesso total marcinha-media" ON storage.objects;

CREATE POLICY "Acesso total marcinha-media"
  ON storage.objects FOR ALL
  USING (bucket_id = 'marcinha-media')
  WITH CHECK (bucket_id = 'marcinha-media');
