function hasLetterAndNumber(text) {
  var hasLetter = false;
  var hasNumber = false;

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (ch >= "0" && ch <= "9") hasNumber = true;
    if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")) hasLetter = true;
  }
  return hasLetter && hasNumber;
}

var form = document.getElementById("registerForm");
var msg = document.getElementById("msg");

form.addEventListener("submit", function (e) {
  e.preventDefault();
  msg.innerHTML = "";

  var firstName = document.getElementById("firstName").value.trim();
  var lastName = document.getElementById("lastName").value.trim();
  var username = document.getElementById("username").value.trim();
  var email = document.getElementById("email").value.trim();
  var imageUrl = document.getElementById("imageUrl").value.trim();
  var password = document.getElementById("password").value;
  var confirmPassword = document.getElementById("confirmPassword").value;

  if (!firstName || !lastName || !username || !email || !imageUrl || !password || !confirmPassword) {
    msg.innerHTML = '<div class="alert alert-danger">All fields are required.</div>';
    return;
  }

  if (password.length < 6) {
    msg.innerHTML = '<div class="alert alert-danger">Password must be at least 6 characters.</div>';
    return;
  }

  if (!hasLetterAndNumber(password)) {
    msg.innerHTML = '<div class="alert alert-danger">Password must contain a letter and a number.</div>';
    return;
  }

  if (password !== confirmPassword) {
    msg.innerHTML = '<div class="alert alert-danger">Passwords do not match.</div>';
    return;
  }

  var users = JSON.parse(localStorage.getItem("users") || "[]");
  var exists = false;

  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username) {
      exists = true;
      break;
    }
  }

  if (exists) {
    msg.innerHTML = '<div class="alert alert-danger">Username already exists.</div>';
    return;
  }

  var newUser = {
    id: Date.now(),
    firstName: firstName,
    lastName: lastName,
    username: username,
    email: email,
    imageUrl: imageUrl,
    password: password,
    playlists: []
  };

  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  msg.innerHTML = '<div class="alert alert-success">Registration successful! Redirecting...</div>';
  setTimeout(function () {
    window.location.href = "login.html";
  }, 700);
});
