-- Migration 020: Split location fields into city/country + Add Russian name fields
-- For family tree bilingual support (Hebrew + Russian)

-- Split location fields into city + country
ALTER TABLE family_members
  ADD COLUMN birth_city VARCHAR(150) AFTER birth_place,
  ADD COLUMN birth_country VARCHAR(100) AFTER birth_city,
  ADD COLUMN death_city VARCHAR(150) AFTER death_place,
  ADD COLUMN death_country VARCHAR(100) AFTER death_city,
  ADD COLUMN residence_city VARCHAR(150) AFTER current_residence,
  ADD COLUMN residence_country VARCHAR(100) AFTER residence_city;

-- Russian name fields
ALTER TABLE family_members
  ADD COLUMN first_name_ru VARCHAR(100) AFTER title,
  ADD COLUMN last_name_ru VARCHAR(100) AFTER first_name_ru,
  ADD COLUMN maiden_name_ru VARCHAR(100) AFTER last_name_ru;

-- Russian location fields
ALTER TABLE family_members
  ADD COLUMN birth_city_ru VARCHAR(150) AFTER birth_country,
  ADD COLUMN birth_country_ru VARCHAR(100) AFTER birth_city_ru,
  ADD COLUMN death_city_ru VARCHAR(150) AFTER death_country,
  ADD COLUMN death_country_ru VARCHAR(100) AFTER death_city_ru,
  ADD COLUMN residence_city_ru VARCHAR(150) AFTER residence_country,
  ADD COLUMN residence_country_ru VARCHAR(100) AFTER residence_city_ru;

-- Migrate existing data: copy combined place to city field
UPDATE family_members SET birth_city = birth_place WHERE birth_place IS NOT NULL AND birth_place != '';
UPDATE family_members SET death_city = death_place WHERE death_place IS NOT NULL AND death_place != '';
UPDATE family_members SET residence_city = current_residence WHERE current_residence IS NOT NULL AND current_residence != '';
