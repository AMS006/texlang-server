const { db } = require("../../../firebase");
const { isValidDate } = require("../../helper");

exports.getGenerateInvoiceWorks = async(req,res) =>{
    try {
        const {companyId,start_date,end_date} = req.query;
       
        if(!isValidDate(start_date) || !isValidDate(end_date)){
            return res.status(400).json({message:"Invalid Date Format"})
        }

        if(!companyId)
            return res.status(400).json({message:"Invalid Request"})

        const worksRef = db.collection('works');
        let workQuery = worksRef
        .where('companyId', '==', companyId)
        .where('start_date', '>=', new Date(start_date))

        const workSnapshot = await workQuery.get();

        if(workSnapshot.empty)
            return res.status(200).json({works:[]})

        let works = [];
        const languageRate = (await db.collection('metadata').doc(`${companyId}_languageRates`).get()).data();

        workSnapshot.docs.forEach((doc) =>{
            const id = doc.id;
            const workDoc = doc.data();
            
            const start_date_work = new Date(workDoc.start_date.seconds * 1000 + workDoc.start_date._nanoseconds / 1000000);
            const end_date_work = new Date(workDoc.end_date.seconds * 1000 + workDoc.end_date._nanoseconds / 1000000);

            if(end_date_work <= new Date(end_date)){
                workDoc.targetLanguage.forEach((language,idx) =>{
                    if(!language?.invoiceGenerated){
                        let langRate = 3.00;
                        let sourceLanguage = String(workDoc.sourceLanguage).toLowerCase();
                        let targetLanguage = String(language.lang).toLowerCase();

                        if(languageRate && languageRate.hasOwnProperty(`${sourceLanguage}-${targetLanguage}`)){
                            langRate = languageRate[`${sourceLanguage}-${targetLanguage}`]
                        }
                        const amount = workDoc.wordCount > 0 ? (langRate * workDoc.wordCount) : (langRate * workDoc.value)
                        works.push({
                            id,
                            idx,
                            fileName:workDoc?.name,
                            wordCount:workDoc?.wordCount,
                            amount,
                            customerId:workDoc?.userEmail,
                            projectName:workDoc?.projectName,
                            createdAt:start_date_work,
                            sourceLanguage,
                            targetLanguage,
                            cost:langRate
                        })
                    }
                })
            }
        })
        return res.status(200).json({works})
    } catch (error) {
        console.log('Get Generate Invoice Works Error: ',error.message)
        return res.status(500).json({message:"Something went wrong"})
    }
}

exports.generateInvoice = async (req, res) => {
  try {
    const { works } = req.body;
    if (!works || !works.length)
      return res.status(400).json({ message: "Invalid Request" });

    const invoiceRef = db.collection("invoices");
    const invoiceBatch = db.batch();
    const workBatch = db.batch();

    let numberOfInvoice = await invoiceRef.get().then((snapshot) => snapshot.size);

    for (const work of works) {
        const { id, idx, email, amount } = work;
        
        numberOfInvoice += 1;
        
        if (!id || Number(idx)<0 || !email || !amount)
            return res.status(400).json({ message: "Invalid Request" });
        
        const padNumber = String(numberOfInvoice).padStart(5, "0");
        const invoiceNumber = `#TEX${padNumber}`;
        const workRef = db.collection("works").doc(id);
        const workData = (await workRef.get()).data();

        const updatedTargetLanguage = [...workData.targetLanguage];
        updatedTargetLanguage[Number(idx)] = {
            ...updatedTargetLanguage[Number(idx)],
            invoiceGenerated: true,
        };

        workBatch.update(workRef, { targetLanguage: updatedTargetLanguage });

        const invoiceData = {
            invoiceNumber,
            workId: id,
            workIndex: idx,
            email,
            companyName: workData.companyName,
            amount,
            status: "Pending",
            createdAt: new Date(),
        };

        invoiceBatch.set(invoiceRef.doc(), invoiceData);
    }

    await Promise.all([invoiceBatch.commit(), workBatch.commit()]);

    return res.status(200).json({ message: "Invoice Generated Successfully" });
    } catch (error) {
        console.error("Generate Invoice Error", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

exports.getApprovePendingInvoices = async (req, res) => {
    try {
        const invoiceRef = db.collection("invoices");
        const invoiceQuery = invoiceRef.where("status", "==", "Pending");

        const invoiceSnapshot = await invoiceQuery.get();

        if (invoiceSnapshot.empty)
            return res.status(200).json({ invoices: [] });

        const invoices = invoiceSnapshot.docs.map((doc) => {
            const invoiceData = doc.data();
            const invoiceId = doc.id;

            const invoiceDate = new Date(invoiceData.createdAt.seconds * 1000 + invoiceData.createdAt._nanoseconds / 1000000);

            return {
                id: invoiceId,
                invoiceNumber: invoiceData.invoiceNumber,
                createdAt: invoiceDate,
                companyName: invoiceData.companyName,
            };
        });
        return res.status(200).json({ invoices });
    } catch (error) {
        console.log("Approve Pending Invoice Error", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

exports.approveInvoices = async(req,res) =>{
    try {
        const {id} = req.body
        if(!id)
            return res.status(400).json({message:"Invalid Request"})

        const invoiceRef = db.collection('invoices');

        await invoiceRef.doc(id).update({status:"Approved"})

        return res.status(200).json({message:"Invoice Approved"})
    } catch (error) {
        console.log("Approve Invoice Error: ", error.message);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

exports.getInvoiceDetails = async(req,res) =>{
    try {
        const {id} = req.params

        if(!id)
            return res.status(400).json({message:"Invalid Request"})

        const invoiceRef = db.collection('invoices').doc(id);

        const invoiceData = (await invoiceRef.get()).data();

        if(!invoiceData)
            return res.status(400).json({message:"Invalid Request"})

        const workRef = db.collection('works').doc(invoiceData.workId);
        const workData = (await workRef.get()).data();

        if(!workData)
            return res.status(400).json({message:"Invalid Request"})

        const invoiceDate = new Date(invoiceData.createdAt.seconds * 1000 + invoiceData.createdAt._nanoseconds / 1000000)
        const centralTaxAmount = (invoiceData.amount * 9.00) / 100;
        const stateTaxAmount = (invoiceData.amount * 9.00) / 100;
        const totalTaxAmount = centralTaxAmount + stateTaxAmount;
        const grandTotal = Number(invoiceData.amount + totalTaxAmount).toFixed(0);
        const invoiceDetails = {
            id:invoiceRef.id,
            invoiceNumber:invoiceData.invoiceNumber,
            companyName:invoiceData.companyName,
            wordCount:workData.wordCount,
            amount:invoiceData.amount,
            email:invoiceData.email,
            invoiceDate,
            centralTaxRate: 9.00,
            stateTaxRate: 9.00,
            centralTaxAmount,
            stateTaxAmount,
            totalTaxAmount,
            grandTotal
        }

        return res.status(200).json({invoiceDetails})
    } catch (error) {
        
    }
}
