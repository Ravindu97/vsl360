--
-- PostgreSQL database dump
--

\restrict gkbUqHFraL1ozeumBpVZZ9eL4VwSGF7gFp9uqlkYMaIWIwkLqxGxkdRmkUZf4ka

-- Dumped from database version 15.17 (Homebrew)
-- Dumped by pg_dump version 15.17 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'INQUIRY_RECEIVED',
    'CLIENT_PROFILE_CREATED',
    'PAX_DETAILS_ADDED',
    'COSTING_COMPLETED',
    'SALES_CONFIRMED',
    'RESERVATION_PENDING',
    'RESERVATION_COMPLETED',
    'TRANSPORT_PENDING',
    'TRANSPORT_COMPLETED',
    'DOCUMENTS_READY',
    'OPS_APPROVED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: CurrencyCode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CurrencyCode" AS ENUM (
    'EUR',
    'USD',
    'INR'
);


--
-- Name: DocumentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocumentType" AS ENUM (
    'INVOICE',
    'TRANSPORT_DETAILS',
    'HOTEL_RESERVATION',
    'FULL_ITINERARY',
    'TRAVEL_CONFIRMATION'
);


--
-- Name: PaxType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaxType" AS ENUM (
    'ADULT',
    'CHILD',
    'INFANT'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'SALES',
    'RESERVATION',
    'TRANSPORT',
    'OPS_MANAGER'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Attachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Attachment" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "fileName" text NOT NULL,
    "fileType" text NOT NULL,
    "filePath" text NOT NULL,
    "fileSize" integer NOT NULL,
    "uploadedBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Booking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Booking" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    status public."BookingStatus" DEFAULT 'INQUIRY_RECEIVED'::public."BookingStatus" NOT NULL,
    "numberOfDays" integer NOT NULL,
    "arrivalDate" timestamp(3) without time zone NOT NULL,
    "arrivalTime" text NOT NULL,
    "departureDate" timestamp(3) without time zone NOT NULL,
    "departureTime" text NOT NULL,
    "additionalActivities" text,
    "specialCelebrations" text,
    "generalNotes" text,
    "salesOwnerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Client" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    name text NOT NULL,
    citizenship text NOT NULL,
    email text NOT NULL,
    "contactNumber" text NOT NULL,
    "passportCopy" text,
    "flightTicket" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "languagePreference" text DEFAULT 'English'::text NOT NULL,
    "preferredCurrency" public."CurrencyCode" DEFAULT 'USD'::public."CurrencyCode" NOT NULL
);


--
-- Name: GeneratedDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GeneratedDocument" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    type public."DocumentType" NOT NULL,
    "filePath" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "generatedBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: HotelBooking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HotelBooking" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "nightNumber" integer NOT NULL,
    "hotelName" text NOT NULL,
    "roomCategory" text NOT NULL,
    "numberOfRooms" integer NOT NULL,
    "roomPreference" text,
    "mealPlan" text NOT NULL,
    "mealPreference" text,
    "mobilityNotes" text,
    "confirmationStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "reservationNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "invoiceDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "costPerPerson" numeric(10,2) NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    "advancePaid" numeric(10,2) DEFAULT 0 NOT NULL,
    "balanceAmount" numeric(10,2) NOT NULL,
    "paymentNotes" text,
    "paymentInstructions" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tourInclusions" text
);


--
-- Name: Pax; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Pax" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    name text NOT NULL,
    relationship text,
    type public."PaxType" NOT NULL,
    age integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StatusHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StatusHistory" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "fromStatus" public."BookingStatus",
    "toStatus" public."BookingStatus" NOT NULL,
    "changedBy" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TransportDayPlan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TransportDayPlan" (
    id text NOT NULL,
    "transportPlanId" text NOT NULL,
    "dayNumber" integer NOT NULL,
    description text NOT NULL,
    "pickupTime" text,
    "pickupLocation" text,
    "dropLocation" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TransportPlan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TransportPlan" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "vehicleModel" text NOT NULL,
    "vehicleNotes" text,
    "babySeatRequired" boolean DEFAULT false NOT NULL,
    "driverName" text,
    "driverLanguage" text NOT NULL,
    "arrivalPickupLocation" text,
    "arrivalPickupTime" text,
    "arrivalPickupNotes" text,
    "departureDropLocation" text,
    "departureDropTime" text,
    "departureDropNotes" text,
    "internalNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "vehicleIdNumber" text,
    "wheelchairRequired" boolean DEFAULT false NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role public."Role" DEFAULT 'SALES'::public."Role" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: destination_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.destination_activities (
    id text NOT NULL,
    destination_id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    is_seasonal boolean DEFAULT false NOT NULL,
    sort_order integer NOT NULL,
    source_row integer
);


--
-- Name: destinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.destinations (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer NOT NULL
);


--
-- Data for Name: Attachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Attachment" (id, "bookingId", "fileName", "fileType", "filePath", "fileSize", "uploadedBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Booking" (id, "bookingId", status, "numberOfDays", "arrivalDate", "arrivalTime", "departureDate", "departureTime", "additionalActivities", "specialCelebrations", "generalNotes", "salesOwnerId", "createdAt", "updatedAt") FROM stdin;
6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	VSL260330-001	COMPLETED	4	2026-03-11 00:00:00	00:06	2026-03-13 00:00:00	12:06				964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-30 06:37:05.422	2026-03-30 06:55:51.149
8c76e13b-0835-4d6c-9d2d-c254b16c4aef	VSL2026007	OPS_APPROVED	4	2026-03-11 00:00:00	03:10	2026-03-15 00:00:00	15:10	Pick flowers from flora	Celebrating his birthday	Make sure to be on time	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 09:41:36.502	2026-03-29 09:46:51.165
57574616-6aab-410e-bf4a-3d97fa74c297	VSL260410-001	COMPLETED	4	2026-03-11 00:00:00	08:42	2026-03-13 00:00:00	20:42				964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-10 03:12:39.614	2026-04-10 03:24:03.627
12f02bc8-5687-45a4-a478-4d36ba87b457	VSL2026005	COMPLETED	5	2026-03-11 00:00:00	00:34	2026-03-15 00:00:00	12:34				964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 07:04:32.622	2026-03-18 07:13:39.804
3954c643-53f0-4e7d-b5ff-96c0837f647f	VSL2026008	COMPLETED	3	2026-03-11 00:00:00	04:42	2026-03-13 00:00:00	16:42				964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 11:13:03.612	2026-03-29 11:25:23.106
031fab34-96e1-4b84-aca3-0711782d6ce9	VSL2026004	COMPLETED	5	2026-03-13 00:00:00	11:35	2026-03-15 00:00:00	23:35				964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 06:05:44.625	2026-03-30 06:30:36.613
4777ce53-9d80-4700-9b30-6a5d357a7be3	VSL2026001	RESERVATION_COMPLETED	2	2026-03-21 00:00:00	00:54	2026-03-13 00:00:00	13:54	safari tour	birthday celebration	have to pick from air port	81eaa75b-539a-4b7b-a44c-c1139fa0b593	2026-03-11 05:24:59.262	2026-03-30 06:33:41.989
9f1a2892-65ef-4332-92c8-72841c76e9d6	VSL2026006	TRANSPORT_PENDING	5	2026-03-11 00:00:00	10:51	2026-03-15 00:00:00	22:51	safari tour	Birthday Celebration		964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-21 05:22:07.036	2026-03-21 05:27:25.052
\.


--
-- Data for Name: Client; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Client" (id, "bookingId", name, citizenship, email, "contactNumber", "passportCopy", "flightTicket", "createdAt", "updatedAt", "languagePreference", "preferredCurrency") FROM stdin;
3332c196-14d3-46c5-9cc3-5dcc09a11029	4777ce53-9d80-4700-9b30-6a5d357a7be3	vinura	german	vinura@gmail.com	767322489	\N	\N	2026-03-11 05:24:59.262	2026-03-11 05:24:59.262	English	USD
18078dfa-58e0-474d-9bf6-7c1bf65fb7fe	3954c643-53f0-4e7d-b5ff-96c0837f647f	aswhun	american	aswhin@gmail.com	0768965457	\N	\N	2026-03-29 11:13:03.612	2026-03-29 11:13:03.612	English	USD
e9ad803f-417a-44e2-b11b-b080b3865095	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	ashan	swedish	aswhin@gmail.com	0768965457	\N	\N	2026-03-29 09:41:36.502	2026-03-29 11:38:55.528	English	USD
72772cb7-b76d-409b-a5f7-3f60ff657d32	9f1a2892-65ef-4332-92c8-72841c76e9d6	pasindu	indian	aswhin@gmail.com	0768965457	\N	\N	2026-03-21 05:22:07.036	2026-03-30 06:29:27.475	English	USD
9da5da6a-ab7f-4d01-b25e-efb6997391d4	12f02bc8-5687-45a4-a478-4d36ba87b457	sadun	indian	aswhin@gmail.com	0768965457	\N	\N	2026-03-18 07:04:32.622	2026-03-30 06:29:41.731	English	USD
80ea9427-6f21-4162-a845-da6001c6796b	031fab34-96e1-4b84-aca3-0711782d6ce9	herath	indian	aswhin@gmail.com	0768965457	\N	\N	2026-03-18 06:05:44.625	2026-03-30 06:29:56.003	English	USD
c955e2ad-c98f-488d-8903-03aafce46a95	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	nemal	american	aswhin@gmail.com	0768965457	\N	\N	2026-03-30 06:37:05.422	2026-04-05 04:32:53.242	English	EUR
16ea9cfd-cc95-4677-8741-c6e5c938d4f9	57574616-6aab-410e-bf4a-3d97fa74c297	nemal	american	aswhin@gmail.com	0768965457	\N	\N	2026-04-10 03:12:39.614	2026-04-10 03:18:35.281	English	USD
\.


