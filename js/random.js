/* random.js — "seeded" random numbers.
 *
 * Normal Math.random() gives different numbers every time. A *seeded* random
 * generator gives the SAME sequence of numbers for the same starting number
 * (the "seed"). That means a workout can be re-created exactly from its seed,
 * and "Shuffle" simply means "pick a new seed".
 *
 * The algorithm is a well-known tiny one called mulberry32.
 */
window.Gym = window.Gym || {};

Gym.makeRandom = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // a number from 0 to <1
  };
};

Gym.newSeed = function () {
  return Math.floor(Math.random() * 1e9);
};
