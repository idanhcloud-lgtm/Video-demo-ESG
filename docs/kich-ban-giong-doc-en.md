# English voice-over script – final cut (no recap), for ElevenLabs v4

Same structure as the Vietnamese voice (V1, V1b, V2, V3, V5) so the video timing can be rebuilt the same way.
One voice tag at the start of each paragraph, `[long pause]` between sentences (the cut points), numbers written as words.
"TO" is written "T-O" so it is read letter by letter.

---

## E0 – Title line (new, replaces the first sentence of E1)
Record as its own file `audio/en/E0.mp3`, so the rest of E1 stays as it is.
```
[confident] Algorithm-based route optimization for reach trucks... simulated on the B2C warehouse layout at Duy Tan Long An.
```
If the voice mispronounces the name, use the phonetic spelling instead:
```
[confident] Algorithm-based route optimization for reach trucks... simulated on the B2C warehouse layout at Zwee Tun Long Ahn.
```
Subtitle: "Algorithm-based route optimization for reach trucks, simulated on the B2C warehouse layout at Duy Tan Long An." /
"Tối ưu lộ trình xe reach truck bằng thuật toán, mô phỏng trên sơ đồ kho B2C – Duy Tân Long An."

## E1 – Opening and race
```
[confident] Algorithm-based route optimization for reach trucks.
[long pause]
[engaging] To compare, we simulate one T-O with twenty-eight put-away stops. On the left, the truck follows the route sequenced by the algorithm. On the right, it follows today's practice: aisle by aisle, from A to T.
[long pause]
[steady] Both trucks start together, at the same speed. The optimized truck has finished... while the aisle-order truck is still driving.
```

## E1b – Distance comparison (after the race)
```
[calm] With the same twenty-eight stops, the optimized route drives one thousand one hundred sixty-six metres. Today's order drives one thousand five hundred ninety-six metres.
[long pause]
[calm] That is about four hundred thirty metres shorter, roughly twenty-seven percent, on a single T-O.
[long pause]
[curious] Why the difference? The current process has four limitations. Let's look at each one on the map.
```

## E2 – Limitations one, two, three
```
[confident] First: nearby stops in different aisles are not handled in sequence. They sit side by side, but the T-O is printed in aisle order, so the neighbouring stop is not next on the list. Passing by, the driver does not know there is another stop right next door... so the truck has to come back to this area a second time.
[long pause]
[confident] With the algorithm, these stops are listed back to back. One visit is enough.
[long pause]
[confident] Second: in some cases, the cross aisles are not used optimally. After a stop deep in the aisle, the truck runs back to the front for one more stop, before changing aisle.
[long pause]
[confident] With the algorithm, the truck changes aisle at the nearest cross aisle, with no trip back to the front. The stop near the front is handled on the way back.
[long pause]
[confident] Third: the stops of a T-O are scattered over many aisles, so the truck easily drives extra distance. To compare, let's straighten both routes.
[long pause]
[confident] The extra red length is the distance the truck drives for nothing today. The optimized route cuts this waste.
```

## E3 – Limitation four
```
[confident] Fourth: congestion at the start of the morning shift. After picking up their T-Os, the forklifts all head for the first aisles at once, causing congestion and a risk of collisions. Because T-Os are printed in aisle order, every driver starts in aisles A and B.
[long pause]
[steady] Only three trucks finish there and turn off at the cross aisle. The other six still have stops further down... so they get stuck in the middle of the aisle.
[long pause]
[confident] With the algorithm, trucks do not run each aisle to the end. Stops are grouped by zone, and at the cross aisle each truck turns off right away, reducing the crowding at shift start.
```

## E5 – Closing
```
[warm] That was the simulation of our algorithm-based route optimization for reach trucks. Next, we present the results of simulating one month of T-Os.
```

---

## Notes
- "First / Second / Third / Fourth" instead of "One: / Two:" so the numbers are not read as a list count.
- Avoid `[clear]` (it caused throat clearing in the Vietnamese takes).
- Figures follow the current video: 1,166 m vs 1,596 m, −430 m, −27%.
- Optional benefit line (dropped with the recap), place before E5 if wanted:
  `[warm, upbeat] Shorter travel, less congestion, and energy saved on every forklift trip.`
