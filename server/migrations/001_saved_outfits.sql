-- Saved outfits are a separate, user-owned collection of existing wardrobe items.
-- This is necessary because the project has no persisted outfits table or save API.
CREATE TABLE IF NOT EXISTS public.lookia_outfits (
  id_outfit BIGSERIAL PRIMARY KEY,
  id_users BIGINT NOT NULL REFERENCES public.users (id_users) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  style VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lookia_outfit_prendas (
  id_outfit BIGINT NOT NULL REFERENCES public.lookia_outfits (id_outfit) ON DELETE CASCADE,
  id_prendas BIGINT NOT NULL REFERENCES public.prendas (id_prendas) ON DELETE CASCADE,
  PRIMARY KEY (id_outfit, id_prendas)
);

CREATE INDEX IF NOT EXISTS lookia_outfits_user_created_idx
  ON public.lookia_outfits (id_users, created_at DESC);
