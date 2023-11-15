const { db } = require("../../../firebase");
const bcrypt = require('bcryptjs')

exports.addNewTranslator = async (req, res) => {
    try {
        const {firstName,lastName,email,password,contact,languages} = req.body;

        if(!firstName || !lastName || !email || !contact || !languages || !languages.length)
            return res.status(400).json({message:"Invalid Request"})

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt)

        const translatorRef = db.collection('translators');
        const translatorSnapshot =  await translatorRef.where('email','==',email).get();

        if(!translatorSnapshot.empty)
            return res.status(400).json({message:"Translator With Email Id Already Exists"})

        const translatorData = {
            firstName,
            lastName,
            email,
            password:hashedPassword,
            contact,
            languages,
            status:true
        }
        await translatorRef.add(translatorData);
        return res.status(200).json({message:"Translator Added Successfully"})
    } catch (error) {
        console.log("Add New Translator Error: ", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}