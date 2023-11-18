const { db,admin } = require("../../../firebase")
const bcrypt = require('bcryptjs')
const sendEmail = require("../../utils/sendEmail")

exports.addNewCompany = async (req, res) => {
    try {
        
        const { adminFirstName, adminLastName, adminPassword, adminEmail,country, companyName, ...data } = req.body
        
        if (!adminEmail || !companyName || !adminFirstName || !adminLastName || !adminPassword || !country)
            return res.status(400).json({ message: "Invalid Request" })
        
        const companyCollection = db.collection('companies');
        const companySnapshot = await companyCollection.where('name', '==', companyName).get();
        if (!companySnapshot.empty)
            return res.status(400).json({ message: "Company Name already Registered" })
        
        const userCollection = db.collection('users');
        const userSnapshot = await userCollection.where('email', '==', adminEmail).get();

        if (!userSnapshot.empty)
            return res.status(400).json({ message: "Admin User already Registered" })
        
        const companyDoc = companyCollection.doc()
        const userDoc = userCollection.doc()
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt)
        await db.runTransaction(async (transaction) => {
            transaction.set(companyDoc, {
                name: companyName,
                country,
                ...data
            })
            transaction.set(userDoc, {
                firstName: adminFirstName,
                lastName: adminLastName,
                email: adminEmail,
                password: hashedPassword,
                companyId: companyDoc.id,
                companyName: companyName,
                role: "admin",
                status: true,
                totalBilledAmount: 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            })
            const html = 
            `<p>Dear Customer,</p>
                <br />
                <p>An account has been created for you on <a href="https://texlang-client-qjvrxcjtna-uc.a.run.app/" target="_blank">Texlang</a>. Please use the following credentials to login.</p>
                <p>Email: ${adminEmail}</p>
                <p>Password: ${adminPassword}</p>`
    
            const subject = 'Texlang Account Created'
            await sendEmail(adminEmail,subject,html)
            const companyData = {
                id: companyDoc.id,
                name: companyName,
            }
            return res.status(200).json({message:"Company Added",companyData})
        })
        

    } catch (error) {
        console.log("Add New Company", error.message)
        return res.status(500).json({message:"Something went wrong"})
    }
}

exports.getAllCompany = async(req, res) => {
    try {
        const user = req.user
        if (!user)
            return res.status(401).json({ message: "Unauthorized" })

        const companyRef = db.collection('companies')
        const companyQuery = await companyRef.get()
        const companies = []
        companyQuery.forEach((doc) => {
            const company = doc.data()
            const id = doc.id
            companies.push({
                id,
                name: company.name,
            })
        })
        return res.status(200).json({ companies })
    } catch (error) {
        console.log('Get All Companies', error.message)
        return res.status(500).json({ message: "Something went wrong" })
    }
}
exports.getCompanyUsers = async (req, res) => {
    try {
        const { companyId } = req.params
        const userRef = db.collection('users')
        const userQuery = await userRef.where('companyId', '==', companyId).get()
        if (userQuery.empty)
            return res.status(400).json({ message: "No users found" })
        
        const users = []
        userQuery.forEach(user => {
            users.push({
                id: user.id,
                email:user.data().email,
            })
        })
        return res.status(200).json({ users })
    } catch (error) {
        console.log('Megdap-Admin-Get-Users', error.message)
        return res.status(500).json({message:"Someting went wrong"})
    }
}

exports.setLanguageRate = async(req, res) => {
    try {
        const { companyId, languages } = req.body
        if (!companyId || !languages || !Array.isArray(languages) || languages.length === 0)
            return res.status(400).json({ message: "Invalid Request" })

        const languageRef = db.collection('metadata').doc(`${companyId}_languageRates`);

        const updateData = {};
        languages.forEach((language) => {
            if (language.unitRate !== undefined) {
                const fieldPath = `${language.sourceLang}-${language.targetLang}`;
                updateData[fieldPath] = language.unitRate;
            }
        });
        const batch = db.batch();
        batch.set(languageRef, updateData, { merge: true });
        await batch.commit();
        return res.status(200).json({ message: "Language Rate Updated" })
    } catch (error) {
        console.log('Megdap-Admin-Set-Language-Rate', error.message)
        return res.status(500).json({message:"Someting went wrong"})
    }
}