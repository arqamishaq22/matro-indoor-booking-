-- Active overlapping bookings are serialized and checked in a transaction.
-- An unconditional unique key would also block rebooking after cancellation.
CREATE INDEX `Booking_courtId_date_startTime_idx` ON `Booking`(`courtId`, `date`, `startTime`);
DROP INDEX `Booking_courtId_date_startTime_endTime_key` ON `Booking`;
DROP INDEX `Booking_courtId_date_idx` ON `Booking`;
