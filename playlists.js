(function () {

  var currentUserString = sessionStorage.getItem("currentUser");
  if (!currentUserString) {
    window.location.href = "login.html";
    return;
  }

  var currentUser = JSON.parse(currentUserString);
  if (!currentUser.playlists) currentUser.playlists = [];

  function mergePlaylistsFromLocalStorage() {
    var users = JSON.parse(localStorage.getItem("users") || "[]");
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === currentUser.username) {
        if (users[i].playlists && users[i].playlists.length > 0) {
          currentUser.playlists = users[i].playlists;
        }
        break;
      }
    }
  }

  function saveUser() {
    sessionStorage.setItem("currentUser", JSON.stringify(currentUser));

    var users = JSON.parse(localStorage.getItem("users") || "[]");
    var found = false;

    for (var i = 0; i < users.length; i++) {
      if (users[i].username === currentUser.username) {
        users[i] = currentUser;
        found = true;
        break;
      }
    }
    if (!found) users.push(currentUser);

    localStorage.setItem("users", JSON.stringify(users));
  }

  function ensureFavorites() {
    var exists = false;
    for (var i = 0; i < currentUser.playlists.length; i++) {
      if (!currentUser.playlists[i].videos) currentUser.playlists[i].videos = [];
      if (currentUser.playlists[i].name === "Favorites") exists = true;
    }
    if (!exists) {
      currentUser.playlists.unshift({ name: "Favorites", videos: [] });
    }
  }

  var playlistList = document.getElementById("playlistList");
  var songsArea = document.getElementById("songsArea");
  var playlistHeader = document.getElementById("playlistHeader");
  var controls = document.getElementById("playlistControls");

  var filterInput = document.getElementById("filterInput");
  var sortSelect = document.getElementById("sortSelect");

  var playPlaylistBtn = document.getElementById("playPlaylistBtn");
  var deletePlaylistBtn = document.getElementById("deletePlaylistBtn");

  var videoModalEl = document.getElementById("videoModal");
  var videoTitleEl = document.getElementById("videoTitle");
  var videoPlayerEl = document.getElementById("videoPlayer");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");

  document.getElementById("welcomeArea").innerText = "Hello " + (currentUser.username || "");

  var img = document.getElementById("userImg");
  img.src = currentUser.imageUrl || "";
  img.onerror = function () { img.style.display = "none"; };

  function showToast(msg) {
    var toastBody = document.getElementById("toastBody");
    var toastEl = document.getElementById("toast");
    if (!toastBody || !toastEl) { alert(msg); return; }
    toastBody.innerHTML = msg;
    new bootstrap.Toast(toastEl).show();
  }

  function getPidFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var pid = params.get("pid");
    if (pid === null) return null;
    var index = parseInt(pid, 10);
    if (isNaN(index)) return null;
    return index;
  }

  function setPidInUrl(pid) {
    var url = new URL(window.location.href);
    url.searchParams.set("pid", String(pid));
    window.history.replaceState({}, "", url.toString());
  }

  function isoToSeconds(iso) {
    if (!iso) return 0;

    var h = 0, m = 0, s = 0;
    var mh = iso.match(/(\d+)H/);
    var mm = iso.match(/(\d+)M/);
    var ms = iso.match(/(\d+)S/);

    if (mh) h = parseInt(mh[1], 10);
    if (mm) m = parseInt(mm[1], 10);
    if (ms) s = parseInt(ms[1], 10);

    return h * 3600 + m * 60 + s;
  }

  function toViews(v) {
    var n = parseInt(String(v || "0").replace(/[^\d]/g, ""), 10);
    if (isNaN(n)) return 0;
    return n;
  }

  function getFilteredSortedVideos(videos) {
    var list = (videos || []).slice();

    var text = (filterInput.value || "").trim().toLowerCase();
    if (text !== "") {
      list = list.filter(function (v) {
        return String(v.title || "").toLowerCase().indexOf(text) !== -1;
      });
    }

    var mode = sortSelect.value;

    if (mode === "az") {
      list.sort(function (a, b) {
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
    } else if (mode === "za") {
      list.sort(function (a, b) {
        return String(b.title || "").localeCompare(String(a.title || ""));
      });
    } else if (mode === "views_desc") {
      list.sort(function (a, b) {
        return toViews(b.views) - toViews(a.views);
      });
    } else if (mode === "views_asc") {
      list.sort(function (a, b) {
        return toViews(a.views) - toViews(b.views);
      });
    }

    return list;
  }

  var playQueue = [];
  var playIndex = -1;
  var timer = null;

  function clearTimer() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function stopPlayerOnly() {
    clearTimer();
    if (videoPlayerEl) videoPlayerEl.src = "";
  }

  function openPlayer() {
    new bootstrap.Modal(videoModalEl).show();
  }

  function playByIndex(i) {
    clearTimer();

    if (i < 0 || i >= playQueue.length) {
      showToast("Playlist finished");
      var inst = bootstrap.Modal.getInstance(videoModalEl);
      if (inst) inst.hide();
      return;
    }

    playIndex = i;
    var v = playQueue[i];
    if (!v || !v.videoId) return;

    videoTitleEl.innerText = v.title || "Player";
    videoPlayerEl.src =
      "https://www.youtube.com/embed/" + v.videoId + "?autoplay=1&origin=" + encodeURIComponent(window.location.origin);

    var seconds = isoToSeconds(v.duration);
    if (seconds > 0) {
      timer = setTimeout(function () {
        playByIndex(playIndex + 1);
      }, (seconds + 1) * 1000);
    }
  }

  prevBtn.onclick = function () {
    if (!playQueue || playQueue.length === 0) return;
    playByIndex(playIndex - 1);
  };

  nextBtn.onclick = function () {
    if (!playQueue || playQueue.length === 0) return;
    playByIndex(playIndex + 1);
  };

  videoModalEl.addEventListener("hidden.bs.modal", function () {
    stopPlayerOnly();
  });

  function removeSongByVideoId(pid, videoId) {
    if (pid === null || !currentUser.playlists[pid]) return;

    var pl = currentUser.playlists[pid];
    if (!pl.videos) pl.videos = [];

    var index = -1;
    for (var i = 0; i < pl.videos.length; i++) {
      if (pl.videos[i].videoId === videoId) { index = i; break; }
    }
    if (index < 0) return;

    pl.videos.splice(index, 1);
    saveUser();

    stopPlayerOnly();
    renderSidebar(pid);
    renderPlaylist(pid);

    showToast("Removed ✓");
  }

  function renderSidebar(activeIndex) {
    playlistList.innerHTML = "";

    if (!currentUser.playlists || currentUser.playlists.length === 0) {
      playlistList.innerHTML = '<li class="list-group-item text-muted">No playlists</li>';
      return;
    }

    currentUser.playlists.forEach(function (pl, i) {
      var li = document.createElement("li");
      li.className = "list-group-item playlist-item" + (i === activeIndex ? " active" : "");
      li.innerText = pl.name;

      li.onclick = function () {
        window.location.href = "playlists.html?pid=" + i;
      };

      playlistList.appendChild(li);
    });
  }

  function renderPlaylist(index) {
    songsArea.innerHTML = "";

    if (index === null || !currentUser.playlists[index]) {
      playlistHeader.innerHTML = "<h4>Playlists</h4>";
      controls.classList.add("d-none");
      playPlaylistBtn.disabled = true;
      songsArea.innerHTML = '<div class="alert alert-info">Choose a playlist from the list.</div>';
      return;
    }

    var playlist = currentUser.playlists[index];
    if (!playlist.videos) playlist.videos = [];

    playlistHeader.innerHTML =
      '<div class="d-flex justify-content-between align-items-center">' +
      "<h4 class='mb-0'>" + playlist.name + "</h4>" +
      "<span class='text-muted small'>Songs: " + playlist.videos.length + "</span>" +
      "</div>";

    controls.classList.remove("d-none");
    playPlaylistBtn.disabled = false;

    deletePlaylistBtn.disabled = playlist.name === "Favorites";

    var list = getFilteredSortedVideos(playlist.videos);

    if (list.length === 0) {
      songsArea.innerHTML = "<p class='text-muted'>No songs in this playlist</p>";
      return;
    }

    list.forEach(function (video) {
      var thumb =
        video.thumbnail ||
        video.thumb ||
        (video.videoId ? "https://i.ytimg.com/vi/" + video.videoId + "/hqdefault.jpg" : "");

      var viewsText = String(video.views || "0");

      var card = document.createElement("div");
      card.className = "card shadow-sm mb-3";

      card.innerHTML =
        '<div class="card-body row g-3 align-items-center">' +
        '<div class="col-md-4">' +
        '<img class="thumb" src="' + thumb + '" alt="thumb" />' +
        "</div>" +
        '<div class="col-md-8">' +
        '<div class="d-flex justify-content-between align-items-start gap-2">' +
        '<div style="flex:1;">' +
        '<h5 class="mb-1" style="cursor:pointer;">' + (video.title || "") + "</h5>" +
        '<div class="text-muted small">Views: ' + viewsText + "</div>" +
        "</div>" +
        '<button class="btn btn-sm btn-danger" id="rm_' + video.videoId + '">Remove</button>' +
        "</div>" +
        "</div>" +
        "</div>";

      card.querySelector("h5").onclick = function () {
        playQueue = list.slice();
        openPlayer();

        var idx = 0;
        for (var i = 0; i < playQueue.length; i++) {
          if (playQueue[i].videoId === video.videoId) { idx = i; break; }
        }
        playByIndex(idx);
      };

      songsArea.appendChild(card);

      var rmBtn = document.getElementById("rm_" + video.videoId);
      rmBtn.onclick = function () { removeSongByVideoId(index, video.videoId); };
    });
  }

  playPlaylistBtn.onclick = function () {
    var pid = getPidFromUrl();

    if (pid === null || !currentUser.playlists[pid]) {
      showToast("Please choose a playlist first.");
      return;
    }

    var playlist = currentUser.playlists[pid];
    if (!playlist.videos || playlist.videos.length === 0) {
      showToast("Playlist is empty.");
      return;
    }

    playQueue = getFilteredSortedVideos(playlist.videos);
    openPlayer();
    playByIndex(0);
  };

  filterInput.addEventListener("input", function () {
    var pid = getPidFromUrl();
    renderSidebar(pid);
    renderPlaylist(pid);
  });

  sortSelect.addEventListener("change", function () {
    var pid = getPidFromUrl();
    renderSidebar(pid);
    renderPlaylist(pid);
  });

  deletePlaylistBtn.onclick = function () {
    var pid = getPidFromUrl();
    if (pid === null || !currentUser.playlists[pid]) return;

    var pl = currentUser.playlists[pid];
    if (pl.name === "Favorites") return;

    if (!confirm("Delete this playlist?")) return;

    currentUser.playlists.splice(pid, 1);
    saveUser();
    window.location.href = "playlists.html";
  };

  document.getElementById("newPlaylistBtn").onclick = function () {
    document.getElementById("newPlaylistName").value = "";
    new bootstrap.Modal(document.getElementById("newPlaylistModal")).show();
  };

  document.getElementById("createPlaylistBtn").onclick = function () {
    var name = document.getElementById("newPlaylistName").value.trim();
    if (!name) return;

    for (var i = 0; i < currentUser.playlists.length; i++) {
      if (String(currentUser.playlists[i].name).toLowerCase() === name.toLowerCase()) {
        showToast("Playlist name already exists.");
        return;
      }
    }

    currentUser.playlists.push({ name: name, videos: [] });
    saveUser();
    window.location.href = "playlists.html?pid=" + (currentUser.playlists.length - 1);
  };

  document.getElementById("logoutBtn").onclick = function () {
    sessionStorage.removeItem("currentUser");
    window.location.href = "login.html";
  };

  mergePlaylistsFromLocalStorage();
  ensureFavorites();
  saveUser();

  var initialPid = getPidFromUrl();
  if (initialPid === null && currentUser.playlists && currentUser.playlists.length > 0) {
    initialPid = 0;
    setPidInUrl(0);
  }

  renderSidebar(initialPid);
  renderPlaylist(initialPid);
})();
