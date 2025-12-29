var form = document.getElementById("loginForm");
var msg = document.getElementById("msg");

function upsertLocalUser(user) {
  var users = JSON.parse(localStorage.getItem("users") || "[]");

  var found = false;
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === user.username) {
      if (users[i].playlists && users[i].playlists.length > 0) {
        user.playlists = users[i].playlists;
      } else if (!user.playlists) {
        user.playlists = [];
      }
      users[i] = user;
      found = true;
      break;
    }
  }

  if (!found) {
    if (!user.playlists) user.playlists = [];
    users.push(user);
  }

  localStorage.setItem("users", JSON.stringify(users));
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  msg.innerHTML = "";

  var username = document.getElementById("username").value.trim();
  var password = document.getElementById("password").value;

  if (!username || !password) {
    msg.innerHTML = '<div class="alert alert-danger">Please enter username and password.</div>';
    return;
  }

  var users = JSON.parse(localStorage.getItem("users") || "[]");
  var foundUser = null;

  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username && users[i].password === password) {
      foundUser = users[i];
      break;
    }
  }

  if (!foundUser) {
    msg.innerHTML = '<div class="alert alert-danger">Wrong username or password.</div>';
    return;
  }

  upsertLocalUser(foundUser);
  sessionStorage.setItem("currentUser", JSON.stringify(foundUser));

  msg.innerHTML = '<div class="alert alert-success">Login successful! Redirecting...</div>';
  setTimeout(function () {
    window.location.href = "search.html";
  }, 700);
});
