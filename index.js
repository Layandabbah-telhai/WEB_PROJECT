fetch("config.json")
  .then(function (res) { return res.json(); })
  .then(function (data) {
    document.getElementById("project-title").innerText = data.projectTitle || "WEB Project";
    document.getElementById("page-title").innerText = data.pageTitle || "Main Page";

    var name = data.student && data.student.name ? data.student.name : "";
    var id = data.student && data.student.id ? data.student.id : "";

    document.getElementById("student-name").innerText = "Student Name: " + name;
    document.getElementById("student-id").innerText = "ID: " + id;

  

    if (data.github) document.getElementById("github-link").href = data.github;
    if (data.liveSite) document.getElementById("live-link").href = data.liveSite;
  })
  .catch(function () {
    console.error("Could not load config.json");
  });
