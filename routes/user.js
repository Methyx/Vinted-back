const express = require("express");
const router = express.Router();

// Import de fileupload qui nous permet de recevoir des formdata
const fileUpload = require("express-fileupload");

const cloudinary = require("cloudinary").v2; // On n'oublie pas le `.v2` à la fin
const convertToBase64 = require("../functions/convertToBase64");

const User = require("../models/User");

const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

// ===========================
// Creation nouvel utilisateur
// ===========================
router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const { username, email, password, newsletter } = req.body;
    const avatarUser = req.files?.picture; // conditonnal chaining : ne plante pas si la clé req.files est 'null'
    // exclusions
    if (!username) {
      return res.status(400).json({ message: "invalid username" });
    }
    if (!email) {
      return res.status(400).json({ message: "email is needed" });
    }
    if (!password) {
      return res.status(400).json({ message: "password is missing" });
    }
    const userExisting = await User.findOne({ email: email });
    if (userExisting !== null) {
      return res.status(409).json({ message: "email already exists" });
    }
    // traitement du mot de passe
    const salt = uid2(16);
    const hash = SHA256(password + salt).toString(encBase64);
    const token = uid2(16);
    // creation de l'objet User
    const user = new User({
      email: email,
      account: {
        username: username,
        avatar: null,
      },
      token: token,
      hash: hash,
      salt: salt,
      newsletter: false, // valeur par défaut
    });
    // traitement de l'avatar
    if (avatarUser) {
      const folder = "/vinted/users/" + user._id;
      const avatarCloudinary = await cloudinary.uploader.upload(
        convertToBase64(avatarUser),
        (options = { folder: folder })
      );
      user.account.avatar = avatarCloudinary;
    }
    // traitement de la newsletter
    if (newsletter === true) {
      user.newsletter = true;
    }
    // sauvegarde du user dans la BDD
    await user.save();
    res.json({
      _id: user._id,
      token: user.token,
      account: user.account,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ===========================
// Login d'un utilisateur
// ===========================
router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // recherche par email
    const user = await User.findOne({ email: email });
    if (user === null) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // check du mot de passe
    const salt = user.salt;
    const newHash = SHA256(password + salt).toString(encBase64);
    if (newHash !== user.hash) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // user OK
    res.json({
      _id: user._id,
      token: user.token,
      account: {
        username: user.account.username,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
