const Razorpay = require("razorpay");
const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// CREATE ORDER
module.exports.createOrder = async (req, res) => {
  try {
    const { listingId, checkIn, checkOut } = req.body;
    const listing = await Listing.findById(listingId);

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const totalNights = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
    );

    if (totalNights <= 0) {
      return res.status(400).json({ error: "Invalid dates" });
    }

    const totalPrice = totalNights * listing.price;

    const order = await razorpay.orders.create({
      amount: totalPrice * 100, // Razorpay uses paise
      currency: "INR",
      receipt: `booking_${Date.now()}`,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      listing: {
        title: listing.title,
        price: listing.price,
      },
      totalNights,
      totalPrice,
      checkIn,
      checkOut,
      listingId,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// VERIFY PAYMENT & SAVE BOOKING
module.exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      listingId,
      checkIn,
      checkOut,
      totalNights,
      totalPrice,
    } = req.body;

    // verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      req.flash("error", "Payment verification failed!");
      return res.redirect(`/listings/${listingId}`);
    }

    // save booking
    const newBooking = new Booking({
      listing: listingId,
      user: req.user._id,
      checkIn,
      checkOut,
      totalNights,
      totalPrice,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: "confirmed",
    });

    await newBooking.save();

    req.flash("success", "Booking confirmed! Payment successful!");
    res.redirect(`/bookings/${newBooking._id}`);
  } catch (e) {
    console.log(e);
    req.flash("error", "Something went wrong!");
    res.redirect("/listings");
  }
};

// SHOW BOOKING CONFIRMATION
module.exports.showBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("listing")
    .populate("user");

  if (!booking) {
    req.flash("error", "Booking not found!");
    return res.redirect("/listings");
  }

  res.render("bookings/show.ejs", { booking });
};

// MY BOOKINGS
module.exports.myBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("listing")
    .sort({ createdAt: -1 });

  res.render("bookings/index.ejs", { bookings });
};
