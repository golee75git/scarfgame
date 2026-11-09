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
  var offerBtn = document.getElementById("offer");
  var gameLink = "https://scarfgame.vercel.app/";
  var visitCount = document.getElementById("visit-count");
  var rustle = new Audio("sound/1.wav");
  var selectSound = new Audio("sound/select.wav");
  var resultModal = document.getElementById("result-modal");
  var resultModalMessage = document.getElementById("result-modal-message");
  var resultModalClose = document.getElementById("result-modal-close");
  var ruleModal = document.getElementById("rule-modal");
  var ruleModalClose = document.getElementById("rule-modal-close");
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

  var idleLine = "";
  var idleToken = 0;
  var idleLines = [
    "아직 빈손이래요! 구경만 하다 해 지겠네!",
    "눈으로 열 장 골랐으면 손으로 한 장 집어요!",
    "스카프 고르랬더니 명상하고 계시네!",
    "손님! 그렇게 쳐다보면 스카프가 부끄러워요!",
    "여기 눈싸움하는 데 아니에요! 하나 집어요!",
    "마음에 드는 거 콕! 매대에 구멍 나겠어요!",
    "첫 장이 어렵지, 여섯 장은 순식간이래요!",
    "빈손으로 오셨으면 나갈 땐 좀 달라야지!",
    "스카프들이 서로 골라달라고 난리 났어요!",
    "아니, 손님! 취향을 집에 두고 오셨어요?",
    "고민은 길고, 내 팔자는 더 길고!",
    "한 장 고른다고 동네방네 소문 안 내요!",
    "손은 주머니에 넣고 눈만 장사하시네!",
    "스카프가 손님 얼굴 외우겠어요! 얼른 골라요!",
    "그렇게 신중하면 스카프도 면접 봐야겠네!",
    "운명의 스카프요? 일단 집어야 인연이 생기지!",
    "예쁜 건 알아가지고! 근데 왜 안 집어요?",
    "손님 손가락, 오늘 휴무예요?",
    "마음은 여섯 장인데 손은 아직 출발도 안 했네!",
    "뒤적뒤적해봐요! 보물은 밑에 숨어 있다니까!",
    "버무려봐요! 취향도 좀 뒤집어보게!",
    "아무것도 안 고르면 내가 아무거나 골라줘요?",
    "이렇게 오래 봤으면 스카프랑 정들었겠어요!",
    "스카프는 내가 펼쳤는데 고민은 손님이 펼치네!",
    "고르는 데 자격증 필요 없어요! 손만 있으면 돼!",
    "한 장만 집어봐요! 나머지는 손이 알아서 해!",
    "아직도 빈손이야? 매대랑 밀당 그만해요!",
    "여기 감정평가 나왔어요? 하나 골라요!",
    "구경은 실컷 했고! 이제 손가락 출근합시다!",
    "내가 졌다, 졌어! 손님 인내심이 더 질겨!",
    "고르다 밤새겠네! 천막 걷기 전에 한 장!",
    "아직 고른 게 없다고? 눈은 벌써 단골인데!",
    "스카프는 준비됐고! 손님 결심만 오면 돼!",
    "이 집 스카프는 안 물어요! 편하게 집어요!",
    "빈손도 전략이야? 아주 큰 그림을 그리시네!",
    "그렇게 뜸 들이면 스카프가 밥 되겠어요!",
    "손님! 머릿속 장바구니는 여기 안 보여요!",
    "여섯 장 고르는 판에 첫 장부터 대하드라마야!",
    "스카프 보러 왔어요, 내 속 뒤집으러 왔어요?",
    "내 장사 인생에 이렇게 신중한 손님은 처음이야!",
    "제 얼굴 그만 보고 스카프 고르세요"
  ];

  function chooseIdleLine() {
    var index = Math.floor(Math.random() * idleLines.length);
    if (idleLines[index] === idleLine) {
      index = (index + 1 + Math.floor(Math.random() * (idleLines.length - 1))) % idleLines.length;
    }
    idleLine = idleLines[index];
  }

  function queueIdleChange(token) {
    window.setTimeout(function () {
      if (token !== idleToken) return;
      if (state.selectedIds.length) return;
      chooseIdleLine();
      render();
      queueIdleChange(token);
    }, 5000);
  }

  function armIdleWait() {
    idleToken += 1;
    idleLine = "";
    var token = idleToken;
    window.setTimeout(function () {
      if (token !== idleToken) return;
      if (state.selectedIds.length) return;
      chooseIdleLine();
      render();
      queueIdleChange(token);
    }, 3000);
  }

  function stopIdleChange() {
    idleToken += 1;
  }

  function resumeIdleChange() {
    idleToken += 1;
    queueIdleChange(idleToken);
  }

  function paintTray() {
    tray.replaceChildren();
    if (!state.selectedIds.length) {
      var empty = document.createElement("p");
      empty.className = "tray-empty";
      empty.textContent = "아직 고른 스카프가 없습니다.";
      if (idleLine) {
        var extra = document.createElement("span");
        extra.className = "idle-line";
        extra.textContent = idleLine;
        empty.appendChild(extra);
      }
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

  var lastVerdict = "";
  var passLines = [
    "여섯 장 전부 다르게! 손님, 눈썰미 좋으시네!",
    "겹치는 게 하나도 없네! 아주 야무지게 골랐어!",
    "이야~ 여섯 장 깔끔하게! 포장해드릴게!",
    "손님은 골라만 가요~ 감탄은 내가 할게!",
    "이렇게 잘 고르면 내가 섞은 보람이 있지!",
    "여섯 장 다 골랐네! 오늘 장보기 대성공!",
    "하나같이 다른 걸로! 보는 눈이 있으셔!",
    "내가 섞고, 손님이 싹 골랐네!",
    "이야~ 이 많은 데서 안 겹치게 골랐어!",
    "손님, 내일부터 여기서 같이 일합시다!",
    "이 솜씨면 눈 감고도 고르시겠네!",
    "여섯 장 합격! 스카프 고르기 달인이네!",
    "이걸로 땀이나 닦아. 하고 다니지 말고.",
    "너네 지금 과소비야.",
    "지금 고른 건 비닐에 있을 때 최고로 예뻐",
    "집에 가지고 들어가지말고 현관에 두고 나눠줘"
  ];
  var missLines = [
    "정신차리세요!",
    "어허~ 같은 걸 또 집었네!",
    "손님~ 취향이 아주 한결같으시네!",
    "아까부터 그것만 눈에 들어와요?",
    "똑같은 거 두 장이면 쌍둥이로 하시게?",
    "그 스카프가 손님 마음에 쏙 들었나 봐!",
    "이건 이미 골랐으니 다른 보물 찾아봐요!",
    "색깔에 속았지? 아까 그 녀석이야!",
    "내가 섞어놔도 그걸 또 찾아내네!",
    "나머지 1000가지는 다 거지 같은 거여.",
    "저 옆에 백화점으로 가시라.",
    "제발 침착하게 고르세요.",
    "돈 천원짜리를 설마 천만원짜리로 고르면 힘들어요"
  ];
  var missAgainLines = [
    "또 그거야? 이제 이름도 지어주겠네!",
    "손님~ 그 스카프랑 정들겠어!",
    "이 정도면 고르는 게 아니라 재회하는 거야!"
  ];

  function pickLine(lines) {
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function showResultModal(ok) {
    var message = ok
      ? pickLine(passLines)
      : pickLine(lastVerdict === "fail" ? missAgainLines : missLines);
    lastVerdict = ok ? "pass" : "fail";
    resultModalMessage.textContent = message;
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
    if (state.selectedIds.length > before) playSelect();
    if (state.selectedIds.length && before === 0) stopIdleChange();
    if (!state.selectedIds.length && before > 0 && idleLine) resumeIdleChange();
    refreshPartialWait();
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

  function playSelect() {
    selectSound.currentTime = 0;
    var playing = selectSound.play();
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

  var partialToken = 0;
  var partialNoted = false;
  var partialLine = "왜, 줄 친구가 없어?";

  function stopPartialWait() {
    partialToken += 1;
  }

  function dismissPartialLine() {
    if (!noteModal.open || noteModal.matches(":modal")) return;
    if (noteModalMessage.textContent !== partialLine) return;
    noteModal.close();
  }

  function armPartialWait() {
    partialToken += 1;
    if (state.phase !== "playing") return;
    var count = state.selectedIds.length;
    if (count < 1 || count >= ScarfData.selectLimit) return;
    var token = partialToken;
    window.setTimeout(function () {
      if (token !== partialToken || partialNoted) return;
      if (state.phase !== "playing") return;
      var now = state.selectedIds.length;
      if (now < 1 || now >= ScarfData.selectLimit) return;
      if (noteModal.open) {
        var onClose = function () {
          noteModal.removeEventListener("close", onClose);
          if (token !== partialToken || partialNoted) return;
          if (state.phase !== "playing") return;
          var left = state.selectedIds.length;
          if (left < 1 || left >= ScarfData.selectLimit) return;
          partialNoted = true;
          showNote(partialLine, false);
        };
        noteModal.addEventListener("close", onClose);
        return;
      }
      partialNoted = true;
      showNote(partialLine, false);
    }, 3000);
  }

  function refreshPartialWait() {
    partialNoted = false;
    var count = state.selectedIds.length;
    if (state.phase !== "playing" || count < 1 || count >= ScarfData.selectLimit) dismissPartialLine();
    armPartialWait();
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
    piled = false;
    pileSpots = {};
    pileHeight = 0;
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
    stopPartialWait();
    dismissPartialLine();
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

  function copyGameLink() {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(gameLink).then(function () {
        showNote("주소를 복사했습니다.", false);
      }).catch(function () {
        showNote(gameLink, false);
      });
      return;
    }
    showNote(gameLink, false);
  }

  function offerGameLink() {
    var shelf = window.ScarfShelf;
    if (shelf && typeof shelf.offer === "function") {
      shelf.offer();
      return;
    }
    if (typeof navigator.share === "function") {
      navigator.share({
        title: "스카프래요! 게임",
        text: "스카프래요! 무늬가 다른 스카프 여섯 장, 골라 보세요.",
        url: gameLink
      }).catch(function (err) {
        if (err && err.name === "AbortError") return;
        copyGameLink();
      });
      return;
    }
    copyGameLink();
  }

  offerBtn.addEventListener("click", offerGameLink);

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
    lastVerdict = "";
    partialNoted = false;
    stopPartialWait();
    closeResultModal();
    armIdleWait();
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

  function showVisits() {
    if (!visitCount) return;
    fetch("api/visits", { method: "POST" })
      .then(function (response) {
        if (!response.ok) throw new Error("unavailable");
        return response.json();
      })
      .then(function (body) {
        var count = body && body.visits;
        if (typeof count !== "number" || !Number.isInteger(count) || count < 0) return;
        visitCount.textContent = "방문 " + String(count);
      })
      .catch(function () {});
  }

  ruleModal.addEventListener("cancel", function (event) {
    event.preventDefault();
  });

  ruleModalClose.addEventListener("click", function () {
    ruleModal.close();
    armIdleWait();
  });

  function modalCoversShelf() {
    return (ruleModal.open && ruleModal.matches(":modal"))
      || (resultModal.open && resultModal.matches(":modal"))
      || (noteModal.open && noteModal.matches(":modal"));
  }

  function wheelDistance(event) {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * grid.clientHeight;
    return event.deltaY;
  }

  window.addEventListener("wheel", function (event) {
    if (event.ctrlKey) return;
    if (modalCoversShelf()) return;
    if (grid.contains(event.target)) return;
    if (grid.classList.contains("is-sliding")) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    var room = grid.scrollHeight - grid.clientHeight;
    if (room <= 0) return;
    var next = grid.scrollTop + wheelDistance(event);
    if (next < 0) next = 0;
    if (next > room) next = room;
    if (next === grid.scrollTop) return;
    grid.scrollTop = next;
    event.preventDefault();
  }, { passive: false });

  render();
  showVisits();
  ruleModal.showModal();
}());
