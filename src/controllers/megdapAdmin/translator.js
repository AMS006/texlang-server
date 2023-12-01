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


exports.assignWorkToTranslator = async (req, res) => {
  try {
    const {translator,translatorName, works} = req.body;
    if (!translator || !works || !works.length)
      return res.status(400).json({ message: "Invalid Request" });

    const batch = db.batch();

    const fileRef = db.collection("files");
    const translatorRef = db.collection("translators").doc(translator);


    const translatorSnapshot = await translatorRef.get();

    if (!translatorSnapshot.exists)
      return res.status(404).json({ message: "No Translator Found" });

    const translatorData = translatorSnapshot.data();

 
    const translatorWorks = translatorData?.works || [];

    const updatedTranslatorWorks = [...translatorWorks, ...works];

    batch.update(translatorRef, { works: updatedTranslatorWorks });

   

    const dateInString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    works.forEach((work) => {
      const fileDocRef = fileRef.doc(work);
      batch.update(fileDocRef, { translatorAssigned:true,translatorId: translator,translatorName, assignedOn: new Date(dateInString) });
    });

    await batch.commit();

    return res.status(200).json({ message: "Work Assigned Successfully" });
  } catch (error) {
    console.log("Assign Work To Translator Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getAllTranslators = async (req, res) => {
  try {
    const translatorRef = db.collection("translators");
    const translatorSnapshot = await translatorRef.get();

    if (translatorSnapshot.empty)
      return res.status(200).json({ translators: [] });

    const translators = translatorSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        contact: data.contact,
        status: data.status? "Active" : "Inactive",
      };
    });
    return res.status(200).json({ translators });
  } catch (error) {
    console.log("Get All Translators Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

exports.getTranslatorDetails = async (req, res) => {
  try {
    const {translatorId} = req.params;

    if(!translatorId) return res.status(400).json({message:"Invalid Request"});

    const translatorRef = db.collection("translators").doc(translatorId);

    const translatorSnapshot = await translatorRef.get();

    if(!translatorSnapshot.exists) return res.status(404).json({message:"No Translator Found"});

    // Translator Details
    const translatorData = translatorSnapshot.data();
    const translatorDetails = {
      id: translatorSnapshot.id,
      name : `${translatorData.firstName} ${translatorData.lastName}`,
      email: translatorData.email,
      contact: translatorData.contact,
      status: translatorData.status,
    }

    // Translators Language Details
    const translatorPairRef = db.collection("translatorPairs");
    const translatorPairSnapshot = await translatorPairRef.where("translatorId", "==", translatorId).get();
    const translatorLanguages = translatorPairSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
      };
    });

    // Translator Works Details
    const translatorWorks = translatorData?.works || [];

    const works = [];
    for(let i=0; i<translatorWorks.length; i++){
      const fileId = translatorWorks[i];

      const fileRef = db.collection("files").doc(fileId);
      const fileSnapshot = await fileRef.get();

      const fileData = fileSnapshot.data();

      const assignedDate = new Date(fileData.assignedOn.seconds * 1000 + fileData.assignedOn._nanoseconds / 1000000);
      const data = {
        id: fileSnapshot.id,
        fileName: fileData.fileName,
        wordCount: fileData?.wordCount,
        projectName: fileData.projectName,
        sourceLanguage: fileData.sourceLanguage,
        targetLanguage: fileData.targetLanguage,
        status: fileData.status,
        assignedOn: assignedDate,
      };
      works.push(data);
    }

    return res.status(200).json({translatorDetails, translatorLanguages, translatorWorks: works});
  } catch (error) {
    console.log("Get Translator Details Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

exports.getReAssignTranslatorWorks = async (req, res) => {
  try {
    const fileRef = db.collection("files");

    const fileSnapshot = await fileRef.where("status" ,'==', "In Progress").where("translatorAssigned", "==", true).get();

    if(fileSnapshot.empty) return res.status(200).json({works: []});

    const works = fileSnapshot.docs.map((doc) => {
      const data = doc.data();
      const assignedDate = new Date(data.assignedOn.seconds * 1000 + data.assignedOn._nanoseconds / 1000000);

      
      return {
        id: doc.id,
        fileName: data.fileName,
        wordCount: data?.wordCount,
        projectName: data.projectName,
        translatorName: data?.translatorName,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
        status: data.status,
        assignedOn: assignedDate,
        translatorId:data?.translatorId,
      };
    });

    return res.status(200).json({works});
  } catch (error) {
    console.log("Get Re Assign Translator Works Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

exports.getTranslatorToReAssignWork = async(req,res) =>{
  try {
    const {translatorId,sourceLanguage,targetLanguage} = req.query;

    if(!translatorId || !sourceLanguage || !targetLanguage) return res.status(400).json({message:"Invalid Request"});

    const translatorPairRef = db.collection("translatorPairs");

    const translatorPairSnapshot = await translatorPairRef.where("translatorId", "!=", translatorId).where("sourceLanguage", "==", sourceLanguage).where("targetLanguage", "==", targetLanguage).get();

    if(translatorPairSnapshot.empty) return res.status(200).json({translators: []});

    const translators = translatorPairSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        value: data.translatorId,
        label: data.translatorName,
      };
    });

    return res.status(200).json({translators});
  } catch (error) {
    console.log("Get Translator To Re Assign Work Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

exports.reAssignWork = async(req,res) =>{
  try {
    const {fileId,translatorId,translatorName} = req.body;

    if(!fileId || !translatorId || !translatorName) return res.status(400).json({message:"Invalid Request"});

    const fileRef = db.collection("files").doc(fileId);

    const fileSnapshot = await fileRef.get();

    if(!fileSnapshot.exists) return res.status(404).json({message:"No File Found"});

    const dateInString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    await fileRef.update({translatorId,translatorName, assignedOn: new Date(dateInString)});

    return res.status(200).json({message:"Work Re Assigned Successfully"});

  } catch (error) {
    console.log("Re Assign Work Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
}