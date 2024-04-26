CREATE TABLE IF NOT EXISTS public.ratings
(
    collection_id character varying(16) COLLATE pg_catalog."default" NOT NULL,
    set_id character varying(6) NOT NULL,
    card_code character varying(6) NOT NULL,
    rated_1 integer NOT NULL default 0,
    rated_2 integer NOT NULL default 0,
    rated_3 integer NOT NULL default 0,
    rated_4 integer NOT NULL default 0,
    rated_5 integer NOT NULL default 0,
    CONSTRAINT ratings_pkey PRIMARY KEY (collection_id, set_id, card_code)
)