--
-- Data for Name: GeneratedDocument; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GeneratedDocument" (id, "bookingId", type, "filePath", version, "generatedBy", "createdAt") FROM stdin;
d7b4a6bf-ae05-4075-9d22-785a728d318e	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_58cb6b32.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-11 05:57:27.835
312aa30f-53cc-4dde-90b7-c9e1e2ce0b24	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_bc000c91.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-11 05:57:34.645
d9c1ef09-4f08-4b88-9ee5-9d9125501d18	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_9c160926.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-11 07:28:58.881
fad1ae2d-0b0b-4706-9f34-4e7d8c45626f	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_ed8ec0fe.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-11 07:38:51.47
6592332a-fa18-4af8-8a36-41b13a07fff6	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_a845ff3c.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-11 07:39:16.125
39d240f6-ae1a-41fd-8cc7-7a58d1d28012	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_d1b858ff.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-11 07:40:12.476
dfb39650-5c4b-4b58-8318-485bdb7af30f	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_89c38885.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-11 07:40:34.519
e5e57faf-d114-40ee-8c21-f4af64c7de75	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_6d99de89.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-11 07:40:50.334
171ffb8c-001a-48b7-ad09-1a7039cbd8c5	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_79bbbd44.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-11 07:41:26.701
c77c1122-19d8-4821-9c55-b0b194cbc984	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_ea6f3b1e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 04:51:50.346
509ad63b-0221-4308-8aeb-cf151460eb57	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_c9be13a8.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 04:55:44.576
4b4df058-ecf1-4698-a008-48587abde45d	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_116c447c.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 04:56:35.252
9448f623-2845-4b88-a115-eb5f3b568c47	4777ce53-9d80-4700-9b30-6a5d357a7be3	HOTEL_RESERVATION	uploads/documents/reservation_VSL2026001_aef7a3b4.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 04:56:54.038
fc456368-58c2-445b-9080-657c8c19591e	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_80cc21c7.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:17:03.207
4fd5dffd-dad4-445c-9489-c748f8d30d60	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_fa0b803e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:18:32.734
9dc3593a-dc47-46af-924a-876ee316ba06	4777ce53-9d80-4700-9b30-6a5d357a7be3	HOTEL_RESERVATION	uploads/documents/reservation_VSL2026001_918a8ed2.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:19:06.083
05faf634-e37d-4227-b019-f7372eaa3734	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_f5abf49f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:19:19.469
c839aa5f-d81b-47d2-8956-c75365e40645	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_87b16ba7.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:20:15.386
07e57818-1432-4308-9a06-5ae03a22a709	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_af32a6c1.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:24:54.599
287ed7d9-72c8-45ad-9565-d31840b8fc74	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_390f085a.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:27:08.593
cfd14423-8d3f-465c-852c-4d9750f779a4	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_cf979cc8.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:34:38.236
7b83d98e-0736-460d-9121-d2f22023fc94	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_f64bc95d.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:39:16.667
c381dcd1-6af6-48b6-bdef-7e5d87e2734f	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_8b1815a1.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:42:50.246
630e0b92-441b-4915-9893-2442e0bff436	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_47feb972.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:45:58.099
ed9048d8-6741-40ee-bd6b-0058699c2511	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_7688861b.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 05:48:02.437
151e8898-5a78-4c31-971c-e1d2fcc8347f	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_038343de.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:04:45.544
4fb7455c-91d1-4b18-b709-ab40e854a672	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_9237c19b.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:04:50.682
a9c39a95-7b7e-4752-acd7-f84ea4db5095	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_0d84bc4b.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:05:36.978
3597e9d1-587d-4319-8916-2003add12c33	4777ce53-9d80-4700-9b30-6a5d357a7be3	HOTEL_RESERVATION	uploads/documents/reservation_VSL2026001_592d1556.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:07:00.785
d2d5f4a4-93e4-4430-92ad-2a50e656c053	4777ce53-9d80-4700-9b30-6a5d357a7be3	HOTEL_RESERVATION	uploads/documents/reservation_VSL2026001_a8624bbb.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:10:21.089
8d9ea4e1-63bf-4335-9fce-4700b2434bd7	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_78cb2fa8.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:12:04.985
731ab9a9-ae62-4387-ab18-6ab5cd663c11	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_889a0910.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:16:49.213
622dd989-cc08-4376-8032-057e2d37696f	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_98c7ca03.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:17:21.632
33dbaa9e-7746-4c2c-b48a-005250036ee3	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_54bd1f01.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:17:48.877
e2609b87-c5af-4c02-ba5a-e5d8a56e5c82	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_ef9658a8.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:21:45.409
5a3634df-26de-49ca-b538-638369bacf67	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_f8029b26.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:23:50.863
3de013d7-18fa-4329-96e8-d12e9b415a0b	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_0a1c3d15.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:25:18.802
0c0894dc-2e82-4b46-b4e7-8287f3f78715	4777ce53-9d80-4700-9b30-6a5d357a7be3	HOTEL_RESERVATION	uploads/documents/reservation_VSL2026001_9c69080d.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:25:31.821
436547cc-4fdd-48d1-b56f-4d1078b364e0	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_094dc4dc.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:25:44.087
ac36bf2d-cac6-49d2-8498-f6080daf2003	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_8c0fe7f5.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:27:31.504
b97e714a-0ed5-408b-93b4-9978c508c5dc	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_e0edb60e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:30:49.389
60206ed2-ea9a-4bda-a2fe-ffc0824e1235	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_c7a47831.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:31:36.605
24b1158f-69c6-4d58-9952-fe7e0d439e16	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_9173ff84.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:32:22.42
4993438b-0b94-4bd0-929d-2800a7161810	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_d7871c94.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:32:26.178
3cda3774-f456-44be-9f64-8de217f5b506	4777ce53-9d80-4700-9b30-6a5d357a7be3	HOTEL_RESERVATION	uploads/documents/reservation_VSL2026001_cc586051.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:32:28.369
17b7c376-45ce-4d55-b5a0-f44673696d04	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_44241b06.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 06:32:30.562
bf03e9e7-608b-433b-b4a3-6da97e4944ee	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_4298b9de.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 07:14:13.319
42a1cf8b-e1c8-4cdf-b9a2-d7b3f5e327d2	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_1eecc47e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 07:14:28.294
30037afe-59b8-44b8-bdb8-cdb12a350496	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_d241bfe6.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-13 07:14:56.792
582de0f0-54d4-487c-a2e3-747a4d53f179	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_3166ce07.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-17 04:48:56.364
831e5f88-6da1-4fc5-8b11-1359504450dd	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_dbb85a2e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-17 04:49:24.789
a287698c-7eb9-49a6-8f5a-19fd132ca41e	4777ce53-9d80-4700-9b30-6a5d357a7be3	HOTEL_RESERVATION	uploads/documents/reservation_VSL2026001_eccd6d6e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-17 04:50:14.941
fdbf56a5-a4d3-402c-9088-1ca20d90697c	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_aa18ecfb.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-17 04:50:51.97
c8aad4dd-aff9-4de8-bf20-b8a8547b8fda	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_71931520.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 03:14:53.519
577eca19-8828-4575-8488-dfd3187d9c64	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_0c6a92c7.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 03:22:40.248
d27a2390-6019-4797-9193-3879e14d0aa2	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_38be4948.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 03:53:57.514
73b27dc8-dfc5-43a2-8a6b-88db0685723c	4777ce53-9d80-4700-9b30-6a5d357a7be3	HOTEL_RESERVATION	uploads/documents/reservation_VSL2026001_5ba48838.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 03:54:59.023
daf71db8-b361-4d34-ab62-fd347ceca533	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_0c4ba20e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 03:56:34.754
efbe0114-eef3-44c0-9c51-52e4cc40b3d7	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_89515360.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 03:59:00.968
b8822b37-3d89-4e59-996d-4b99fb01b525	031fab34-96e1-4b84-aca3-0711782d6ce9	FULL_ITINERARY	uploads/documents/itinerary_VSL2026004_ecdc1a5f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 06:08:08.048
77919d47-e0c7-4ad5-8ff6-c03f66891b1b	12f02bc8-5687-45a4-a478-4d36ba87b457	INVOICE	uploads/documents/invoice_VSL2026005_24da9857.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 07:11:04.109
944cb69e-ccc7-43a0-89b5-8698520af2a5	12f02bc8-5687-45a4-a478-4d36ba87b457	FULL_ITINERARY	uploads/documents/itinerary_VSL2026005_a1b429de.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 07:11:17.218
217a2b04-6ba4-48cb-9fd6-bff81a3a1b9d	12f02bc8-5687-45a4-a478-4d36ba87b457	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026005_6b378ba4.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-18 07:15:32.703
2aa1dfeb-f126-4d23-aab7-1861d645a318	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_99174d2f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-21 05:32:36.002
aed681de-f906-4f41-903f-96c237ffaf6e	4777ce53-9d80-4700-9b30-6a5d357a7be3	FULL_ITINERARY	uploads/documents/itinerary_VSL2026001_dc6d6f8b.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-21 05:34:00.986
855cb637-9897-4f13-9c46-8c438aecc1ee	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_3817750b.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-23 13:56:06.965
6d8efd56-eb4c-40be-9af4-573839ec8732	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_e7d86a5d.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-23 14:03:15.429
1c19e09b-5b3f-4a58-b617-b598c310bc5d	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_723934e1.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-23 14:13:28.297
cc8e90a4-39b4-4f73-829f-bd61e28fcc65	4777ce53-9d80-4700-9b30-6a5d357a7be3	INVOICE	uploads/documents/invoice_VSL2026001_5ca22600.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-23 14:16:51.619
14d828bb-ee00-4ba5-8e27-d39bb2b59510	031fab34-96e1-4b84-aca3-0711782d6ce9	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026004_57ae02ff.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-24 17:47:11.427
8af66174-1bbe-4beb-9f1d-af8717d64bf6	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	INVOICE	uploads/documents/invoice_VSL2026007_dc8d6159.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 09:48:23.437
932246f1-3747-4528-98fe-614288293085	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_c4c999c4.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 09:48:44.141
1e2b611a-0ca1-44e8-a9e1-696a6b359724	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_20a82693.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 09:52:42.229
618a8816-1728-45b5-8685-be4e42584528	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_af76bddf.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 09:54:44.704
c0ca1e14-f1f8-42e7-9ded-55dde1504863	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_568fb676.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 09:57:14.205
82b2205c-3d43-4f7b-9d51-7a7a02954f41	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_5330443e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:00:54.892
c59861a2-c049-42f5-8819-991983679d82	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	INVOICE	uploads/documents/invoice_VSL2026007_11449a75.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:03:00.466
29fee419-4f41-4fe0-bacb-2b502b782ceb	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_77312516.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:16:26.28
6a436a90-7092-43aa-9f4f-df01f02fb39c	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_8cd6b333.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:17:21.922
018ecaf2-d009-45e4-9ece-e2c8dbe22d50	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	INVOICE	uploads/documents/invoice_VSL2026007_4a84ec69.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:18:08.489
cb432740-597d-4aeb-8d2f-16c55543fead	4777ce53-9d80-4700-9b30-6a5d357a7be3	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026001_9147b0b3.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:20:27.522
847fd09f-76c7-4e3e-b599-98855d64c569	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026007_0ff7369a.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:21:07.614
dddc0e56-61cc-4001-af86-7f8f9699b781	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026007_8e8de17d.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:33:03.905
9b699904-f1bb-4d71-9a31-b3d36f2be06e	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_8f725a2d.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:33:46.71
bafa01d1-c67a-4ae1-9395-62ff7bbb0da4	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_eb3fabf0.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:38:16.386
51a40143-d387-46bc-a5bb-3db6db4e125e	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_9ac203e2.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:43:04.257
076dec51-929c-4023-9d38-7955b0cb8336	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_d533d7f0.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:46:03.899
ef0ce4e5-0f60-4f7e-88f6-01f5caecedc0	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026007_d5833cf2.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:47:43.629
04884562-c391-4650-89f2-bff6d9b00010	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	INVOICE	uploads/documents/invoice_VSL2026007_20655f4d.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:58:58.982
fdb64b99-b398-4605-97e6-35f909db39ab	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026007_2e964dbf.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:59:39.687
15d536fa-e9d5-443f-a4b1-a9901022bf3f	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRANSPORT_DETAILS	uploads/documents/transport_VSL2026007_489ea1d3.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 10:59:47.811
4d45c9fe-ba8f-4151-bae1-4ebb596c69b5	3954c643-53f0-4e7d-b5ff-96c0837f647f	INVOICE	uploads/documents/invoice_VSL2026008_723c1596.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 11:25:27.064
a4485edb-0b6b-47c1-a7e0-376fb89a9dac	3954c643-53f0-4e7d-b5ff-96c0837f647f	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL2026008_2f490c88.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-29 11:26:04.003
ca75d600-bfe5-4a96-8191-8a25d972cfdc	3954c643-53f0-4e7d-b5ff-96c0837f647f	INVOICE	uploads/documents/invoice_VSL2026008_247fc919.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-30 06:28:01.789
e39b45da-d2dc-4c84-bb44-b124602f9af8	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_4ccd47de.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-30 06:44:09.821
e733dc33-22a1-4bf9-9c5b-270b08ffd945	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL260330-001_f8386bfc.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-30 06:49:16.385
79180bfb-cfef-496d-92e3-913142bd4733	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRANSPORT_DETAILS	uploads/documents/transport_VSL260330-001_21dd7dd1.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-30 06:53:16.447
329a9d8f-3d8e-4db2-b286-fef4be99f776	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRANSPORT_DETAILS	uploads/documents/transport_VSL260330-001_300a2b7f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-30 06:55:28.023
6e6f4a89-05e8-4ee7-8421-f5f241562407	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_cc4a2d76.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-03-30 06:56:08.639
ec3cc1d5-3e5b-42cd-bdec-2afabd42b347	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_be06b4ce.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 04:17:28.66
7f2cab57-f38f-4fec-8cfc-d07b822fffd2	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_66d57ced.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 04:18:22.086
0a8cd807-0962-4560-9a12-180061979c80	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_a0f5f901.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 04:19:28.306
d40b0004-3397-46da-9517-7f032f5c8f92	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_5bb4d30f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 04:33:01.853
74f92187-5c39-41ea-9980-fb453e2ebd92	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_c24135d0.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 04:34:39.794
902ebba2-592c-448a-a276-c1fe49993703	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_0241872d.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 04:36:27.68
5465a4c7-2bcb-47b2-b426-0bfa8028b5f8	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_2931fc9d.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:06:39.315
25e9fc8c-727a-41cf-a27e-dcb309ac46b5	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_86f40a32.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:11:14.148
6e0ae4d6-a1b8-4c19-84f5-87f97ceffda7	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_b96b34de.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:11:33.008
9db609bf-773d-4f71-856b-03f4bf60c6f0	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_8d5d95a5.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:17:00.519
acf0a923-a6e9-408a-a2d6-e362da6c7cb3	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_faeff21a.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:24:01.904
64f53fc4-67f5-4ee3-a2bd-9dee488dac8e	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_0830c70c.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:31:34.33
ca42b1a1-5864-4468-ac92-71c0f7ff8bf7	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_dfdbc625.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:36:03.066
66ab1e33-2deb-4dde-9987-a072a2b0f9c6	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_99a09260.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:36:09.526
6d90c2b2-582a-44aa-a806-848cfba647ad	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_8d18e76b.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:36:16.464
c18403d6-4410-48cf-83ab-732cde61db58	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_7aa62c10.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:44:27.715
956b7800-82e2-4193-b329-0a2d2c3a3bea	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_a9a767db.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:44:34.497
6c0341d7-5bbb-426c-a11a-71bbd48a6d73	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_4df62c50.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:44:40.358
9a95c2b4-4c8f-4ef5-b970-29c179241b55	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRANSPORT_DETAILS	uploads/documents/transport_VSL260330-001_e0e71dfc.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:45:24.477
642073ce-adaa-44b1-9639-97be1e8fad1a	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRANSPORT_DETAILS	uploads/documents/transport_VSL260330-001_304d2bec.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:45:46.359
09871c76-627b-49d1-aed4-af3249aea8a0	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_749792bf.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:45:59.069
6e6d2c8f-0ea3-4e80-bf4b-1a2d8a258aae	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_b4d169ac.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:46:50.302
a1083d06-1224-4783-becd-6b7a9b0927aa	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_07b6a326.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:54:30.653
b201d3b9-5dd3-43f5-919b-d73cfe215ab3	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_6c3e150e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:54:53.031
eba6160c-8dd6-4100-99a1-68c85a355976	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_f34f85ee.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:56:57.455
385e3269-26e4-4e2d-8279-ef8e17b2e7d6	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_1220e57b.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 06:57:18.019
0b528b8c-768c-4091-8b0b-f76d25ae5514	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_290fca6f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:03:07.061
86c88349-fa74-4502-b2df-05d5e065d861	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_73946558.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:07:10.036
370f7efe-1c78-4721-8e52-da96c03aca84	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_938993ef.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:43:26.955
353aafcc-6270-41bd-bbbd-05d684871200	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_c1d23b66.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:44:02.24
07718e92-0ab6-4527-986d-fff599d3b962	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_b96096c4.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:46:50.242
9c19b1a3-c192-4d3b-b35a-5a0e60b232ed	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_8a1c3b08.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:47:10.326
dad1a3a6-6732-4366-8674-d2271b948cbc	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_c6733d73.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:48:52.881
7db26ca0-221c-43be-a7f4-e4f972650f3a	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_7bea478e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:50:29.015
70a9f6ab-e48e-4466-9178-b7a2b4a89a85	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_3197809d.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:51:54.206
32237495-96af-4d31-89eb-c2bee1607dde	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_b0ed2674.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:55:42.981
b1f5ed31-a819-4186-adda-4e1838b2037d	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_d4c5a5ac.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 07:59:20.349
ba3e4865-5b6b-4557-b440-051098b36c76	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_2f05ed8c.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 08:02:09.963
15fbd1b2-72b5-4b62-b5a2-76c1f5a38d59	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_a7a6fa77.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 08:04:24.957
98591323-504c-473b-ab51-7e5a1a786b52	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_2b86731f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 08:06:12.911
3da2edd6-f63a-4d61-8fcd-186de99ada8f	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_82d7791f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 09:18:14.641
f21f71e4-1af2-417e-9ec3-c757663ed628	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL260330-001_a30098c0.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 09:18:45.28
436ddfa7-9b51-41ea-a9ce-0483142494a6	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRANSPORT_DETAILS	uploads/documents/transport_VSL260330-001_dae54736.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 09:19:03.723
57cd7a58-e753-4f88-9e83-65034145e31a	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_e9b2d5f9.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 09:19:22.838
478aef39-0440-4404-846c-99211ed769fa	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_2076d299.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 09:23:08.932
7ac08ca0-49a5-4bf1-97a2-757b9d992cfb	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_fc2399ad.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 09:28:02.996
e5735a0e-d1d9-4195-9e40-6d7a6e6deb30	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_1278cef3.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 09:28:57.395
3780ce2e-616c-437c-afc8-6fdf57d8b7a5	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_f9de1f8f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-05 09:40:24.669
e24a2b55-1c27-46be-9b15-cce555020476	57574616-6aab-410e-bf4a-3d97fa74c297	INVOICE	uploads/documents/invoice_VSL260410-001_6085704a.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-10 03:17:32.058
298f1345-4922-40d0-b766-f0a21e4a581b	57574616-6aab-410e-bf4a-3d97fa74c297	INVOICE	uploads/documents/invoice_VSL260410-001_6c2ead2e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-10 03:18:08.419
440c8906-98ac-4388-9b34-e0bc45449556	57574616-6aab-410e-bf4a-3d97fa74c297	INVOICE	uploads/documents/invoice_VSL260410-001_8d8ae2d5.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-10 03:18:44.222
358a115f-6b1b-437d-9fef-4386adf5bbd3	57574616-6aab-410e-bf4a-3d97fa74c297	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL260410-001_cbffdc8f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-10 03:24:07.934
34b8c8de-3ea8-4eca-9a3e-44cb1b89bcda	57574616-6aab-410e-bf4a-3d97fa74c297	TRANSPORT_DETAILS	uploads/documents/transport_VSL260410-001_0d096a04.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-10 03:24:16.545
1ae11308-ca79-45c9-873a-dd0a91b6f51c	57574616-6aab-410e-bf4a-3d97fa74c297	FULL_ITINERARY	uploads/documents/itinerary_VSL260410-001_806cc8f5.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-10 03:26:40.275
c360c3cc-9a28-403a-b8d3-b009ccb7d038	57574616-6aab-410e-bf4a-3d97fa74c297	INVOICE	uploads/documents/invoice_VSL260410-001_b9a1405c.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-14 13:19:12.134
f119791c-788d-4142-8850-15a20aad1942	57574616-6aab-410e-bf4a-3d97fa74c297	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL260410-001_742a32c8.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-14 13:19:44.656
fff359cf-d332-4ec1-9fa4-5e685cb03eab	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_22c89494.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-14 13:40:30.507
bd5179db-1c30-4b23-915b-c376e42f72d0	57574616-6aab-410e-bf4a-3d97fa74c297	INVOICE	uploads/documents/invoice_VSL260410-001_a87c972a.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-14 13:43:06.7
404a3d73-7c9d-4d14-a68a-7f6cd675af3a	57574616-6aab-410e-bf4a-3d97fa74c297	INVOICE	uploads/documents/invoice_VSL260410-001_9b9c0b5c.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-14 13:43:33.619
9ac1c358-3068-4e24-b1da-d768a423129f	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INVOICE	uploads/documents/invoice_VSL260330-001_72aa83f6.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-14 13:54:04.73
961e9708-aa22-40e5-96be-82f923044d56	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRAVEL_CONFIRMATION	uploads/documents/travel_confirmation_VSL260330-001_9b7c3b3e.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-14 13:54:40.329
271b9e45-1d28-4e6b-bbf4-c30381cacf1a	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRANSPORT_DETAILS	uploads/documents/transport_VSL260330-001_a671c5a4.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-14 13:55:06.329
90ca8375-ea8d-4428-b55e-cc3ada7625c4	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	FULL_ITINERARY	uploads/documents/itinerary_VSL260330-001_65a40711.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-14 13:55:17.42
a0206d4b-d9bb-4f93-b03b-14c22abc142a	57574616-6aab-410e-bf4a-3d97fa74c297	INVOICE	uploads/documents/invoice_VSL260410-001_c597ff22.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-15 11:08:29.141
f7a9b2d4-b90d-48bf-bd57-be077ecc1738	57574616-6aab-410e-bf4a-3d97fa74c297	INVOICE	uploads/documents/invoice_VSL260410-001_dc0dbc1f.pdf	1	964e9cf4-4e74-46f3-8d1e-de9a9864864e	2026-04-15 11:11:39.454
\.


