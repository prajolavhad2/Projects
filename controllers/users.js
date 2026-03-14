const User = require("../models/user.js");

module.exports.userSignUpRender = (req, res) => {
  res.render("users/signup.ejs");
};

module.exports.userSignUp = async (req, res) => {
  try {
    let { username, email, password } = req.body;
    console.log("BODY:", req.body); // ← add this
    const newUser = new User({ email, username });
    await User.register(newUser, password);
    req.login(newUser, (error) => {
      if (error) {
        return next(error);
      }
      req.flash("success", "Welcome to Wanderlust!");
      res.redirect("/listings");
    });
  } catch (e) {
    console.log("ERROR:", e); // ← add this
    req.flash("error", e.message);
    res.redirect("/signup");
  }
};

module.exports.userLoginRender = (req, res) => {
  // only save referer if isLoggedIn hasn't already saved a redirectUrl
  if (
    !req.session.redirectUrl &&
    req.headers.referer &&
    !req.headers.referer.includes("/login")
  ) {
    req.session.redirectUrl = req.headers.referer;
  }
  res.render("users/login.ejs");
};

module.exports.userLogin = (req, res) => {
  req.flash("success", "Welcome to WanderLust! You are Logged in...");
  let redirectUrl = res.locals.redirectUrl || "/listings";
  res.redirect(redirectUrl);
};

module.exports.userLogout = (req, res) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }
    req.flash("success", "User Logged Out!");
    res.redirect("/listings");
  });
};
