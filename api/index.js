// The absolute minimum serverless function

module.exports = (req, res) => {
  // Just return a static text response
  res.status(200).send('MeetNing API is running');
};
