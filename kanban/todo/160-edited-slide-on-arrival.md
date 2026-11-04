# An edited slide arrives already updated

**Problem:** with card 50, when a slide is edited while another one is on screen, the new player waits for a calm moment. If the slide on screen never gets one (it has a video, say), the presenter moves on and sees the old version of the next slide for about half a second, then watches it fade into the new one. The audience sees the slide change while it's being talked about, which is what the "Right away" setting promises to avoid where it can.

**Demand:** found while checking card 50 in Dia, on the test deck's video slide (slide 4) followed by an edited slide 5. Any deck with a video before an edited slide does it.

**Approach:** when a new player is ready and waiting, and the presenter moves on (→, a clicker, a click), the swap can happen at that moment: the key goes to the new player instead, which is on the same slide and step, so its own transition plays into the updated slide. Leaving the slide stops its video anyway, so cutting it isn't seen. Presenter view's Next and auto-play move on too, and need the same.

**Done when:**
- [ ] Moving on from a slide that kept a new player waiting goes straight into the updated next slide, with Slides' own transition and no fade afterwards.
- [ ] Works from the keyboard, a clicker, a click on the slide, presenter view's Next and auto-play.
- [ ] Covered by a Playwright test.
