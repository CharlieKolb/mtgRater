CREATE TABLE IF NOT EXISTS public.ratings
(
    collection_id character varying(10) COLLATE pg_catalog."default" NOT NULL,
    card_name character varying(100) NOT NULL,
    rated_1 integer NOT NULL default 0,
    rated_2 integer NOT NULL default 0,
    rated_3 integer NOT NULL default 0,
    rated_4 integer NOT NULL default 0,
    rated_5 integer NOT NULL default 0,
    CONSTRAINT ratings_pkey PRIMARY KEY (collection_id, card_name)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.ratings
    OWNER to postgres;