CREATE TABLE IF NOT EXISTS public.cards
(
    set_id character varying(6) NOT NULL,
    card_code character varying(6) NOT NULL,
    card_name character varying(126),
    CONSTRAINT cards_pkey PRIMARY KEY (set_id, card_code)
)
