# The companion blinks

**Problem:** the toolbar companion's eyes follow the mouse, but otherwise he's still. A blink now and then, and a little reaction when clicked, would make him feel alive, which is the point of a mascot whose eyes move.

**Evidence of demand:** the maintainer asked for a blink while designing the companion (card 240), then turned down the first one ("terrible"), and the click squash never got a yes. The extension shipped without either.

**Approach:** redo the blink with what the 3D loop's lids taught, as far as 25px allows: close fast and open slower (shut in 2–3 frames, open over 5–6), an upper lid sweeping down with an arched edge instead of the eye squashing flat, both eyes together, and blinks timed with a change of where he looks. Prototype it on the Wonky Companion page first (https://claude.ai/artifact/SnjWex2Brb4N2JzTyuwSE9), then in companion.js. Nothing moves when the presenter's system asks for reduced motion. Decide the click squash at the same time.

**Done when:**
- [ ] The maintainer has said yes to the blink, and to the squash or its absence.
- [ ] companion.js does it, and nothing moves with reduced motion on.
- [ ] Compared side by side with Slides' toolbar in a live deck.
