const { db } = require("../../../firebase");

exports.getAllProjects = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(400).json({ message: "Invalid Request" });

    const projectCollection = db.collection("projects");

    let projectQuery = projectCollection
      .where("companyId", "==", user?.companyId)
      .orderBy("createdAt", "desc");

    const projectsData = await projectQuery.get();

    const projects = projectsData.docs.map((item) => {
      const id = item.id;
      const projectDoc = item.data();

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
        name: projectDoc.name,
        customer: projectDoc?.user?.email,
        start_date,
        end_date,
        status: projectDoc.status,
      };
    });
    return res.status(200).json({ projects });
  } catch (error) {
    console.log("Get All Projects Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getLatestProject = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(400).json({ message: "Invalid Request" });

    const projectCollection = db.collection("projects");

    let projectQuery = projectCollection
      .where("companyId", "==", user?.companyId)
      .orderBy("createdAt", "desc")
      .limit(5);

    const projectsData = await projectQuery.get();

    const projects = projectsData.docs.map((item) => {
      const id = item.id;
      const projectDoc = item.data();

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
        start_date,
        end_date,
        status: projectDoc?.status,
      };
    });

    return res.status(200).json({ projects });
  } catch (error) {
    console.log("Get Latest Projects Error: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.getProjectDetailsAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "Invalid Request" });

    const projectCollection = db.collection("projects");

    const projectDoc = (await projectCollection.doc(id).get()).data();

    const start_date = new Date(
      projectDoc.start_date.seconds * 1000 +
        projectDoc.start_date._nanoseconds / 1000000,
    );
    const end_date = new Date(
      projectDoc.end_date.seconds * 1000 +
        projectDoc.end_date._nanoseconds / 1000000,
    );

    const project = {
      id,
      name: projectDoc?.name,
      department: projectDoc?.department,
      userId: projectDoc?.user?.email,
      userName: projectDoc?.user?.name,
      totalCost: projectDoc?.totalCost,
      start_date,
      end_date,
      status: projectDoc?.status,
    };
    return res.status(200).json({ project });
  } catch (error) {
    console.log("Get Project Error Admin: ", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