--
-- Data for Name: HotelBooking; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."HotelBooking" (id, "bookingId", "nightNumber", "hotelName", "roomCategory", "numberOfRooms", "roomPreference", "mealPlan", "mealPreference", "mobilityNotes", "confirmationStatus", "reservationNotes", "createdAt", "updatedAt") FROM stdin;
9d477aca-4409-44fb-88bf-d423f8325099	4777ce53-9d80-4700-9b30-6a5d357a7be3	1	Jetwing Blue	luxury	1	double	BB	non vegeterian		CONFIRMED		2026-03-18 03:17:08.708	2026-03-18 03:55:19.32
09794b37-6397-4294-a95c-e0e262ed41ee	4777ce53-9d80-4700-9b30-6a5d357a7be3	2	cinnamon grand	luxury	1	double	BB	non vegeterian		CONFIRMED		2026-03-18 03:22:33.026	2026-03-18 03:55:21.671
77aec51d-f7c6-433b-b5d4-5b1bae2a1389	4777ce53-9d80-4700-9b30-6a5d357a7be3	3	taj	luxury	2	double	BB	non vegeterian		CONFIRMED		2026-03-18 03:56:00.593	2026-03-18 03:56:04.084
38ac39ec-5561-49b1-9bad-ba539178c78b	4777ce53-9d80-4700-9b30-6a5d357a7be3	4	kandalama	luxury	1	double	BB	non vegeterian		PENDING		2026-03-18 03:56:25.571	2026-03-18 03:56:25.571
4e78083b-ef1f-4108-8aad-22ab0c1c8b48	031fab34-96e1-4b84-aca3-0711782d6ce9	3	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-18 06:06:11.168	2026-03-18 06:06:36.678
04189eee-c89a-40c7-b3ab-c3bb6612eecd	031fab34-96e1-4b84-aca3-0711782d6ce9	4	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-18 06:06:11.174	2026-03-18 06:06:37.077
02a8ac36-b5cd-4fe9-b3d7-788cde5f60c6	57574616-6aab-410e-bf4a-3d97fa74c297	1	To Be Confirmed	To Be Confirmed	1	\N	BB		\N	CONFIRMED		2026-04-10 03:22:39.409	2026-04-10 03:22:41.625
725317af-2e6f-4e12-9456-c9f6928c8feb	57574616-6aab-410e-bf4a-3d97fa74c297	2	To Be Confirmed	To Be Confirmed	1	\N	BB		\N	CONFIRMED		2026-04-10 03:22:39.416	2026-04-10 03:22:42.308
44ae1557-f90f-4065-93df-b5aa1a42129d	031fab34-96e1-4b84-aca3-0711782d6ce9	1	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-18 06:06:11.156	2026-03-18 06:06:56.644
e3eb1a22-b4c5-4a72-8020-66c63855bd81	031fab34-96e1-4b84-aca3-0711782d6ce9	2	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-18 06:06:11.162	2026-03-18 06:06:57.394
c7358ec5-d934-4f94-969c-e89b209f0b45	12f02bc8-5687-45a4-a478-4d36ba87b457	1	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-18 07:08:56.588	2026-03-18 07:09:19.158
d9307671-2e52-4ed2-9b9c-5a42a0289e85	12f02bc8-5687-45a4-a478-4d36ba87b457	2	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-18 07:08:56.593	2026-03-18 07:09:23.123
3398ddb2-3ac3-4b1e-a278-15113b070132	12f02bc8-5687-45a4-a478-4d36ba87b457	3	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-18 07:08:56.596	2026-03-18 07:09:37.889
aef82c21-a127-4e83-a6fb-ca741320ee16	12f02bc8-5687-45a4-a478-4d36ba87b457	4	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-18 07:08:56.601	2026-03-18 07:09:38.655
9ba85a2c-5437-4f9f-aebb-5cab529539c3	9f1a2892-65ef-4332-92c8-72841c76e9d6	1	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-21 05:26:47.882	2026-03-21 05:27:02.154
a275a4af-7afb-4bfc-aa39-34a0256e0ec6	9f1a2892-65ef-4332-92c8-72841c76e9d6	2	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-21 05:26:47.887	2026-03-21 05:27:03.75
acbf4bdc-fdd1-4c4d-bf28-96adc36a3756	9f1a2892-65ef-4332-92c8-72841c76e9d6	3	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-21 05:26:47.892	2026-03-21 05:27:16.101
e543dd4c-4f5e-4115-b920-342278356537	9f1a2892-65ef-4332-92c8-72841c76e9d6	4	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-21 05:26:47.897	2026-03-21 05:27:16.962
2dbd5611-5bf4-4f67-ae69-ce1a2f796676	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	1	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-29 09:41:40.683	2026-03-29 09:41:45.4
b4056f11-c39e-4b85-a92b-635cd0518c22	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	2	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-29 09:41:40.691	2026-03-29 09:41:46.049
0bdb39ec-e49a-42df-a335-ba69e10f3208	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	3	To Be Confirmed	To Be Confirmed	1		BB			CONFIRMED		2026-03-29 09:41:40.696	2026-03-29 09:41:46.533
03d804de-bedc-40b0-aa00-265d2d7909c4	57574616-6aab-410e-bf4a-3d97fa74c297	3	To Be Confirmed	To Be Confirmed	1	\N	BB		\N	CONFIRMED		2026-04-10 03:22:39.42	2026-04-10 03:22:42.841
e57568c1-00b3-4a2c-99d8-e3860e54ce76	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	4	kandalama	luxury	1	double	BB	non vegeterian		CONFIRMED		2026-03-29 09:53:13.981	2026-03-29 09:54:18.462
36d36ccf-0605-420b-b69f-27419579688f	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	5	kandalama	luxury	1	double	BB	non vegeterian	have a driver	CONFIRMED	make it clean	2026-03-29 09:53:44.382	2026-03-29 09:54:31.895
3540d80b-f3f9-42d3-9def-88d13270e4e2	3954c643-53f0-4e7d-b5ff-96c0837f647f	1	To Be Confirmed	To Be Confirmed	1	\N	BB		\N	CONFIRMED		2026-03-29 11:24:23.334	2026-03-29 11:24:25.735
d79ad4c5-7dfc-4850-b78f-b505e0cc4577	3954c643-53f0-4e7d-b5ff-96c0837f647f	2	To Be Confirmed	To Be Confirmed	1	\N	BB		\N	CONFIRMED		2026-03-29 11:24:23.341	2026-03-29 11:24:26.334
2dec3f62-26d4-43b1-8775-dcc8915c7030	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	1	To Be Confirmed	To Be Confirmed	1	\N	BB		\N	CONFIRMED		2026-03-30 06:47:16.831	2026-03-30 06:47:44.454
3750a1a9-1668-48ab-bcf6-ee44aa935c5f	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	2	To Be Confirmed	To Be Confirmed	1	\N	BB		\N	CONFIRMED		2026-03-30 06:47:16.837	2026-03-30 06:48:55.699
bfb7bc88-0713-47aa-8a20-611665262d57	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	3	To Be Confirmed	To Be Confirmed	1	\N	BB		\N	CONFIRMED		2026-03-30 06:47:16.842	2026-03-30 06:48:56.565
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Invoice" (id, "bookingId", "invoiceNumber", "invoiceDate", "costPerPerson", "totalAmount", "advancePaid", "balanceAmount", "paymentNotes", "paymentInstructions", "createdAt", "updatedAt", "tourInclusions") FROM stdin;
f9f11948-22b9-4618-8107-1f2a48668436	12f02bc8-5687-45a4-a478-4d36ba87b457	INV-2026-005	2026-03-18 07:06:47.498	4000.00	12000.00	200.00	11800.00			2026-03-18 07:06:47.498	2026-03-18 07:06:47.498	\N
2f9dd371-3d81-4aa8-9cfa-2b0ad4133fb9	9f1a2892-65ef-4332-92c8-72841c76e9d6	INV-2026-006	2026-03-21 05:26:08.494	4000.00	8000.00	1000.00	7000.00			2026-03-21 05:26:08.494	2026-03-21 05:26:08.494	\N
4648d882-c029-43b6-8551-6c763d5428fb	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	INV-2026-009	2026-03-30 06:39:52.238	4000.00	20000.00	1000.00	19000.00	advance was done by cash		2026-03-30 06:39:52.238	2026-04-05 09:27:57.839	complementary welcome drink\ntranslator\nexperience driver
cca3bfa4-5d82-4815-a938-5e96d818c30a	57574616-6aab-410e-bf4a-3d97fa74c297	INV-VSL260410-001-01	2026-04-10 03:17:23.102	3000.00	7500.00	2000.00	5500.00			2026-04-10 03:17:23.102	2026-04-10 03:17:23.102	
c736c7c3-36da-4897-8a15-00b4916a04a1	4777ce53-9d80-4700-9b30-6a5d357a7be3	INV-2026-001	2026-03-11 05:56:30.631	1000.00	2000.00	300.00	1700.00	advance done by cash at airport	Not applicable	2026-03-11 05:56:30.631	2026-03-23 14:16:28.953	\N
fdc5c153-2342-41af-8895-b336a41a2ada	031fab34-96e1-4b84-aca3-0711782d6ce9	INV-2026-004	2026-03-18 06:06:02.073	4000.00	4000.00	300.00	3700.00			2026-03-18 06:06:02.073	2026-03-24 17:47:04.625	bed and breakfast\nnavigation
abcc15b8-7128-4db9-a561-b1bc04a18b49	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	INV-2026-007	2026-03-29 09:45:48.705	3000.00	3000.00	1000.00	2000.00			2026-03-29 09:45:48.705	2026-03-29 09:45:48.705	Free Welcome Drinks\nComplementary Body massage\nTranslator
e4f2ea74-548f-4fb8-8899-4b58cfac8f95	3954c643-53f0-4e7d-b5ff-96c0837f647f	INV-2026-008	2026-03-29 11:22:15.03	4000.00	4000.00	1000.00	3000.00			2026-03-29 11:22:15.03	2026-03-29 11:22:15.03	
\.


