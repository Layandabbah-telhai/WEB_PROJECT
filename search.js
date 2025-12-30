var API_KEY = "API_KEY";
var PAGE_SIZE = 50;

var currentQuery = "";
var nextPageToken = "";
var selectedVideo = null;

function getCurrentUser() {
  var s = sessionStorage.getItem("currentUser");
  if (!s) return null;
  return JSON.parse(s);
}

function setCurrentUser(u) {
  sessionStorage.setItem("currentUser", JSON.stringify(u));
}

function upsertLocalUser(u) {
  var users = JSON.parse(localStorage.getItem("users") || "[]");
  var found = false;

  for (var i = 0; i < users.length; i++) {
    if (users[i].username === u.username) {
      users[i] = u;
      found = true;
      break;
    }
  }
  if (!found) users.push(u);

  localStorage.setItem("users", JSON.stringify(users));
}

function ensureFavoritesPlaylist(user) {
  if (!user.playlists) user.playlists = [];

  var exists = false;
  for (var i = 0; i < user.playlists.length; i++) {
    if (user.playlists[i].name === "Favorites") exists = true;
  }
  if (!exists) user.playlists.push({ name: "Favorites", videos: [] });
}

function findPlaylistIndexByName(user, name) {
  if (!user.playlists) return -1;
  for (var i = 0; i < user.playlists.length; i++) {
    if (user.playlists[i].name === name) return i;
  }
  return -1;
}

function isVideoInPlaylist(playlist, videoId) {
  if (!playlist || !playlist.videos) return false;
  for (var i = 0; i < playlist.videos.length; i++) {
    if (playlist.videos[i].videoId === videoId) return true;
  }
  return false;
}

function countPlaylistsContaining(user, videoId) {
  if (!user || !user.playlists) return 0;
  var c = 0;
  for (var i = 0; i < user.playlists.length; i++) {
    if (isVideoInPlaylist(user.playlists[i], videoId)) c++;
  }
  return c;
}

function setQueryString(q) {
  var url = new URL(window.location.href);
  url.searchParams.set("q", q);
  window.history.replaceState({}, "", url.toString());
}

function getQueryString() {
  var params = new URLSearchParams(window.location.search);
  return params.get("q") || "";
}

function saveLastSearch(q) {
  sessionStorage.setItem("lastSearchQuery", q);
}

function loadLastSearch() {
  return sessionStorage.getItem("lastSearchQuery") || "";
}

function setAlert(html) {
  document.getElementById("alertArea").innerHTML = html || "";
}

function showToast(html) {
  document.getElementById("toastBody").innerHTML = html;
  new bootstrap.Toast(document.getElementById("toast")).show();
}

function setModalMsg(type, text) {
  var box = document.getElementById("modalMsg");
  if (!text) { box.innerHTML = ""; return; }
  box.innerHTML = '<div class="alert alert-' + type + ' py-2 mb-0">' + text + "</div>";
}

function durationISOToText(iso) {
  var h = 0, m = 0, s = 0;
  var matchH = iso.match(/(\d+)H/);
  var matchM = iso.match(/(\d+)M/);
  var matchS = iso.match(/(\d+)S/);

  if (matchH) h = parseInt(matchH[1], 10);
  if (matchM) m = parseInt(matchM[1], 10);
  if (matchS) s = parseInt(matchS[1], 10);

  if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  return m + ":" + String(s).padStart(2, "0");
}

function createPlaylist(name) {
  var user = getCurrentUser();
  if (!user) return false;

  if (!user.playlists) user.playlists = [];

  var lower = name.toLowerCase();
  for (var i = 0; i < user.playlists.length; i++) {
    if (String(user.playlists[i].name).toLowerCase() === lower) return false;
  }

  user.playlists.push({ name: name, videos: [] });
  setCurrentUser(user);
  upsertLocalUser(user);
  return true;
}

function addVideoToPlaylist(playlistName, video) {
  var user = getCurrentUser();
  ensureFavoritesPlaylist(user);

  var idx = findPlaylistIndexByName(user, playlistName);
  if (idx < 0) return -1;

  var pl = user.playlists[idx];
  if (!pl.videos) pl.videos = [];

  if (isVideoInPlaylist(pl, video.videoId)) return idx;

  pl.videos.push(video);

  setCurrentUser(user);
  upsertLocalUser(user);

  showToast(
    'Added to <b>' + playlistName + '</b> ✓ ' +
    '<a href="playlists.html?pid=' + idx + '">Go to playlist</a>'
  );

  return idx;
}

