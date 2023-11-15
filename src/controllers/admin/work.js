const { db } = require("../../../firebase");

exports.getWorks = async(req, res) => {
    try {
        const { projectId } = req.params

        if (!projectId)
            return res.status(404).json({ message: "Invalid Request" })
        
        const workQuery = db.collection('works').where('projectId', '==', projectId)

        const works = await workQuery.get()
        if (works.empty)
            return res.status(404).json({ message: "No Works Found" })
        
        const worksData = works.docs.map((item) => {
            const work = item.data()
            return {
                name:work?.name,
                sourceLanguage:work?.sourceLanguage,
                targetLanguage:work?.targetLanguage,
                contentType:work?.contentType,
                wordCount:work?.wordCount,
                value:work?.value
            }
        })
    
        return res.status(200).json({works:worksData})
        
    } catch (error) {
        console.log("Get-Works: ", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}
exports.getInvoiceWorks = async(req, res) => {
    try {
        const { projectId } = req.params    
        
        if (!projectId)
            return res.status(404).json({ message: "Invalid Request" })
        
        const workQuery = db.collection('works').where('projectId', '==', projectId)

        const works = await workQuery.get()
        if (works.empty)
            return res.status(404).json({ message: "No Works Found" })
        
        const worksData = works.docs.map((item) => {
            const work = item.data()
            return {
                name:work?.name,
                contentType:work?.contentType,
                amount:work?.cost
            }
        })
    
        return res.status(200).json({works:worksData})
        
    } catch (error) {
        console.log("Get-Works: ", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}
exports.getJobWiseData = async(req,res) =>{
    try {
        const user = req.user;

        const jobWiseDataRef =  db.collection('metadata').doc(`${user?.companyId}_jobWiseData`)
        const jobWiseData = await jobWiseDataRef.get();

        if(!jobWiseData.exists)
            return res.status(404).json({message:"No Jobs Found"})

        const jobs = jobWiseData.data()
        
        return res.status(200).json({jobs})
    } catch (error) {
        console.log("Job Wise Data: ", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}