--
-- Data for Name: Pax; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Pax" (id, "bookingId", name, relationship, type, age, "createdAt", "updatedAt") FROM stdin;
0a944f26-fbba-4c31-a42a-ace312624a01	4777ce53-9d80-4700-9b30-6a5d357a7be3	kumar	friend	ADULT	24	2026-03-11 05:52:04.444	2026-03-11 05:52:04.444
f883a834-9b3b-491c-9801-8e442945e96c	12f02bc8-5687-45a4-a478-4d36ba87b457	yuwin	brother	CHILD	30	2026-03-18 07:05:27.743	2026-03-18 07:05:27.743
26f2ffde-35b2-45e9-ae7a-d70423e20880	12f02bc8-5687-45a4-a478-4d36ba87b457	kumar	friend	ADULT	50	2026-03-18 07:05:36.959	2026-03-18 07:05:36.959
346f7d65-252e-4dbc-a5af-dae3a05c3b97	9f1a2892-65ef-4332-92c8-72841c76e9d6	binara	brother	ADULT	30	2026-03-21 05:23:04.706	2026-03-21 05:23:04.706
cf36d199-8a9d-490a-b191-db482939b32b	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	kumar	brother	ADULT	30	2026-03-30 06:37:24.672	2026-03-30 06:37:24.672
0ca13e0a-f8ca-4d9c-b193-a7d279446761	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	yuwin	brother	CHILD	8	2026-03-30 06:45:26.018	2026-03-30 06:45:26.018
ce571cca-1c89-4fdc-8c81-65203f4d38be	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	saddeep	child	INFANT	2	2026-04-05 03:34:10.172	2026-04-05 03:34:10.172
f6e0756d-40b2-4bbc-b162-f3f87739f35c	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	amila	friend	ADULT	42	2026-04-05 03:34:30.101	2026-04-05 03:34:30.101
585a46e1-5e41-474c-aa42-ef09beba2a84	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	omalka	friend	CHILD	8	2026-04-05 03:34:48.185	2026-04-05 03:34:48.185
2ee93c12-31ab-4a59-aaab-85fd7c7e4a5e	57574616-6aab-410e-bf4a-3d97fa74c297	yuwin	brother	CHILD	8	2026-04-10 03:13:33.737	2026-04-10 03:13:33.737
a906867f-e468-43ac-8da7-237eb199c495	57574616-6aab-410e-bf4a-3d97fa74c297	yohan	child	INFANT	4	2026-04-10 03:15:18.643	2026-04-10 03:15:18.643
2155a732-e5c2-42b4-ad9a-67cc7c7922f2	57574616-6aab-410e-bf4a-3d97fa74c297	amal	friend	ADULT	25	2026-04-10 03:15:36.766	2026-04-10 03:15:36.766
\.


--
-- Data for Name: StatusHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StatusHistory" (id, "bookingId", "fromStatus", "toStatus", "changedBy", notes, "createdAt") FROM stdin;
8716dc8c-cdb4-47c2-ad9b-dedd60dcc1e2	4777ce53-9d80-4700-9b30-6a5d357a7be3	\N	CLIENT_PROFILE_CREATED	81eaa75b-539a-4b7b-a44c-c1139fa0b593	Booking created	2026-03-11 05:24:59.262
8893c0bc-f8ab-43eb-b24c-db347135e438	4777ce53-9d80-4700-9b30-6a5d357a7be3	CLIENT_PROFILE_CREATED	PAX_DETAILS_ADDED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	all good	2026-03-11 05:51:35.554
36d22547-6143-49d2-bf22-e7fa18a80da3	4777ce53-9d80-4700-9b30-6a5d357a7be3	PAX_DETAILS_ADDED	COSTING_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-11 07:41:45.837
c8cd985f-fbb6-4602-80c1-d5308a2e3032	4777ce53-9d80-4700-9b30-6a5d357a7be3	COSTING_COMPLETED	SALES_CONFIRMED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-11 07:41:51.584
8858afa0-1ea2-4902-b452-b9d372ef6cf8	4777ce53-9d80-4700-9b30-6a5d357a7be3	SALES_CONFIRMED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	make the reservation	2026-03-11 07:42:06.918
418dcd40-4d14-4a5d-94b0-e7c2cd3e7c16	4777ce53-9d80-4700-9b30-6a5d357a7be3	RESERVATION_PENDING	RESERVATION_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	reservation complete	2026-03-11 07:42:13.667
d35a0b94-5254-490d-8122-dc157cb62396	031fab34-96e1-4b84-aca3-0711782d6ce9	\N	CLIENT_PROFILE_CREATED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	Booking created	2026-03-18 06:05:44.625
49ce431b-4aa0-4074-8631-2edb98885c95	031fab34-96e1-4b84-aca3-0711782d6ce9	CLIENT_PROFILE_CREATED	PAX_DETAILS_ADDED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:05:47.334
fab3f1f7-f58d-426a-a86c-e4c166a5443c	031fab34-96e1-4b84-aca3-0711782d6ce9	PAX_DETAILS_ADDED	COSTING_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:06:05.115
c46f63ec-1182-47bc-a07d-3321d6955c57	031fab34-96e1-4b84-aca3-0711782d6ce9	COSTING_COMPLETED	SALES_CONFIRMED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:06:07.114
441be065-a8d3-4c60-9020-0faa27eafe94	031fab34-96e1-4b84-aca3-0711782d6ce9	SALES_CONFIRMED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:06:10.398
2fc1b20e-52ea-4020-bfe3-6472f59ffafd	031fab34-96e1-4b84-aca3-0711782d6ce9	RESERVATION_PENDING	SALES_CONFIRMED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:06:23.248
f94e2d84-a80e-4907-be0a-69005404a1fd	031fab34-96e1-4b84-aca3-0711782d6ce9	SALES_CONFIRMED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:06:28.264
8698698e-3826-4e2d-a732-2350ecb1b7db	031fab34-96e1-4b84-aca3-0711782d6ce9	RESERVATION_PENDING	RESERVATION_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:06:40.132
542a037e-9b19-4862-8046-92e397798f96	031fab34-96e1-4b84-aca3-0711782d6ce9	RESERVATION_COMPLETED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:06:45.165
7a4981e0-d9a5-4a88-a1ec-f63ddf42ac2d	031fab34-96e1-4b84-aca3-0711782d6ce9	RESERVATION_PENDING	RESERVATION_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:07:00.747
84f6a8a9-3a96-4e7b-9007-5e81b3f24c31	031fab34-96e1-4b84-aca3-0711782d6ce9	RESERVATION_COMPLETED	TRANSPORT_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:07:02.417
67f7744c-c0af-4051-9b5d-e4fbbe93c35c	031fab34-96e1-4b84-aca3-0711782d6ce9	TRANSPORT_PENDING	TRANSPORT_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:07:48.915
9570bfc1-a607-4662-be93-8331e358a969	031fab34-96e1-4b84-aca3-0711782d6ce9	TRANSPORT_COMPLETED	DOCUMENTS_READY	SYSTEM	Both departments completed — documents ready for generation	2026-03-18 06:07:48.926
a807e687-be6d-474f-8f29-c503a090e5c8	031fab34-96e1-4b84-aca3-0711782d6ce9	DOCUMENTS_READY	OPS_APPROVED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:07:51.928
f0b0609e-8af3-4a6b-b591-80d45329253f	031fab34-96e1-4b84-aca3-0711782d6ce9	OPS_APPROVED	COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 06:07:53.907
9b3bae86-161e-4574-a0cb-239127d1ff2c	12f02bc8-5687-45a4-a478-4d36ba87b457	\N	CLIENT_PROFILE_CREATED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	Booking created	2026-03-18 07:04:32.622
bc9060f8-5af4-443b-8a8d-dc235410b9e8	12f02bc8-5687-45a4-a478-4d36ba87b457	CLIENT_PROFILE_CREATED	PAX_DETAILS_ADDED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:04:44.682
46955590-bf45-4112-af16-60ffc8843255	12f02bc8-5687-45a4-a478-4d36ba87b457	PAX_DETAILS_ADDED	COSTING_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:08:23.916
a9927bd4-1c79-4c00-964e-5de04cf0fb52	12f02bc8-5687-45a4-a478-4d36ba87b457	COSTING_COMPLETED	SALES_CONFIRMED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:08:45.475
8e31cfdf-7577-43c8-a88b-8ccaa7572a78	12f02bc8-5687-45a4-a478-4d36ba87b457	SALES_CONFIRMED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:08:54.098
abe8b1cb-dd82-4112-9096-f378db87b278	12f02bc8-5687-45a4-a478-4d36ba87b457	RESERVATION_PENDING	RESERVATION_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:10:03.426
ebfff7a2-ffba-4f65-ae85-a8d1f4d72a4b	12f02bc8-5687-45a4-a478-4d36ba87b457	RESERVATION_COMPLETED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:10:11.885
5f07f275-e785-485a-b9cb-0449dd434119	12f02bc8-5687-45a4-a478-4d36ba87b457	RESERVATION_PENDING	RESERVATION_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:10:19.704
e014767c-94da-4d90-b470-7bf2c36742bb	12f02bc8-5687-45a4-a478-4d36ba87b457	RESERVATION_COMPLETED	TRANSPORT_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:10:22.772
1b99acab-503f-446b-baf7-5ca948afceae	12f02bc8-5687-45a4-a478-4d36ba87b457	TRANSPORT_PENDING	TRANSPORT_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:10:50.057
5498e274-6668-4478-9800-1d6d1e47b882	12f02bc8-5687-45a4-a478-4d36ba87b457	TRANSPORT_COMPLETED	DOCUMENTS_READY	SYSTEM	Both departments completed — documents ready for generation	2026-03-18 07:10:50.062
62051edb-4dda-47ac-8e89-45e6cd5982ea	12f02bc8-5687-45a4-a478-4d36ba87b457	DOCUMENTS_READY	OPS_APPROVED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:13:34.578
cd52f639-ea4c-42e1-8e92-6de72fdcc740	12f02bc8-5687-45a4-a478-4d36ba87b457	OPS_APPROVED	COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-18 07:13:39.804
bf62532d-8baa-4247-803d-cdf33d097f00	9f1a2892-65ef-4332-92c8-72841c76e9d6	\N	CLIENT_PROFILE_CREATED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	Booking created	2026-03-21 05:22:07.036
a7804ea0-1631-4fd6-b5ef-fd2b0020439c	9f1a2892-65ef-4332-92c8-72841c76e9d6	CLIENT_PROFILE_CREATED	PAX_DETAILS_ADDED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-21 05:23:11.634
0d322751-c161-46c2-958a-88df43ec8d8c	9f1a2892-65ef-4332-92c8-72841c76e9d6	PAX_DETAILS_ADDED	COSTING_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-21 05:26:23.375
99c59f10-359f-43d3-9d5b-3919e85eee81	9f1a2892-65ef-4332-92c8-72841c76e9d6	COSTING_COMPLETED	PAX_DETAILS_ADDED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-21 05:26:27.834
963fa5d1-aeef-4d21-a512-c5b2db308705	9f1a2892-65ef-4332-92c8-72841c76e9d6	PAX_DETAILS_ADDED	COSTING_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-21 05:26:37.304
9bb0782d-4ecd-4b18-bd10-b3e5fb7ee9e1	9f1a2892-65ef-4332-92c8-72841c76e9d6	COSTING_COMPLETED	SALES_CONFIRMED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-21 05:26:42.132
0a8a13a2-eb21-4c38-bc95-69f0fa33f3cd	9f1a2892-65ef-4332-92c8-72841c76e9d6	SALES_CONFIRMED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-21 05:26:46.551
292d5345-e16d-4422-9828-84654fd2a7c0	9f1a2892-65ef-4332-92c8-72841c76e9d6	RESERVATION_PENDING	RESERVATION_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-21 05:27:21.952
6882002d-135c-4724-abb7-328ddc1ef18f	9f1a2892-65ef-4332-92c8-72841c76e9d6	RESERVATION_COMPLETED	TRANSPORT_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-21 05:27:25.052
5849c1b9-55a1-4534-90a2-73512b88b108	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	\N	CLIENT_PROFILE_CREATED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	Booking created	2026-03-29 09:41:36.502
aeea2cc0-55a6-4114-8666-594fc8840637	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	CLIENT_PROFILE_CREATED	PAX_DETAILS_ADDED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 09:44:30.18
2e77969e-c789-4287-b125-74b357f61b78	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	PAX_DETAILS_ADDED	COSTING_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	completed the invoice\n	2026-03-29 09:46:05.735
ada590cc-9b05-4aef-b6d5-d74f1367dc06	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	COSTING_COMPLETED	SALES_CONFIRMED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 09:46:13.885
20d303b9-954e-4e29-8dbd-d77e7b259f27	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	SALES_CONFIRMED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 09:46:17.432
b6556f11-ec42-4423-b2ec-bd4e926a9466	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	RESERVATION_PENDING	RESERVATION_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 09:46:25.351
3d12c1db-2e77-44fd-bf33-cd66157645c0	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	RESERVATION_COMPLETED	TRANSPORT_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 09:46:28.449
32d6d6a0-2a2b-47ab-a09c-e1ed9041a8f0	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRANSPORT_PENDING	TRANSPORT_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 09:46:48.717
b2c08b39-27b5-4804-ad21-b6b16f13d26b	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	TRANSPORT_COMPLETED	DOCUMENTS_READY	SYSTEM	Both departments completed — documents ready for generation	2026-03-29 09:46:48.724
8fb64807-bb40-4054-886d-efc485198873	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	DOCUMENTS_READY	OPS_APPROVED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 09:46:51.165
e0bd9132-3ff8-463c-a256-c5d080d03c39	3954c643-53f0-4e7d-b5ff-96c0837f647f	\N	CLIENT_PROFILE_CREATED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	Booking created	2026-03-29 11:13:03.612
2cc5bfe7-7af1-4a37-8c35-7adfd5b6c785	3954c643-53f0-4e7d-b5ff-96c0837f647f	CLIENT_PROFILE_CREATED	PAX_DETAILS_ADDED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:21:39.705
09f4f4ab-e377-423f-82ed-0d01aa1ff510	3954c643-53f0-4e7d-b5ff-96c0837f647f	PAX_DETAILS_ADDED	COSTING_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:22:20
678e760c-ece6-49b6-95b6-e3f9277262e3	3954c643-53f0-4e7d-b5ff-96c0837f647f	COSTING_COMPLETED	SALES_CONFIRMED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:22:23.236
7743fdde-a73c-45e4-a911-2334f4f8a032	3954c643-53f0-4e7d-b5ff-96c0837f647f	SALES_CONFIRMED	COSTING_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:22:26.638
38ec1d62-fc84-4516-af3d-36d7755f136e	3954c643-53f0-4e7d-b5ff-96c0837f647f	COSTING_COMPLETED	SALES_CONFIRMED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:22:29.802
5b10afbd-1c81-433d-8d16-7026cfabcb8d	3954c643-53f0-4e7d-b5ff-96c0837f647f	SALES_CONFIRMED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:24:19.322
06b7241c-6d8b-4f8a-b52d-953ba377333f	3954c643-53f0-4e7d-b5ff-96c0837f647f	RESERVATION_PENDING	RESERVATION_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:24:29.854
e8d36fa8-5bcb-49b2-aaa1-1b976c849d15	3954c643-53f0-4e7d-b5ff-96c0837f647f	RESERVATION_COMPLETED	TRANSPORT_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:24:33.118
cec8df37-dbf2-41ce-ac40-aa4f0e7c6355	3954c643-53f0-4e7d-b5ff-96c0837f647f	TRANSPORT_PENDING	TRANSPORT_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:25:17.425
2111cdd9-e2bd-4479-adb0-fa9f052b0bc9	3954c643-53f0-4e7d-b5ff-96c0837f647f	TRANSPORT_COMPLETED	DOCUMENTS_READY	SYSTEM	Both departments completed — documents ready for generation	2026-03-29 11:25:17.43
c3736ce6-37eb-46c1-aa65-c37e8364c581	3954c643-53f0-4e7d-b5ff-96c0837f647f	DOCUMENTS_READY	OPS_APPROVED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:25:20.57
db44215f-d35b-4f8f-87f8-55927828a624	3954c643-53f0-4e7d-b5ff-96c0837f647f	OPS_APPROVED	COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-29 11:25:23.106
19503eae-01b4-4f71-8831-cd5c206ad543	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	\N	CLIENT_PROFILE_CREATED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	Booking created	2026-03-30 06:37:05.422
0f8ee7af-86e9-4002-b58b-29ba515d3fd3	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	CLIENT_PROFILE_CREATED	PAX_DETAILS_ADDED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-30 06:37:31.703
c17a1e73-d007-4ae0-883e-32a04c5701be	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	PAX_DETAILS_ADDED	COSTING_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-30 06:44:02.319
cd88b088-3e25-4b69-937a-75de91c742b7	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	COSTING_COMPLETED	SALES_CONFIRMED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-30 06:47:11.118
ea8f7ad2-5926-4533-8a17-ebfe1249509d	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	SALES_CONFIRMED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-30 06:47:15.253
2ed34808-5c4f-480e-8823-f295111ec49b	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	RESERVATION_PENDING	RESERVATION_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-30 06:49:01.585
030f80c1-bc12-4ca8-b44c-c1fa70ee7602	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	RESERVATION_COMPLETED	TRANSPORT_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-30 06:50:19.451
0693c53c-f7a4-4bb5-b153-720f96789422	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRANSPORT_PENDING	TRANSPORT_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-30 06:55:45.015
79eff2da-4c0c-4497-8a77-47e26266b568	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	TRANSPORT_COMPLETED	DOCUMENTS_READY	SYSTEM	Both departments completed — documents ready for generation	2026-03-30 06:55:45.024
d7fd5498-bba8-421c-8855-428891f4005c	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	DOCUMENTS_READY	OPS_APPROVED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-30 06:55:48.381
fed0b055-e33f-4f87-81e7-bdf0109f1e50	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	OPS_APPROVED	COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-03-30 06:55:51.149
7cf6d46b-a17a-487d-9f8c-ff214b74757b	57574616-6aab-410e-bf4a-3d97fa74c297	\N	CLIENT_PROFILE_CREATED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	Booking created	2026-04-10 03:12:39.614
9f492f32-06f0-41fb-a078-2750ffdbcc0c	57574616-6aab-410e-bf4a-3d97fa74c297	CLIENT_PROFILE_CREATED	PAX_DETAILS_ADDED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-04-10 03:12:50.642
99f16531-c763-4c37-a0d5-ea2bf5acaff5	57574616-6aab-410e-bf4a-3d97fa74c297	PAX_DETAILS_ADDED	COSTING_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-04-10 03:22:32.88
89101355-2963-4191-9191-1896e7282d9f	57574616-6aab-410e-bf4a-3d97fa74c297	COSTING_COMPLETED	SALES_CONFIRMED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-04-10 03:22:35.926
3585a63c-3d1c-4d9f-a904-f7be26bf14e2	57574616-6aab-410e-bf4a-3d97fa74c297	SALES_CONFIRMED	RESERVATION_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-04-10 03:22:47.061
4cb207c9-112b-460b-ad84-a749d265e423	57574616-6aab-410e-bf4a-3d97fa74c297	RESERVATION_PENDING	RESERVATION_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-04-10 03:22:49.358
d4909f41-2d28-4d0d-bdc7-01ac2e8932c4	57574616-6aab-410e-bf4a-3d97fa74c297	RESERVATION_COMPLETED	TRANSPORT_PENDING	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-04-10 03:22:51.977
9e8302d2-6748-448b-a7a7-7b6514ea6aff	57574616-6aab-410e-bf4a-3d97fa74c297	TRANSPORT_PENDING	TRANSPORT_COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-04-10 03:23:56.812
01c6ef55-6cae-4d33-a53c-1ad9a5aefaf3	57574616-6aab-410e-bf4a-3d97fa74c297	TRANSPORT_COMPLETED	DOCUMENTS_READY	SYSTEM	Both departments completed — documents ready for generation	2026-04-10 03:23:56.82
f57edded-432f-4514-bddb-d9a821123ccc	57574616-6aab-410e-bf4a-3d97fa74c297	DOCUMENTS_READY	OPS_APPROVED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-04-10 03:24:00.758
cc646e0f-7557-4a57-94fb-baafc4956a0e	57574616-6aab-410e-bf4a-3d97fa74c297	OPS_APPROVED	COMPLETED	964e9cf4-4e74-46f3-8d1e-de9a9864864e	\N	2026-04-10 03:24:03.627
\.


