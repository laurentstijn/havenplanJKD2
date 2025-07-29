-- Script om Firebase data te controleren
-- Dit is een voorbeeld van hoe je data in Firebase zou kunnen structureren

-- Voorbeeld van hoe de data eruit zou moeten zien in Firebase:
-- /boats/
--   0: { id: 1, name: "Boot 1", ... }
--   1: { id: 2, name: "Boot 2", ... }
--   ...
--   177: { id: 178, name: "Boot 178", ... }

-- Als je 178 boten verwacht, controleer dan:
-- 1. Ga naar Firebase Console
-- 2. Ga naar Realtime Database
-- 3. Kijk naar de "boats" node
-- 4. Tel het aantal entries

-- Mogelijke oorzaken waarom je maar 2 boten ziet:
-- 1. Data staat niet in Firebase maar lokaal
-- 2. Firebase rules blokkeren toegang
-- 3. Data staat in verkeerde structuur
-- 4. App gebruikt lokale test data
