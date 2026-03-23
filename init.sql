-- Luo dockeria varten testitietokannan ja myöntää käyttäjälle oikeudet siihen.
-- Ajetaan automaattisesti MySQL-kontainerin ensikäynnistyksessä.
-- Huom! Ratkaisuun voi liittyä riskejä, harjoitusmielessä valittu ratkaisu.
CREATE DATABASE IF NOT EXISTS tupla_test;
GRANT ALL PRIVILEGES ON tupla_test.* TO 'tupla'@'%';
FLUSH PRIVILEGES;