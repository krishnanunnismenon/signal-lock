#pragma once
#include <stdint.h>

// Adjacent A/B transitions cancel contact bounce; impossible jumps reset travel.
struct Quadrature {
  uint8_t previous = 3;
  int8_t travel = 0;
  uint8_t transitionsPerClick = 4;

  void reset(uint8_t ab) { previous = ab; travel = 0; }
  int8_t sample(uint8_t ab) {
    static const int8_t direction[16] = {
      0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0
    };
    if ((previous ^ ab) == 3) travel = 0;
    else travel += direction[(previous << 2) | ab];
    previous = ab;
    if (travel >= transitionsPerClick) { travel = 0; return 1; }
    if (travel <= -transitionsPerClick) { travel = 0; return -1; }
    return 0;
  }
};
