var laneKey = "scarf-aisle-slots";
var laneCount = 24;
var freshMs = 60000;
var markPattern = /^[a-f0-9]{32}$/;
var slotPattern = /^([0-9]{1,16})\.([a-f0-9]{32})\.([1-6])$/;
var fieldPattern = /^(?:[0-9]|1[0-9]|2[0-3])$/;

function flatSlots(result) {
  var slots = [];
  var i, field, raw, found, index;
  for (i = 0; i < laneCount; i++) slots.push(null);
  if (!Array.isArray(result)) return slots;
  for (i = 0; i + 1 < result.length; i += 2) {
    field = result[i];
    raw = result[i + 1];
    if (typeof field !== "string" || typeof raw !== "string") continue;
    if (!fieldPattern.test(field)) continue;
    found = slotPattern.exec(raw);
    if (!found) continue;
    index = Number(field);
    slots[index] = { until: Number(found[1]), mark: found[2], face: Number(found[3]) };
  }
  return slots;
}

function nextBoard(slots, mark, stay, face, now) {
  var board = [];
  var i, slot, live, home, until;
  home = -1;
  for (i = 0; i < slots.length; i++) {
    slot = slots[i];
    live = !!(slot && slot.until > now && slot.face >= 1 && slot.face <= 6);
    if (!live) {
      board.push(null);
      continue;
    }
    if (slot.mark === mark) {
      if (home < 0) {
        home = i;
        board.push({ until: slot.until, mark: slot.mark, face: slot.face });
      } else {
        board.push(null);
      }
    } else {
      board.push({ until: slot.until, mark: slot.mark, face: slot.face });
    }
  }
  if (!stay) {
    if (home >= 0) board[home] = null;
    return board;
  }
  until = now + freshMs;
  if (home >= 0) {
    board[home] = { until: until, mark: mark, face: face };
    return board;
  }
  for (i = 0; i < board.length; i++) {
    if (!board[i]) {
      board[i] = { until: until, mark: mark, face: face };
      break;
    }
  }
  return board;
}

function writesFor(before, after) {
  var dels = [];
  var sets = [];
  var live = 0;
  var i, next, prev;
  for (i = 0; i < after.length; i++) {
    next = after[i];
    prev = before[i];
    if (!next) {
      if (prev) dels.push(String(i));
    } else if (!prev || prev.until !== next.until || prev.mark !== next.mark || prev.face !== next.face) {
      sets.push({ field: String(i), value: String(next.until) + "." + next.mark + "." + String(next.face) });
    }
    if (next) live += 1;
  }
  return { dels: dels, sets: sets, live: live };
}

function readAsk(request) {
  var body = request.body;
  if (typeof body === "string") {
    if (body.length > 120) return null;
    try {
      body = JSON.parse(body);
    } catch (err) {
      return null;
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (typeof body.mark !== "string" || !markPattern.test(body.mark)) return null;
  if (typeof body.stay !== "boolean") return null;
  if (!body.stay) return { mark: body.mark, stay: false, face: 0 };
  if (typeof body.face !== "number" || !Number.isInteger(body.face)) return null;
  if (body.face < 1 || body.face > 6) return null;
  return { mark: body.mark, stay: true, face: body.face };
}

function roster(board, mark) {
  var faces = [];
  var mine = -1;
  var i;
  for (i = 0; i < board.length; i++) {
    if (!board[i]) continue;
    if (board[i].mark === mark && mine < 0) mine = faces.length;
    faces.push(board[i].face);
  }
  return { faces: faces, mine: mine };
}

async function redisCall(url, token, command) {
  var reply, payload, i, item;
  reply = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!reply.ok) return null;
  payload = await reply.json();
  if (!payload) return null;
  if (Array.isArray(payload)) {
    for (i = 0; i < payload.length; i++) {
      item = payload[i];
      if (!item || item.error) return null;
    }
    return payload;
  }
  if (payload.error) return null;
  return payload.result;
}

async function aisle(request, response) {
  var base, token, ask, listed, now, before, after, change, commands, hset, i, saved, crowd;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "method" });
    return;
  }
  ask = readAsk(request);
  if (!ask) {
    response.status(400).json({ error: "mark" });
    return;
  }
  base = process.env.KV_REST_API_URL;
  token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) {
    response.status(503).json({ error: "unready" });
    return;
  }
  base = base.replace(/\/$/, "");
  try {
    listed = await redisCall(base, token, ["HGETALL", laneKey]);
    if (!Array.isArray(listed)) {
      response.status(502).json({ error: "store" });
      return;
    }
    before = flatSlots(listed);
    now = Date.now();
    after = nextBoard(before, ask.mark, ask.stay, ask.face, now);
    change = writesFor(before, after);
    commands = [];
    if (change.dels.length) commands.push(["HDEL", laneKey].concat(change.dels));
    if (change.sets.length) {
      hset = ["HSET", laneKey];
      for (i = 0; i < change.sets.length; i++) {
        hset.push(change.sets[i].field, change.sets[i].value);
      }
      commands.push(hset);
    }
    if (commands.length) {
      saved = await redisCall(base + "/pipeline", token, commands);
      if (saved === null) {
        response.status(502).json({ error: "store" });
        return;
      }
    }
    crowd = roster(after, ask.mark);
    response.status(200).json({ faces: crowd.faces, mine: crowd.mine });
  } catch (err) {
    response.status(502).json({ error: "store" });
  }
}

aisle.flatSlots = flatSlots;
aisle.nextBoard = nextBoard;
aisle.writesFor = writesFor;
aisle.roster = roster;
aisle.laneCount = laneCount;
aisle.freshMs = freshMs;
module.exports = aisle;
