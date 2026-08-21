-- Rollback de la Fase 0 del estándar de fichas (2026-08-20).
--
-- Qué se hizo: se vaciaron las 34 descripciones que eran 100% relleno, porque
-- llevaban el precio incrustado en el texto ("Precio de catálogo: $X") y en 28
-- casos ese precio YA NO coincidía con el precio real del producto: el sitio
-- mostraba públicamente dos precios distintos para el mismo artículo.
--
-- No se perdió contenido útil: se verificó línea por línea que ninguna de estas
-- 34 descripciones decía algo más que la tautología ("X es un producto de X
-- dentro de la categoría Y"), el precio, y la lista de sabores (que ya se
-- renderiza aparte desde product_flavors).
--
-- Este archivo restaura el texto anterior tal cual estaba. Ejecutar SOLO si hay
-- que deshacer el cambio; devolvería también los precios desactualizados.
--
-- 34 productos.

update products set descripcion = '{"Adiplex es un producto de Adiplex dentro de la categoría pre entrenos.","Precio de catálogo: $13.50. Sabores disponibles: Kiwi-Berry."}'::text[] where id = '355eb1bd-ee1d-4246-b8e6-5b3b02e37308';
update products set descripcion = '{"Amino Energy es un producto de Optimum Nutrition dentro de la categoría aminoácidos.","Precio de catálogo: $25.00. Sabores disponibles: Uva, Green Apple, Blue Raspberry, Mojito, Fresa Lima, Naranja, Sandía, Fruit Fusion."}'::text[] where id = 'f525dde9-36f7-4529-a4ce-a632f0e60e91';
update products set descripcion = '{"Ashwagandha 90 cápsulas es un producto de Ashwagandha dentro de la categoría salud y bienestar.","Precio de catálogo: $16.50."}'::text[] where id = '6d3fc5bf-aed1-4ced-ae63-a65161a84301';
update products set descripcion = '{"BioSport Xtreme Gainer 3 kg es un producto de BioSport USA dentro de la categoría ganadores de peso.","Precio de catálogo: $35.00. Sabores disponibles: Vainilla, Chocolate, Fresa, Cookies & Cream."}'::text[] where id = 'a1507ebe-13b5-4e2d-ba2b-956d500b81ec';
update products set descripcion = '{"Biotin Vitamin B7 120 cápsulas es un producto de Biotin dentro de la categoría salud y bienestar.","Precio de catálogo: $15.00."}'::text[] where id = '162bb085-1802-43c6-9e60-7974e7e79bf7';
update products set descripcion = '{"Biotin Women 120 cápsulas es un producto de Biotin Women dentro de la categoría salud y bienestar.","Precio de catálogo: $18.00."}'::text[] where id = 'b1222c75-1367-4c60-9557-55a101a66683';
update products set descripcion = '{"Cellucor C4 Whey Protein 2 lb es un producto de Cellucor C4 dentro de la categoría proteínas whey.","Precio de catálogo: $38.00. Sabores disponibles: Hershey''s Milk Chocolate, Reese''s Chocolate Peanut Butter, Vanilla Bean."}'::text[] where id = '2fd6edce-18b3-4fcb-8844-b11a104085ba';
update products set descripcion = '{"Cellucor C4 Whey Protein 5 lb es un producto de Cellucor C4 dentro de la categoría proteínas whey.","Precio de catálogo: $71.00. Sabores disponibles: Reese''s Chocolate Peanut Butter, Vanilla Bean."}'::text[] where id = '099a3767-7980-48a5-8864-b1d55818d3e7';
update products set descripcion = '{"Carniburn Fuego es un producto de Carniburn dentro de la categoría quemadores.","Precio de catálogo: $35.00. Sabores disponibles: Sour Gummie, Strawberry Watermelon."}'::text[] where id = '5b248bfa-a017-4741-a021-4c6a02864f07';
update products set descripcion = '{"Inositol 500 mg 240 cápsulas es un producto de Inositol dentro de la categoría salud y bienestar.","Precio de catálogo: $20.00."}'::text[] where id = '3a110221-6ffd-4b2c-950b-d0889d0f97a1';
update products set descripcion = '{"Liv52 Protector Hepático es un producto de Liv52 dentro de la categoría salud y bienestar.","Precio de catálogo: $15.00."}'::text[] where id = 'd0283615-1d2c-446b-9391-3266606ef4cb';
update products set descripcion = '{"Magnesium Complex 240 cápsulas es un producto de Magnesium Complex dentro de la categoría salud y bienestar.","Precio de catálogo: $20.00."}'::text[] where id = '155849d1-bbd3-482c-8255-b3f3ebe8dd35';
update products set descripcion = '{"Maltodextrin 2 lb es un producto de Maltodextrin dentro de la categoría carbohidratos.","Precio de catálogo: $20.00."}'::text[] where id = '420ca056-bae7-4335-84f1-b3595c28ca50';
update products set descripcion = '{"Maltodextrin 8 lb es un producto de Maltodextrin dentro de la categoría carbohidratos.","Precio de catálogo: $45.00."}'::text[] where id = '949f018f-c8cb-4f48-9f31-1ada93bfa42f';
update products set descripcion = '{"Maniac Extreme Pre-Workout es un producto de Maniac dentro de la categoría pre entrenos.","Precio de catálogo: $25.00. Sabores disponibles: Green Apple, Watermelon."}'::text[] where id = 'aaafc218-0747-4082-8602-d22cb99cd12c';
update products set descripcion = '{"Mesomorph Pre-Workout es un producto de APS Nutrition dentro de la categoría pre entrenos.","Precio de catálogo: $26.50. Sabores disponibles: Varios sabores."}'::text[] where id = '5becf937-8e6c-473b-b3af-1a407cd33abd';
update products set descripcion = '{"NAC 1000 mg 120 cápsulas es un producto de NAC dentro de la categoría salud y bienestar.","Precio de catálogo: $20.00."}'::text[] where id = '3b6dd833-bcbe-4a17-96f5-c3daee134b87';
update products set descripcion = '{"NAD+ es un producto de NAD+ dentro de la categoría salud y bienestar.","Precio de catálogo: $50.00."}'::text[] where id = '8e85f340-e3f0-435d-954b-f2c51aa14b02';
update products set descripcion = '{"Olive Leaf Extract 75 mg 90 cápsulas es un producto de Olive Leaf dentro de la categoría salud y bienestar.","Precio de catálogo: $25.00."}'::text[] where id = 'e4b07c5e-49ae-4458-93b6-51e366ca22c6';
update products set descripcion = '{"Potassium 99 mg 240 cápsulas es un producto de Potassium dentro de la categoría salud y bienestar.","Precio de catálogo: $20.00."}'::text[] where id = '1ba480ac-99fe-4feb-a794-7b4297edb3ff';
update products set descripcion = '{"Potassium 99 mg 30 cápsulas es un producto de Potassium dentro de la categoría salud y bienestar.","Precio de catálogo: $9.50."}'::text[] where id = 'e28615b1-9d7c-4f7a-946e-edb27109d21c';
update products set descripcion = '{"HTP Precision Protein 2 lb es un producto de HTP dentro de la categoría proteínas iso.","Precio de catálogo: $36.00. Sabores disponibles: Chocolate Peanut Butter, Cookies, Chocolate, Honey Granola, Fresa, Vainilla."}'::text[] where id = '8260e638-772e-443a-b501-fab9f1ba9ba4';
update products set descripcion = '{"ProSupps Hyde Nightmare es un producto de ProSupps dentro de la categoría pre entrenos.","Precio de catálogo: $27.50. Sabores disponibles: Jawbreaker."}'::text[] where id = 'a3f66af8-65a6-4a5e-bb1c-a6888f977e04';
update products set descripcion = '{"R-Alpha Lipoic Acid 120 cápsulas es un producto de R-ALA dentro de la categoría salud y bienestar.","Precio de catálogo: $25.00."}'::text[] where id = '8cdbe315-8ac7-41d6-abe0-95d6c601e518';
update products set descripcion = '{"Resveratrol 120 cápsulas es un producto de Resveratrol dentro de la categoría salud y bienestar.","Precio de catálogo: $25.50."}'::text[] where id = '052804a3-9bf7-4da7-bebc-14ebd06147bc';
update products set descripcion = '{"Revive Vitamin C 200 cápsulas es un producto de Revive dentro de la categoría salud y bienestar.","Precio de catálogo: $13.50."}'::text[] where id = '89d58efa-e437-44f0-8f4b-ac476a76c976';
update products set descripcion = '{"Skull Pre-Workout Xtreme es un producto de Skull dentro de la categoría pre entrenos.","Precio de catálogo: $20.00. Sabores disponibles: Sour Apple Rage."}'::text[] where id = 'c3c6b740-fae8-481b-b60c-285b0272b213';
update products set descripcion = '{"Vitamin E 30 cápsulas es un producto de Vitamin E dentro de la categoría salud y bienestar.","Precio de catálogo: $10.50."}'::text[] where id = '527d95a5-9809-4643-951b-df6e4332d222';
update products set descripcion = '{"Mutant Whey 5 lb es un producto de Mutant dentro de la categoría proteínas whey.","Precio de catálogo: $50.00. Sabores disponibles: Vainilla, Brownie, Triple Chocolate, Cookies & Cream, Fresa."}'::text[] where id = '163d54ec-318b-41a3-b554-856eedcdaa42';
update products set descripcion = '{"Xpel Diurético es un producto de Xpel dentro de la categoría quemadores.","Precio de catálogo: $18.00."}'::text[] where id = '1f9505b7-a3f1-4fed-8b1d-7ef120b4cea7';
update products set descripcion = '{"Xtend BCAA 30 servidas es un producto de Xtend dentro de la categoría aminoácidos.","Precio de catálogo: $25.00. Sabores disponibles: Mango Madness, Glacial Grape, Fruit Punch."}'::text[] where id = '7b08d89f-fe4f-45e0-9655-0aed2e0a2cb3';
update products set descripcion = '{"Zinc Chelate 50 mg 120 cápsulas es un producto de Zinc Chelate dentro de la categoría salud y bienestar.","Precio de catálogo: $15.50."}'::text[] where id = 'd8866010-89a3-47bf-8992-c72f09bbe9fe';
update products set descripcion = '{"ZMA 180 cápsulas es un producto de ZMA dentro de la categoría salud y bienestar.","Precio de catálogo: $22.50."}'::text[] where id = 'b3b09fae-60f1-498c-a6bc-2f0488c5fbb9';
update products set descripcion = '{"ZMA 90 cápsulas es un producto de ZMA dentro de la categoría salud y bienestar.","Precio de catálogo: $22.00."}'::text[] where id = '5ec30115-8c94-4377-bdee-818de6ce1752';

-- La columna description (texto) era un espejo del array descripcion, unido
-- por saltos de linea. Se limpio tambien, porque la ficha la renderiza ANTES
-- que el array (description_long || description || descripcion): dejarla habria
-- mantenido el precio viejo visible. Se reconstruye desde el array ya restaurado:
update products set description = array_to_string(descripcion, E'\n')
where coalesce(array_length(descripcion,1),0) > 0
  and array_to_string(descripcion,' ') like '%Precio de catálogo%';