function removeVideoFromPlaylistByName(playlistName, videoId) {
  var user = getCurrentUser();
  if (!user) return false;
  ensureFavoritesPlaylist(user);

  var idx = findPlaylistIndexByName(user, playlistName);
  if (idx < 0) return false;

  var pl = user.playlists[idx];
  if (!pl.videos) pl.videos = [];

  var newVideos = [];
  var removed = false;

  for (var i = 0; i < pl.videos.length; i++) {
    if (pl.videos[i].videoId === videoId) removed = true;
    else newVideos.push(pl.videos[i]);
  }

  if (!removed) return false;

  pl.videos = newVideos;
  setCurrentUser(user);
  upsertLocalUser(user);
  return true;
}

function isInFavorites(videoId) {
  var user = getCurrentUser();
  ensureFavoritesPlaylist(user);
  var idx = findPlaylistIndexByName(user, "Favorites");
  if (idx < 0) return false;
  return isVideoInPlaylist(user.playlists[idx], videoId);
}

function toggleFavorites(video) {
  var inFav = isInFavorites(video.videoId);
  if (inFav) {
    var ok = removeVideoFromPlaylistByName("Favorites", video.videoId);
    if (ok) showToast("Removed from <b>Favorites</b> ✓");
    return;
  }
  addVideoToPlaylist("Favorites", video);
}

function openPlaylistModal(video) {
  selectedVideo = video;
  setModalMsg("", "");
  document.getElementById("selectedVideoTitle").innerText = video.title;
  renderPlaylistDropdown(video);
  new bootstrap.Modal(document.getElementById("playlistModal")).show();
}

function renderPlaylistDropdown(video) {
  var user = getCurrentUser();
  ensureFavoritesPlaylist(user);

  var select = document.getElementById("playlistSelect");
  select.innerHTML = "";

  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a playlist...";
  placeholder.selected = true;
  placeholder.disabled = true;
  select.appendChild(placeholder);

  if (!user.playlists || user.playlists.length === 0) return;

  for (var i = 0; i < user.playlists.length; i++) {
    var pl = user.playlists[i];
    var already = isVideoInPlaylist(pl, video.videoId);

    var opt = document.createElement("option");
    opt.value = pl.name;
    opt.textContent = already ? (pl.name + " (Added ✓)") : pl.name;
    if (already) opt.disabled = true;

    select.appendChild(opt);
  }

  select.onchange = function () {
    var name = select.value;
    if (!name || !selectedVideo) return;

    var user2 = getCurrentUser();
    var idx = findPlaylistIndexByName(user2, name);
    if (idx < 0) return;
    if (isVideoInPlaylist(user2.playlists[idx], selectedVideo.videoId)) return;

    addVideoToPlaylist(name, selectedVideo);

    setModalMsg("success", "Added to " + name + " ✓");
    renderPlaylistDropdown(selectedVideo);

    updateCardUI(selectedVideo.videoId);
  };
}

var playerModalEl = null;
var playerTitleEl = null;
var playerFrameEl = null;

function openPlayer(video) {
  if (!video || !video.videoId) return;
  playerTitleEl.innerText = video.title || "Player";
  playerFrameEl.src =
    "https://www.youtube-nocookie.com/embed/" + video.videoId +
    "?autoplay=1&origin=" + encodeURIComponent(window.location.origin);
  new bootstrap.Modal(playerModalEl).show();
}

function stopPlayer() {
  if (playerFrameEl) playerFrameEl.src = "";
}

function fetchSearchPage(q, pageToken) {
  var url =
    "https://www.googleapis.com/youtube/v3/search" +
    "?part=snippet&type=video" +
    "&maxResults=" + encodeURIComponent(PAGE_SIZE) +
    "&q=" + encodeURIComponent(q) +
    "&key=" + encodeURIComponent(API_KEY);

  if (pageToken) url += "&pageToken=" + encodeURIComponent(pageToken);

  return fetch(url).then(function (r) {
    return r.json().then(function (data) {
      if (!r.ok) {
        var msg = data && data.error && data.error.message ? data.error.message : "YouTube API error";
        throw new Error(msg);
      }
      return data;
    });
  });
}

