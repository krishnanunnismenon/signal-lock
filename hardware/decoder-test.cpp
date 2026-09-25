#include <cassert>
#include <cstdio>
#include "signal-lock/Quadrature.h"

int main() {
  Quadrature knob;
  knob.reset(3);
  int total = 0;
  const uint8_t forward[] = {1, 0, 2, 3};
  for (auto state : forward) total += knob.sample(state);
  assert(total == 1);
  total = 0;
  const uint8_t reverse[] = {2, 0, 1, 3};
  for (auto state : reverse) total += knob.sample(state);
  assert(total == -1);
  total = 0;
  const uint8_t bounce[] = {1, 3, 1, 0, 1, 0, 2, 0, 2, 3};
  for (auto state : bounce) total += knob.sample(state);
  assert(total == 1);
  knob.reset(3);
  assert(knob.sample(1) == 0);
  assert(knob.sample(3) == 0); // Incomplete turn reversed: no click.
  assert(knob.travel == 0);
  knob.sample(1);
  knob.sample(2); // Impossible two-bit jump resets partial travel.
  assert(knob.travel == 0);
  knob.reset(3);
  knob.transitionsPerClick = 2;
  assert(knob.sample(1) == 0);
  assert(knob.sample(0) == 1);
  puts("Encoder decoder: direction, bounce, reversal, invalid jumps and half-step checks passed.");
}
