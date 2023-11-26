const xlsx = require("xlsx");
const PDFParser = require("pdf-parse");
const textract = require("textract");
const WordExtractor = require("word-extractor");

const { admin, bucket } = require("../../firebase");
const { DOWNLOAD_URL_EXPIRE_DAYS } = require("../constants");

exports.isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && !isNaN(date.getTime());
};

exports.getDownloadUrl = async (path) => {
  const bucket = admin.storage().bucket();
  const file = bucket.file(path);
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + DOWNLOAD_URL_EXPIRE_DAYS);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: expirationDate,
  });
  return url;
};

exports.uploadFileToFirebaseStorage = async (file, path) => {
  try {
    if (!file || !path) {
      throw new Error("Missing file or path");
    }

    const fileBuffer = file.buffer;

    const fileRef = bucket.file(path);

    const writeStream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    await new Promise((resolve, reject) => {
      writeStream.on("error", (error) => {
        console.error("Error uploading file:", error);
        reject(error);
      });

      writeStream.on("finish", () => {
        resolve();
      });

      writeStream.end(fileBuffer);
    });

    return `File uploaded to ${path}`;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

exports.countWords = async (file) => {
  if (file.mimetype === "application/pdf") {
    try {
      const pdfData = await PDFParser(file.buffer);
      const text = pdfData.text;
      const wordCount = text.split(/\s+/).length;

      return wordCount;
    } catch (error) {
      console.log("An Error Occured", error?.message);
      throw new Error("Something went wrong");
    }
  } else if (
    file.mimetype === "application/msword" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(file.buffer);

      const text = extracted.getBody();

      const wordCount = text.split(/\s+/).length;

      return wordCount;
    } catch (error) {
      console.log("An Error Occured", error?.message);
      throw new Error("Something went wrong");
    }
  } else if (
    file.mimetype === "text/csv" ||
    file.mimetype === "application/vnd.ms-excel" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    const workbook = xlsx.read(file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    let wordCount = 0;

    for (const cellAddress in sheet) {
      const cell = sheet[cellAddress];
      if (cell.v) {
        let text = "" + cell.v;
        wordCount += text.split(/\s+/).length;
      }
    }
    return wordCount;
  } else if (file.mimetype === "text/plain") {
    const text = file.buffer.toString("utf8");
    const wordCount = text.split(/\s+/).length;
    return wordCount;
  } else if (
    file.mimetype === "application/vnd.ms-powerpoint" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return new Promise((resolve, reject) => {
      textract.fromBufferWithMime(file.mimetype, file.buffer, (err, text) => {
        if (err) {
          reject(err);
        } else {
          const wordCount = text.split(/\s+/).length;
          resolve(wordCount);
        }
      });
    });
  } else {
    return 0;
  }
};
