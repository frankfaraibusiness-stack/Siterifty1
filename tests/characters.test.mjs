import test from "node:test";
import assert from "node:assert/strict";
import { CHARACTERS, CHARACTER_IDS, CHARACTER_SVG, characterSrc, getCharacter, isCharacterId } from "../lib/characters.js";

test("there are exactly two built-in characters: Lucia (female) and Jason (male)", () => {
  assert.deepEqual([...CHARACTER_IDS].sort(), ["jason", "lucia"]);
  assert.equal(CHARACTERS.lucia.gender, "female");
  assert.equal(CHARACTERS.jason.gender, "male");
});

test("only the two known ids are accepted", () => {
  assert.equal(isCharacterId("lucia"), true);
  assert.equal(isCharacterId("jason"), true);
  for (const bad of ["", "LUCIA", "toString", "__proto__", null, undefined, 5, {}]) assert.equal(isCharacterId(bad), false);
  assert.equal(getCharacter("nobody"), null);
  assert.equal(characterSrc("nobody"), null);
});

test("each character has a picture file path and embedded art", () => {
  for (const id of CHARACTER_IDS) {
    assert.match(characterSrc(id), /^\/characters\/[a-z]+\.svg$/);
    assert.match(CHARACTER_SVG[id], /^<svg[\s>]/);
  }
});