--
-- Data for Name: TransportDayPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportDayPlan" (id, "transportPlanId", "dayNumber", description, "pickupTime", "pickupLocation", "dropLocation", notes, "createdAt", "updatedAt") FROM stdin;
b5e55b24-c809-4a6d-9ed1-9b48aeb837ad	7d430ac4-1982-4e60-88b0-ec7b22fdb765	1	travel to sigirya	01:09	jetwing blue hotel	sigiraya	make sure to bring a VIP grade vehicle	2026-03-11 07:40:02.258	2026-03-11 07:40:02.258
\.


--
-- Data for Name: TransportPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransportPlan" (id, "bookingId", "vehicleModel", "vehicleNotes", "babySeatRequired", "driverName", "driverLanguage", "arrivalPickupLocation", "arrivalPickupTime", "arrivalPickupNotes", "departureDropLocation", "departureDropTime", "departureDropNotes", "internalNotes", "createdAt", "updatedAt", "vehicleIdNumber", "wheelchairRequired") FROM stdin;
7d430ac4-1982-4e60-88b0-ec7b22fdb765	4777ce53-9d80-4700-9b30-6a5d357a7be3	Car	Get a VIP grade vehicle	t	Vihanga	English	airport	11:24	please bring a umbrella	jetwing blue	15:25	make sure to be on time	this is a VIP client	2026-03-11 05:55:19.962	2026-03-11 05:55:19.962	\N	f
aea3d9e1-3390-4c3c-815f-236f79bfae24	031fab34-96e1-4b84-aca3-0711782d6ce9	car	make it a VIP grade vehicle	f	lahiru	English	airport		make sure be on time	cinnamon		hotel is pending booking		2026-03-18 06:07:45.087	2026-03-18 06:07:45.087	\N	f
08e789cc-4a72-4a3b-bda9-6be5f5029049	12f02bc8-5687-45a4-a478-4d36ba87b457	car	make it a VIP grade vehicle	f	lahiru	English	airport		make sure be on time	cinnamon		hotel is pending booking		2026-03-18 07:10:32.675	2026-03-18 07:10:32.675	\N	f
6cf1296d-312f-452f-9aa0-083e322306f7	8c76e13b-0835-4d6c-9d2d-c254b16c4aef	car	make it a VIP grade vehicle	t	lahiru	English	airport	15:16	make sure be on time	cinnamon	03:16	hotel is pending booking		2026-03-29 09:46:43.185	2026-03-29 10:16:19.027	bjz5489	t
4f55dfd3-d5d7-4f95-b78a-879376554514	3954c643-53f0-4e7d-b5ff-96c0837f647f	car	make it a VIP grade vehicle	t	lahiru	English	airport	19:54	please bring a umbrella	cinnamon	04:54	hotel is pending booking		2026-03-29 11:25:01.707	2026-03-29 11:25:01.707	bjz5489	t
3f9d5114-ee01-4f8e-8be3-7a3ee7e8bc6c	6a1f25ca-2d6e-4571-8257-fb9ecbc57c97	car	make it a VIP grade vehicle	t		English	airport	00:21	please bring a umbrella	cinnamon	00:21	hotel is pending booking		2026-03-30 06:53:02.082	2026-03-30 06:53:02.082	bhy-5489	t
24adf57e-4270-4dfc-a263-552715e052f8	57574616-6aab-410e-bf4a-3d97fa74c297	car	make it a VIP grade vehicle	t	lahiru	English	airport	08:53		cinnamon	20:53			2026-04-10 03:23:17.861	2026-04-10 03:23:17.861	bjz5489	f
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, password, name, role, "isActive", "createdAt", "updatedAt") FROM stdin;
964e9cf4-4e74-46f3-8d1e-de9a9864864e	admin@vsl360.com	$2b$10$q6ozpZgAZ.NFo63BfWppa..9O9Ih460pJgxBJhGPvTLmAfz19wUp6	System Admin	OPS_MANAGER	t	2026-03-11 05:16:56.684	2026-03-11 05:16:56.684
81eaa75b-539a-4b7b-a44c-c1139fa0b593	sales@vsl360.com	$2b$10$q6ozpZgAZ.NFo63BfWppa..9O9Ih460pJgxBJhGPvTLmAfz19wUp6	Sales Person	SALES	t	2026-03-11 05:16:56.691	2026-03-11 05:16:56.691
870b4265-4e3d-4120-95df-53cd361ba204	reservation@vsl360.com	$2b$10$q6ozpZgAZ.NFo63BfWppa..9O9Ih460pJgxBJhGPvTLmAfz19wUp6	Reservation Team	RESERVATION	t	2026-03-11 05:16:56.693	2026-03-11 05:16:56.693
b7b453f6-4495-4b53-9c9b-76cd807983ff	transport@vsl360.com	$2b$10$q6ozpZgAZ.NFo63BfWppa..9O9Ih460pJgxBJhGPvTLmAfz19wUp6	Transport Team	TRANSPORT	t	2026-03-11 05:16:56.694	2026-03-11 05:16:56.694
1946adce-d887-44ac-a1da-4f50a2061ece	kasun@vsl360.com	$2b$10$auG97X3eSz3RZWy.bldZhuOH7zUBYifgs0qKHnViHbyAy2K895iLW	kasun	SALES	t	2026-04-10 03:42:55.654	2026-04-10 03:42:55.654
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c4d67b54-e947-46b0-9875-f1adee3eb648	f9a6dcd38a24da24555c1df1e62c7820c4848fa8428947da1d750ce58bae6ca1	2026-03-11 10:46:55.382273+05:30	20260311051655_init	\N	\N	2026-03-11 10:46:55.368833+05:30	1
cdc371fb-7811-42f3-bd87-67d91be4f2ca	d66493df4dd5eac02c4bc975345d8363f7a7874cd539fa20fdcd6f490a79ea06	2026-03-23 19:40:41.113404+05:30	20260323141041_add_tour_inclusions	\N	\N	2026-03-23 19:40:41.111517+05:30	1
b469b1c5-ee31-4e2a-b21e-bbd27656be13	c346a89781484aa2a6ff5a1e4f6d291e43e56444bcee1b84ba9dd9747ead0bdb	2026-03-24 23:12:40.708555+05:30	20260324174240_add_travel_confirmation_doc_type	\N	\N	2026-03-24 23:12:40.707018+05:30	1
51ce6047-08b2-4b56-8c3e-3906b847be17	e8a1499bc6b9b9145914a68734d16543c08cdfc51dfb2ad95b28b54d19e221f4	2026-03-29 15:45:26.896321+05:30	20260329101519_add_vehicle_id_wheelchair	\N	\N	2026-03-29 15:45:26.893314+05:30	1
f1b87e4c-f9b7-478e-a6c1-361af9622a3a	bb05fd8fe89130a68afe70bf97b716d416aea4e66e061147881381eb39d4e0ff	2026-03-29 16:27:38.31764+05:30	20260329105738_add_client_language_preference	\N	\N	2026-03-29 16:27:38.315778+05:30	1
b987cac3-bc58-4c89-abad-fa7f4dc72b11	b572a69513f498e5de0d401fcab09bc5bb7edeff0a84fe4e015368d33c0af3df	2026-03-29 17:46:05.432101+05:30	20260329160000_remove_tour_month	\N	\N	2026-03-29 17:46:05.428691+05:30	1
377eca1d-7808-43d6-8ac3-3d818f4cb3e4	3342514f5d90dd943f37ca8334c5de9b038d59c25ba8dc7798d6271ab0b2a5d4	2026-04-05 10:01:00.478539+05:30	20260405120000_add_client_preferred_currency	\N	\N	2026-04-05 10:01:00.475911+05:30	1
\.


