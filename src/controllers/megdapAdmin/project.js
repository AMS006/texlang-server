const { db, admin } = require("../../../firebase");
const { isValidDate } = require("../../helper");
const sendEmail = require("../../utils/sendEmail");

exports.getUserProjects = async (req, res) => {
    try {
        const { userId } = req.params
        if (!userId)
            return res.status(400).json({ message: "Invalid Request" })
        
        const projectRef = db.collection('projects');
        const projectQuery = projectRef.where('userId', '==', userId).orderBy('createdAt', 'desc').where('status','==','In Progress');
        
        const projectSnapshot = await projectQuery.get()
        if(projectSnapshot.empty)
            return res.status(200).json({ projects: [] });

        const projects = projectSnapshot.docs.map((doc) => {
            const id = doc.id
            const projectDoc = doc.data();
            return {
                id,
                name: projectDoc?.name,
            }
        })
        return res.status(200).json({ projects });
    } catch (error) {
        console.log("Get Projects Error: ", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

exports.updateProjectStatus = async(req,res) =>{
    try {
        const {projectId} = req.body;

        if(!projectId)
            return res.status(400).json({message:"Invalid Request"})

        const projectRef = db.collection('projects').doc(projectId);
        const projectData = (await projectRef.get()).data();
        const email = projectData?.user?.email;

        const batch = db.batch();
        const end_date = admin.firestore.FieldValue.serverTimestamp()
        batch.update(projectRef,{status:"Completed",end_date})
        
        if(email){
            const html = `Dear Customer,
            <br />
            <p> Please note, the work you had uploaded on <a href="https://texlang-client-qjvrxcjtna-uc.a.run.app/" target="_blank">Texlang</a>. for the project ${projectData?.name} has been completed. Please login to your account to download the completed work. </p>`
            await sendEmail(email,"Texlang Project Completed", html)
        }

        await batch.commit();
        return res.status(200).json({message:"Status Updated"})
    } catch (error) {
        console.log("Update Project Status Error: ", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}
exports.getPaymentPendingProjects = async(req,res)=>{
    try {
        const {companyId,start_date,end_date} = req.query;
        const endDate = new Date(end_date);
        endDate.setHours(23,59,59,999);
        if(!isValidDate(start_date) || !isValidDate(end_date)){
            return res.status(400).json({message:"Invalid Date Format"})
        }
        if(!companyId)
            return res.status(400).json({message:"Invalid Request"})

        const projectsRef = db.collection('projects');
        let projectsQuery = projectsRef
        .where('companyId', '==', companyId)
        .where('paymentSuccess', '==', false)
        .where('start_date', '>=', new Date(start_date))
        .where('start_date', '<=', endDate)

        const projectsSnapshot = await projectsQuery.get();
        if(projectsSnapshot.empty)
            return res.status(200).json({projects:[]})
        const projects = projectsSnapshot.docs.map((doc)=>{
            const id = doc.id;
            const projectDoc = doc.data();
            const start_date = new Date(projectDoc.start_date.seconds * 1000 + projectDoc.start_date._nanoseconds / 1000000);
            const end_date = new Date(projectDoc.end_date.seconds * 1000 + projectDoc.end_date._nanoseconds / 1000000);

            return {
                id,
                name:projectDoc?.name,
                user:projectDoc?.user?.email,
                createdAt:start_date,
                end_date,
                wordCount:projectDoc?.wordCount,
                amount:projectDoc?.totalCost,
                numberOfLanguages:projectDoc?.numberOfLanguages,
            }
        })
        
        return res.status(200).json({projects})
    } catch (error) {
        console.log("Payment Pending Project Error", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

exports.updatePaymentPendingProjects = async(req,res) =>{
    try {
        const {projects} = req.body;

        if(!projects)
            return res.status(400).json({message:"Invalid Request"})

        const projectRef = db.collection('projects');
        const batch = db.batch();
        projects.forEach((project)=>{
            const projectDoc = projectRef.doc(project.id);
            batch.update(projectDoc,{paymentSuccess:true})
        })
        await batch.commit();
        return res.status(200).json({message:"Status Updated"})
    } catch (error) {
        console.log("Update Payment Pending Project Error: ", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}
