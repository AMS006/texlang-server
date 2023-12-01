const { db } = require("../../../firebase");
const {
  getDownloadUrl,
  uploadFileToFirebaseStorage,
  isValidDate,
} = require("../../helper");

exports.getDownloadProjectWorks = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId)
      return res.status(400).json({
        message: "Invalid Request",
      });

    const workRef = db.collection("works");

    const workQuery = workRef
      .where("projectId", "==", projectId)
      .where("currentStatus" ,"==" ,"In Progress");
    

    const workSnapshot = await workQuery.get();
    if (workSnapshot.empty)
      return res.status(200).json({
        works: [],
      });
    
    const works = await Promise.all(
      workSnapshot.docs.map(async(doc) => {
        const id = doc.id;
        const workDoc = doc.data();
        const downloadUrl = await getDownloadUrl(workDoc?.sourceFilePath);
        return {
          id,
          sourceLanguage: workDoc?.sourceLanguage,
          fileName: workDoc?.name,
          downloadUrl,
        };
      }),
    );

    return res.status(200).json({ works });
  } catch (error) {
    console.log("Get Work Error: ", error.message);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

exports.getUploadProjectWorks = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId)
      return res.status(400).json({
        message: "Invalid Request",
      });
    const fileRef = db.collection("files");

    const fileQuery = fileRef
      .where("projectId", "==", projectId)
      .where("status", "==", "In Progress");

    const fileSnapshot = await fileQuery.get();
    if (fileSnapshot.empty)
      return res.status(200).json({
        works: [],
      });
    
    const filesData = fileSnapshot.docs.map((doc) => {
      const id = doc.id;
      const fileDoc = doc.data();
      return {
        id,
        workId: fileDoc?.workId,
        sourceLanguage: fileDoc?.sourceLanguage,
        targetLanguage: fileDoc?.targetLanguage,
        name: fileDoc?.fileName,
      };
    });

    const works = filesData.reduce((result, current) => {
      // Check if there is an entry in the result array for the current workId
      const existingEntry = result.find(entry => entry.workId === current.workId);

      // If an entry exists, push the current object into its items array
      if (existingEntry) {
        existingEntry.items.push(current);
      } else {
        // If an entry doesn't exist, create a new entry with the current object in its items array
        result.push({
          workId: current.workId,
          name: current.name,
          sourceLanguage: current.sourceLanguage,
          items: [current]
        });
      }

      return result;
    }, []);

  
    return res.status(200).json({ works });
  } catch (error) {
    console.log("Get Work Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.uploadUserProjectWork = async (req, res) => {
  try {
    const file = req.file;
    const { id } = req.body;

    if (!file || !id)
      return res.status(400).json({ message: "Invalid Request" });

    const fileRef = db.collection("files").doc(id);
    const fileData = (await fileRef.get()).data();

    const batch = db.batch();
    const dateInString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const date = new Date(dateInString);
    const filePath = `${fileData?.companyName.split(" ").join("_")}/${fileData?.userId}/completed/${date}/${fileData.fileName}`;
    await uploadFileToFirebaseStorage(file, filePath);

    batch.update(fileRef, {
      status: "Completed",
      downloadPath:filePath,
      end_date: date,
    });

  
    await batch.commit();
    return res.status(200).json({ message: "Work Uploaded" });
  } catch (error) {
    console.log("Upload User Project Work Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getUserWorksForUpdate = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ message: "Invalid Request" });
    const workRef = db.collection("works");
    const workQuery = workRef
      .where("projectId", "==", projectId)
      .where("currentStatus", "==", "In Progress");
    const workSnapshot = await workQuery.get();
    if (workSnapshot.empty) return res.status(200).json({ works: [] });

    const works = workSnapshot.docs.map((doc) => {
      const id = doc.id;
      const workDoc = doc.data();
      return {
        id,
        name: workDoc?.name,
        jobType: workDoc?.contentType,
        wordCount: workDoc?.wordCount,
        value: workDoc?.value,
        cost: workDoc?.cost,
      };
    });
    return res.status(200).json({ works });
  } catch (error) {
    console.log("Get User Works For Update Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getWorkForCompanyBilling = async (req, res) => {
  try {
    const { companyId, start_date, end_date } = req.query;
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999);

    if (!isValidDate(start_date) || !isValidDate(end_date)) {
      return res.status(400).json({ message: "Invalid Date Format" });
    }

    if (!companyId) return res.status(400).json({ message: "Invalid Request" });

    const projectsRef = db.collection("works");
    let workQuery = projectsRef
      .where("companyId", "==", companyId)
      .where("start_date", ">=", new Date(start_date))
      .where("start_date", "<=", endDate);

    const workSnapshot = await workQuery.get();
    if (workSnapshot.empty) return res.status(200).json({ works: [] });

    const languageRate = (
      await db.collection("metadata").doc(`${companyId}_languageRates`).get()
    ).data();

    const works = workSnapshot.docs.map((doc) => {
      const id = doc.id;
      const workDoc = doc.data();

      const sourceLanguage = String(workDoc?.sourceLanguage).toLowerCase();
      const languageRates = workDoc?.targetLanguage.map((language) => {
        const targetLanguage = String(language.lang).toLowerCase();
        if (
          languageRate &&
          languageRate.hasOwnProperty(`${sourceLanguage}-${targetLanguage}`)
        ) {
          return {
            lang: targetLanguage,
            rate: languageRate[`${sourceLanguage}-${targetLanguage}`],
          };
        } else {
          return { lang: targetLanguage, rate: 3 };
        }
      });
      const start_date = new Date(
        workDoc.start_date.seconds * 1000 +
          workDoc.start_date._nanoseconds / 1000000,
      );
      const end_date = new Date(
        workDoc.end_date.seconds * 1000 +
          workDoc.end_date._nanoseconds / 1000000,
      );
      return {
        id,
        fileName: workDoc?.name,
        wordCount: workDoc?.wordCount,
        cost: workDoc?.cost,
        customerId: workDoc?.userEmail,
        projectName: workDoc?.projectName,
        createdAt: start_date,
        end_date,
        numberOfLanguages: workDoc?.targetLanguage?.length,
        languageRates,
      };
    });
    return res.status(200).json({ works });
  } catch (error) {
    console.log("Get Work For Company Billing Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.updateUserWorks = async (req, res) => {
  try {
    const { id, wordCount, cost } = req.body;

    if (!id || !wordCount || !cost)
      return res.status(400).json({ message: "Invalid Request" });

    const workRef = db.collection("works").doc(id);
    const workData = (await workRef.get()).data();

    const userRef = db.collection("users").doc(workData?.userId);
    const userData = (await userRef.get()).data();

    const projectRef = db.collection("projects").doc(workData?.projectId);
    const projectData = (await projectRef.get()).data();

    const fileRef = await db.collection("files").where("workId", "==", id).get();

    const oldCost = Number(workData?.cost);
    const oldWordCount = Number(workData?.wordCount);

    const newCost = Number(cost);
    const newWordCount = Number(wordCount);

    const newProjectCost = projectData?.totalCost - oldCost + newCost;
    const newProjectWordCount = projectData?.wordCount - oldWordCount + newWordCount;
    const newUserTotalBilledAmount = userData?.totalBilledAmount - oldCost + newCost;

    const batch = db.batch();
    batch.update(workRef, { wordCount:Number(newWordCount), cost:Number(newCost) });// Update wordCount and cost in workCollction
    batch.update(projectRef, { cost: newProjectCost, wordCount: newProjectWordCount });// Update wordCount and cost in projectCollction
    batch.update(userRef, { totalBilledAmount: newUserTotalBilledAmount });// Update totalBilledAmount in userCollction

    // Update wordCount and cost in fileCollction
    if(oldWordCount !== newWordCount) {
      fileRef.forEach((doc) => {
        batch.update(doc.ref, { wordCount:newWordCount });
      });
    }

    await batch.commit();
    
    return res.status(200).json({ message: "Work Updated" });
  } catch (error) {
    console.log("Update User Works Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.updateWorkStatus = async(req,res) =>{
  try {
    const {workId} = req.params;

    if(!workId) return res.status(400).json({message:"Invalid Request"});

    const workRef = db.collection("works").doc(workId);

    await workRef.update({currentStatus:"Completed"});

    return res.status(200).json({message:"Work Updated"});
  } catch (error) {
    console.log("Update Work Status Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

exports.getNotAssignedWorks = async(req,res) =>{
  try {
    const {sourceLanguage,targetLanguage} = req.query;

    if(!sourceLanguage || !targetLanguage) return res.status(400).json({message:"Invalid Request"});

    const fileRef = db.collection("files");

    const fileQuery = fileRef
      .where("sourceLanguage", "==", sourceLanguage)
      .where("targetLanguage", "==", targetLanguage)
      .where("status", "!=", "Completed")
      .where("translatorAssigned", "==", false);

    const fileSnapshot = await fileQuery.get();

    if (fileSnapshot.empty)
      return res.status(200).json({
        works: [],
      });

    const works = fileSnapshot.docs.map((doc) => {
      const id = doc.id;
      const fileDoc = doc.data();
      return {
        id,
        workId: fileDoc?.workId,
        sourceLanguage: fileDoc?.sourceLanguage,
        targetLanguage: fileDoc?.targetLanguage,
        fileName: fileDoc?.fileName,
        wordCount: fileDoc?.wordCount,
        jobType: fileDoc?.contentType,
      };
    });
    return res.status(200).json({ works });
  } catch (error) {
    console.log("Get Not Assigned Works Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
}