--
-- Data for Name: destination_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.destination_activities (id, destination_id, title, description, category, is_seasonal, sort_order, source_row) FROM stdin;
ACT_0001	DST_001	Lagoon boat safari (mangroves, birds, sunset)	Discover the serene beauty of Negombo Lagoon with a peaceful boat safari through lush mangrove forests. As you glide along calm waters, you'll witness a rich ecosystem filled with exotic birds, traditional fishing methods, and untouched nature. The experience becomes truly magical during sunset, when the sky reflects golden hues over the lagoon. Creating a perfect setting for photography and relaxation. This is one of the best nature experiences in Negombo for travelers seeking tranquility and scenic beauty.	WILDLIFE	f	1	3
ACT_0002	DST_001	Fish market visit (early morning local experience)	Start your day with an authentic cultural experience at Negombo's bustling fish market, one of the largest in Sri Lanka. Early in the morning, you'll see fishermen bringing in their fresh catch straight from the ocean, while locals negotiate and trade in a lively atmosphere. The market offers a raw and real glimpse into Sri Lankan coastal life, making it a must-visit for travelers who want to explore local traditions, seafood culture, and daily routines beyond typical tourist spots.	GENERAL	f	2	4
ACT_0003	DST_001	Dutch canal boat ride	Step back in time with a relaxing boat ride along the historic Dutch Canal, a colonial-era waterway surrounded by tropical greenery and village life. As you cruise through this scenic route, you'll observe local homes, fishing communities, and quiet landscapes that showcase the authentic charm of Negombo. This slow-paced experience is perfect for those who enjoy cultural exploration combined with peaceful surroundings.	LEISURE	f	3	5
ACT_0004	DST_001	Beach relaxation / jet skiing	Unwind on the golden sandy beaches of Negombo, where the sound of the waves and ocean breeze create the perfect tropical escape. Whether you prefer to relax under the sun or enjoy thrilling water sports like jet skiing, this experience offers something for every traveler. It's an ideal way to balance your journey with both relaxation and adventure along Sri Lanka's beautiful west coast.	ADVENTURE	f	4	6
ACT_0005	DST_001	City cycling tour	Explore Negombo like a local with a guided cycling tour through charming streets, coastal roads, and traditional neighborhoods. This immersive experience allows you to interact with locals, discover hidden gems, and observe everyday Sri Lankan life up close. From small temples to vibrant markets, cycling offers a unique and eco-friendly way to experience the culture and lifestyle of this coastal town.	SPIRITUAL	f	5	7
ACT_0006	DST_002	Sigiriya Rock Fortress climb (UNESCO site)	Step into history as you climb the iconic Sigiriya Rock Fortress, a UNESCO World Heritage Site and one of Sri Lanka's most famous landmarks. Rising dramatically from the jungle, this ancient royal citadel offers a fascinating journey through frescoes, mirror walls, and lion-shaped gateways. As you reach the summit, you'll be rewarded with breathtaking panoramic views of lush greenery and surrounding villages. This is a must-do experience for travelers seeking culture, history, and unforgettable views in Sri Lanka.	CULTURAL	f	6	10
ACT_0007	DST_002	Pidurangala Rock sunrise hike	For one of the most breathtaking sunrise experiences in Sri Lanka, hike up Pidurangala Rock in the early morning. The short yet adventurous climb takes you through forest paths and rocky terrain, leading to a stunning viewpoint overlooking Sigiriya Rock and the surrounding landscapes. Watching the sunrise from the top, as the sky turns shades of orange and gold, is a truly magical moment and a favorite among photographers and nature lovers.	ADVENTURE	f	7	11
ACT_0008	DST_002	Village safari	Experience authentic Sri Lankan village life with a unique cultural safari in the Sigiriya countryside. Travel by traditional bullock cart through rural paths, enjoy a peaceful canoe ride across a scenic lake, and visit a local village home where you'll learn to cook traditional Sri Lankan dishes. This immersive experience allows you to connect with locals, understand their lifestyle, and enjoy fresh, homemade cuisine, making it one of the most memorable cultural activities in Sri Lanka.	WILDLIFE	f	8	12
ACT_0009	DST_002	Elephant safari in Minneriya / Kaudulla	Witness the majestic beauty of wild elephants in their natural habitat with a safari in Minneriya National Park or Kaudulla National Park. These parks are famous for the "Gathering," where large herds of elephants come together near water reservoirs. The safari offers an exciting opportunity to see elephants, birds, and other wildlife up close, making it a must-do for nature enthusiasts and wildlife lovers visiting Sri Lanka.	WILDLIFE	f	9	13
ACT_0010	DST_002	Ayurvedic spa experience	Relax and rejuvenate with a traditional Ayurvedic spa experience in Sigiriya, inspired by Sri Lanka's ancient healing practices. Enjoy herbal treatments, therapeutic massages, and natural oils designed to restore balance to your body and mind. Surrounded by peaceful nature, this wellness experience is perfect after a day of exploration, offering deep relaxation and a touch of luxury to your journey.	LEISURE	f	10	14
ACT_0011	DST_003	Ancient city cycling tour (UNESCO ruins)	Explore the timeless beauty of Ancient City of Polonnaruwa with a guided cycling tour through its well-preserved ruins. Ride along quiet pathways surrounded by ancient temples, royal palaces, and sacred monuments dating back over 1,000 years. This eco-friendly experience allows you to fully immerse yourself in the history and scale of the kingdom at your own pace, making it one of the best ways to discover Polonnaruwa's cultural heritage.	SPIRITUAL	f	11	16
ACT_0012	DST_003	Explore ancient city	Step into the golden age of Sri Lankan history as you explore the remarkable ruins of Polonnaruwa, once the thriving capital of the island. Discover iconic sites such as the Royal Palace, sacred quadrangles, and the beautifully carved Buddha statues at Gal Vihara. Surrounded by lush greenery and peaceful surroundings, this experience offers a deep cultural and spiritual connection, perfect for travelers interested in history, architecture, and heritage.	SPIRITUAL	f	12	17
ACT_0013	DST_004	Sacred city temple tour	Discover the spiritual heart of Sri Lanka with a visit to the Sacred City of Anuradhapura, one of the oldest continuously inhabited cities in the world. The highlight of this sacred journey is the revered Sri Maha Bodhi, believed to be grown from a cutting of the original Bodhi tree under which Buddha attained enlightenment. Surrounded by ancient monasteries and peaceful surroundings, this experience offers a profound connection to Sri Lanka's rich Buddhist heritage.	SPIRITUAL	f	13	21
ACT_0014	DST_004	Ruwanwelisaya & Jetavanaramaya stupas	Witness the grandeur of ancient Sri Lankan architecture as you visit the iconic Ruwanwelisaya and Jetavanaramaya, two of the most impressive stupas in the world. These massive white domes stand as symbols of devotion and engineering brilliance, attracting pilgrims and travelers alike. Walking around these sacred monuments, especially during prayer times, allows you to experience the powerful spiritual energy and timeless beauty of Anuradhapura.	SPIRITUAL	f	14	22
ACT_0015	DST_004	Local pilgrimage experience	Immerse yourself in the authentic spiritual life of Sri Lanka by joining a local pilgrimage experience in Anuradhapura. Observe devotees dressed in white offering flowers, lighting oil lamps, and practicing ancient rituals passed down through generations. This unique cultural interaction allows you to witness genuine faith and devotion, providing a deeper understanding of Sri Lanka's traditions and spiritual lifestyle.	SPIRITUAL	f	15	23
ACT_0016	DST_005	Whale & dolphin watching (seasonal)	Embark on an unforgettable ocean adventure in Trincomalee with a whale and dolphin watching experience (best during the season). Cruise into the deep blue waters of the Indian Ocean, where you may witness majestic blue whales, playful dolphins, and other marine life in their natural habitat. This thrilling yet peaceful journey is perfect for nature lovers and offers one of the most unique wildlife experiences in Sri Lanka.	WILDLIFE	t	16	26
ACT_0017	DST_005	Snorkeling at Pigeon Island	Discover the vibrant underwater world of Pigeon Island National Park, one of the best snorkeling spots in Sri Lanka. Swim among colorful coral reefs, tropical fish, and even reef sharks in crystal-clear waters. This protected marine park offers an easy and enjoyable snorkeling experience for both beginners and experienced travelers, making it a must-visit for anyone exploring Trincomalee.	WILDLIFE	f	17	27
ACT_0018	DST_005	Visit Koneswaram Temple (cliff views) & Visit Fort Frederick	Visit the sacred Koneswaram Temple, dramatically perched on a cliff overlooking the ocean. Known as the "Temple of a Thousand Pillars," it offers breathtaking panoramic views and deep spiritual significance. Combine this with a visit to Fort Frederick, a historic site surrounded by greenery and home to friendly deer roaming freely. This experience blends culture, history, and stunning coastal scenery.	SPIRITUAL	f	18	28
ACT_0019	DST_005	Nilaveli beach relaxation	Unwind on the pristine shores of Nilaveli Beach, famous for its soft white sand and calm turquoise waters. Far from the crowds, this tranquil beach is perfect for sunbathing, swimming, or simply enjoying the peaceful coastal atmosphere. Whether you're looking to relax or capture picture-perfect moments, Nilaveli offers one of the most beautiful beach experiences in Sri Lanka.	LEISURE	f	19	29
ACT_0020	DST_006	Munneswaram & Manavari temple	Explore the spiritual heritage of Chilaw with a visit to the sacred Munneswaram Temple and Manavari Temple. These ancient temples are deeply connected to the Ramayana legend and attract devotees from India and around the world. Surrounded by peaceful surroundings and rich history, this experience offers a meaningful cultural and spiritual journey, perfect for those seeking divine connection and heritage exploration.	SPIRITUAL	f	20	31
ACT_0021	DST_006	Lagoon fishing experience	Enjoy a unique and authentic local experience with traditional fishing in the calm lagoons of Chilaw. Join local fishermen as they demonstrate age-old techniques, giving you a hands-on opportunity to try fishing yourself. Set against a backdrop of mangroves and serene waters, this activity offers a glimpse into the daily life of coastal communities and a chance to connect with nature in a peaceful setting.	WILDLIFE	f	21	32
ACT_0022	DST_006	Quiet beach relaxation	Escape the crowds and unwind on the untouched beaches of Chilaw, where tranquility meets natural beauty. With soft sands, gentle waves, and a calm atmosphere, these beaches are perfect for relaxation, long walks, and enjoying the sunset. Ideal for travelers seeking a peaceful coastal retreat, Chilaw offers a refreshing break away from busy tourist hotspots.	LEISURE	f	22	33
ACT_0023	DST_007	Dambulla Cave Temple (UNESCO)	Discover the awe-inspiring beauty of the Dambulla Cave Temple, one of the most well-preserved cave temple complexes in Asia. Carved into a rock, this sacred site features stunning Buddha statues, intricate wall paintings, and centuries-old murals that tell stories of Sri Lanka's Buddhist heritage. As you explore the peaceful caves, surrounded by panoramic views of the countryside, you'll experience a deep sense of spirituality and history.	SPIRITUAL	f	23	38
ACT_0024	DST_007	Golden Buddha Temple visit	Visit the iconic Golden Temple of Dambulla, home to a towering golden Buddha statue that welcomes visitors from afar. This impressive landmark combines modern architecture with religious significance and serves as an important spiritual center. The temple complex also houses a museum showcasing Buddhist art and history, making it a perfect stop for cultural exploration and photography.	SPIRITUAL	f	24	39
ACT_0025	DST_007	Ayurvedic Spice garden tour	Engage your senses with a visit to a traditional spice garden in Dambulla, where you'll learn about Sri Lanka's world-famous herbs and spices. Walk through lush gardens filled with cinnamon, cardamom, pepper, and medicinal plants, while experts explain their uses in Ayurveda and local cuisine. This interactive experience often includes demonstrations and herbal treatments, offering both knowledge and relaxation in a natural setting.	LEISURE	f	25	40
ACT_0026	DST_008	Visit Temple of the Tooth	Experience the spiritual heart of Sri Lanka with a visit to the sacred Temple of the Sacred Tooth Relic, one of the most revered Buddhist sites in the world. Located within the royal palace complex, this temple houses a relic of Lord Buddha and attracts thousands of pilgrims daily. Witness traditional rituals, explore the beautiful architecture, and feel the deep spiritual atmosphere that makes Kandy a must-visit destination.	SPIRITUAL	f	26	43
ACT_0027	DST_008	Cultural dance show	Immerse yourself in Sri Lanka's vibrant traditions with an energetic cultural dance performance in Kandy. Featuring traditional Kandyan dances, fire walking, and drumming, this lively show reflects the island's rich heritage and artistic expression. It's a captivating experience that brings Sri Lankan culture to life through rhythm, color, and movement.	CULTURAL	f	27	44
ACT_0028	DST_008	Kandy lake evening walk	Enjoy a peaceful stroll around the scenic Kandy Lake, located in the heart of the city. Surrounded by lush hills and historic landmarks, the lake offers a calm and romantic atmosphere, especially during sunset. This relaxing walk is perfect for unwinding after a day of sightseeing while taking in the beauty of Kandy.	LEISURE	f	28	45
ACT_0029	DST_008	Gem museum visit	Discover the fascinating world of Sri Lanka's precious stones with a visit to a gem museum in Kandy. Learn about the island's rich history in gem mining, see rare stones such as sapphires and rubies, and understand the craftsmanship behind fine jewelry. This experience is both educational and exciting, especially for those interested in luxury and local artistry.	CULTURAL	f	29	46
ACT_0030	DST_008	Peradeniya Botanical Garden	Explore the lush beauty of Royal Botanic Gardens, Peradeniya, one of the finest botanical gardens in Asia. Spread over vast grounds, it features a stunning collection of orchids, palm avenues, bamboo groves, and exotic plants from around the world. This serene environment is perfect for nature lovers, photography enthusiasts, and anyone seeking a refreshing escape.	GENERAL	f	30	47
ACT_0031	DST_008	Ayurvedic Spice garden tour	Enhance your wellness journey with a visit to a traditional spice garden near Kandy. Discover the secrets of Sri Lanka's natural herbs and spices, including cinnamon, cloves, and nutmeg, widely used in Ayurvedic treatments. Guided tours often include demonstrations and relaxing herbal therapies, offering a perfect blend of knowledge, culture, and rejuvenation.	LEISURE	f	31	48
ACT_0032	DST_009	Tea plantation & factory visit	Step into the heart of Sri Lanka's tea country in Nuwara Eliya with a visit to lush tea plantations and a working factory. Walk through rolling green hills where world-famous Ceylon tea is grown, and witness the fascinating process from leaf to cup. Enjoy freshly brewed tea while soaking in breathtaking views, making this a must-do experience for nature lovers and culture enthusiasts.	GENERAL	f	32	50
ACT_0033	DST_009	Enjoy Train ride	Enjoy one of the most beautiful train journeys in the world through the misty hills of Sri Lanka. Travel between Kandy and Nuwara Eliya (Nanu Oya station), passing through tea estates, tunnels, and picturesque villages. This iconic train ride offers stunning panoramic views and unforgettable moments, making it a highlight for photographers and travelers alike.	ADVENTURE	f	33	51
ACT_0034	DST_009	Visit Ramboda waterfall	Witness the majestic beauty of Ramboda Falls, one of the tallest and most scenic waterfalls in the country. Surrounded by lush greenery and misty mountains, this cascading waterfall creates a refreshing and tranquil atmosphere. It's an ideal stop for nature lovers and a perfect photo opportunity during your journey through the hill country.	GENERAL	f	34	52
ACT_0035	DST_009	Explore Hanuman temple	Visit the sacred Sri Bhakta Hanuman Temple, an important site connected to the Ramayana legend. Surrounded by mountains and tea plantations, this temple holds deep spiritual significance for Hindu travelers. The peaceful environment and mythological connection make it a meaningful cultural and religious experience.	SPIRITUAL	f	35	53
ACT_0036	DST_009	Visit Gregory Lake	Relax and unwind at Gregory Lake, a scenic spot surrounded by hills and cool climate. Enjoy activities such as boat rides, cycling, or simply a leisurely walk along the lakeside. This popular attraction offers a perfect blend of relaxation and recreation in the heart of Nuwara Eliya.	LEISURE	f	36	54
ACT_0037	DST_009	Visit to local Strawberry farms	Experience a delightful visit to strawberry farms in Nuwara Eliya, where the cool climate creates ideal conditions for fresh produce. Walk through the farms, taste freshly picked strawberries, and enjoy desserts made from local ingredients. This charming experience is especially loved by families and couples.	GENERAL	f	37	55
ACT_0038	DST_009	Visit to Ambewela farm	Discover the picturesque Ambewela Farm, often called "Little New Zealand" of Sri Lanka. Surrounded by rolling grasslands, this farm is home to high-quality dairy production and offers a peaceful countryside experience. Visitors can explore the farm, see animals, and enjoy fresh dairy products in a scenic setting.	GENERAL	f	38	56
ACT_0039	DST_009	Explore Horton Plains	Explore the breathtaking landscapes of Horton Plains National Park, a UNESCO-listed natural reserve known for its unique biodiversity. Walk through misty grasslands and cloud forests to reach famous viewpoints like World's End and Baker's Falls. This nature experience is perfect for those seeking scenic beauty and a refreshing escape into the wild.	WILDLIFE	f	39	57
ACT_0040	DST_009	Trip to Little England cottages	Experience the colonial charm of Nuwara Eliya, often referred to as "Little England," with its cozy cottages, red-brick houses, and cool climate. A visit to these charming properties offers a glimpse into the British-era lifestyle, surrounded by beautifully maintained gardens and scenic landscapes. It's a perfect experience for relaxation, photography, and enjoying the peaceful hill country atmosphere.	LEISURE	f	40	58
ACT_0041	DST_010	Visit Nine Arch Bridge visit	Witness one of Sri Lanka's most iconic landmarks, the Nine Arch Bridge, a stunning colonial-era railway bridge surrounded by lush jungle and tea plantations. Time your visit to see a train crossing the bridge for the perfect photo opportunity. This picturesque spot is a must-visit for travelers seeking Instagram-worthy views and a touch of history in Ella.	CULTURAL	f	41	60
ACT_0042	DST_010	Enjoy Ravana Pool Club	Relax in style at the popular Ravana Pool Club, where luxury meets tropical vibes. Enjoy refreshing cocktails, infinity pool views, music, and a vibrant atmosphere surrounded by greenery. It's the perfect place to unwind, socialize, and enjoy a premium leisure experience in Ella.	LEISURE	f	42	61
ACT_0043	DST_010	Little Adam's Peak hike	Enjoy a scenic and easy hike to Little Adam's Peak, offering breathtaking panoramic views of the surrounding mountains and tea plantations. The well-marked trail makes it accessible for all fitness levels, and the sunrise or sunset views from the top are truly unforgettable. This is one of the best short hikes in Ella for nature lovers.	ADVENTURE	f	43	62
ACT_0044	DST_010	Flying Ravana zipline	Add some adrenaline to your trip with the thrilling Flying Ravana Zipline, one of the fastest zip lines in South Asia. Glide over lush green hills and enjoy stunning aerial views of Ella's landscape. This exciting experience is perfect for adventure seekers looking for a unique perspective of the region.	ADVENTURE	f	44	63
ACT_0045	DST_010	Explore Ella town	Discover the laid-back charm of Ella, a vibrant town surrounded by nature. Stroll through its cozy streets filled with cafes, boutique shops, and friendly locals. The relaxed atmosphere, combined with cool weather and scenic views, makes Ella a favorite destination for travelers from around the world.	LEISURE	f	45	64
ACT_0046	DST_010	Ella Rock hike	Challenge yourself with a rewarding hike to Ella Rock, one of the most scenic viewpoints in the region. The trail takes you through railway tracks, tea plantations, and forest paths, leading to breathtaking views from the summit. This hike is perfect for adventure lovers seeking both excitement and natural beauty.	ADVENTURE	f	46	65
ACT_0047	DST_010	Café hopping	Indulge in Ella's vibrant café culture by exploring its many unique and stylish spots. From scenic mountain-view cafés to cozy hidden gems in Ella, you can enjoy freshly brewed coffee, delicious international cuisine, and relaxed vibes. This experience is perfect for unwinding, socializing, and capturing beautiful travel moments.	LEISURE	f	47	66
ACT_0048	DST_011	Jeep safari in Yala National Park	Embark on an exciting wildlife adventure in Yala National Park, the most famous national park in Sri Lanka, known for having one of the highest densities of leopards in the world. Travel through diverse landscapes, lagoons, and open grasslands in a private jeep, guided by experienced trackers. Along the way, you may encounter elephants, crocodiles, sloth bears, and a wide variety of bird species. This thrilling safari experience offers a perfect blend of nature, adventure, and unforgettable moments in the wild.	WILDLIFE	f	48	68
ACT_0049	DST_012	Kataragama temple visit	Visit the sacred Kataragama Temple, one of the most important pilgrimage sites in Sri Lanka, revered by Buddhists, Hindus, and Muslims alike. Dedicated to Lord Skanda (Kataragama Deviyo), this spiritual complex attracts devotees from across the country and beyond. Surrounded by a peaceful yet vibrant atmosphere, the temple offers a unique opportunity to experience Sri Lanka's rich religious harmony and devotion.	SPIRITUAL	f	49	70
ACT_0050	DST_012	Evening pooja experience	Witness the powerful energy of the evening pooja at Kataragama Temple, where rituals are performed with fire, drums, and chanting. As the sun sets, the temple comes alive with devotion, creating an intense and emotional atmosphere. This spiritual ceremony offers a rare glimpse into traditional worship practices and leaves visitors with a deeply moving and unforgettable experience.	SPIRITUAL	f	50	71
ACT_0051	DST_012	Explore Spiritual rituals	Immerse yourself in the unique spiritual traditions of Kataragama, where devotees perform ancient rituals as acts of faith and gratitude. From offerings and prayers to symbolic practices passed down through generations, this experience allows you to witness authentic devotion up close. It's a profound cultural encounter that provides deeper insight into Sri Lanka's spiritual life and beliefs.	SPIRITUAL	f	51	72
ACT_0052	DST_013	Silent beach relaxation	Unwind on the serene shores of Tangalle, where untouched beaches and crystal-clear waters create the perfect setting for relaxation. Far from crowded tourist spots, Tangalle offers a peaceful atmosphere ideal for sunbathing, long walks, and enjoying the soothing sound of the ocean. This hidden gem is perfect for travelers seeking tranquility and a true tropical escape.	LEISURE	f	52	76
ACT_0053	DST_013	Visit Rekawa turtle conservation project	Experience a unique wildlife encounter at the Rekawa Turtle Conservation Project, one of the most important turtle nesting sites in Sri Lanka. Visit in the evening to witness sea turtles coming ashore to lay their eggs in a natural and protected environment. This responsible and educational experience offers a rare opportunity to observe marine life up close while supporting conservation efforts.	WILDLIFE	f	53	77
ACT_0054	DST_013	Lagoon kayaking	Explore the calm and scenic lagoons near Tangalle with a relaxing kayaking experience. Paddle through mangrove forests, observe birdlife, and enjoy the peaceful surroundings at your own pace. This eco-friendly activity is perfect for nature lovers looking to connect with the quiet beauty of Sri Lanka's coastal ecosystems.	WILDLIFE	f	54	78
ACT_0055	DST_014	Whale watching tours	Set out on an unforgettable ocean adventure from Mirissa, one of the best places in the world for whale watching. Cruise into the deep waters of the Indian Ocean, where you may spot majestic blue whales, sperm whales, and playful dolphins in their natural habitat. This early morning experience is a must for nature lovers and offers a rare opportunity to witness marine giants up close.	WILDLIFE	f	55	80
ACT_0056	DST_014	Explore Parrot Rock	Take a short walk across the shallow waters to reach Parrot Rock, a small hill offering panoramic views of Mirissa Beach. This hidden viewpoint is perfect for capturing stunning photos of the coastline, especially during sunrise or sunset. It's a quick yet rewarding experience for travelers exploring the area.	LEISURE	f	56	81
ACT_0057	DST_014	Coconut Tree Hill sunset	Visit the iconic Coconut Tree Hill, one of the most photographed spots in Sri Lanka. With a row of tall coconut palms overlooking the ocean, this location offers breathtaking sunset views and a perfect tropical vibe. It's an ideal place to relax, take photos, and enjoy the beauty of Sri Lanka's southern coast.	LEISURE	f	57	82
ACT_0058	DST_014	Explore Mirissa Beach & Secret beach	Enjoy the lively atmosphere of Mirissa Beach, known for its golden sands, turquoise waters, and beachfront cafés. For a more secluded experience, visit Secret Beach Mirissa, a quiet bay perfect for swimming and relaxing away from the crowds. Together, these spots offer the perfect mix of energy and tranquility.	LEISURE	f	58	83
ACT_0059	DST_014	Beach nightlife	Experience the vibrant nightlife of Mirissa, where beachside bars and restaurants come alive after sunset. Enjoy music, seafood dinners, fire shows, and lively parties right by the ocean. This energetic atmosphere makes Mirissa a favorite destination for young travelers and those looking to enjoy Sri Lanka's coastal nightlife.	LEISURE	f	59	84
ACT_0060	DST_014	Enjoy Surfing experience	Ride the waves along the الساحل of Mirissa, where gentle breaks make it an ideal spot for both beginners and intermediate surfers. With warm waters and professional instructors available, surfing in Mirissa is a fun and exciting way to experience the ocean. It's a must-try activity for adventure seekers visiting the south coast.	ADVENTURE	f	60	85
ACT_0061	DST_015	Enjoy Surfing experience	Ride the gentle waves of Weligama, one of the best beginner-friendly surfing destinations in Sri Lanka. With its wide sandy bay and consistent waves, Weligama offers the perfect conditions for learning and improving your surfing skills. Professional instructors and surf schools are readily available, making it an exciting and accessible experience for all levels.	ADVENTURE	f	61	87
ACT_0062	DST_015	Stilt fishermen experience	Witness the iconic tradition of stilt fishing along the الساحل near Weligama, a unique cultural practice found only in Sri Lanka. Perched on wooden stilts above the shallow waters, fishermen demonstrate their age-old fishing technique, creating a truly memorable and photogenic scene. This experience offers insight into local heritage and is a must-see for cultural explorers.	CULTURAL	f	62	88
ACT_0063	DST_015	Beach cafés & chill vibe	Relax and soak in the laid-back atmosphere of Weligama, known for its trendy beach cafés and relaxed coastal lifestyle. Enjoy freshly brewed coffee, healthy meals, and ocean views while listening to the sound of the waves. This chill vibe makes Weligama a favorite spot for digital nomads, couples, and travelers looking to unwind by the sea.	LEISURE	f	63	89
ACT_0064	DST_016	Advanced surfing	Ride powerful waves along Ahangama, a hotspot for experienced surfers seeking consistent reef and point breaks. Known for its stronger waves and less crowded surf spots, Ahangama offers the perfect setting to challenge your skills and elevate your surfing experience. This destination attracts surf enthusiasts from around the world looking for both adventure and a relaxed coastal atmosphere.	ADVENTURE	f	64	92
ACT_0065	DST_016	Boutique café hopping	Explore the stylish café scene of Ahangama, known for its trendy boutique cafés and creative spaces. From artisan coffee to healthy brunch options, each café offers a unique ambiance blending modern design with tropical charm. This experience is perfect for travelers who enjoy good food, aesthetic interiors, and a relaxed social vibe by the ocean.	LEISURE	f	65	93
ACT_0066	DST_016	Instagram-style beach photography spots	Capture stunning travel moments at some of the most photogenic locations in Ahangama. From palm-lined beaches and oceanfront villas to unique coastal viewpoints, Ahangama is a paradise for photography lovers and content creators. Whether it's sunrise, sunset, or candid beach shots, every corner offers a perfect backdrop for your Instagram-worthy memories.	LEISURE	f	66	94
ACT_0067	DST_017	Jungle Beach visit	Escape to the hidden paradise of Jungle Beach, a secluded bay surrounded by lush greenery and calm turquoise waters. Accessible through a short jungle trail, this peaceful beach offers a perfect retreat away from the crowds. Ideal for swimming, relaxing, and enjoying nature, Jungle Beach is a must-visit for travelers seeking a quiet and scenic coastal experience.	LEISURE	f	67	96
ACT_0068	DST_017	Enjoy Snorkeling experience	Discover the underwater beauty of Unawatuna with an exciting snorkeling experience in its clear, shallow waters. Swim among colorful fish, coral reefs, and diverse marine life in one of Sri Lanka's best beginner-friendly snorkeling spots. This activity is perfect for families, couples, and anyone looking to explore the ocean in a fun and easy way.	GENERAL	f	68	97
ACT_0069	DST_017	Enjoy Diving experience	Explore deeper into the ocean with a diving experience in Unawatuna, where you can discover vibrant coral gardens, shipwrecks, and rich marine biodiversity. Guided by professional instructors, this experience caters to both beginners and certified divers. It's an unforgettable adventure for those looking to experience Sri Lanka's underwater world up close.	ADVENTURE	f	69	98
ACT_0070	DST_017	Rumassala Peace pagoda	Visit the serene Japanese Peace Pagoda Rumassala, located on a hill overlooking the океан. This peaceful Buddhist stupa offers breathtaking panoramic views of the coastline and surrounding जंगल. Known for its calm and spiritual atmosphere, it's an ideal spot for meditation, sunset views, and quiet reflection away from the busy beach scene.	SPIRITUAL	f	70	99
ACT_0071	DST_017	Beach parties & restaurants	Enjoy the lively atmosphere of Unawatuna, famous for its beachfront restaurants, live music, and vibrant beach parties. As the sun sets, the shoreline transforms into a social hub where you can enjoy fresh seafood, cocktails, and entertainment right by the ocean. This experience is perfect for travelers looking to combine relaxation with nightlife.	LEISURE	f	71	100
ACT_0072	DST_018	Galle Fort walking tour (UNESCO)	Step into history with a walking tour of the iconic Galle Fort, a beautifully preserved colonial fortress built by the Portuguese and later expanded by the Dutch. Wander through cobblestone streets lined with charming villas, boutique hotels, and historic landmarks. This immersive experience offers a perfect blend of culture, architecture, and seaside charm, making it one of the most unique destinations in Sri Lanka.	CULTURAL	f	72	102
ACT_0073	DST_018	Lighthouse & sunset views	Enjoy breathtaking coastal views at the historic Galle Lighthouse, located within the fort overlooking the океан. As the sun begins to set, the sky transforms into vibrant shades of orange and pink, creating a magical atmosphere along the fort walls. This is one of the best sunset spots on the south coast, perfect for photography and relaxation.	CULTURAL	f	73	103
ACT_0074	DST_018	Shopping (boutiques, handicrafts)	Explore the vibrant shopping scene inside Galle Fort, where you'll find unique boutiques, art galleries, and local handicraft stores. From handmade jewelry and textiles to souvenirs and designer pieces, shopping here offers a perfect mix of tradition and modern style. It's an ideal experience for travelers looking to take home something special from Sri Lanka.	CULTURAL	f	74	104
ACT_0075	DST_018	Café culture (very popular with Europeans)	Experience the lively café culture of Galle Fort, known for its trendy cafés, artisan coffee, and international cuisine. With its European-style ambiance and coastal views, the fort has become a favorite spot for travelers from around the world. Whether you're enjoying brunch, fresh seafood, or a sunset coffee, this experience perfectly combines relaxation with a sophisticated vibe.	CULTURAL	f	75	105
ACT_0076	DST_019	Water sports (jet ski, banana boat, parasailing)	Experience the thrill of water sports in Bentota, one of the best destinations in Sri Lanka for adventure activities. From high-speed jet skiing to fun-filled banana boat rides and breathtaking parasailing over the океан, there's something for every adrenaline seeker. This exciting experience perfectly combines fun, adventure, and stunning coastal views.	ADVENTURE	f	76	108
ACT_0077	DST_019	Bentota river safari	Explore the rich biodiversity of the Bentota River with a scenic boat safari through mangroves and calm waterways. As you cruise along the river, you may spot crocodiles, exotic birds, and local wildlife while visiting small islands and cinnamon plantations. This relaxing yet adventurous journey offers a unique perspective of Sri Lanka's natural beauty.	WILDLIFE	f	77	109
ACT_0078	DST_019	Turtle hatchery visit	Visit a turtle conservation center near Bentota and learn about efforts to protect endangered sea turtles. Observe baby turtles, understand the hatching process, and even witness their release into the океан (depending on timing). This meaningful and educational experience is perfect for families and wildlife lovers, offering a closer connection to marine conservation in Sri Lanka.	WILDLIFE	f	78	110
ACT_0079	DST_019	Kande Viharaya temple	Step into a powerful spiritual experience at the majestic Kande Viharaya Temple, home to one of the tallest seated Buddha statues in the world. As you walk through the sacred temple grounds, you feel a deep sense of peace, devotion, and cultural richness. The sound of chanting, the scent of incense, and the golden Buddha create a truly emotional connection with Sri Lanka's Buddhist heritage.	SPIRITUAL	f	79	111
ACT_0080	DST_019	Madu river safari & Cinnamon islands	Discover the magical world of the Madu River, where nature unfolds in its purest form. A boat safari through winding mangroves takes you past small islands, hidden temples, and untouched ecosystems. You will witness exotic birds, water monitors, and peaceful village life along the riverbanks - a journey that feels like entering a living natural paradise filled with calm and wonder.	WILDLIFE	f	80	112
ACT_0081	DST_020	Colombo city tour (Gangaramaya, Independence Square)	Discover the dynamic capital of Sri Lanka with a guided tour of Colombo, where modern life blends seamlessly with cultural heritage. Visit iconic landmarks such as the sacred Gangaramaya Temple and the historic Independence Memorial Hall. This experience offers a perfect introduction to the city's history, architecture, and spiritual significance.	SPIRITUAL	f	81	114
ACT_0082	DST_020	Shopping (One Galle Face, Pettah market)	Enjoy a diverse shopping experience in Colombo, from modern malls to traditional markets. Visit One Galle Face Mall for international brands, dining, and ocean views, or explore the bustling streets of Pettah Market for local goods, textiles, and a vibrant street shopping atmosphere. This blend of old and new makes Colombo a shopper's paradise.	LEISURE	f	82	115
ACT_0083	DST_020	Rooftop dining & nightlife	Experience the energetic nightlife of Colombo with rooftop dining and stylish lounges overlooking the city skyline and океан. Enjoy gourmet cuisine, creative cocktails, and live music in a sophisticated setting. Whether it's a romantic dinner or a night out with friends, Colombo offers some of the best nightlife experiences in Sri Lanka.	LEISURE	f	83	116
ACT_0084	DST_020	Street food tour	Dive into the flavors of Colombo with an exciting street food tour through its lively neighborhoods. Taste local favorites like kottu roti, hoppers, and fresh seafood while exploring hidden food spots loved by locals. This culinary journey offers a delicious way to experience Sri Lanka's culture, traditions, and everyday life.	GENERAL	f	84	117
ACT_0085	DST_021	Kalutara Bodhiya temple visit	Visit the sacred Kalutara Bodhiya, one of the most revered Buddhist sites in Sri Lanka, beautifully located along the Kalu Ganga river. This historic temple is home to a sacred Bodhi tree believed to be a descendant of the original tree under which Buddha attained enlightenment. Surrounded by a peaceful atmosphere, it offers a deeply spiritual experience where visitors can observe rituals, offer prayers, and connect with Sri Lanka's rich religious heritage.	SPIRITUAL	f	85	119
ACT_0086	DST_021	Beach relaxation	Unwind on the tranquil beaches of Kalutara, where golden sands and gentle waves create the perfect setting for relaxation. Less crowded than other coastal destinations, Kalutara offers a calm and refreshing escape ideal for sunbathing, leisurely walks, and enjoying the soothing ocean breeze. It's the perfect place to slow down and end your journey on a peaceful note.	LEISURE	f	86	120
ACT_0087	DST_022	Dolphin watching	Embark on an unforgettable marine adventure in Kalpitiya, one of the best places in Sri Lanka for dolphin watching. Cruise into the open ocean where you can witness large pods of spinner dolphins jumping and playing alongside the boat. This early morning experience offers breathtaking views of the sea and a magical connection with marine wildlife in their natural habitat.	WILDLIFE	f	87	123
ACT_0088	DST_022	Kite surfing	Experience world-class kite surfing in Kalpitiya, known for its consistent winds and ideal lagoon conditions. Whether you are a beginner or an advanced rider, Kalpitiya offers perfect flat waters and professional instructors to elevate your skills. This destination is considered one of the top kite surfing spots in Asia, attracting adventure seekers from around the globe.	WILDLIFE	f	88	124
ACT_0089	DST_022	Lagoon kayaking	Explore the peaceful lagoons of Kalpitiya with a relaxing kayaking experience through mangroves and calm waters. Paddle at your own pace while observing birdlife and enjoying the untouched natural surroundings. This eco-friendly activity is perfect for travelers looking to connect with nature and enjoy a quiet escape.	WILDLIFE	f	89	125
ACT_0090	DST_023	Calm shallow beach swimming	Enjoy the peaceful waters of Pasikuda, famous for its exceptionally calm and shallow sea. Stretching far into the ocean, the gentle waters make it one of the safest beaches in Sri Lanka for swimming, especially for families and non-swimmers. With soft golden and crystal-clear water, Pasikuda offers a perfect setting for relaxation and carefree beach time.	LEISURE	f	90	127
ACT_0091	DST_023	Snorkeling	Discover the underwater beauty of Pasikuda with a relaxing snorkeling experience in its clear, shallow waters. Explore colorful marine life and coral formations while enjoying excellent visibility and calm conditions. This easy and enjoyable activity is ideal for beginners and anyone looking to experience Sri Lanka's marine world in a safe and peaceful environment.	LEISURE	f	91	128
ACT_0092	DST_024	Koggala lake boat safari	Explore the tranquil waters of Koggala Lake with a scenic boat safari through mangroves and small islands. As you cruise across the lake, you'll encounter rich birdlife, traditional fishing scenes, and untouched natural beauty. This relaxing journey offers a unique blend of nature and culture, making it one of the most peaceful experiences on Sri Lanka's south coast.	WILDLIFE	f	92	131
ACT_0093	DST_024	Cinnamon island visit	Visit a traditional cinnamon island in Koggala Lake and discover how Sri Lanka's world-famous cinnamon is cultivated and processed. Watch local artisans demonstrate peeling techniques and learn about the history of this valuable spice. This authentic cultural experience provides a deeper understanding of local livelihoods while offering a chance to enjoy the serene island atmosphere.	CULTURAL	f	93	132
ACT_0094	DST_025	Surfing	Experience the legendary waves of Arugam Bay, known as one of the best surf points in the world. The long, clean right-hand point breaks create the perfect ride for both beginners and professional surfers. As you stand on the board, feel the warm ocean breeze, endless blue horizon, and pure adrenaline that makes Arugam Bay a true surfer's paradise in Sri Lanka.	ADVENTURE	f	94	134
ACT_0095	DST_025	Lagoon safari (crocodiles, elephants)	Escape into the hidden wilderness just minutes away from the beach. A lagoon safari in Arugam Bay takes you through calm mangrove waters where nature reveals its raw beauty. Watch crocodiles resting silently along the banks, elephants moving gracefully nearby, and flocks of exotic birds flying over the lagoon - a peaceful yet thrilling wildlife experience in untouched nature.	WILDLIFE	f	95	135
ACT_0096	DST_025	Beach parties	When the sun sets, Arugam Bay transforms into a vibrant coastal celebration. Seasonal beach parties bring together travelers from all over the world under the stars, with live music, fire dances, and oceanfront DJ nights. The sound of waves blends with the rhythm of music, creating unforgettable tropical nights filled with energy, freedom, and connection.	CULTURAL	t	96	136
ACT_0097	DST_025	Yoga & wellness retreats	Slow down and reconnect with yourself in the peaceful rhythm of Arugam Bay. Surrounded by palm trees and ocean views, yoga and wellness retreats offer daily sessions of yoga, meditation, and healing practices. It is the perfect place to restore balance, breathe deeply, and experience inner peace while listening to the calming sound of the Indian Ocean.	WELLNESS	f	97	137
\.


