const express = require("express");
const mongoose = require("mongoose");

const app = express();
mongoose.connect("mongodb://localhost/vinted");

const cloudinary = require("cloudinary").v2; // On n'oublie pas le `.v2` à la fin
// connexion à mon compte Cloudinary
cloudinary.config({
  cloud_name: "dzwc3i8qc",
  api_key: "637439733896396",
  api_secret: "7KdyNXbaadrQEpt_R8sMHnBnQPA",
  secure: true,
});

app.use(express.json());

app.use(require("./routes/user"));
app.use(require("./routes/offer"));
app.use(require("./routes/offers"));

app.all("*", (req, res) => {
  res.status(404).json({ message: "route not found" });
});

app.listen(3000, () => {
  console.log("Phil, server is started 🚘");
});
