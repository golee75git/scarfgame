var ScarfGame = (function () {
  "use strict";

  var SELECT_LIMIT = 6;
  var ROUND_SIZE = 16;
  var BLOCKED_NOTICE = "이미 6장을 골랐습니다. 하나를 해제하거나 결과를 확인하세요.";

  function shuffle(list, random) {
    var copy = list.slice();
    var i;
    for (i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  var TURN_STEPS = [0, 90, 180, 270];

  function makeCard(design, variant, index, turn) {
    var number = index < 10 ? "0" + index : String(index);
    var quarter = TURN_STEPS.indexOf(turn) >= 0 ? turn : 0;
    return {
      id: "round-" + number,
      designId: design.designId,
      name: design.name,
      colorName: variant.colorName,
      color: variant.color,
      image: variant.image || null,
      turn: quarter
    };
  }

  function pickTurn(random) {
    return TURN_STEPS[Math.floor(random() * TURN_STEPS.length)];
  }

  function otherTurn(turn, random) {
    var start = TURN_STEPS.indexOf(turn);
    if (start < 0) start = 0;
    var hop = 1 + Math.floor(random() * (TURN_STEPS.length - 1));
    return TURN_STEPS[(start + hop) % TURN_STEPS.length];
  }

  function differentVariant(variants) {
    var first = variants[0];
    var i;
    for (i = 1; i < variants.length; i += 1) {
      if (variants[i].colorName !== first.colorName) return variants[i];
    }
    return first;
  }

  function pushPair(cards, design, index, random) {
    var variants = design.variants || [];
    var roll = typeof random === "function" ? random : Math.random;
    var firstTurn = pickTurn(roll);
    cards.push(makeCard(design, variants[0], index, firstTurn));
    cards.push(makeCard(design, differentVariant(variants), index + 1, otherTurn(firstTurn, roll)));
    return index + 2;
  }

  function tally(cards) {
    var counts = {};
    cards.forEach(function (card) {
      counts[card.designId] = (counts[card.designId] || 0) + 1;
    });
    return counts;
  }

  function sizeOf(options) {
    return options && options.roundSize > 0 ? options.roundSize : ROUND_SIZE;
  }

  function pairCountFor(designCount, size) {
    var room = Math.floor(size / 2);
    return Math.min(designCount, Math.max(2, room));
  }

  function isPlayable(cards, size) {
    if (cards.length !== size) return false;
    var counts = tally(cards);
    var ids = Object.keys(counts);
    var duplicated = ids.filter(function (id) { return counts[id] >= 2; });
    return ids.length >= SELECT_LIMIT && duplicated.length >= 2;
  }

  function dealFrom(catalog, random, size, columns) {
    var designs = shuffle(catalog, random);
    var cards = [];
    var index = 1;
    var pairCount = pairCountFor(designs.length, size);
    var i;
    for (i = 0; i < pairCount; i += 1) {
      index = pushPair(cards, designs[i], index, random);
    }
    for (i = pairCount; i < designs.length && cards.length < size; i += 1) {
      var variants = shuffle(designs[i].variants, random);
      cards.push(makeCard(designs[i], variants[0], index, pickTurn(random)));
      index += 1;
    }
    return seatApart(cards, random, columns);
  }

  function columnCountOf(columns) {
    if (columns === 3 || columns === 4) return columns;
    return 2;
  }

  function beside(a, b, columns) {
    var rowA = Math.floor(a / columns);
    var colA = a % columns;
    var rowB = Math.floor(b / columns);
    var colB = b % columns;
    return Math.abs(rowA - rowB) <= 1 && Math.abs(colA - colB) <= 1;
  }

  function twinBeside(cards, columns) {
    var i, j;
    for (i = 0; i < cards.length; i += 1) {
      if (!cards[i]) continue;
      for (j = i + 1; j < cards.length; j += 1) {
        if (!cards[j]) continue;
        if (cards[i].designId === cards[j].designId && beside(i, j, columns)) return true;
      }
    }
    return false;
  }

  function openingHasTwin(cards) {
    var seen = {};
    var index, limit;
    limit = cards.length < 6 ? cards.length : 6;
    for (index = 0; index < limit; index += 1) {
      if (!cards[index]) continue;
      if (seen[cards[index].designId]) return true;
      seen[cards[index].designId] = true;
    }
    return false;
  }

  function anchorGap(columns) {
    if (columns >= 4) return 2;
    if (columns === 3) return 5;
    return 4;
  }

  function fillOpenSlots(slots, rest, columns) {
    var index, pick;
    for (index = 0; index < slots.length; index += 1) {
      if (slots[index]) continue;
      pick = -1;
      var cursor;
      for (cursor = 0; cursor < rest.length; cursor += 1) {
        slots[index] = rest[cursor];
        if (!twinBeside(slots, columns)) {
          pick = cursor;
          break;
        }
        slots[index] = undefined;
      }
      if (pick < 0) return false;
      rest.splice(pick, 1);
    }
    return rest.length === 0;
  }

  function seatApart(cards, random, columns) {
    var width = columnCountOf(columns);
    var gap = anchorGap(width);
    var attempt;
    if (gap >= cards.length) return cards.slice();
    for (attempt = 0; attempt < 40; attempt += 1) {
      var pool = shuffle(cards, random);
      var twinId = "";
      var index, count;
      for (index = 0; index < pool.length && !twinId; index += 1) {
        count = 0;
        var scan;
        for (scan = 0; scan < pool.length; scan += 1) {
          if (pool[scan].designId === pool[index].designId) count += 1;
        }
        if (count >= 2) twinId = pool[index].designId;
      }
      if (!twinId) return pool;
      var slots = new Array(cards.length);
      var rest = [];
      var planted = 0;
      for (index = 0; index < pool.length; index += 1) {
        if (pool[index].designId === twinId && planted === 0) {
          slots[0] = pool[index];
          planted = 1;
        } else if (pool[index].designId === twinId && planted === 1) {
          slots[gap] = pool[index];
          planted = 2;
        } else {
          rest.push(pool[index]);
        }
      }
      if (planted < 2) continue;
      if (!fillOpenSlots(slots, rest, width)) continue;
      if (!twinBeside(slots, width) && openingHasTwin(slots)) return slots;
    }
    return cards.slice();
  }

  function fallbackDeal(catalog, size, columns) {
    var designs = catalog.slice();
    var cards = [];
    var index = 1;
    var pairCount = pairCountFor(designs.length, size);
    var i;
    for (i = 0; i < pairCount && i < designs.length; i += 1) {
      index = pushPair(cards, designs[i], index, Math.random);
    }
    for (i = pairCount; i < designs.length && cards.length < size; i += 1) {
      cards.push(makeCard(designs[i], designs[i].variants[0], index, pickTurn(Math.random)));
      index += 1;
    }
    if (isPlayable(cards, size)) return seatApart(cards, Math.random, columns);

    cards = [];
    index = 1;
    var guard = 0;
    while (cards.length < size && catalog.length && guard < 40) {
      var design = catalog[guard % catalog.length];
      var variant = design.variants[cards.length % design.variants.length];
      cards.push(makeCard(design, variant, index, pickTurn(Math.random)));
      index += 1;
      guard += 1;
    }
    return seatApart(cards, Math.random, columns);
  }

  function mixHex(a, b, t) {
    function channel(hex, index) { return parseInt(hex.slice(index, index + 2), 16); }
    function byte(n) { var s = Math.max(0, Math.min(255, n)).toString(16); return s.length === 1 ? "0" + s : s; }
    return "#" + byte(Math.round(channel(a, 1) * (1 - t) + channel(b, 1) * t)) +
      byte(Math.round(channel(a, 3) * (1 - t) + channel(b, 3) * t)) +
      byte(Math.round(channel(a, 5) * (1 - t) + channel(b, 5) * t));
  }

  function prepareCatalog(catalog, stage) {
    var extra = { hstripe: 1, speck: 1, ripple: 1, slash: 1 };
    var source = catalog;
    if (stage < 2) {
      var basic = catalog.filter(function (design) { return !extra[design.designId]; });
      if (basic.length) source = basic;
    } else {
      var similar = { wave: 1, ring: 1, arc: 1, scale: 1, dot: 1, floral: 1, stripe: 1, leaf: 1, diamond: 1, hstripe: 1, speck: 1, ripple: 1, slash: 1, pic09: 1, pic10: 1, pic11: 1, pic13: 1, pic14: 1, pic15: 1, pic16: 1 };
      var filtered = catalog.filter(function (design) { return similar[design.designId]; });
      if (filtered.length) source = filtered;
    }
    if (stage < 3) return source;
    return source.map(function (design) {
      var variants = design.variants || [];
      return {
        designId: design.designId,
        name: design.name,
        variants: variants.map(function (variant, index) {
          var other = variants[index === 0 ? 1 : 0] || variant;
          return {
            colorName: variant.colorName,
            color: mixHex(variant.color, other.color, 0.4),
            image: variant.image
          };
        })
      };
    });
  }

  function createRound(catalog, options) {
    var random = options && typeof options.random === "function" ? options.random : Math.random;
    var size = sizeOf(options);
    var stage = options && options.stage > 1 ? options.stage : 1;
    var columns = columnCountOf(options && options.columns);
    var source = prepareCatalog(catalog, stage);
    var attempt;
    for (attempt = 0; attempt < 2; attempt += 1) {
      var cards = dealFrom(source, random, size, columns);
      if (isPlayable(cards, size)) return cards;
    }
    return fallbackDeal(source, size, columns);
  }

  function copyState(state, patch) {
    function pick(key) {
      return Object.prototype.hasOwnProperty.call(patch, key) ? patch[key] : state[key];
    }
    return {
      cards: pick("cards"),
      selectedIds: pick("selectedIds"),
      phase: pick("phase"),
      duplicateDesignIds: pick("duplicateDesignIds")
    };
  }

  function newRound(catalog, options) {
    return {
      cards: createRound(catalog, options),
      selectedIds: [],
      phase: "playing",
      duplicateDesignIds: []
    };
  }

  function toggleSelection(state, cardId) {
    if (state.phase === "fail") {
      var failIndex = state.selectedIds.indexOf(cardId);
      var failCard = state.cards.filter(function (card) { return card.id === cardId; })[0];
      if (failIndex < 0 || !failCard || state.duplicateDesignIds.indexOf(failCard.designId) < 0) {
        return { state: state, notice: "" };
      }
      var remaining = state.selectedIds.slice();
      remaining.splice(failIndex, 1);
      return {
        notice: "",
        state: copyState(state, {
          selectedIds: remaining,
          phase: "playing",
          duplicateDesignIds: []
        })
      };
    }
    if (state.phase !== "playing") {
      return { state: state, notice: "" };
    }
    var selectedIds = state.selectedIds.slice();
    var index = selectedIds.indexOf(cardId);
    if (index >= 0) {
      selectedIds.splice(index, 1);
      return {
        notice: "",
        state: copyState(state, { selectedIds: selectedIds })
      };
    }
    if (selectedIds.length >= SELECT_LIMIT) {
      return { state: state, notice: BLOCKED_NOTICE };
    }
    var exists = state.cards.some(function (card) { return card.id === cardId; });
    if (!exists) return { state: state, notice: "" };
    selectedIds.push(cardId);
    return {
      notice: "",
      state: copyState(state, { selectedIds: selectedIds })
    };
  }

  function selectedCards(cards, selectedIds) {
    return selectedIds.map(function (id) {
      return cards.filter(function (card) { return card.id === id; })[0];
    }).filter(Boolean);
  }

  function judgeSelection(cards, selectedIds) {
    var selected = selectedCards(cards, selectedIds);
    var counts = tally(selected);
    var duplicateDesignIds = Object.keys(counts).filter(function (id) {
      return counts[id] >= 2;
    });
    var duplicateLabels = duplicateDesignIds.map(function (id) {
      var card = selected.filter(function (item) { return item.designId === id; })[0];
      return card.name + " " + counts[id] + "장";
    });
    var ready = selected.length === SELECT_LIMIT;
    return {
      ok: ready && Object.keys(counts).length === SELECT_LIMIT,
      ready: ready,
      duplicateDesignIds: duplicateDesignIds,
      duplicateLabels: duplicateLabels
    };
  }

  function shuffleCards(state, columns) {
    return copyState(state, { cards: seatApart(state.cards, Math.random, columns) });
  }

  function resetSelection(state) {
    return copyState(state, {
      selectedIds: [],
      phase: "playing",
      duplicateDesignIds: []
    });
  }

  return {
    createRound: createRound,
    toggleSelection: toggleSelection,
    judgeSelection: judgeSelection,
    shuffleCards: shuffleCards,
    resetSelection: resetSelection,
    newRound: newRound
  };
}());
