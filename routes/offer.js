const express = require("express");
const router = express.Router();

// Import de fileupload qui nous permet de recevoir des formdata
const fileUpload = require("express-fileupload");

const Offer = require("../models/Offer");
// const User = require("../models/User");

const cloudinary = require("cloudinary").v2; // On n'oublie pas le `.v2` à la fin

const isAuthenticated = require("../middlewares/isAuthenticated");
const convertToBase64 = require("../functions/convertToBase64");

// ==================
// Creer une annonce
// ==================
router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const user = req.user;
      const { title, description, price, condition, city, brand, size, color } =
        req.body;
      const pictureUser = req.files?.picture; // conditonnal chaining : ne plante pas si la clé req.files est 'null'
      // console.log(Array.isArray(pictureUser));
      // exclusions
      if (!title || typeof title !== "string" || title.length > 50) {
        return res.status(400).json({ message: "title is not correct" });
      }
      if (
        !description ||
        typeof description !== "string" ||
        description.length > 500
      ) {
        return res.status(400).json({ message: "description is not correct" });
      }
      if (!price || Number(price) === NaN || Number(price) > 100000) {
        return res.status(400).json({ message: "price is not correct" });
      }
      // creation de l'offre 'vide' pour avoir l'id
      const newOffer = new Offer({});
      // traitement des images
      let pictureTab = []; // le tableau des images reçues
      const cloudinaryTab = []; // le tableau des liens Cloudinary des images
      if (pictureUser) {
        if (!Array.isArray(pictureUser)) {
          // on crée un tableau d'images, même si on a récupéré qu'une image
          pictureTab.push(pictureUser);
        } else {
          pictureTab = pictureUser;
        }
        // on charge chaque image dans Cloudinary, dans un repertoire dédié à l'offre
        const folder = "/vinted/offers/" + newOffer._id;

        for (let i = 0; i < pictureTab.length; i++) {
          cloudinaryTab.push(
            await cloudinary.uploader.upload(
              convertToBase64(pictureTab[i]),
              (options = { folder: folder })
            )
          );
        }
      }

      // !!!  await dans une boucle forEach() NE FONCTIONNE PAS !!!
      //   pictureTab.forEach(async (file) => {
      //     cloudinaryTab.push(
      //       await cloudinary.uploader.upload(
      //         convertToBase64(file),
      //         (options = { folder: folder })
      //       )
      //     );
      //     console.log("dans la boucle : ", cloudinaryTab);  // dans la boucle : [blablabla]  (ça marche)
      //   });
      // }
      // console.log("boucle finie : ", cloudinaryTab); // boucle finie : [] s'affiche AVANT  'dnas la boucle' !!!
      //

      // sauvegarde de l'annonce
      newOffer.product_name = title;
      newOffer.product_description = description;
      newOffer.product_price = price;
      newOffer.product_details = [
        { ETAT: condition },
        { EMPLACEMENT: city },
        { MARQUE: brand },
        { COULEUR: color },
        { TAILLE: size },
      ];
      newOffer.product_image = cloudinaryTab;
      newOffer.owner = user; // on stocke tout l'user ici (pour la réponse), mais en BDD on aura que l'id compte tenu du modele
      await newOffer.save();
      // reponse
      // const offerInBDD = await Offer.findById(newOffer._id).populate(
      //   "owner",
      //   "account"
      // );
      // res.json(offerInBDD);
      res.json(newOffer);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

// =====================
// Supprimer une annonce
// =====================
router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  try {
    const idOffer = req.query.id;
    if (!idOffer) {
      return res.status(400).json({ message: "id requested" });
    }
    const offer = await Offer.findById(idOffer);
    if (offer === null) {
      return res.status(400).json({ message: "offer not found" });
    }
    // suppression de l'image
    const PicturePublicId = offer.product_image.public_id;
    if (PicturePublicId) {
      await cloudinary.uploader.destroy(PicturePublicId); // image
      const folder = "/vinted/offers/" + offer._id;
      await cloudinary.api.delete_folder(folder); // repertoire
    }
    // suppression de l'offre
    offer.delete();
    res.json({ message: "the offer has been deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// ====================
// Modifier une annonce
// ====================

router.put("/offer/modify", isAuthenticated, async (req, res) => {
  try {
    const idOffer = req.query.id;
    const { title, description, price } = req.body;
    const offer = await Offer.findById(idOffer).populate("owner", "token");
    // offre non trouvée
    if (offer === null) {
      return res.status(400).json({ message: "offer not found" });
    }
    // verifier que l'offre lui appartient
    if (req.user.token !== offer.owner.token) {
      return res.status(401).json({ message: "unauthorized" });
    }
    // traitement des paramètres à modifier
    if (title && typeof title === "string" && title.length <= 50) {
      offer.product_name = title;
    } else {
      return res.status(400).json({ message: "title is not correct" });
    }
    if (
      description &&
      typeof description === "string" &&
      description.length <= 500
    ) {
      offer.product_description = description;
    } else {
      return res.status(400).json({ message: "description is not correct" });
    }
    if (price && Number(price) !== NaN && Number(price) <= 100000) {
      offer.product_price = Number(price);
    } else {
      return res.status(400).json({ message: "price is not correct" });
    }
    // sauvegarde
    await offer.save();
    res.json({ message: "offer updated" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ======================
// Recupérer une annonce
// ======================
router.get("/offer/:id", async (req, res) => {
  try {
    idOffer = req.params.id;
    const offer = await Offer.findById(idOffer).populate("owner", "account");
    if (offer === null) {
      res.status(400).json({ message: "id not found" });
    } else {
      res.json(offer);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
