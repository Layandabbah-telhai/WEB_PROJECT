function hasLetterNumberAndSpecial(text) {
  var hasLetter = false;
  var hasNumber = false;
  var hasSpecial = false;

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    var isNumber = ch >= "0" && ch <= "9";
    var isLetter = (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z");
    if (isNumber) hasNumber = true;
    else if (isLetter) hasLetter = true;
    else hasSpecial = true;
  }
  return hasLetter && hasNumber && hasSpecial;
}

var form = document.getElementById("registerForm");
var msg = document.getElementById("msg");

form.addEventListener("submit", function (e) {
  e.preventDefault();
  msg.innerHTML = "";

  var firstName = document.getElementById("firstName").value.trim();
  var username = document.getElementById("username").value.trim();
  var imageUrl = document.getElementById("imageUrl").value.trim();
  var password = document.getElementById("password").value;
  var confirmPassword = document.getElementById("confirmPassword").value;

  if (!firstName || !username || !imageUrl || !password || !confirmPassword) {
    msg.innerHTML = '<div class="alert alert-danger">All fields are required.</div>';
    return;
  }

  if (password.length < 6) {
    msg.innerHTML = '<div class="alert alert-danger">Password must be at least 6 characters.</div>';
    return;
  }

  if (!hasLetterNumberAndSpecial(password)) {
    msg.innerHTML = '<div class="alert alert-danger">Password must contain a letter, a number, and a special character.</div>';
    return;
  }

  if (password !== confirmPassword) {
    msg.innerHTML = '<div class="alert alert-danger">Passwords do not match.</div>';
    return;
  }

  var users = JSON.parse(localStorage.getItem("users") || "[]");
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username) {
      msg.innerHTML = '<div class="alert alert-danger">Username already exists.</div>';
      return;
    }
  }

  var newUser = {
    id: Date.now(),
    firstName: firstName,
    username: username,
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
