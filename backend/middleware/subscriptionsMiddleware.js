const checkPlan = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userPackage = req.user.package_type || 'FREE';

    console.log("User package:", userPackage);

    // contoh limit logic (optional)
    if (userPackage === 'FREE') {
      req.planLimit = 5;
    } else {
      req.planLimit = 9999;
    }

    next();

  } catch (error) {
    console.error("CHECKPLAN ERROR:", error);
    res.status(500).json({ message: "Kesalahan middleware plan" });
  }
};

module.exports = { checkPlan };