-- Rollback de la corrección de "marca = ingrediente/nombre de producto" (2026-08-23).
--
-- Qué se hizo: 13 productos tenían el nombre del ingrediente o del producto
-- cargado en el campo "marca" en vez del fabricante real (ej. "Inositol" en
-- vez de "Nutricost"). Se verificó cada uno contra la foto real del producto
-- (o el nombre de archivo original de Supabase Storage, que conserva la marca
-- de cuando se subió) antes de corregir — ninguno se adivinó.
--
-- Nutricost: Inositol, Biotin, Maltodextrin (2lb y 8lb), Olive Leaf,
--   Resveratrol, Zinc Chelate, Potassium 30 cápsulas (NO el de 240: sin foto,
--   queda sin confirmar), R-Alpha Lipoic Acid.
-- PrimaForce: ZMA 180 cápsulas (foto confirma "PRIMAFORCE" en la etiqueta).
-- BioSport: Adiplex (foto dice "Bio-Sport USA").
-- Hi-Tech Pharmaceuticals: H20 Expulsion y las 3 variantes de Precision
--   Protein (marca "HTP" -> nombre completo confirmado en foto; unifica con
--   Lipodrene Fat Burner, que ya usaba el nombre completo).
-- MHP: Xpel Diurético (foto dice "MHP — Maximum Human Performance").
--
-- Ejecutar SOLO si hay que deshacerlo.

update products set brand = 'Adiplex' where id = '355eb1bd-ee1d-4246-b8e6-5b3b02e37308';
update products set brand = 'Biotin' where id = '162bb085-1802-43c6-9e60-7974e7e79bf7';
update products set brand = 'HTP' where id = '856b633c-96eb-480b-8ef2-d490bf7642d6';
update products set brand = 'Inositol' where id = '3a110221-6ffd-4b2c-950b-d0889d0f97a1';
update products set brand = 'Maltodextrin' where id = '420ca056-bae7-4335-84f1-b3595c28ca50';
update products set brand = 'Maltodextrin' where id = '949f018f-c8cb-4f48-9f31-1ada93bfa42f';
update products set brand = 'Olive Leaf' where id = 'e4b07c5e-49ae-4458-93b6-51e366ca22c6';
update products set brand = 'Potassium' where id = 'e28615b1-9d7c-4f7a-946e-edb27109d21c';
update products set brand = 'HTP' where id = '81362118-5cc3-44bc-b043-fef7e7e45f66';
update products set brand = 'HTP' where id = '2819bd57-fac1-4f5f-999d-5b6ca2c5482a';
update products set brand = 'HTP' where id = '8260e638-772e-443a-b501-fab9f1ba9ba4';
update products set brand = 'R-ALA' where id = '8cdbe315-8ac7-41d6-abe0-95d6c601e518';
update products set brand = 'Resveratrol' where id = '052804a3-9bf7-4da7-bebc-14ebd06147bc';
update products set brand = 'Xpel' where id = '1f9505b7-a3f1-4fed-8b1d-7ef120b4cea7';
update products set brand = 'Zinc Chelate' where id = 'd8866010-89a3-47bf-8992-c72f09bbe9fe';
update products set brand = 'ZMA' where id = 'b3b09fae-60f1-498c-a6bc-2f0488c5fbb9';
