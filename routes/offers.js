const { request } = require("express");
const express = require("express");
const router = express.Router();

const Offer = require("../models/Offer");

router.get("/offers", async (req, res) => {
  const nbOffersPerPage = 5; // fixation en dur pour le moment
  try {
    const { title, description, priceMin, priceMax, sort, page } = req.query;
    // construction de la requete dans FIND pour les mots clés
    const requestFind = {};
    if (title) {
      // title est recherché sur "product_name" OU "product_description"
      requestFind.$or = [
        { product_name: new RegExp(title, "i") },
        { product_description: new RegExp(title, "i") },
      ];
      // requestFind.product_name = new RegExp(title, "i");
    }
    if (description) {
      // description est recherché UNIQUEMENT dans "product_description"
      requestFind.product_description = new RegExp(description, "i");
    }
    // construction de la requete dans FIND pour les prix
    if (priceMin) {
      if (!Number(priceMin)) {
        return res.status(400).json({ message: "priceMin has to be Number" });
      }
      requestFind.product_price = { $gte: Number(priceMin) };
    }
    if (priceMax) {
      if (!Number(priceMax)) {
        return res.status(400).json({ message: "priceMax has to be Number" });
      }
      if (!requestFind.product_price) {
        requestFind.product_price = { $lte: Number(priceMax) };
      } else {
        requestFind.product_price.$lte = Number(priceMax);
      }
    }
    // construction de la requete SORT
    const requestSort = {};
    if (sort === "price-desc") {
      requestSort.product_price = "desc";
    } else if (sort === "price-asc") {
      requestSort.product_price = "asc";
    } else if (sort) {
      return res.status(400).json({ message: "sort parameter is not correct" });
    }
    // construction de la requete SKIP et LIMIT
    const nbToLimit = nbOffersPerPage;
    let nbToSkip = 0;
    if (Number(page) > 1) {
      nbToSkip = (page - 1) * nbToLimit;
    }

    // envoi de la requete à la BDD
    const results = await Offer.find(requestFind)
      .sort(requestSort)
      .skip(nbToSkip)
      .limit(nbToLimit)
      // .select("product_name product_description product_price owner")
      .populate("owner", "account _id");
    // reponse au client
    nbElements = await Offer.countDocuments(requestFind);
    const response = {
      count: nbElements,
      offers: results,
    };
    res.json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
