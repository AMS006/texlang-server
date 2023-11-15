const validator = require('validator')

const {db, admin} = require('../../firebase')
const { getWorksData, formatJobWiseData } = require('./work')
const { getDownloadUrl } = require('../helper')

exports.addProject = async(req,res) =>{
    try {
        const {name,department,works,description} = req.body
        const user = req.user
        
        if(!user)
            return res.status(401).json({ message: "Invalid Request" })
        
        if(validator.isEmpty(name) || validator.isEmpty(department)){
            return res.status(400).json({message:"Plzz provide all Fields"})
        }
        if(!works || works.length == 0)
            return res.status(400).json({message:"Invalid Request"})


        const userRef =  db.collection('users').doc(user.id)
        const projectRef = db.collection('projects').doc()
        const jobWiseDataRef = db.collection('metadata').doc(`${user.companyId}_jobWiseData`)

         const userDetail = {
            email: user.email,
            name:user.name
        }
        const wordCount = works.reduce((acc,work) => acc + Number(work.wordCount),0)
        const numberOfLanguages = works.reduce((acc,work) => acc + work.targetLanguage.length,0)

        const createdAt = admin.firestore.FieldValue.serverTimestamp()
        const start_date = new Date();
        const end_date = new Date(start_date);
        end_date.setDate(start_date.getDate() + 2);
        
        const projectId = projectRef.id
        const worksData = await getWorksData(works,projectId,name,user.companyId)

        const totalCost = worksData.reduce((acc,work) => acc + Number(work.cost),0)
        const projectData = {
            name,
            department,
            totalCost:Number(totalCost),
            createdAt,
            start_date,
            end_date,
            description:description?description:'',
            userId:user.id,
            user: userDetail,
            wordCount,
            numberOfLanguages,
            companyId: user?.companyId,
            companyName: user?.companyName,
            status: "In Progress",
            paymentSuccess:false
        }
        

        // Transaction to Update the billed amount of user to add Project and associated work with it and to update JobWiseData
        await db.runTransaction(async(transaction)=>{
            const amount = Number(totalCost)
            const jobWiseDataExists = (await transaction.get(jobWiseDataRef)).exists

            transaction.update(userRef,{totalBilledAmount:admin.firestore.FieldValue.increment(amount)})
            
            transaction.set(projectRef,projectData)

           
            const batch = db.batch();
            worksData.forEach((work) =>{
                const workRef = db.collection('works').doc();
                batch.set(workRef,{...work,
                    userId:user.id,
                    userEmail:user.email,
                    companyId:user.companyId,
                    companyName:user.companyName,
                    start_date,
                    end_date,
                    projectName:name,
                })
            })
            await batch.commit()

            const jobWiseData = formatJobWiseData(works)

            if(jobWiseDataExists){
                for(const field in jobWiseData){
                    const val = Number(jobWiseData[field])

                    transaction.update(jobWiseDataRef, {
                        [field]:admin.firestore.FieldValue.increment(val)
                    })
                }
            }else{
                transaction.set(jobWiseDataRef,jobWiseData)
            }

        })

        return res.status(201).json({message:"Project Added"})
    } catch (error) {
        console.log("Add New Project : ", error.message)
        return res.status(500).json({message:"Something went wrong"})
    }
}

exports.getProjects = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(400).json({ message: "Invalid Request" });

        const projectRef = db.collection('projects');

        let projectQuery = projectRef.where('userId', '==', user.id).orderBy('createdAt','desc');
       
        const projectSnapshot = await projectQuery.get()
        
        const projects = projectSnapshot.docs.map((doc) =>{
            const id = doc.id
            const projectDoc = doc.data();
            
            const start_date = new Date(projectDoc.start_date.seconds * 1000 + projectDoc.start_date._nanoseconds / 1000000);
            const end_date = new Date(projectDoc.end_date.seconds * 1000 + projectDoc.end_date._nanoseconds / 1000000);

            return {
                id,
                name: projectDoc?.name,
                userId: projectDoc?.user?.email,
                start_date,
                end_date,
                status: projectDoc?.status
            };
        })

        return res.status(200).json({ projects });
    } catch (error) {
        console.log("Get Projects Error: ", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

exports.getProjectDetailsUser = async(req,res) =>{
    try {
        const {id} = req.params;
        
        if(!id)
            return res.status(400).json({message:"Invalid Request"})

        const projectCollection = db.collection('projects');

        const data = (await projectCollection.doc(id).get()).data()

        if(!data)
            return res.status(404).json({message:"No Project Found"})
        const workCollection = db.collection('works').where('projectId' ,'==',id)
        const worksData = (await workCollection.get()).docs

        const works = []
        for(let i = 0;i<worksData.length;i++){
            const work = worksData[i].data();
            const id = worksData[i].id;
            for(let i = 0;i<work.targetLanguage.length;i++){
                if(work.targetLanguage[i].downloadPath){
                    const downloadUrl = await getDownloadUrl(work.targetLanguage[i].downloadPath)
                    
                    work.targetLanguage[i].downloadUrl = downloadUrl
                }
            }
            
            const updatedWork ={
                id,
                name:work?.name,
                sourceLanguage:work?.sourceLanguage,
                approvalStatus:work?.approvalStatus,
                currentStatus:work?.currentStatus,
                targetLanguage:work?.targetLanguage
            }
            works.push(updatedWork)
        }
        const project = {
            name: data.name,
        }
        return res.status(200).json({project,works})
    } catch (error) {
        console.log("Get Project Error: ", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

