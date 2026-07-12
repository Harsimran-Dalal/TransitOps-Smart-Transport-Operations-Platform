-- FIX 3: Correct vehicle types inferred from model names (production junk data backfill).
-- Tata LPT / Tata Truck → TRUCK; Bolero / Ace / Dost / Pickup → VAN.

UPDATE "Vehicle"
SET "type" = 'TRUCK'
WHERE "type" IS DISTINCT FROM 'TRUCK'
  AND (
    LOWER("nameModel") ~ '\m(truck|lpt|tractor|trailer|hcv|multi[\s-]?axle)\M'
  );

UPDATE "Vehicle"
SET "type" = 'VAN'
WHERE "type" IS DISTINCT FROM 'VAN'
  AND (
    LOWER("nameModel") ~ '\m(ace|bolero|dost|pickup|tempo|van|omni|eicher|tigor|innova|xylo)\M'
  );

UPDATE "Vehicle"
SET "type" = 'BIKE'
WHERE "type" IS DISTINCT FROM 'BIKE'
  AND (
    LOWER("nameModel") ~ '\m(bike|motorcycle|scooter|two[\s-]?wheeler)\M'
  );
