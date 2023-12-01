const validator = require("validator");

const { db, admin } = require("../../firebase");
const { getWorksData, formatJobWiseData } = require("./work");
const { getDownloadUrl } = require("../helper");

exports.addProject = async (req, res) => {
  try {
    const { name, department, works, description } = req.body;
    const user = req.user;

    if (!user) return res.status(401).json({ message: "Invalid Request" });

    if (validator.isEmpty(name) || validator.isEmpty(department)) {
      return res.status(400).json({ message: "Plzz provide all Fields" });
    }

    if (!works || works.length == 0)
      return res.status(400).json({ message: "Invalid Request" });

    const userRef = db.collection("users").doc(user.id);
    const projectRef = db.collection("projects").doc();
    const jobWiseDataRef = db
      .collection("metadata")
      .doc(`${user.companyId}_jobWiseData`);

    const userDetail = {
      email: user.email,
      name: user.name,
    };
    const wordCount = works.reduce(
      (acc, work) => acc + Number(work.wordCount),
      0,
    );
    const numberOfLanguages = works.reduce(
      (acc, work) => acc + work.targetLanguage.length,
      0,
    );

    const createdAt = admin.firestore.FieldValue.serverTimestamp();
    const start_dateInString = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
    const start_date = new Date(start_dateInString);
    const end_date = new Date(start_date);
    end_date.setDate(start_date.getDate() + 2);

    const projectId = projectRef.id;
    const worksData = await getWorksData(
      works,
      projectId,
      name,
      user.companyId,
    );

    const totalCost = worksData.reduce(
      (acc, work) => acc + Number(work.cost),
      0,
    );
    const projectData = {
      name,
      department,
      totalCost: Number(totalCost),
      createdAt,
      start_date,
      end_date,
      description: description ? description : "",
      userId: user.id,
      user: userDetail,
      wordCount,
      numberOfLanguages,
      companyId: user?.companyId,
      companyName: user?.companyName,
      status: "In Progress",
      paymentSuccess: false,
      invoiceGenerated: false,
    };

    await db.runTransaction(async (transaction) => {
      const amount = Number(totalCost);
      const jobWiseDataExists = (await transaction.get(jobWiseDataRef)).exists;

      transaction.update(userRef, {
        totalBilledAmount: admin.firestore.FieldValue.increment(amount),
      });

      transaction.set(projectRef, projectData);

      

      worksData.forEach((work) => {
        const workRef = db.collection("works").doc();
        
        work.targetLanguage.forEach((language) => {
          const fileRef = db.collection("files").doc();
          const fileData = {
            companyId:user?.companyId,
            userId: user.id,
            projectId,
            companyName:user?.companyName,
            sourceLanguage: String(work.sourceLanguage).toLowerCase(),
            targetLanguage: String(language.lang).toLowerCase(),
            status: "In Progress",
            wordCount:work?.wordCount|| 0,
            value: work?.value || 0,
            contentType: work?.contentType,
            workId: workRef.id,
            userEmail: user.email,
            projectName:name,
            fileName:work?.name,
            start_date,
            end_date,
            translatorAssigned: false,
            invoiceGenerated: false,
          }
          transaction.set(fileRef, fileData);
        });

        transaction.set(workRef, {
          ...work,
          userId: user.id,
          companyId: user.companyId,
          userEmail: user.email,
          companyName: user.companyName,
          start_date,
          end_date,
          projectName: name,
        });
      });

    
      const jobWiseData = formatJobWiseData(works);

      if (jobWiseDataExists) {
        for (const field in jobWiseData) {
          const val = Number(jobWiseData[field]);

          transaction.update(jobWiseDataRef, {
            [field]: admin.firestore.FieldValue.increment(val),
          });
        }
      } else {
        transaction.set(jobWiseDataRef, jobWiseData);
      }
    });

    return res.status(201).json({ message: "Project Added" });
  } catch (error) {
    console.log("Add New Project : ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(400).json({ message: "Invalid Request" });

    const projectRef = db.collection("projects");

    let projectQuery = projectRef
      .where("userId", "==", user.id)
      .orderBy("createdAt", "desc");

    const projectSnapshot = await projectQuery.get();

    const projects = projectSnapshot.docs.map((doc) => {
      const id = doc.id;
      const projectDoc = doc.data();

      const start_date = new Date(
        projectDoc.start_date.seconds * 1000 +
          projectDoc.start_date._nanoseconds / 1000000,
      );
      const end_date = new Date(
        projectDoc.end_date.seconds * 1000 +
          projectDoc.end_date._nanoseconds / 1000000,
      );

      return {
        id,
        name: projectDoc?.name,
        userId: projectDoc?.user?.email,
        start_date,
        end_date,
        status: projectDoc?.status,
      };
    });

    return res.status(200).json({ projects });
  } catch (error) {
    console.log("Get Projects Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getProjectDetailsUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "Invalid Request" });

    const projectCollection = db.collection("projects");

    const projectData = (await projectCollection.doc(id).get()).data();

    if (!projectData) return res.status(404).json({ message: "No Project Found" });

    const workCollection = db.collection("works").where("projectId", "==", id);
    const worksData = (await workCollection.get()).docs;

    const works = [];
    for (let i = 0; i < worksData.length; i++) {
      const work = worksData[i].data();
      const id = worksData[i].id;

      const fileCollection = db.collection("files").where("workId", "==", id);

      const filesData = (await fileCollection.get()).docs;
      const isWordCompleted = filesData.every((file) => file.data().status === "Completed");
      for (let i = 0; i < filesData.length; i++) {
        const file = filesData[i].data();
        if (file?.downloadPath) {
          const downloadUrl = await getDownloadUrl(
            file.downloadPath,
          );

          work.targetLanguage[i].downloadUrl = downloadUrl;
        }
      }

      const updatedWork = {
        id,
        name: work?.name,
        sourceLanguage: work?.sourceLanguage,
        approvalStatus: work?.approvalStatus,
        currentStatus: isWordCompleted ? "Completed" : "In Progress",
        targetLanguage: work?.targetLanguage,
      };
      works.push(updatedWork);
    }
    const project = {
      name: projectData.name,
    };
    return res.status(200).json({ project, works });
  } catch (error) {
    console.log("Get Project Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
