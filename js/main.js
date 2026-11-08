(function () {
  "use strict";

  var roundSize = ScarfData.roundSize;
  var roundMax = 24;
  var stage = 1;

  function shelfColumns() {
    if (window.innerWidth >= 1024) return 4;
    if (window.innerWidth >= 640) return 3;
    return 2;
  }

  var laidColumns = shelfColumns();
  var state = ScarfGame.newRound(ScarfData.catalog, { roundSize: roundSize, stage: stage, columns: laidColumns });
  var hideColorCaption = document.body.getAttribute("data-hide-caption") === "color";
  var notice = "";
  var piled = false;
  var pileSpots = {};
  var pileHeight = 0;

  var grid = document.getElementById("grid");
  var tray = document.getElementById("tray");
  var countEl = document.getElementById("count");
  var hintEl = document.getElementById("hint");
  var noticeEl = document.getElementById("notice");
  var resultTitle = document.getElementById("result-title");
  var vendorLine = document.getElementById("vendor-line");
  var dupList = document.getElementById("dup-list");
  var resultBox = document.getElementById("result");
  var rummageBtn = document.getElementById("rummage");
  var pileBtn = document.getElementById("pile");
  var retryBtn = document.getElementById("retry");
  var leaveBtn = document.getElementById("leave");
  var rustle = new Audio("sound/1.wav");
  var resultModal = document.getElementById("result-modal");
  var resultModalMessage = document.getElementById("result-modal-message");
  var resultModalClose = document.getElementById("result-modal-close");
  var noteModal = document.getElementById("note-modal");
  var noteModalMessage = document.getElementById("note-modal-message");
  var noteStay = document.getElementById("note-stay");
  var noteLeave = document.getElementById("note-leave");

  function findCard(id) {
    return state.cards.filter(function (card) { return card.id === id; })[0];
  }

  function isSelected(id) {
    return state.selectedIds.indexOf(id) !== -1;
  }

  function isDuplicate(card) {
    return state.duplicateDesignIds.indexOf(card.designId) !== -1;
  }

  function cardLabel(card, selected) {
    var parts = [card.name, card.colorName, selected ? "선택됨" : "선택 안 됨"];
    if (state.phase === "fail" && isDuplicate(card)) parts.push("같은 디자인");
    return parts.join(", ");
  }

  function remainingHint() {
    if (state.phase !== "playing") return "";
    var left = ScarfData.selectLimit - state.selectedIds.length;
    if (left > 0) return "";
    return "";
  }

  function appendFace(parent, card) {
    var face = document.createElement("span");
    face.className = "scarf-face";
    face.setAttribute("data-design", card.designId);
    face.style.setProperty("--scarf-color", card.color);
    if (card.image) {
      var img = document.createElement("img");
      img.alt = "";
      img.src = card.image;
      if (card.turn) img.setAttribute("data-turn", String(card.turn));
      img.addEventListener("error", function () {
        img.remove();
      });
      face.appendChild(img);
    }
    var check = document.createElement("span");
    check.className = "check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";
    face.appendChild(check);
    parent.appendChild(face);
  }

  function makeCardButton(card, focusKind) {
    var selected = isSelected(card.id);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "scarf-card";
    button.setAttribute("data-card-id", card.id);
    button.setAttribute("data-focus", focusKind);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    button.setAttribute("aria-label", cardLabel(card, selected));
    button.disabled = state.phase !== "playing" && !(state.phase === "fail" && selected && isDuplicate(card));
    if (state.phase === "fail" && isDuplicate(card)) button.classList.add("is-duplicate");
    appendFace(button, card);
    if (!hideColorCaption) {
      var meta = document.createElement("span");
      meta.className = "scarf-meta";
      var color = document.createElement("span");
      color.className = "scarf-color";
      color.textContent = card.colorName;
      meta.appendChild(color);
      button.appendChild(meta);
    }
    if (state.phase === "fail" && isDuplicate(card)) {
      var flag = document.createElement("span");
      flag.className = "dup-flag";
      flag.textContent = "같은 디자인";
      button.appendChild(flag);
    }
    return button;
  }

  function restoreFocus() {
    var active = document.activeElement;
    if (!active || !active.getAttribute) return null;
    var cardId = active.getAttribute("data-card-id");
    if (!cardId) return active.id || null;
    return {
      cardId: cardId,
      focusKind: active.getAttribute("data-focus")
    };
  }

  function paintStatus() {
    countEl.textContent = state.selectedIds.length + " / " + ScarfData.selectLimit + "장";
    hintEl.textContent = remainingHint();
    noticeEl.textContent = notice;

    if (state.phase === "playing") {
      resultBox.classList.remove("is-success", "is-fail");
      resultTitle.textContent = "";
      vendorLine.textContent = "";
      dupList.textContent = "";
      return;
    }

    var success = state.phase === "success";
    resultBox.classList.toggle("is-success", success);
    resultBox.classList.toggle("is-fail", !success);
    resultTitle.textContent = "";
    vendorLine.textContent = "";
    dupList.textContent = "";
  }

  function paintGrid() {
    grid.replaceChildren();
    grid.classList.toggle("is-piled", piled);
    grid.style.height = "";
    state.cards.forEach(function (card) {
      if (piled && isSelected(card.id)) return;
      var button = makeCardButton(card, "grid");
      var spot = piled ? pileSpots[card.id] : null;
      if (spot) {
        button.style.left = spot.left + "%";
        button.style.top = spot.top + "px";
        button.style.zIndex = String(spot.z);
        button.style.transform = "rotate(" + spot.turn + "deg)";
      }
      grid.appendChild(button);
    });
    if (piled && pileHeight > 0) grid.style.height = pileHeight + "px";
    if (piled) keepPileInside();
  }

  function keepPileInside() {
    var limit = grid.clientHeight;
    var buttons = grid.querySelectorAll(".scarf-card");
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      var extra = button.offsetTop + button.offsetHeight - limit;
      if (extra <= 0) continue;
      var next = Math.max(0, Math.round(button.offsetTop - extra));
      button.style.top = next + "px";
      var id = button.getAttribute("data-card-id");
      if (id && pileSpots[id]) pileSpots[id].top = next;
    }
  }

  var slideToken = 0;

  function shelfPlaces() {
    var places = {};
    var buttons = grid.querySelectorAll(".scarf-card");
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      if (buttons[i].getAttribute("data-focus") !== "grid") continue;
      var id = buttons[i].getAttribute("data-card-id");
      if (!id) continue;
      var box = buttons[i].getBoundingClientRect();
      places[id] = { left: box.left, top: box.top };
    }
    return places;
  }

  function slideShelf(places, ms) {
    if (!places) return;
    slideToken += 1;
    var token = slideToken;
    var buttons = grid.querySelectorAll(".scarf-card");
    var moves = [];
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      if (button.getAttribute("data-focus") !== "grid") continue;
      var origin = places[button.getAttribute("data-card-id")];
      if (!origin) continue;
      var box = button.getBoundingClientRect();
      var dx = Math.round(origin.left - box.left);
      var dy = Math.round(origin.top - box.top);
      if (dx === 0 && dy === 0) continue;
      var keep = button.style.transform || "";
      button.style.transition = "none";
      button.style.transform = "translate(" + dx + "px, " + dy + "px) rotate(0deg)";
      moves.push({
        button: button,
        end: "translate(0px, 0px) " + (keep.indexOf("rotate") === 0 ? keep : "rotate(0deg)"),
        keep: keep
      });
    }
    if (!moves.length) return;
    grid.classList.add("is-sliding");
    window.setTimeout(function () {
      if (token !== slideToken) return;
      var n;
      for (n = 0; n < moves.length; n += 1) {
        moves[n].button.style.transition = "";
        moves[n].button.style.transform = moves[n].keep;
      }
      grid.classList.remove("is-sliding");
    }, ms + 80);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (token !== slideToken) return;
        var n;
        for (n = 0; n < moves.length; n += 1) {
          moves[n].button.style.transition = "transform " + ms + "ms ease";
          moves[n].button.style.transform = moves[n].end;
        }
      });
    });
  }

  function paintTray() {
    tray.replaceChildren();
    if (!state.selectedIds.length) {
      var empty = document.createElement("p");
      empty.className = "tray-empty";
      empty.textContent = "아직 고른 스카프가 없습니다.";
      tray.appendChild(empty);
      return;
    }
    state.selectedIds.forEach(function (id) {
      var card = findCard(id);
      if (card) tray.appendChild(makeCardButton(card, "tray"));
    });
  }

  function closeResultModal() {
    if (resultModal.open) resultModal.close();
  }

  function showResultModal(ok) {
    resultModalMessage.textContent = ok ? "계산" : "정신차리세요";
    resultModalClose.textContent = ok ? "다음단계로" : "다시고르기";
    closeResultModal();
    resultModal.showModal();
  }

  function fitTray() {
    document.body.style.paddingBottom = "";
  }

  function render() {
    var previous = restoreFocus();
    paintStatus();
    paintGrid();
    paintTray();
    if (typeof previous === "string") {
      var control = document.getElementById(previous);
      if (control) control.focus();
    } else if (previous) {
      var next = document.querySelector(
        '[data-card-id="' + previous.cardId + '"][data-focus="' + previous.focusKind + '"]'
      );
      if (!next && previous.focusKind === "tray") {
        next = document.querySelector(
          '[data-card-id="' + previous.cardId + '"][data-focus="grid"]'
        );
      }
      if (next) next.focus();
    }
    fitTray();
  }

  window.addEventListener("resize", function () {
    fitTray();
    var next = shelfColumns();
    if (next !== laidColumns && state.phase === "playing") {
      laidColumns = next;
      state = ScarfGame.shuffleCards(state, next);
      render();
    } else {
      laidColumns = next;
    }
  });

  function onPick(event) {
    var button = event.target.closest("button");
    if (!button || button.disabled) return;
    var cardId = button.getAttribute("data-card-id");
    if (!cardId) return;
    var before = state.selectedIds.length;
    var result = ScarfGame.toggleSelection(state, cardId);
    state = result.state;
    notice = result.notice;
    if (state.phase === "playing" && before < ScarfData.selectLimit && state.selectedIds.length === ScarfData.selectLimit) {
      settlePick();
      return;
    }
    render();
  }

  grid.addEventListener("click", onPick);
  tray.addEventListener("click", onPick);

  function playRustle() {
    rustle.currentTime = 0;
    var playing = rustle.play();
    if (playing && typeof playing.catch === "function") playing.catch(function () {});
  }

  var noteToken = 0;
  var lastStir = "";
  var rummageLines = [
    "어허~ 위에 것만 보면 섭섭하지!",
    "뒤져봐요~ 보물찾기가 따로 있나!",
    "방금 거기! 뭐 좋은 거 보였는데?",
    "손님, 스카프랑 숨바꼭질해요?",
    "그렇게 뒤지면 내가 숨긴 것도 나오겠네!",
    "천천히 봐요~ 다 임자가 따로 있어!",
    "아이고~ 다 섞였네! 더 예뻐졌네!",
    "뒤적이는 솜씨가 단골이시네!",
    "내가 뭘 어디 뒀더라? 같이 찾아봐요!"
  ];
  var pileLines = [
    "골고루 버무려야 예쁜 게 올라와요!",
    "자~ 한 번 싹 버무려봅시다!",
    "섞어 섞어~ 새 판 깔아드려요!",
    "위에 건 아래로! 아래 건 위로!",
    "살살 버무려요~ 김치 아니에요!",
    "아이고~ 스카프 비빔밥 됐네!",
    "꽁꽁 숨은 예쁜 놈, 나와라!",
    "이렇게 섞으면 나도 뭐가 어딨는지 몰라!",
    "자, 골고루 섞었으니 다시 골라봐요!"
  ];

  function stirLine(kind, lines, againLine) {
    if (lastStir === kind) return againLine;
    lastStir = kind;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function showNote(message, leaving) {
    noteToken += 1;
    var token = noteToken;
    noteModalMessage.textContent = message;
    noteStay.hidden = !leaving;
    noteLeave.hidden = !leaving;
    if (leaving) noteStay.textContent = "더 골라볼게요";
    var modalNow = noteModal.open && noteModal.matches(":modal");
    if (noteModal.open && modalNow !== leaving) noteModal.close();
    if (!noteModal.open) {
      if (leaving) noteModal.showModal();
      else noteModal.show();
    }
    if (leaving) return;
    window.setTimeout(function () {
      if (token !== noteToken || !noteModal.open) return;
      noteModal.close();
    }, 2000);
  }

  function closeShelf() {
    var shelf = window.ScarfShelf;
    if (shelf && typeof shelf.leave === "function") shelf.leave();
  }

  rummageBtn.addEventListener("click", function () {
    playRustle();
    var places = shelfPlaces();
    state = ScarfGame.shuffleCards(state, shelfColumns());
    laidColumns = shelfColumns();
    render();
    slideShelf(places, 1000);
    showNote(stirLine("rummage", rummageLines, "손님~ 스카프보다 손이 더 바빠!"), false);
  });

  pileBtn.addEventListener("click", function () {
    playRustle();
    var places = shelfPlaces();
    var buttons = grid.querySelectorAll(".scarf-card");
    var cardHeight = 0;
    var n;
    for (n = 0; n < buttons.length; n += 1) {
      cardHeight = Math.max(cardHeight, buttons[n].offsetHeight);
    }
    pileHeight = grid.clientHeight;
    var room = Math.max(0, pileHeight - cardHeight);
    piled = true;
    pileSpots = {};
    state.cards.forEach(function (card) {
      pileSpots[card.id] = {
        left: Math.round(Math.random() * 46),
        top: Math.round(Math.random() * room),
        turn: Math.round(Math.random() * 30 - 15),
        z: Math.floor(Math.random() * state.cards.length)
      };
    });
    render();
    slideShelf(places, 1000);
    showNote(stirLine("pile", pileLines, "손님~ 그만 버무려요! 스카프에서 맛 나겠어!"), false);
  });

  function settlePick() {
    var judgment = ScarfGame.judgeSelection(state.cards, state.selectedIds);
    if (!judgment.ready || state.phase !== "playing") {
      render();
      return;
    }
    state = {
      cards: state.cards,
      selectedIds: state.selectedIds.slice(),
      phase: judgment.ok ? "success" : "fail",
      duplicateDesignIds: judgment.ok ? [] : judgment.duplicateDesignIds.slice()
    };
    notice = "";
    render();
    showResultModal(judgment.ok);
  }

  leaveBtn.addEventListener("click", function () {
    showNote("벌써 가시게? 이제 좋은 거 나오는데!", true);
  });

  noteStay.addEventListener("click", function () {
    noteModal.close();
  });

  noteLeave.addEventListener("click", function () {
    noteModal.close();
    closeShelf();
  });

  function openFreshShelf(grow) {
    if (grow) {
      roundSize = Math.min(roundMax, roundSize + 2);
      stage = Math.min(3, stage + 1);
    }
    laidColumns = shelfColumns();
    state = ScarfGame.newRound(ScarfData.catalog, { roundSize: roundSize, stage: stage, columns: laidColumns });
    piled = false;
    pileSpots = {};
    pileHeight = 0;
    notice = "";
    closeResultModal();
    render();
  }

  retryBtn.addEventListener("click", function () {
    openFreshShelf(state.phase === "success");
  });

  resultModalClose.addEventListener("click", function () {
    if (state.phase === "success") {
      openFreshShelf(true);
      return;
    }
    closeResultModal();
  });

  render();
}());
