const express = require("express");
const router = express.Router();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const Offer = require("../models/Offer");

const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/payment", isAuthenticated, async (req, res) => {
  try {
    // verification du stripeToken
    const stripeToken = req.body.stripeToken;
    const offerId = req.body.offerId;
    const offerAmount = req.body.offerAmount;
    const globalAmount = req.body.globalAmount;
    if (!stripeToken || !offerId) {
      return res.status(400).json({ message: "missing parameters" });
    }

    // récupération de l'offre
    const offer = await Offer.findById(offerId).populate("owner", "account");
    if (offer === null) {
      return res.status(400).json({ message: "offer doesn't exist" });
    }
    if (offer.product_price !== offerAmount) {
      return res
        .status(400)
        .json({ message: "offer amount doesn't correspond" });
    }

    // realisation du paiment
    const response = await stripe.charges.create({
      amount: Math.round(globalAmount * 100),
      currency: "eur",
      description: offer.product_name,
      source: stripeToken,
    });
    if (response.status === "succeeded") {
      res.json({ message: "payment succeeded" });
    } else {
      res.status(417).json({ message: "problem occurs" });
    }
  } catch (error) {
    console.log(error.message);
  }
});

module.exports = router;
