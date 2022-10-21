const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    const tokenRaw = req.headers.authorization;
    if (!tokenRaw) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const tokenSent = tokenRaw.replace("Bearer ", "");
    const userFound = await User.findOne({ token: tokenSent }).select(
      "account token"
    );
    if (userFound === null) {
      return res.status(401).json({ message: "unauthorized" });
    }
    req.user = userFound;
    next();
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

module.exports = isAuthenticated;
