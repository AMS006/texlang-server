const { db } = require("../../../firebase");

exports.getApprovePendingInvoices = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const invoiceCollection = db.collection("invoices");
    const invoiceQuery = await invoiceCollection
      .where("companyId", "==", user.companyId)
      .where("companyAdminApproved", "==", false)
      .where("isCanceled", "==", false)
      .get();
    if (invoiceQuery.empty) {
      return res.status(200).json({ invoices: [] });
    }

    const invoices = invoiceQuery.docs.map((doc) => {
      const id = doc.id;
      const invoiceDoc = doc.data();
      const createdAt = new Date(
        invoiceDoc.createdAt.seconds * 1000 +
          invoiceDoc.createdAt._nanoseconds / 1000000,
      );

      return {
        id,
        refrenceNumber: invoiceDoc.refNumber,
        invoiceDate: createdAt,
        companyName: invoiceDoc.companyName,
      };
    });
    return res.status(200).json({ invoices });
  } catch (error) {
    console.log("Get Pending Invoices Error: ", error.message);
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

exports.updateInvoiceDetails = async (req, res) => {
  try {
    const { invoiceNumber, hscCode } = req.body;

    const { id } = req.params;

    if (!id || !invoiceNumber || !hscCode)
      return res.status(400).json({ message: "Invalid Request" });

    const invoiceRef = db.collection("invoices").doc(id);

    invoiceRef.update({
      invoiceNumber,
      hscCode,
      companyAdminApproved: true,
    });

    return res.status(200).json({ message: "Invoice Updated Successfully" });
  } catch (error) {
    console.log("Update Invoice Details Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
