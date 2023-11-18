const { db, admin } = require("../../../firebase");
const { getDownloadUrl, uploadFileToFirebaseStorage, isValidDate } = require("../../helper");


exports.getDownloadProjectWorks = async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!projectId) return res.status(400).json({
            message: "Invalid Request"
        });
        const workRef = db.collection('works');
        const workQuery = workRef.where('projectId', '==', projectId).where('currentStatus','!=','Completed')
        const workSnapshot = await workQuery.get();
        if (workSnapshot.empty)
            return res.status(200).json({
                works: []
            });
        
        const works = await Promise.all(workSnapshot.docs.map(async (doc) => {
            const id = doc.id;
            const workDoc = doc.data();

            const downloadUrl = await getDownloadUrl(workDoc?.filePath);
            return {
                id,
                sourceLanguage: workDoc?.sourceLanguage,
                downloadUrl
            };
        }));
       
        return res.status(200).json({works});
    } catch (error) {
        console.log("Get Work Error: ", error.message);
        return res.status(500).json({
        message: "Something went wrong"
        });
    }
}

exports.getUploadProjectWorks = async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!projectId) return res.status(400).json({
            message: "Invalid Request"
        });
        const workRef = db.collection('works');
        const workQuery = workRef.where('projectId', '==', projectId).where('currentStatus','==','In Progress');
        const workSnapshot = await workQuery.get();
        if (workSnapshot.empty)
            return res.status(200).json({
                works: []
            });
        
        let works = [];
        workSnapshot.forEach((doc) => {
            const id = doc.id;
            const workDoc = doc.data();
            works.push({
                id,
                sourceLanguage: workDoc?.sourceLanguage,
                targetLanguage: workDoc?.targetLanguage,
                name: workDoc?.name
            });
        });
        return res.status(200).json({works});
    } catch (error) {
        console.log("Get Work Error: ", error.message);
        return res.status(500).json({message: "Something went wrong"});
    }
}

exports.uploadUserProjectWork = async(req,res)=>{
    try {
        const file = req.file
        const {idx,id} = req.body
        
        if(!file || !idx || !id)
            return res.status(400).json({message:"Invalid Request"})

        const workRef = db.collection('works').doc(id);
        const workData = (await workRef.get()).data();

        const filePath = `${workData?.companyName.split(' ').join('_')}/${workData?.userId+'/completed'}/${workData.name}`
        await uploadFileToFirebaseStorage(file,filePath)

        workData.targetLanguage[Number(idx)] = {...workData.targetLanguage[Number(idx)],downloadPath:filePath}
        const isCompleted = workData.targetLanguage.every((obj) => obj.hasOwnProperty('downloadPath'));
        if(isCompleted){
            const end_date = admin.firestore.FieldValue.serverTimestamp();
            await workRef.update({
                targetLanguage:workData.targetLanguage,
                currentStatus: 'Completed',
                end_date
            })
        }
        else{
            await workRef.update({
                targetLanguage:workData.targetLanguage,
            })
        }
        return res.status(200).json({message:"Work Uploaded"})
    } catch (error) {
        console.log('Upload User Project Work Error: ',error.message)
        return res.status(500).json({message:"Something went wrong"})
    }
}

exports.getUserWorksForUpdate = async(req,res)=>{
    try {
        const {projectId} = req.params
        if(!projectId)
            return res.status(400).json({message:"Invalid Request"})
        const workRef = db.collection('works');
        const workQuery = workRef.where('projectId','==',projectId).where('currentStatus','==','In Progress');
        const workSnapshot = await workQuery.get();
        if(workSnapshot.empty)
            return res.status(200).json({works:[]})
        
        const works = workSnapshot.docs.map((doc)=>{
            const id = doc.id;
            const workDoc = doc.data();
            return {
                id,
                name:workDoc?.name,
                jobType:workDoc?.contentType,
                wordCount:workDoc?.wordCount,
                value:workDoc?.value,
                cost:workDoc?.cost,
            }
        })
        return res.status(200).json({works})
    } catch (error) {
        console.log('Get User Works For Update Error: ',error.message)
        return res.status(500).json({message:"Something went wrong"})
    }
}

exports.getWorkForCompanyBilling = async(req,res)=>{
    try {
        const {companyId,start_date,end_date} = req.query;
        const endDate = new Date(end_date);
        endDate.setHours(23,59,59,999);

        if(!isValidDate(start_date) || !isValidDate(end_date)){
            return res.status(400).json({message:"Invalid Date Format"})
        }

        if(!companyId)
            return res.status(400).json({message:"Invalid Request"})

        const projectsRef = db.collection('works');
        let workQuery = projectsRef
        .where('companyId', '==', companyId)
        .where('start_date', '>=', new Date(start_date))
        .where('start_date', '<=', endDate);

        const workSnapshot = await workQuery.get();
        if(workSnapshot.empty)
            return res.status(200).json({works:[]})

        const languageRate = (await db.collection('metadata').doc(`${companyId}_languageRates`).get()).data();

        const works = workSnapshot.docs.map((doc)=>{
            const id = doc.id;
            const workDoc = doc.data();
           
            const sourceLanguage = String(workDoc?.sourceLanguage).toLowerCase();
            const languageRates  = workDoc?.targetLanguage.map((language)=>{
                const targetLanguage = String(language.lang).toLowerCase();
                if(languageRate && languageRate.hasOwnProperty(`${sourceLanguage}-${targetLanguage}`)){
                    return {lang:targetLanguage, rate:languageRate[`${sourceLanguage}-${targetLanguage}`]}
                }
                else{
                    return {lang:targetLanguage, rate:3}
                }
            })
            const start_date = new Date(workDoc.start_date.seconds * 1000 + workDoc.start_date._nanoseconds / 1000000);
            const end_date = new Date(workDoc.end_date.seconds * 1000 + workDoc.end_date._nanoseconds / 1000000);
            return {
                id,
                fileName:workDoc?.name,
                wordCount:workDoc?.wordCount,
                cost:workDoc?.cost,
                customerId:workDoc?.userEmail,
                projectName:workDoc?.projectName,
                createdAt:start_date,
                end_date,
                numberOfLanguages: workDoc?.targetLanguage?.length,
                languageRates
            }
        })
        return res.status(200).json({works})
    } catch (error) {
        console.log('Get Work For Company Billing Error: ',error.message)
        return res.status(500).json({message:"Something went wrong"})
    }
}
exports.updateUserWorks = async(req,res)=>{
    try {
        const {id,wordCount,cost} = req.body

        if(!id || !wordCount || !cost)
            return res.status(400).json({message:"Invalid Request"})

        const workRef = db.collection('works').doc(id);
        const workData = (await workRef.get()).data();

        const workCost = Number(workData?.cost);
        if(workCost !== Number(cost)){
            const userRef = db.collection('users').doc(workData?.userId);
            const userData = (await userRef.get()).data();
            const totalCost = userData?.totalBilledAmount;
            console.log(totalCost)
            const updatedTotalCost = totalCost - workCost + Number(cost);
            await userRef.update({
                totalBilledAmount:Number(updatedTotalCost)
            })
        }
        await workRef.update({
            wordCount,
            cost
        });

        return res.status(200).json({message:"Work Updated"})
    } catch (error) {
        console.log('Update User Works Error: ',error.message);
        return res.status(500).json({message:"Something went wrong"})
    }
}