function fetchVideoDetailsByIds(ids) {
  var url =
    "https://www.googleapis.com/youtube/v3/videos" +
    "?part=snippet,contentDetails,statistics,status" +
    "&id=" + encodeURIComponent(ids.join(",")) +
    "&key=" + encodeURIComponent(API_KEY);

  return fetch(url).then(function (r) {
    return r.json().then(function (data) {
      if (!r.ok) {
        var msg = data && data.error && data.error.message ? data.error.message : "YouTube API error";
        throw new Error(msg);
      }
      return data;
    });
  });
}

function startNewSearch(q) {
  currentQuery = q;
  nextPageToken = "";
  setAlert("");
  document.getElementById("results").innerHTML = "";
  document.getElementById("loadMoreBtn").classList.add("d-none");
  loadMore();
}

function loadMore() {
  if (!currentQuery) return;

  setAlert('<div class="text-muted mb-2">Loading...</div>');

  fetchSearchPage(currentQuery, nextPageToken)
    .then(function (searchData) {
      setAlert("");

      nextPageToken = searchData.nextPageToken || "";
      var items = searchData.items || [];

      if (items.length === 0) {
        if (document.getElementById("results").innerHTML.trim() === "") {
          document.getElementById("results").innerHTML = '<div class="alert alert-info">No results</div>';
        }
        document.getElementById("loadMoreBtn").classList.add("d-none");
        return Promise.resolve(null);
      }

      var ids = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].id && items[i].id.videoId) ids.push(items[i].id.videoId);
      }

      return fetchVideoDetailsByIds(ids);
    })
    .then(function (detailsData) {
      if (!detailsData) return;

      appendResults(detailsData.items || []);

      if (nextPageToken) document.getElementById("loadMoreBtn").classList.remove("d-none");
      else document.getElementById("loadMoreBtn").classList.add("d-none");
    })
    .catch(function (err) {
      setAlert('<div class="alert alert-danger">' + err.message + "</div>");
      document.getElementById("loadMoreBtn").classList.add("d-none");
    });
}

function ensureCardBadge(videoId) {
  var card = document.getElementById("card_" + videoId);
  if (!card) return;

  var user = getCurrentUser();
  ensureFavoritesPlaylist(user);

  var count = countPlaylistsContaining(user, videoId);
  var badge = card.querySelector(".added-badge");

  if (count > 0) {
    if (!badge) {
      var s = document.createElement("span");
      s.className = "badge text-bg-success added-badge";
      s.innerText = "✓";
      card.appendChild(s);
    }
  } else {
    if (badge) badge.remove();
  }
}

function updateFavoriteButton(videoId) {
  var btn = document.getElementById("fav_" + videoId);
  if (!btn) return;

  var added = isInFavorites(videoId);
  btn.className = "btn btn-sm " + (added ? "btn-danger" : "btn-outline-danger");
  btn.innerText = added ? "♥ Added ✓" : "♡ Add to Favorites";
}

function updateAddToPlaylistButton(videoId) {
  var btn = document.getElementById("addpl_" + videoId);
  if (!btn) return;

  var user = getCurrentUser();
  if (!user) return;

  ensureFavoritesPlaylist(user);
  var inAny = countPlaylistsContaining(user, videoId) > 0;

  btn.className = "btn btn-sm " + (inAny ? "btn-secondary" : "btn-primary");
  btn.innerText = "Add to playlist";
  btn.disabled = false;
}

function updateCardUI(videoId) {
  updateFavoriteButton(videoId);
  updateAddToPlaylistButton(videoId);
  ensureCardBadge(videoId);
}