--
-- Data for Name: destinations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.destinations (id, name, slug, is_active, sort_order) FROM stdin;
DST_003	Polonnaruwa	polonnaruwa	t	3
DST_004	Anuradhapura	anuradhapura	t	4
DST_005	Trincomalee	trincomalee	t	5
DST_007	Dambulla	dambulla	t	7
DST_008	Kandy	kandy	t	8
DST_009	Nuwara Eliya	nuwara-eliya	t	9
DST_010	Ella	ella	t	10
DST_011	Yala	yala	t	11
DST_012	Kataragama	kataragama	t	12
DST_013	Tangalle	tangalle	t	13
DST_014	Mirissa	mirissa	t	14
DST_015	Weligama	weligama	t	15
DST_016	Ahangama	ahangama	t	16
DST_017	Unawatuna	unawatuna	t	17
DST_018	Galle	galle	t	18
DST_019	Bentota	bentota	t	19
DST_020	Colombo	colombo	t	20
DST_021	Kalutara	kalutara	t	21
DST_022	Kalpitiya	kalpitiya	t	22
DST_023	Pasikuda	pasikuda	t	23
DST_024	Koggala	koggala	t	24
DST_025	Arugam Bay	arugam-bay	t	25
DST_006	Chilaw	chilaw	t	6
DST_001	Negombo	negombo	t	1
DST_002	Sigiriya	sigiriya	t	2
\.


