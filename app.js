if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}
console.log(process.env.SECRET);

const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const myError = require("./utils/myError.js");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingRouter = require("./routes/booking.js");

const app = express();

// ======================
// EJS SETUP
// ======================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// ======================
// MIDDLEWARE
// ======================

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(cookieParser());

// ======================
// DATABASE CONNECTION
// ======================

// const mongoUrl = "mongodb://127.0.0.1:27017/wanderlust";

const dbUrl = process.env.ATLAS_LINK;

async function main() {
  await mongoose.connect(dbUrl);
  console.log("MongoDB Connected");
}

main().catch((err) => console.log(err));

// ======================
// SESSION SETUP
// ======================

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("Error in Mongo Store", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 3,
    maxAge: 1000 * 60 * 60 * 24 * 3,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

// ======================
// PASSPORT SETUP
// ======================

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ======================
// FLASH & CURRENT USER (must be BEFORE all routes)
// ======================

app.use(async (req, res, next) => {
  if (req.user) {
    res.locals.currUser = await User.findById(req.user._id).populate(
      "wishlist",
    );
  } else {
    res.locals.currUser = null;
  }
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// ======================
// ROUTES (all AFTER the middleware above)
// ======================

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/bookings", bookingRouter);

// ======================
// 404 HANDLER
// ======================

app.use((req, res, next) => {
  next(new myError(404, "Page Not Found"));
});

// ======================
// ERROR HANDLER
// ======================

app.use((err, req, res, next) => {
  let { status = 500, message = "Something went wrong!" } = err;
  res.status(status).render("error.ejs", { err });
});

// ======================
// SERVER
// ======================

app.listen(8082, () => {
  console.log("Server running on port 8082");
});
