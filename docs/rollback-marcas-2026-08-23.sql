-- Rollback de la normalización de marcas (2026-08-23).
--
-- Qué se hizo: 6 marcas tenían variantes de escritura (mayúsculas distintas o
-- errores de tipeo) que las hacían aparecer como marcas separadas en el
-- filtro del catálogo, y en el caso de los typos ("Optimun Nutrition", "APS"),
-- hacían que el producto NO apareciera al filtrar por la marca correcta:
--
--   Biosport / BioSport / BioSport USA        -> BioSport
--   Muscletech / MuscleTech                    -> MuscleTech
--   nutricost / Nutricost                      -> Nutricost
--   primaforce / Primaforce                    -> PrimaForce
--   APS / APS Nutrition                        -> APS Nutrition
--   Optimun Nutrition / Optimun  Nutrition /
--     Optimum Nutrition                        -> Optimum Nutrition
--
-- Verificado producto por producto antes de fusionar (Isomorph/Isomorph 28 =
-- APS Nutrition, BioSport Xtreme Gainer = BioSport, Gold Standard/Serious
-- Mass = Optimum Nutrition): no son marcas distintas, son la misma escrita
-- distinto.
--
-- Este archivo restaura el `brand` exacto que tenía cada producto antes del
-- cambio. Ejecutar SOLO si hay que deshacerlo.