--
-- Name: Attachment Attachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_pkey" PRIMARY KEY (id);


--
-- Name: Booking Booking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);


--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: GeneratedDocument GeneratedDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GeneratedDocument"
    ADD CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY (id);


--
-- Name: HotelBooking HotelBooking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HotelBooking"
    ADD CONSTRAINT "HotelBooking_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: Pax Pax_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Pax"
    ADD CONSTRAINT "Pax_pkey" PRIMARY KEY (id);


--
-- Name: StatusHistory StatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StatusHistory"
    ADD CONSTRAINT "StatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: TransportDayPlan TransportDayPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportDayPlan"
    ADD CONSTRAINT "TransportDayPlan_pkey" PRIMARY KEY (id);


--
-- Name: TransportPlan TransportPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportPlan"
    ADD CONSTRAINT "TransportPlan_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: destination_activities destination_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destination_activities
    ADD CONSTRAINT destination_activities_pkey PRIMARY KEY (id);


--
-- Name: destinations destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_pkey PRIMARY KEY (id);


--
-- Name: destinations destinations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_slug_key UNIQUE (slug);


--
-- Name: Booking_bookingId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Booking_bookingId_key" ON public."Booking" USING btree ("bookingId");


--
-- Name: Client_bookingId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Client_bookingId_key" ON public."Client" USING btree ("bookingId");


--
-- Name: Invoice_bookingId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_bookingId_key" ON public."Invoice" USING btree ("bookingId");


--
-- Name: Invoice_invoiceNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON public."Invoice" USING btree ("invoiceNumber");


--
-- Name: TransportPlan_bookingId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TransportPlan_bookingId_key" ON public."TransportPlan" USING btree ("bookingId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Attachment Attachment_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Booking Booking_salesOwnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_salesOwnerId_fkey" FOREIGN KEY ("salesOwnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Client Client_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GeneratedDocument GeneratedDocument_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GeneratedDocument"
    ADD CONSTRAINT "GeneratedDocument_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HotelBooking HotelBooking_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HotelBooking"
    ADD CONSTRAINT "HotelBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Invoice Invoice_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Pax Pax_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Pax"
    ADD CONSTRAINT "Pax_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StatusHistory StatusHistory_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StatusHistory"
    ADD CONSTRAINT "StatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TransportDayPlan TransportDayPlan_transportPlanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportDayPlan"
    ADD CONSTRAINT "TransportDayPlan_transportPlanId_fkey" FOREIGN KEY ("transportPlanId") REFERENCES public."TransportPlan"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TransportPlan TransportPlan_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransportPlan"
    ADD CONSTRAINT "TransportPlan_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: destination_activities destination_activities_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destination_activities
    ADD CONSTRAINT destination_activities_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict gkbUqHFraL1ozeumBpVZZ9eL4VwSGF7gFp9uqlkYMaIWIwkLqxGxkdRmkUZf4ka

