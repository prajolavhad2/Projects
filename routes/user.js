const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/users.js");

// GET & POST /signup
router
  .route("/signup")
  .get(userController.userSignUpRender)
  .post(userController.userSignUp);

// GET & POST/login
router
  .route("/login")
  .get(userController.userLoginRender)
  .post(
    saveRedirectUrl, // ← this is correct, keep it here
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.userLogin,
  );

router.get("/logout", userController.userLogout);

router.post("/wishlist/:listingId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const { listingId } = req.params;
  const user = await User.findById(req.user._id);

  const index = user.wishlist.indexOf(listingId);
  if (index === -1) {
    user.wishlist.push(listingId);
  } else {
    user.wishlist.splice(index, 1);
  }

  await user.save();
  res.json({ wishlisted: index === -1 });
});

router.get("/wishlist", async (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be logged in!");
    return res.redirect("/login");
  }
  const user = await User.findById(req.user._id).populate("wishlist");
  res.render("users/wishlist.ejs", { wishlist: user.wishlist });
});

module.exports = router;
