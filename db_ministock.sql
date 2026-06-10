SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';
SET default_table_access_method = heap;

-- ====================================================
-- TABEL MASTER: CATEGORIES (Ditambahkan untuk sistem kategori)
-- ====================================================
CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

ALTER TABLE public.categories OWNER TO postgres;

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;
ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;
ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


-- ====================================================
-- TABEL MASTER: PRODUCTS (Sesuai file bawaan + kolom category_id)
-- ====================================================
CREATE TABLE public.products (
    id integer NOT NULL,
    sku character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0,
    min_stock integer DEFAULT 5,
    category_id integer, -- Hubungan ke tabel categories
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

ALTER TABLE public.products OWNER TO postgres;

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.products_id_seq OWNER TO postgres;
ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);

COPY public.products (id, sku, name, price, stock, min_stock, created_at, updated_at) FROM stdin;
\.

SELECT pg_catalog.setval('public.products_id_seq', 4, true);
SELECT pg_catalog.setval('public.categories_id_seq', 1, false);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

-- Semua constraint bawaan dari file db_ministock.sql Anda
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key1 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key10 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key11 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key12 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key13 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key14 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key15 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key16 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key17 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key18 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key19 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key2 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key20 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key21 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key22 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key23 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key24 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key25 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key26 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key27 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key28 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key29 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key3 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key30 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key31 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key32 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key4 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key5 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key6 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key7 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key8 UNIQUE (sku);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_key9 UNIQUE (sku);

-- KUNCI RELASI (Foreign Key) antara Produk dan Kategori
ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_product_category 
    FOREIGN KEY (category_id) REFERENCES public.categories(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;