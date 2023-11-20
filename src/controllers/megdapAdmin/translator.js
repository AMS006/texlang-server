const { db } = require("../../../firebase");
const bcrypt = require("bcryptjs");

exports.addNewTranslator = async (req, res) => {
  try {
    const { firstName, lastName, email, password, contact, languages } =
      req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !contact ||
      !languages ||
      !languages.length
    )
      return res.status(400).json({ message: "Invalid Request" });
    const sourceLanguages = languages.map(
      (language) => language.sourceLanguage,
    );

    const updatedSouceLanguages = [...new Set(sourceLanguages)];

    const translatorRef = db.collection("translators");
    const translatorDoc = translatorRef.doc();
    const translatorSnapshot = await translatorRef
      .where("email", "==", email)
      .get();

    if (!translatorSnapshot.empty)
      return res
        .status(400)
        .json({ message: "Translator With Email Id Already Exists" });

    const batch = db.batch();
    const translatorPairRef = db.collection("translatorPairs");
    const translatorPairData = languages.map((language) => {
      return {
        sourceLanguage: language.sourceLanguage,
        targetLanguage: language.targetLanguage,
        translatorId: translatorDoc.id,
        translatorName: `${firstName} ${lastName}`,
      };
    });

    translatorPairData.forEach((data) => {
      const translatorPairDocRef = translatorPairRef.doc();
      batch.set(translatorPairDocRef, data);
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const translatorData = {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      contact,
      sourceLanguages: updatedSouceLanguages,
      status: true,
    };
    batch.set(translatorDoc, translatorData);

    await batch.commit();
    return res.status(200).json({ message: "Translator Added Successfully" });
  } catch (error) {
    console.log("Add New Translator Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getTranslatorsSourceLanguages = async (req, res) => {
  try {
    const translatorRef = db.collection("translators");
    const translatorSnapshot = await translatorRef.get();

    if (translatorSnapshot.empty)
      return res.status(200).json({ sourceLanguages: [] });

    const sourceLanguages = [
      ...new Set(
        translatorSnapshot.docs.flatMap((doc) => doc.data().sourceLanguages),
      ),
    ];

    return res.status(200).json({ sourceLanguages });
  } catch (error) {
    console.log("Get Translator Source Languages Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getTargetLanguages = async (req, res) => {
  try {
    const translatorPairRef = db.collection("translatorPairs");

    const { sourceLanguage } = req.query;
    if (!sourceLanguage)
      return res.status(400).json({ message: "Invalid Request" });

    const translatorPairSnapshot = await translatorPairRef
      .where("sourceLanguage", "==", sourceLanguage)
      .get();

    if (translatorPairSnapshot.empty)
      return res.status(200).json({ targetLanguages: [] });

    const targetLanguages = [
      ...new Set(
        translatorPairSnapshot.docs.map((doc) => doc.data().targetLanguage),
      ),
    ];

    return res.status(200).json({ targetLanguages });
  } catch (error) {}
};

exports.getTranslators = async (req, res) => {
  try {
    const { sourceLanguage, targetLanguage } = req.query;

    if (!sourceLanguage || !targetLanguage)
      return res.status(400).json({ message: "Invalid Request" });

    const translatorPairRef = db.collection("translatorPairs");
    const translatorPairSnapshot = await translatorPairRef
      .where("sourceLanguage", "==", sourceLanguage)
      .where("targetLanguage", "==", targetLanguage)
      .get();

    if (translatorPairSnapshot.empty)
      return res.status(200).json({ translators: [] });

    const translators = translatorPairSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: data.translatorId,
        name: data.translatorName,
      };
    });
    return res.status(200).json({ translators });
  } catch (error) {
    console.log("Get Translators Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
