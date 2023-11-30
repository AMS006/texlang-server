const { filesize } = require("filesize");

const { db } = require("../../firebase");
const { countWords } = require("../helper");
const { DEFAULT_LANGUAGE_RATE } = require("../constants");

exports.uploadWork = async (req, res) => {
  try {
    const file = req.file;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!file) {
      return res.status(400).send("No file uploaded");
    }

    let value = 0,
      wordCount = 0;

    wordCount = await countWords(file);
    const date = new Date(Number(req.body.timeStamp));
    const remoteFileName = `${user.companyName.split(" ").join("_")}/${
      user.id
    }/${date}/${req.body.name}`;

    const fileName = file.originalname;
    let size = filesize(file.size, { base: 2, standard: "jedec" });
    let format = fileName.split(".").pop();

    res.status(200).json({
      sourceFilePath: remoteFileName,
      name: req.body.name,
      size,
      format,
      wordCount,
      value,
      sourceLanguage: "english",
      targetLanguage: [],
      contentType: "translation",
    });
  } catch (error) {
    console.log("Upload Work : ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
exports.getWorksData = async (works, projectId, projectName, companyId) => {
  const worksData = [];
  const languageRate = db
    .collection("metadata")
    .doc(`${companyId}_languageRates`);
  const languageRateData = (await languageRate.get()).data();

  works.forEach((work) => {
    let cost = 0;
    let sourceLanguage = String(work.sourceLanguage).toLowerCase();
    let wordCount = Number(work.wordCount);

    work.targetLanguage.forEach((language) => {
      let targetLanguage = String(language.lang).toLowerCase();
      if (
        languageRateData &&
        languageRateData.hasOwnProperty(`${sourceLanguage}-${targetLanguage}`)
      ) {
        if (wordCount > 0)
          cost +=
            languageRateData[`${sourceLanguage}-${targetLanguage}`] * wordCount;
        else
          cost +=
            languageRateData[`${sourceLanguage}-${targetLanguage}`] *
            work.value;
      } else {
        work.wordCount > 0
          ? (cost += DEFAULT_LANGUAGE_RATE * wordCount)
          : (cost += DEFAULT_LANGUAGE_RATE * work.value);
      }
    });

    worksData.push({
      ...work,
      cost: Number(cost),
      projectId,
      projectName: projectName,
      approvalStatus: "Yes",
      currentStatus: "In Progress",
    });
  });

  return worksData;
};
exports.formatJobWiseData = (works) => {
  const jobWiseData = {};

  works.forEach((work) => {
    if (jobWiseData.hasOwnProperty(work.contentType)) {
      jobWiseData[work.contentType] += 1;
    } else {
      jobWiseData[work.contentType] = 1;
    }
  });
  return jobWiseData;
};
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!comment || comment.length === 0)
      return res.status(400).json({ message: "Invalid Request" });
    if (!id) return res.status(400).json({ message: "Invalid Request" });

    const workRef = db.collection("works").doc(id);

    const workData = (await workRef.get()).data();

    let comments = [];
    if (workData?.comments && workData?.comments?.length > 0) {
      comments = [...workData.comments, comment];
    } else {
      comments = [comment];
    }

    await workRef.update({ comments });

    return res.status(200).json({ message: "Comment Added" });
  } catch (error) {
    console.log("Add Comment : ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
