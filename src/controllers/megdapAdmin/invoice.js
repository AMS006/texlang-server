const { db } = require("../../../firebase");
const { CGST_RATE, SGST_RATE, DEFAULT_LANGUAGE_RATE } = require("../../constants");
const { isValidDate } = require("../../helper");
const sendInvoiceEmail = require("../../utils/sendInvoiceEmail");

exports.getGenerateInvoiceWorks = async (req, res) => {
  try {
    const { companyId, start_date, end_date } = req.query;
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999);

    if (!isValidDate(start_date) || !isValidDate(end_date)) {
      return res.status(400).json({ message: "Invalid Date Format" });
    }

    if (!companyId) return res.status(400).json({ message: "Invalid Request" });

    const filesRef = db.collection("files");
    let filesQuery = filesRef
      .where("companyId", "==", companyId)
      .where("start_date", ">=", new Date(start_date))
      .where("start_date", "<=", endDate);

    const fileSnapshot = await filesQuery.get();

    if (fileSnapshot.empty) return res.status(200).json({ works: [] });

    let works = [];
    const languageRate = (
      await db.collection("metadata").doc(`${companyId}_languageRates`).get()
    ).data();

    fileSnapshot.docs.forEach((doc) => {
      const id = doc.id;
      const workDoc = doc.data();
      
      const start_date_work = new Date(
        workDoc.start_date.seconds * 1000 +
          workDoc.start_date._nanoseconds / 1000000,
      );

      
        if (!workDoc?.invoiceGenerated) {
          let langRate = DEFAULT_LANGUAGE_RATE;
          let sourceLanguage = String(workDoc.sourceLanguage).toLowerCase();
          let targetLanguage = String(workDoc.targetLanguage).toLowerCase();
          if (
            languageRate &&
            languageRate.hasOwnProperty(`${sourceLanguage}-${targetLanguage}`)
          ) {
            langRate = languageRate[`${sourceLanguage}-${targetLanguage}`];
          }
          const amount =
            workDoc.wordCount > 0
              ? langRate * workDoc.wordCount
              : langRate * workDoc.value;
          works.push({
            id,
            fileName: workDoc?.fileName,
            wordCount: workDoc?.wordCount,
            amount,
            customerId: workDoc?.userEmail,
            projectName: workDoc?.projectName,
            createdAt: start_date_work,
            sourceLanguage,
            targetLanguage,
            cost: langRate,
          });
        }
      });
    return res.status(200).json({ works });
  } catch (error) {
    console.log("Get Generate Invoice Works Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const { works } = req.body;
    if (!works || !works.length)
      return res.status(400).json({ message: "Invalid Request" });

    const invoiceRef = db.collection("invoices");
    const invoiceBatch = db.batch();
    const fileBatch = db.batch();

    let numberOfInvoice = await invoiceRef
      .get()
      .then((snapshot) => snapshot.size);

    for (const work of works) {
      const { id, email, amount } = work;

      numberOfInvoice += 1;

      if (!id  || !email || !amount)
        return res.status(400).json({ message: "Invalid Request" });

      const refNumber = String(numberOfInvoice).padStart(4, "0");

      const fileRef = db.collection("files").doc(id);
      const fileData = (await fileRef.get()).data();

      fileBatch.update(fileRef, { invoiceGenerated: true });


      const invoiceData = {
        refNumber,
        fileId: id,
        wordCount: fileData.wordCount,
        email,
        companyName: fileData.companyName,
        companyId: fileData?.companyId,
        amount,
        adminApproved: false,
        companyAdminApproved: false,
        isCanceled: false,
        createdAt: new Date(),
      };

      invoiceBatch.set(invoiceRef.doc(), invoiceData);
    }

    await Promise.all([invoiceBatch.commit(), fileBatch.commit()]);

    return res.status(200).json({ message: "Invoice Generated Successfully" });
  } catch (error) {
    console.error("Generate Invoice Error", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getApprovePendingInvoices = async (req, res) => {
  try {
    const invoiceRef = db.collection("invoices");
    const invoiceQuery = invoiceRef.where("adminApproved", "==", false);

    const invoiceSnapshot = await invoiceQuery.get();

    if (invoiceSnapshot.empty) return res.status(200).json({ invoices: [] });

    const invoices = invoiceSnapshot.docs.map((doc) => {
      const invoiceData = doc.data();
      const invoiceId = doc.id;

      const invoiceDate = new Date(
        invoiceData.createdAt.seconds * 1000 +
          invoiceData.createdAt._nanoseconds / 1000000,
      );

      return {
        id: invoiceId,
        refrenceNumber: invoiceData?.refNumber,
        invoiceNumber: invoiceData?.invoiceNumber,
        createdAt: invoiceDate,
        companyName: invoiceData?.companyName,
      };
    });
    return res.status(200).json({ invoices });
  } catch (error) {
    console.log("Approve Pending Invoice Error", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isCA, isCancel } = req.body;
    if (!id) return res.status(400).json({ message: "Invalid Request" });

    const invoiceRef = db.collection("invoices");
    const batch = db.batch();
    if (isCancel) {
      const invoiceData = (await invoiceRef.doc(id).get()).data();
      const fileRef = db.collection("files").doc(invoiceData.fileId);
     

      
      batch.update(fileRef, { invoiceGenerated: false });
      batch.update(invoiceRef.doc(id), { isCanceled: true });
    } else if (isCA) {
      batch.update(invoiceRef.doc(id), { companyAdminApproved: true });
    } else {
      batch.update(invoiceRef.doc(id), { adminApproved: true });
    }
    await batch.commit();

    return res
      .status(200)
      .json({
        message: `Invoice ${isCancel ? "Canceled" : "Approved"} Successfully`,
      });
  } catch (error) {
    console.log("Approve Invoice Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getInvoiceDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "Invalid Request" });

    const invoiceRef = db.collection("invoices").doc(id);

    const invoiceData = (await invoiceRef.get()).data();

    if (!invoiceData)
      return res.status(400).json({ message: "Invalid Request" });


    const invoiceDate = new Date(
      invoiceData.createdAt.seconds * 1000 +
        invoiceData.createdAt._nanoseconds / 1000000,
    );
    const centralTaxAmount = (invoiceData.amount * CGST_RATE) / 100;
    const stateTaxAmount = (invoiceData.amount * SGST_RATE) / 100;
    const totalTaxAmount = centralTaxAmount + stateTaxAmount;
    const grandTotal = Number(invoiceData.amount + totalTaxAmount).toFixed(0);

    const invoiceDetails = {
      id: invoiceRef.id,
      invoiceNumber: invoiceData?.invoiceNumber,
      companyName: invoiceData?.companyName,
      wordCount: invoiceData?.wordCount,
      amount: invoiceData?.amount,
      hscCode: invoiceData?.hscCode,
      adminApproved: invoiceData?.adminApproved,
      email: invoiceData?.email,
      invoiceDate,
      centralTaxRate: CGST_RATE,
      stateTaxRate: SGST_RATE,
      centralTaxAmount,
      stateTaxAmount,
      totalTaxAmount,
      grandTotal,
    };

    return res.status(200).json({ invoiceDetails });
  } catch (error) {
    console.log("Get Invoice Details Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getAllInvoices = async (req, res) => {
  try {
    const invoiceRef = db.collection("invoices");
    const invoiceSnapshot = await invoiceRef.get();

    if (invoiceSnapshot.empty) return res.status(200).json({ invoices: [] });

    const invoices = invoiceSnapshot.docs.map((doc) => {
      const invoiceData = doc.data();
      const invoiceId = doc.id;

      const invoiceDate = new Date(
        invoiceData.createdAt.seconds * 1000 +
          invoiceData.createdAt._nanoseconds / 1000000,
      );

      return {
        id: invoiceId,
        refrenceNumber: invoiceData?.refNumber,
        invoiceNumber: invoiceData.invoiceNumber,
        createdAt: invoiceDate,
        companyName: invoiceData.companyName,
        status: invoiceData.isCanceled?'Cancelled':
                invoiceData?.companyAdminApproved
          ? "CA Approved"
          : invoiceData?.adminApproved
            ? "Admin Approved"
            : "Pending",
      };
    });
    return res.status(200).json({ invoices });
  } catch (error) {
    console.log("Get All Invoices Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getInvoicesToSend = async (req, res) => {
  try {
    const invoiceRef = db.collection("invoices");

    const invoiceQuery = invoiceRef
      .where("adminApproved", "==", true)
      .where("companyAdminApproved", "==", true)
      .where("isCanceled", "==", false);

    const invoiceSnapshot = await invoiceQuery.get();

    if (invoiceSnapshot.empty) return res.status(200).json({ invoices: [] });

    const invoices = invoiceSnapshot.docs.map((doc) => {
      const invoiceData = doc.data();
      const invoiceId = doc.id;

      const invoiceDate = new Date(
        invoiceData.createdAt.seconds * 1000 +
          invoiceData.createdAt._nanoseconds / 1000000,
      );

      return {
        id: invoiceId,
        invoiceNumber: invoiceData?.invoiceNumber,
        invoiceDate,
        companyName: invoiceData?.companyName,
      };
    });
    return res.status(200).json({ invoices });
  } catch (error) {
    console.log("Get Invoices To Send Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.sendInvoiceEmailToUser = async (req, res) => {
  try {
    const { to, subject, text, attachment } = req.body;

    await sendInvoiceEmail(to, subject, text, attachment);

    res.send("Email sent");
  } catch (error) {
    console.log("Send Invoice Email To User Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
