const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookings.js");
const { isLoggedIn } = require("../middleware.js");
const wrapAsync = require("../utils/wrapAsync.js");

router.post(
  "/create-order",
  isLoggedIn,
  wrapAsync(bookingController.createOrder),
);
router.post(
  "/verify-payment",
  isLoggedIn,
  wrapAsync(bookingController.verifyPayment),
);
router.get("/my-bookings", isLoggedIn, wrapAsync(bookingController.myBookings));
router.get("/:id", isLoggedIn, wrapAsync(bookingController.showBooking));

module.exports = router;
