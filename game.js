const gameSize = Math.min(window.innerWidth - 20, window.innerHeight - 20, 600);
const scale = gameSize / 600;
const fontSize = window.innerWidth < 600 ? 10 : 14;
const passengerSpacing = window.innerWidth < 600 ? 25 : 40;
const maxPassengersToShow = 1000;

const k = kaplay({
  canvas: document.querySelector("#game"),
  width: gameSize,
  height: gameSize,
});

const busColors = [
  [0, 0, 255],
  [0, 255, 0],
  [0, 255, 255],
  [255, 0, 0],
  [255, 0, 255],
  [255, 255, 0],
];

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getAABB(bus) {
  const half = 35 * scale;
  return {
    minX: bus.x - half,
    maxX: bus.x + half,
    minY: bus.y - half,
    maxY: bus.y + half,
  };
}

function aabbsOverlap(a, b) {
  return (
    a.maxX > b.minX && a.minX < b.maxX && a.maxY > b.minY && a.minY < b.maxY
  );
}

k.scene("game", () => {
  let slots = [null, null, null, null]; // 4 pickup slots
  let parkingBuses = [];
  const positions = [];
  for (let i = 0; i < 40; i++) {
    const row = Math.floor(i / 5);
    let y = 220 + [0, 60, 80, 140, 160, 220, 240, 300][row];
    positions.push({
      x: (160 + (i % 5) * 80) * scale,
      y: y * scale,
      rot: Math.floor(i / 5) % 2 === 0 ? 45 : 135,
      color: busColors[Math.floor(Math.random() * busColors.length)],
      capacity: [2, 4, 6][Math.floor(Math.random() * 3)],
    });
  }
  positions.forEach((pos) => {
    const dir = Math.floor(Math.random() * 2) === 0;
    parkingBuses.push({
      color: pos.color,
      x: pos.x,
      y: pos.y,
      rot: pos.rot,
      capacity: pos.capacity,
      dir,
      facing: pos.rot === 45 ? (dir ? "NW" : "SE") : dir ? "NE" : "SW",
    });
  });
  // Generate initial passengers based on parking buses
  let buses = [...parkingBuses];

  let passengers = [];

  while (buses.length > 0) {
    let group1 = [];
    for (let i = 0; i < 4 && buses.length > 0; i++) {
      let bus = buses.pop();
      for (let j = 0; j < bus.capacity; j++) {
        group1.push([...bus.color]);
      }
    }
    group1 = shuffle(group1);

    let group2 = [];
    for (let i = 0; i < 4 && buses.length > 0; i++) {
      let bus = buses.pop();
      for (let j = 0; j < bus.capacity; j++) {
        group2.push([...bus.color]);
      }
    }
    group2 = shuffle(group2);

    const passengerList = [...group1, ...group2];

    passengers = passengers.concat(passengerList);
  }

  let passengerObjs = [];
  let parkingObjs = [];
  let slotObjs = [];
  let slotTextObjs = [];
  let slotSeatObjs = [];
  let movingBus = null;

  // Background
  k.add([k.rect(gameSize, gameSize), k.pos(0, 0), k.color(200, 200, 200)]);

  // Draw slot backgrounds once
  for (let i = 0; i < 4; i++) {
    k.add([
      k.rect(80 * scale, 40 * scale),
      k.pos((100 + i * 120) * scale, 150 * scale),
      k.color(150, 150, 150),
      k.outline(2 * scale, k.color(0, 0, 0)),
      k.area(),
      "slot",
      { slotIdx: i },
    ]);
  }

  function drawPassengers() {
    const displayCount = Math.min(passengers.length, maxPassengersToShow);
    // Remove excess objects
    while (passengerObjs.length > displayCount) {
      passengerObjs.pop().destroy();
    }
    // Add missing objects
    while (passengerObjs.length < displayCount) {
      const idx = passengerObjs.length;
      passengerObjs.push(
        k.add([
          k.circle(20 * scale),
          k.pos((50 + idx * passengerSpacing) * scale, 50 * scale),
          k.color(...passengers[idx]),
        ])
      );
    }
    // Update positions and colors
    passengerObjs.forEach((obj, idx) => {
      obj.pos.x = (50 + idx * passengerSpacing) * scale;
      obj.use(k.color(...passengers[idx]));
    });
  }

  function drawParking() {
    parkingObjs.forEach((b) => b.destroy());
    parkingObjs = [];
    parkingBuses.forEach((bus, idx) => {
      const obj = k.add([
        k.rect(60 * scale, 30 * scale),
        k.pos(bus.x, bus.y),
        k.rotate(bus.rot),
        k.color(...bus.color),
        k.area(),
        "parkingBus",
        { busData: bus },
      ]);

      // Add thick white border on the left
      obj.add([
        k.rect(5 * scale, 30 * scale),
        k.pos(bus.dir ? 0 : 60 * scale, 0),
        k.color(255, 255, 255),
      ]);
      parkingObjs.push(obj);

      // Add seat circles as children
      let offsets = [];
      if (bus.capacity === 2) {
        offsets = [
          { x: 20, y: 15 },
          { x: 40, y: 15 },
        ];
      } else if (bus.capacity === 4) {
        offsets = [
          { x: 15, y: 10 },
          { x: 45, y: 10 },
          { x: 15, y: 20 },
          { x: 45, y: 20 },
        ];
      } else if (bus.capacity === 6) {
        offsets = [
          { x: 10, y: 10 },
          { x: 30, y: 10 },
          { x: 50, y: 10 },
          { x: 10, y: 20 },
          { x: 30, y: 20 },
          { x: 50, y: 20 },
        ];
      }
      for (let i = 0; i < bus.capacity; i++) {
        const circle = obj.add([
          k.circle(5 * scale),
          k.pos(offsets[i].x * scale, offsets[i].y * scale),
          k.color(255, 255, 255),
          k.outline(1 * scale, k.color(0, 0, 0)),
        ]);
      }
    });
  }

  function drawSlots() {
    slotObjs.forEach((b) => b.destroy());
    slotTextObjs.forEach((t) => t.destroy());
    slotObjs = [];
    slotTextObjs = [];
    slots.forEach((bus, idx) => {
      if (bus) {
        const obj = k.add([
          k.rect(60 * scale, 30 * scale),
          k.pos((110 + idx * 120) * scale, 155 * scale),
          k.color(...bus.color),
          k.area(),
          "slotBus",
          { slotIdx: idx },
        ]);
        slotObjs.push(obj);

        // Add seat circles as children
        let offsets = [];
        if (bus.capacity === 2) {
          offsets = [
            { x: 20, y: 15 },
            { x: 40, y: 15 },
          ];
        } else if (bus.capacity === 4) {
          offsets = [
            { x: 15, y: 10 },
            { x: 45, y: 10 },
            { x: 15, y: 20 },
            { x: 45, y: 20 },
          ];
        } else if (bus.capacity === 6) {
          offsets = [
            { x: 10, y: 10 },
            { x: 30, y: 10 },
            { x: 50, y: 10 },
            { x: 10, y: 20 },
            { x: 30, y: 20 },
            { x: 50, y: 20 },
          ];
        }
        for (let i = 0; i < bus.capacity; i++) {
          const filled = i < bus.current;
          const circle = obj.add([
            k.circle(5 * scale),
            k.pos(offsets[i].x * scale, offsets[i].y * scale),
            filled ? k.color(...bus.color) : k.color(255, 255, 255),
            k.outline(1 * scale, k.color(0, 0, 0)),
          ]);
        }
      }
    });
  }

  drawPassengers();
  drawParking();
  drawSlots();

  // Click parking bus
  k.onClick("parkingBus", (bus) => {
    if (movingBus) return; // prevent clicking while moving
    const busData = bus.busData;
    const idx = parkingBuses.indexOf(busData);
    const emptySlotIdx = slots.findIndex((slot) => !slot);
    if (emptySlotIdx !== -1) {
      // calculate dx, dy based on facing
      let dx, dy;
      if (busData.facing === "NW") {
        dx = -1;
        dy = -1;
      } else if (busData.facing === "NE") {
        dx = 1;
        dy = -1;
      } else if (busData.facing === "SW") {
        dx = -1;
        dy = 1;
      } else if (busData.facing === "SE") {
        dx = 1;
        dy = 1;
      }
      movingBus = {
        bus,
        originalPos: k.vec2(bus.pos.x, bus.pos.y),
        targetSlotIdx: emptySlotIdx,
        dx,
        dy,
        timer: 0,
      };
    }
  });

  // Automatic loading
  k.onUpdate(() => {
    if (movingBus) {
      movingBus.timer += k.dt();
      const speed = 200; // adjust speed
      const newX = movingBus.bus.pos.x + movingBus.dx * speed * k.dt();
      const newY = movingBus.bus.pos.y + movingBus.dy * speed * k.dt();
      // temporarily move to check collision
      const oldPos = movingBus.bus.pos.clone();
      movingBus.bus.pos.x = newX;
      movingBus.bus.pos.y = newY;
      const collided = parkingObjs.some(
        (obj) => obj !== movingBus.bus && movingBus.bus.isColliding(obj)
      );
      // restore position
      movingBus.bus.pos = oldPos;
      if (collided) {
        // reset to original position
        movingBus.bus.pos = movingBus.originalPos.clone();
        movingBus = null;
        return;
      }
      // no collision, move
      movingBus.bus.pos.x = newX;
      movingBus.bus.pos.y = newY;
      // check if 1 second passed
      if (movingBus.timer >= 1) {
        // teleport to slot
        const targetX = (110 + movingBus.targetSlotIdx * 120) * scale;
        movingBus.bus.pos = k.vec2(targetX, 155 * scale);
        movingBus.bus.angle = 0;
        // place in slot
        slots[movingBus.targetSlotIdx] = {
          ...movingBus.bus.busData,
          current: 0,
        };
        parkingBuses.splice(parkingBuses.indexOf(movingBus.bus.busData), 1);
        movingBus.bus.destroy();
        drawParking();
        // load passengers
        let updated = false;
        while (
          passengers.length > 0 &&
          passengers[0].every((c, i) => c === movingBus.bus.busData.color[i]) &&
          slots[movingBus.targetSlotIdx].current <
            slots[movingBus.targetSlotIdx].capacity
        ) {
          passengers.shift();
          slots[movingBus.targetSlotIdx].current++;
          updated = true;
          if (
            slots[movingBus.targetSlotIdx].current ===
            slots[movingBus.targetSlotIdx].capacity
          ) {
            slots[movingBus.targetSlotIdx] = null;
            break;
          }
        }
        drawSlots();
        if (updated) {
          drawPassengers();
        }
        movingBus = null;
      }
    }
    let updated = false;
    slots.forEach((bus, idx) => {
      if (bus) {
        while (
          passengers.length > 0 &&
          passengers[0].every((c, i) => c === bus.color[i]) &&
          bus.current < bus.capacity
        ) {
          passengers.shift();
          bus.current++;
          updated = true;
          if (bus.current === bus.capacity) {
            slots[idx] = null;
            break;
          }
        }
      }
    });
    if (updated) {
      drawPassengers();
      drawSlots();
    }
    // Check game over
    if (passengers.length > 0) {
      const hasMatch = slots.some(
        (bus) => bus && passengers[0].every((c, i) => c === bus.color[i])
      );
      if (!hasMatch) {
        // k.add([k.text("Game Over!", 48), k.pos(200, 250), k.color(255, 0, 0)]);
        // Stop updates or something, but for simplicity, leave
      }
    }
  });
});

k.go("game");