update products set brand = 'APS' where id = '68a3ce97-a718-422e-ae09-c2fdc3c32c7e';
update products set brand = 'APS Nutrition' where id = '2c928e9c-f425-4fcb-b178-2ba118ef0bfa';
update products set brand = 'APS Nutrition' where id = '5becf937-8e6c-473b-b3af-1a407cd33abd';
update products set brand = 'Biosport' where id = '06470ce3-a77b-4d49-9ce8-665dbaa54491';
update products set brand = 'Biosport' where id = '66c7962b-927c-4032-a61b-4a9af6dbc0c5';
update products set brand = 'Biosport' where id = '735f766d-77b4-4b9a-9a21-ffc13facde28';
update products set brand = 'BioSport' where id = '149678ac-d690-4b76-b45f-b4a1ec4d234c';
update products set brand = 'BioSport USA' where id = 'a1507ebe-13b5-4e2d-ba2b-956d500b81ec';
update products set brand = 'Muscletech' where id = '5cda32e5-3af9-4115-9255-4e181f569695';
update products set brand = 'MuscleTech' where id = '10c26095-3945-4ee8-9d49-939f556c6a43';
update products set brand = 'MuscleTech' where id = '1bdcc3a6-b91a-446b-a21d-e85fa7940269';
update products set brand = 'MuscleTech' where id = '2e1c859a-1ec2-414e-af32-58272b55bdef';
update products set brand = 'MuscleTech' where id = '456d03c8-24d8-465d-80cb-5896c2cc553a';
update products set brand = 'MuscleTech' where id = '4c2136ad-1bfc-4344-b3ce-f8d298284571';
update products set brand = 'MuscleTech' where id = '83308272-b9dc-4077-9934-fe749b981a22';
update products set brand = 'MuscleTech' where id = 'a5900426-636c-4f99-967d-f68fb5f1c814';
update products set brand = 'MuscleTech' where id = 'b571d904-660f-4402-9938-326a0c97e628';
update products set brand = 'MuscleTech' where id = 'e55f5d54-76d7-4d5b-8305-622941acbdeb';
update products set brand = 'nutricost' where id = '3b6dd833-bcbe-4a17-96f5-c3daee134b87';
update products set brand = 'nutricost' where id = '527d95a5-9809-4643-951b-df6e4332d222';
update products set brand = 'nutricost' where id = '5ec30115-8c94-4377-bdee-818de6ce1752';
update products set brand = 'Nutricost' where id = '0245dc9e-0f2d-4734-96fe-172a5eb58c4b';
update products set brand = 'Nutricost' where id = '0315945e-c4ae-447c-84ba-7b32c7f6e730';
update products set brand = 'Nutricost' where id = '2bc1c2b0-e51e-4ea5-84ce-e84c5290af94';
update products set brand = 'Nutricost' where id = '34289488-cdc8-4ed8-a17d-053bf35970f4';
update products set brand = 'Nutricost' where id = '3bb09e02-065d-436e-afbd-39952b124605';
update products set brand = 'Nutricost' where id = '3df78699-ba8d-4d26-94ac-8f5451d055bc';
update products set brand = 'Nutricost' where id = '3f93bc6a-2b90-48b9-bf17-a5d3a3ca6e21';
update products set brand = 'Nutricost' where id = '4e861129-a9d0-476c-8bd3-840859aaa3a3';
update products set brand = 'Nutricost' where id = '579d1e58-df30-4e45-a8d6-ff9e4d8a2c90';
update products set brand = 'Nutricost' where id = '5a2370cb-2293-4774-a527-5a2aff8430d4';
update products set brand = 'Nutricost' where id = '6388a361-31b7-48e1-9996-a3aa68d5687f';
update products set brand = 'Nutricost' where id = '6c865d79-75db-43bb-b6ca-4d8f3bb6916c';
update products set brand = 'Nutricost' where id = '7269a93b-28ce-4494-aa2c-6e93ecf09712';
update products set brand = 'Nutricost' where id = '74adbf7a-c1cd-4beb-881f-f37ffa4f60f8';
update products set brand = 'Nutricost' where id = '751b304c-2e70-464c-b9d1-09f393d94b4e';
update products set brand = 'Nutricost' where id = '8e4999cf-9ad0-45c0-8de1-bbbc18e3d6fe';
update products set brand = 'Nutricost' where id = '987f7501-c624-426f-a298-71621498ff51';
update products set brand = 'Nutricost' where id = '98cd27c6-5e22-440b-8f47-0288d29f3061';
update products set brand = 'Nutricost' where id = 'a6678c34-c2c6-4c69-a83f-44f9b82d62ff';
update products set brand = 'Nutricost' where id = 'c240aeee-ae10-4a0c-b884-6b022e216840';
update products set brand = 'Nutricost' where id = 'c5dbcd6a-678d-4b34-a2a1-950166f04df0';
update products set brand = 'Nutricost' where id = 'f1b4a10c-4a2f-44c8-ac70-ced0f680e1ce';
update products set brand = 'Nutricost' where id = 'f8354e7e-38f1-43ae-868f-246f07f3b5e6';
update products set brand = 'Nutricost' where id = 'fb80ce41-59b4-4f4a-bb1a-58c05cc90488';
update products set brand = 'Optimum Nutrition' where id = '09c48d1e-3989-4542-811d-f64aad184129';
update products set brand = 'Optimum Nutrition' where id = '11274920-16f5-4cce-9d26-994faf55ba35';
update products set brand = 'Optimum Nutrition' where id = '1eed31b0-0c0a-4d0f-8bb3-2f737f9c9f57';
update products set brand = 'Optimum Nutrition' where id = '329d3bb8-bec1-45bd-90f8-837eee2b1725';
update products set brand = 'Optimum Nutrition' where id = '3ef2bc8d-1fed-471b-9fa8-6f0aefda9f48';
update products set brand = 'Optimum Nutrition' where id = '4565b067-c1d5-4bfa-b7f3-69d611d421b1';
update products set brand = 'Optimum Nutrition' where id = '58293a06-37dd-47b3-bcfa-10a7b61d3c9e';
update products set brand = 'Optimum Nutrition' where id = '5cdeab50-fa06-40e8-b2c3-cb95d04417c1';
update products set brand = 'Optimum Nutrition' where id = '5e30a4f4-cead-4e71-a939-641c961fd65c';
update products set brand = 'Optimum Nutrition' where id = '7e6fc6ff-ac05-4397-b520-adefed07351e';
update products set brand = 'Optimum Nutrition' where id = '89868fce-2e0c-4d65-a880-e10562a999fe';
update products set brand = 'Optimum Nutrition' where id = '967adf92-228c-4aec-9a81-b100ca75476a';
update products set brand = 'Optimum Nutrition' where id = 'ac5a9abf-d3da-4fff-bdc8-1dd90de45ac0';
update products set brand = 'Optimum Nutrition' where id = 'd6092b52-95f9-463e-88d7-6f5b5550958b';
update products set brand = 'Optimum Nutrition' where id = 'd832b4cc-f32b-429b-94d8-834a9a48bd99';
update products set brand = 'Optimum Nutrition' where id = 'f525dde9-36f7-4529-a4ce-a632f0e60e91';
update products set brand = 'Optimum Nutrition' where id = 'f83ba8d0-8c7f-46ad-88db-054dcb5e6761';
update products set brand = 'Optimun  Nutrition' where id = 'c1dc0f90-ae8c-400c-8551-24ca5b456dbf';
update products set brand = 'Optimun Nutrition' where id = 'f4068c9b-d94c-41e4-847f-8b98889e3ef2';
update products set brand = 'primaforce' where id = 'c7edb7e9-251f-4df4-8f6b-984bf9237cca';
update products set brand = 'Primaforce' where id = '14c45881-d78c-48f7-bd38-faebfad13bd9';
update products set brand = 'Primaforce' where id = '81d27094-0403-4dae-a4c2-f556cf155ec9';
