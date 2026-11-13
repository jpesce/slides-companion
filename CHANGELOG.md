# Changelog

What changed in each version, newest first. Each version's section becomes its tag message (`make tag`) and its GitHub release notes (`make release`).

## v1.0.0 - Unreleased

**Image Spotlight is now Slides Companion**

Presenter tools for Google Slides, still free, open source, and working entirely in your browser. Spotlight is still here, rebuilt, alongside new tools for presenting. Settings open from the companion in Slides' toolbar, or from the extension's button in your browser.

- **Spotlight:** select an image and press <kbd>Space</kbd>, or right-click it and choose Spotlight image, to see it full screen. Go through the slide's other images with the arrow keys or the bar below the picture. During a slideshow, click an image to spotlight it, even when your pointer has rested there long enough to hide. Choose whether grouped images show as one picture or each on its own. Pictures stay crisp right to their edges, with no stray light line along a side.
- **Download image:** right-click an image and save it as it was added to the deck, under the deck's name.
- **Links:** during a slideshow, links on words, pictures and shapes open over your slide (even when your pointer has rested there and hidden), and <kbd>Esc</kbd> brings you back right where you left it. Back and Forward work as in a tab, PDFs open in Google's viewer (even at addresses that don't end in .pdf), YouTube and Drive videos play in their own players, and when a site won't show inside the slideshow, you can allow every site or open it in a new tab.
- **Zoom & scroll:** zoom into a slide with your trackpad, mouse wheel or <kbd>+</kbd> and <kbd>-</kbd> to show a detail up close. Scrolling no longer skips slides by accident.
- **Pen:** what you draw with Slides' pen stays on the slide for the next time you present.
- **Timer:** in presenter view, count down from how long you have, with a bar that fills as you go and an orange warning near the end. Each deck remembers its time.
- **Floating notes:** your speaker notes, in their own fonts, in a small window that floats over the full-screen slideshow, and that meeting apps leave out when you share only the slideshow's tab. Open it from View › Show floating notes, the slideshow's ⋮ menu or <kbd>Shift</kbd>+<kbd>S</kbd>.
- **Presenter view:** on one screen, presenter view floats over your full-screen slideshow, timer, slides and notes included, and stays on top. Open it as always, from Slides' menus or with <kbd>S</kbd>. With a second screen, it opens in a window of its own, as Slides does. In Settings, you can choose to float just your notes, or always use a window of its own.
- **Live edits:** edits to the deck, by you or anyone else, reach a slideshow that's already running. Should Google change Slides in a way live edits can't follow, your slideshow simply carries on without them, and afterwards Slides tells you so, with a report you can send us in one click.
- **Keyboard:** our shortcuts are listed in Slides' Keyboard shortcuts dialog, and our menu items work with the arrow keys and access keys like Slides' own.
- **Languages:** the extension speaks Slides' language, in 33 languages, right to left in Arabic and Hebrew.
- **A new look:** the binoculars are gone. Meet the companion, a small furry friend who peeks up from the extension's icon and sits at the top of Slides' side toolbar, watching your mouse. He blinks now and then, and squishes happily when you click him (he keeps still if your computer is set to reduce motion). Rather keep Slides' toolbar as Google made it? Hide him in Settings.
- The extension's button in your browser no longer opens a popup: in a Slides tab it opens Settings right there, and elsewhere it's greyed out.

## v0.1.2 - 2025-05-23

**Update extension name**

- Renamed to the correct title: "Image Spotlight for Google Slides"

## v0.1.1 - 2025-05-20

**Update permissions**

- Remove `activeTab` permission

## v0.1.0 - 2025-05-08

**Initial release**

Introduces the image spotlight feature and related interactions.

- Enable image spotlight on click + Space
- Exit spotlight mode by pressing Space, Esc, or by clicking anywhere
- Retain image crop or mask during spotlight
