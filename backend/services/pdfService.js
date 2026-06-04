const generatePDF = (req, res) => {
  const watermark = req.planLimits.pdfWatermark;

  if (watermark === true) {
    // tambahkan watermark "ScrumApps Free"
  } else if (watermark === 'custom') {
    // gunakan logo perusahaan
  } else {
    // tanpa watermark
  }
};