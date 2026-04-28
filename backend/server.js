const path = require("path");
const { app, ensureAppReady } = require("./app");

const PORT = process.env.PORT || 5000;
const frontendBuild = path.join(__dirname, "../frontend/build");

app.use(require("express").static(frontendBuild));
app.get("*", (req, res) => {
  const index = path.join(frontendBuild, "index.html");
  res.sendFile(index, (err) => {
    if (err) res.status(200).send("Backend running. Start frontend separately in development.");
  });
});

(async () => {
  await ensureAppReady();
  app.listen(PORT, () => {
    console.log(`\nBONDE Result System Backend`);
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log("Database: Firebase Firestore\n");
  });
})();