function appendResults(videos) {
  var results = document.getElementById("results");

  var user = getCurrentUser();
  ensureFavoritesPlaylist(user);
  setCurrentUser(user);
  upsertLocalUser(user);

  for (var i = 0; i < videos.length; i++) {
    var v = videos[i];
    if (!v || !v.id) continue;
    if (!v.status || v.status.embeddable !== true) continue;

    var videoObj = {
      videoId: v.id,
      title: v.snippet && v.snippet.title ? v.snippet.title : "",
      thumbnail: v.snippet && v.snippet.thumbnails && v.snippet.thumbnails.medium ? v.snippet.thumbnails.medium.url : "",
      views: v.statistics && v.statistics.viewCount ? v.statistics.viewCount : "0",
      duration: v.contentDetails && v.contentDetails.duration ? v.contentDetails.duration : "PT0S"
    };

    var favAdded = isInFavorites(videoObj.videoId);
    var inAny = countPlaylistsContaining(user, videoObj.videoId) > 0;

    var card = document.createElement("div");
    card.id = "card_" + videoObj.videoId;
    card.className = "card shadow-sm mb-3 video-card position-relative";

    var favBtnClass = favAdded ? "btn-danger" : "btn-outline-danger";
    var favText = favAdded ? "♥ Added ✓" : "♡ Add to Favorites";

    var badgeHtml = inAny ? '<span class="badge text-bg-success added-badge">✓</span>' : "";

    card.innerHTML =
      badgeHtml +
      '<div class="card-body">' +
      '<div class="row g-3 align-items-center">' +
      '<div class="col-md-4">' +
      '<img class="thumb" id="img_' + videoObj.videoId + '" src="' + videoObj.thumbnail + '" alt="thumb" />' +
      '</div>' +
      '<div class="col-md-8">' +
      '<h5 class="mb-2 clickable-title video-title" title="' + String(videoObj.title || "").replace(/"/g, "&quot;") + '" id="ttl_' + videoObj.videoId + '">' + videoObj.title + '</h5>' +
      '<div class="text-muted mb-3">' +
      'Duration: ' + durationISOToText(videoObj.duration) +
      ' | Views: ' + videoObj.views +
      '</div>' +
      '<div class="d-flex gap-2 flex-wrap">' +
      '<button class="btn btn-sm ' + (inAny ? "btn-secondary" : "btn-primary") + '" id="addpl_' + videoObj.videoId + '">Add to playlist</button>' +
      '<button class="btn btn-sm ' + favBtnClass + '" id="fav_' + videoObj.videoId + '">' + favText + '</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    results.appendChild(card);

    (function (vo) {
      var imgEl = document.getElementById("img_" + vo.videoId);
      var ttlEl = document.getElementById("ttl_" + vo.videoId);

      if (imgEl) imgEl.onclick = function () { openPlayer(vo); };
      if (ttlEl) ttlEl.onclick = function () { openPlayer(vo); };

      var addBtn = document.getElementById("addpl_" + vo.videoId);
      if (addBtn) addBtn.onclick = function () { openPlaylistModal(vo); };

      var favBtn = document.getElementById("fav_" + vo.videoId);
      if (favBtn) {
        favBtn.onclick = function () {
          toggleFavorites(vo);
          updateCardUI(vo.videoId);
          if (selectedVideo && selectedVideo.videoId === vo.videoId) {
            renderPlaylistDropdown(selectedVideo);
          }
        };
      }
    })(videoObj);
  }
}

(function init() {
  var user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }

  ensureFavoritesPlaylist(user);
  setCurrentUser(user);
  upsertLocalUser(user);

  document.getElementById("welcomeArea").innerText = "Hello " + user.username;

  var img = document.getElementById("userImg");
  img.src = user.imageUrl || "";
  img.onerror = function () { img.style.display = "none"; };

  document.getElementById("logoutBtn").onclick = function () {
    sessionStorage.removeItem("currentUser");
    window.location.href = "login.html";
  };

  playerModalEl = document.getElementById("playerModal");
  playerTitleEl = document.getElementById("playerTitle");
  playerFrameEl = document.getElementById("playerFrame");

  if (playerModalEl) {
    playerModalEl.addEventListener("hidden.bs.modal", function () {
      stopPlayer();
    });
  }

  document.getElementById("searchBtn").onclick = function () {
    var q = document.getElementById("searchInput").value.trim();
    if (!q) return;

    setQueryString(q);
    saveLastSearch(q);
    startNewSearch(q);
  };

  document.getElementById("loadMoreBtn").onclick = function () { loadMore(); };

  document.getElementById("createPlaylistBtn").onclick = function () {
    if (!selectedVideo) { setModalMsg("danger", "No selected video."); return; }

    var name = document.getElementById("newPlaylistName").value.trim();
    if (!name) { setModalMsg("danger", "Please enter a playlist name."); return; }

    var ok = createPlaylist(name);
    if (!ok) { setModalMsg("danger", "Playlist name already exists."); return; }

    addVideoToPlaylist(name, selectedVideo);

    document.getElementById("newPlaylistName").value = "";
    setModalMsg("success", "Created and added to " + name + " ✓");

    renderPlaylistDropdown(selectedVideo);
    updateCardUI(selectedVideo.videoId);
  };

  var q0 = getQueryString();
  if (!q0) q0 = loadLastSearch();

  if (q0) {
    document.getElementById("searchInput").value = q0;
    startNewSearch(q0);
  }
})();
