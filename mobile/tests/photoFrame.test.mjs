import assert from "node:assert/strict";
import test from "node:test";
import {
  focalAfterDrag,
  focalPoint,
  photoContentPosition,
} from "../src/lib/photoFrame.ts";

test("older top and bottom framing keeps its position after upgrading", () => {
  assert.deepEqual(focalPoint({ frame: "top" }), { x: 50, y: 0 });
  assert.deepEqual(focalPoint({ frame: "bottom" }), { x: 50, y: 100 });
  assert.deepEqual(photoContentPosition({ focalX: 36, focalY: 72 }), {
    left: "36%",
    top: "72%",
  });
});

test("dragging a portrait photo moves its vertical crop and clamps at edges", () => {
  assert.deepEqual(focalAfterDrag({ x: 50, y: 50 }, 30, -40, 200, 400, 800), {
    x: 50,
    y: 70,
  });
  assert.deepEqual(focalAfterDrag({ x: 50, y: 50 }, 0, 500, 200, 400, 800), {
    x: 50,
    y: 0,
  });
});

test("dragging a wide photo moves its horizontal crop", () => {
  assert.deepEqual(focalAfterDrag({ x: 50, y: 50 }, 50, 30, 200, 800, 400), {
    x: 25,
    y: 50,
  });
});
