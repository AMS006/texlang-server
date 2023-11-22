const { db } = require("../../../firebase");
const { CGST_RATE, SGST_RATE } = require("../../Constants");

exports.getProjectInvoices = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const projectRef = db
      .collection("projects")
      .where("companyId", "==", user?.companyId)
      .where("status", "==", "Completed");

    const projectData = (await projectRef.get()).docs;

    const projects = projectData.map((data) => {
      const project = data.data();
      const id = data.id;
      return {
        id,
        invoiceId: project?.invoiceId,
        name: project?.name,
        department: project?.department,
        createdBy: project?.user.email,
        invoiceGenerated: project?.invoiceGenerated,
        invoiceNumber: project?.invoiceNumber,
      };
    });
    return res.status(200).json({ projects });
  } catch (error) {
    console.log("Get Invoice Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.generateProjectInvoice = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) return res.status(400).json({ message: "Invalid Request" });

    const projectRef = db.collection("projects").doc(projectId);
    const projectInvoiceRef = db.collection("projectInvoices");

    const isInvoiceGenerated = await projectInvoiceRef
      .where("projectId", "==", projectId)
      .get();

    if (!isInvoiceGenerated.empty) {
      const invoiceDetails = isInvoiceGenerated.docs[0].data();
      const invoiceDate = new Date(
        invoiceDetails.invoiceDate.seconds * 1000 +
          invoiceDetails.invoiceDate._nanoseconds / 1000000,
      );
      const invoice = {
        id: invoiceDetails.id,
        invoiceNumber: invoiceDetails.invoiceNumber,
        invoiceDate,
        companyName: invoiceDetails.companyName,
        department: invoiceDetails.department,
        name: invoiceDetails.name,
        amount: invoiceDetails.amount,
        works: invoiceDetails?.works || [],
        userEmail: invoiceDetails?.userEmail,
        department: invoiceDetails?.department,
        taxDetails: invoiceDetails?.taxDetails,
      };
      return res
        .status(200)
        .json({ message: "Invoice Already Generated", invoice });
    }
    const projectData = (await projectRef.get()).data();
    const invoiceData = await projectInvoiceRef.get();
    const num = (invoiceData.size + 1).toString().padStart(5, "0");
    const invoiceNumber = `#TEX${num}`;
    const invoiceDate = new Date();

    const workRef = db.collection("works").where("projectId", "==", projectId);
    const workData = await workRef.get();

    const works = workData.docs.map((doc) => {
      const work = doc.data();
      const id = doc.id;
      return {
        id,
        name: work.name,
        amount: work.cost,
        contentType: work.contentType,
      };
    });

    const batch = db.batch();

    const projectInvoiceRefId = projectInvoiceRef.doc().id;
    const projectInvoiceRefDoc = projectInvoiceRef.doc(projectInvoiceRefId);

    const totalAmountAfterTax =
      ((CGST_RATE + SGST_RATE) / 100) * projectData?.totalCost +
      projectData?.totalCost;
    const taxDetails = [
      {
        cgst: CGST_RATE,
        sgst: SGST_RATE,
        totalAmountAfterTax,
        totalAmount: projectData?.totalCost,
      },
    ];
    const invoiceFields = {
      id: projectInvoiceRefId,
      projectId,
      invoiceNumber,
      invoiceDate,
      companyId: projectData?.companyId,
      companyName: projectData?.companyName,
      department: projectData?.department,
      name: projectData?.name,
      amount: projectData?.totalCost,
      userEmail: projectData?.user?.email,
      works,
      taxDetails,
    };

    batch.set(projectInvoiceRefDoc, invoiceFields);
    batch.update(projectRef, {
      invoiceGenerated: true,
      invoiceNumber,
      invoiceId: projectInvoiceRefId,
    });

    await batch.commit();
    return res
      .status(201)
      .json({ message: "Invoice Generated", invoice: invoiceFields });
  } catch (error) {
    console.log("Generate Invoice Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getProjectInvoiceDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "Invalid Request" });

    const projectInvoiceRef = db.collection("projectInvoices").doc(id);
    const projectInvoiceData = (await projectInvoiceRef.get()).data();

    if (!projectInvoiceData)
      return res.status(400).json({ message: "Invalid Request" });
    const invoiceDate = new Date(
      projectInvoiceData.invoiceDate.seconds * 1000 +
        projectInvoiceData.invoiceDate._nanoseconds / 1000000,
    );
    const invoice = {
      id: projectInvoiceData.id,
      invoiceNumber: projectInvoiceData.invoiceNumber,
      invoiceDate,
      companyName: projectInvoiceData.companyName,
      department: projectInvoiceData.department,
      name: projectInvoiceData.name,
      amount: projectInvoiceData.amount,
      works: projectInvoiceData?.works || [],
      userEmail: projectInvoiceData?.userEmail,
      department: projectInvoiceData?.department,
      taxDetails: projectInvoiceData?.taxDetails,
    };

    return res.status(200).json({ invoice });
  } catch (error) {
    console.log("Get Invoice Details Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
