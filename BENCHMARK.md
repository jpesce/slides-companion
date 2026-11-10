# How Slides Companion compares

Slides Companion adds presenter tools to Google Slides™. Many other projects tackle the same problems, and some do things we don't. This page sets them side by side, so you can pick what fits your talk, and so we remember what's out there.

_Checked on 8 November 2026._ Figures come from each project's own page: the Chrome Web Store's user count and rating, the Google Workspace Marketplace's install count (a running total, so it isn't comparable with Chrome's user counts), and GitHub stars. We read each listing, and the published code where there is some, but we didn't run every tool. "Per its listing" marks what we took on the project's word. Something wrong or missing? [Open an issue](https://github.com/jpesce/slides-companion/issues) and we'll fix it.

**How Slides Companion works, in short:** a free, open-source (GPL-3.0) Chrome extension. It runs entirely in your browser, with no account and no server, on top of Slides' own slideshow. So your videos, animations and clicker keep working. That choice also sets its limits: anything that needs a server, like a phone remote or audience polls, is something it doesn't do (see [What Slides Companion doesn't do](#what-slides-companion-doesnt-do)).

## At a glance

| | Google Slides alone | Slides Companion | Other options |
|---|---|---|---|
| **See an image full screen** | No | Yes, in the editor and the slideshow, then the slide's other images with the arrow keys | [Image Zoom for Slides, Docs, PowerPoint & Word](#spotlight-images) (one image at a time) |
| **Open a website over the slide** | Links open in a new tab | Over the slide, with Back and Forward, PDFs and YouTube or Drive videos; <kbd>Esc</kbd> brings you back | [sliFrame](#websites-over-the-slide) (no longer runs in Chrome); [Pear Deck](#websites-over-the-slide) (on students' own devices) |
| **Zoom into a slide while presenting** | No | Trackpad, mouse wheel or <kbd>+</kbd>/<kbd>-</kbd>, and drag to look around | [Google Slides Zoom](#zoom); magnifier lenses |
| **Stop scrolling from changing slides** | Scrolling changes slides | A setting, or zoom instead | [Stop Slide Scrolling](#scrolling) |
| **Keep what you draw** | A pen and laser pointer; drawings disappear when the slideshow ends | Slides' own pen drawings stay for the next time you present | [Annotate](#drawing-and-laser-pointers) (its own layer, with an account) |
| **Countdown only you can see** | Presenter view's timer counts up | Presenter view's own timer counts down, warns before the end, adds a minute | [SlidePace](#timers) (has a presenter-only option); most timers show on the slide, for the audience |
| **See your notes while the slideshow is full screen** | Presenter view (with one screen, not at the same time as full screen) | A small picture-in-picture window over the full-screen slideshow, left out when you share only the slideshow's tab | [HumDocs](#speaker-notes-and-teleprompters) (also picture-in-picture, and can follow your voice); phone remotes |
| **Edits reach a slideshow that's running** | No; a "Publish to the web" link updates within minutes | Yes: right away, once you've moved on, or at the next slideshow | [Live Present Slides](#live-edits-and-signage) (shows the editor instead of the slideshow) |
| **Download an image as it was added** | No | Right-click › Download image | [Google Slides & Docs - Download Image](#downloading-images) |
| **Phone remote** | No | No | [Remote for Slides](#remotes), [Copresent](#remotes) |
| **Audience polls, quizzes, Q&A** | Audience Q&A | No | [Pear Deck, Nearpod, Slido](#audience-interaction) |
| **Captions** | Yes | No | [Live Classroom Captions](#captions) (translated) |
| **Price, account** | Free with Slides | Free, no account | Mostly free; several have paid tiers or need an account |

## What Google Slides already does

Worth knowing before installing anything. From Google's Help Center, and what we see in a live deck:

- **Presenter view** opens your notes, the next slide and a timer in a separate window. With one screen, you can't use presenter view and full screen at the same time ([Help Center](https://support.google.com/docs/answer/1696787)). Its timer counts up, with pause and reset; it doesn't count down.
- **Laser pointer** (<kbd>L</kbd>) and **pen** while presenting. Drawings "disappear after you end your slideshow" ([Help Center](https://support.google.com/docs/answer/1696787), [9to5Google](https://9to5google.com/2023/08/10/google-slides-draw-annotate/)).
- **Captions** ([Help Center](https://support.google.com/docs/answer/9109474)), **Audience Q&A** ([Help Center](https://support.google.com/docs/answer/6386827)), **Present in Meet** ([Help Center](https://support.google.com/docs/answer/12751228)), and a black or white screen (<kbd>B</kbd>, <kbd>W</kbd>). Speaker spotlight and recording come with some paid Workspace editions.
- **Publish to the web** gives a link that updates by itself, though it "can take a few minutes" ([Help Center](https://support.google.com/docs/answer/183965)). In our tests it took 30 to 60 minutes.
- Not built in: zooming into a slide while presenting, showing a website inside the slideshow, edits reaching a slideshow that's already running, and stopping the scroll wheel from changing slides.

## Spotlight images

See an image from a slide full screen.

| Project | Kind | Users · rating | Price · license | How it works | Compared with Slides Companion |
|---|---|---|---|---|---|
| **Slides Companion** | Chrome extension | new | Free · GPL-3.0 | Select an image and press <kbd>Space</kbd> or right-click it; in a slideshow, click it. Arrow keys go through the slide's other images | |
| [Image Zoom for Slides, Docs, PowerPoint & Word](https://chromewebstore.google.com/detail/mbcdnjbocanmphhbkpbjbnepdhbihafo) | Chrome extension | 1,000 · 5.0 (4) | Free · not stated | Click an image to enlarge it, in the editor and the slideshow; also in Docs, PowerPoint and Word online | Works in more apps; one image at a time, no going through the others |
| [Image Zoom for Google Slides™](https://chromewebstore.google.com/detail/iliapnlbadkahalbmkooffmcfbpgdohc) | Chrome extension | 26 · no ratings | Free · not stated | A button on hover enlarges the image | One image at a time |

## Websites over the slide

Show a live website, PDF or video during a slideshow, without leaving it.

| Project | Kind | Users · rating | Price · license | How it works | Compared with Slides Companion |
|---|---|---|---|---|---|
| **Slides Companion** | Chrome extension | new | Free · GPL-3.0 | Any link opens over the slide in Slides' own player, with Back and Forward. PDFs open in Google's viewer, YouTube and Drive videos in their players. A site that refuses to be shown inside another page says so, with a way to allow it or open it in a new tab | |
| [sliFrame](https://github.com/log-md/sliFrame) | Chrome extension (unpacked) | 54★ on GitHub | Free · MIT | Put a web address in a text box and the page shows in its place, in the editor and the slideshow | Built for Manifest V2, which current Chrome no longer runs; sites that refuse to be shown inside another page stay blank |
| [CircuitVerse Presentation Embed](https://github.com/CircuitVerse/CircuitVerse-Presentation-Embed) | Add-on + extension | 10★ on GitHub | Free · MIT | Embeds live CircuitVerse circuits | CircuitVerse circuits only |
| [Pear Deck](https://workspace.google.com/marketplace/app/pear_deck_for_google_slides_addon/363332900703) | Add-on | 81M+ installs · 4.3 (1,916) | Free and paid plans · proprietary | Website slides appear on each student's own device, in a Pear Deck session | Made for classrooms, on the audience's devices; needs an account |

## Zoom

Zoom into part of a slide while presenting.

| Project | Kind | Users · rating | Price · license | How it works | Compared with Slides Companion |
|---|---|---|---|---|---|
| **Slides Companion** | Chrome extension | new | Free · GPL-3.0 | Pinch or <kbd>Ctrl</kbd>+scroll, the mouse wheel, or <kbd>+</kbd> and <kbd>-</kbd>; drag to look around | |
| [Google Slides Zoom](https://chromewebstore.google.com/detail/hcfdipbanljliibhmpambhpcfifbadie) ([code](https://github.com/aben20807/google-slides-zoom)) | Chrome extension | 52 · 5.0 (7) | Free · Apache-2.0 | <kbd>Ctrl</kbd> with <kbd>+</kbd>/<kbd>-</kbd>, <kbd>Ctrl</kbd>+scroll or pinch, drag to move, in the editor and the slideshow | The closest match |
| [Magnifying Glass (Hover Zoom)](https://chromewebstore.google.com/detail/gfcbebjdigncefnokoncehghgfndjcgn) | Chrome extension | 60,000 · 4.4 (62) | Free · not stated | A magnifier lens over a picture of the tab, on any site | A still picture: videos and animations stop under the lens |
| [cursor-zoom](https://github.com/vineethbekal/cursor-zoom) | Extension (unpacked) | 0★ on GitHub | Free · no license | A lens that follows the pointer | Not in the store |

## Scrolling

Keep a brush of the trackpad from skipping slides.

| Project | Kind | Users · rating | Price · license | How it works | Compared with Slides Companion |
|---|---|---|---|---|---|
| **Slides Companion** | Chrome extension | new | Free · GPL-3.0 | Scrolling zooms, or does nothing, as you choose in Settings | |
| [Stop Slide Scrolling in Google Presentation](https://chromewebstore.google.com/detail/cmpmjbfhpecollipohbphhgbohleeeon) ([code](https://github.com/sneakaway-studio/stop-slide-scrolling)) | Chrome and Firefox extension | 10,000 · 4.7 (86) | Free · MIT | Blocks the wheel in Slides, Drawings and Calendar, with an optional key to scroll anyway | Also in Firefox; last updated June 2022 |
| [nopresoscroll](https://github.com/rockhunters08/nopresoscroll) | Extension (unpacked) | 0★ on GitHub | Free · not stated | Blocks scrolling in slideshows | Manifest V2, which current Chrome no longer runs |

## Drawing and laser pointers

Slides has its own pen and laser pointer, but drawings are gone when the slideshow ends. Slides Companion keeps them; the others draw on a layer of their own, over any website.

| Project | Kind | Users · rating | Price · license | How it works | Compared with Slides Companion |
|---|---|---|---|---|---|
| **Slides Companion** | Chrome extension | new | Free · GPL-3.0 | What you draw with Slides' own pen stays on the slide for the next time you present, until Erase all | Slides' pen, kept; no new drawing tools |
| [Annotate](https://chromewebstore.google.com/detail/gdojjgflncpbcfmenbkndfhoamlhajmf) | Chrome extension | 200,000 · 2.9 (220) | Free; Pro $34.99/year · proprietary | Draw on any page, PDF or deck, saved to your Annotate account; also a screen shade and a timer | Works everywhere; needs an account, and the laser is a paid feature |
| [Screenity](https://chromewebstore.google.com/detail/kbbdabhdfibnancpjfhlkhafgdilcnji) ([code](https://github.com/alyssaxuu/screenity)) | Chrome extension | 200,000 · 3.7 (768) | Free, optional Pro · GPL-3.0 | A screen recorder with drawing tools | For recording a talk |
| [Page Marker](https://chromewebstore.google.com/detail/jfiihjeimjpkpoaekpdpllpaeichkiod) | Chrome extension | 1,000,000 · 4.5 (632) | Free · not stated | Draw on any page | Works on any site |
| [Web Paint](https://chromewebstore.google.com/detail/mnopmeepcnldaopgndiielmfoblaennk) | Chrome extension | 400,000 · 4.3 (1.8K) | Free · not stated | Draw and add shapes or text on any page | Works on any site |
| [AnyTab Laser Pointer](https://chromewebstore.google.com/detail/ennlhkgoflgahjbkkhnaifpalkmhencd) | Chrome extension | 3,000 · 4.6 (182) | Free · not stated | A fading laser trail on any tab | Slides already has one; this one works on any site |
| [Cursor Highlighter](https://chromewebstore.google.com/detail/echjgnggfpiohepohkpfknhjbnccdjlo) | Chrome extension | 10,000 · 3.4 (42) | Free · not stated | Highlights the pointer on any page | |
| [Laser Pen](https://chromewebstore.google.com/detail/pldaipieikpmkjdcbibjkhicikieojei) | Chrome extension | 1,000 · 4.2 (5) | Free · not stated | A laser that also highlights and circles | |

## Timers

Nearly every timer for Slides puts the time on the slide, for the audience to see, which suits classrooms and workshops. Slides Companion's timer is for the speaker only.

| Project | Kind | Users · rating | Price · license | How it works | Compared with Slides Companion |
|---|---|---|---|---|---|
| **Slides Companion** | Chrome extension | new | Free · GPL-3.0 | Click presenter view's own timer to count down from how long you have. A bar fills, it turns orange 1, 2 or 5 minutes before the end, and you can add a minute. Each deck remembers its time | Only you see it; one timer for the whole talk |
| [Slides Timer](https://chromewebstore.google.com/detail/nfhjdkmpebifdelclimjfaackjhiglpc) (ClayCodes) | Chrome extension | 100,000 · 3.5 (112) | Free; Pro subscription · proprietary | Type a tag like `<<5:00->>` on a slide and it counts down there | The audience sees it; a timer per slide |
| [Slides Timer Add-on](https://workspace.google.com/marketplace/app/slides_timer_addon/420799124011) | Add-on | 338K+ installs · 3.6 (18) | Free and paid features · not stated | Inserts those tags for you; works with the Slides Timer extension | Same as above |
| [Timer for Google Slides](https://chromewebstore.google.com/detail/illohafojpagagkmcldmcckjndfclnjd) (Learninglab) | Chrome extension | 5,000 · 4.5 (4) | Free · not stated | A floating timer you drag over the slide, with presets | The audience sees it |
| [SlidePace](https://chromewebstore.google.com/detail/dchbmbjjgcdjkhkkmebpnbhgegchobca) | Chrome extension | 12 · no ratings | €12/year or €39 once · proprietary | A corner timer that turns orange, then red when you're over; add or take a minute | Shows to the audience by default, with an option for the presenter only |
| [Showmaster](https://workspace.google.com/marketplace/app/showmaster/580658689613) | Add-on + extension | 19K+ installs · 4.3 (12) | Free and paid features · not stated | A countdown, music and a frame before the talk and during breaks | For the time around the talk |
| [EDUwidgets](https://chromewebstore.google.com/detail/icghojljcmcjgmeihliiajigpgkkljaa) | Chrome extension | 771 · 5.0 (5) | Free · not stated | A floating timer, traffic light and name picker over any site; no account, everything in the browser | For classrooms, seen by everyone |

Smaller timers that also show on the slide: [Slidetime](https://github.com/fyrot/slidetime), [Live Slides Timer](https://chromewebstore.google.com/detail/dlhbmoonnaipppbcdechfbkooljfopcn), [Visual Timer for Google Slides](https://chromewebstore.google.com/detail/fnnbpemcahjlhihddlnbhlfnimbccghc), [Presentation Pacemaker](https://github.com/opt-tech/okkake-timer) (a cat chasing a mouse shows your pace), [Countdown Timers for Google Slides™](https://chromewebstore.google.com/detail/dbkaffncfbfhcmfgnmcdjpoljnhknhab), [Slides Timer (dpappo)](https://chromewebstore.google.com/detail/olmccfpmlekjekpcimoongaekidkoahb), [google-slides-timer-chrome](https://github.com/duckwaresoft/google-slides-timer-chrome), [Timer for Google Slides (Cahier Digital)](https://chromewebstore.google.com/detail/hlboijiillpahconjibboaamnienkghb), [Meeting Timer for Google Slides](https://github.com/ashual/meeting-timer-overlay), and on GitHub only, [slide-timer](https://github.com/takoratta/slide-timer) and [slides-speaker-timer](https://github.com/ischlag/slides-speaker-timer) (per slide).

## Speaker notes and teleprompters

| Project | Kind | Users · rating | Price · license | How it works | Compared with Slides Companion |
|---|---|---|---|---|---|
| **Slides Companion** | Chrome extension | new | Free · GPL-3.0 | Your notes in a picture-in-picture window that floats over the full-screen slideshow and follows it; zoom the notes, or move the window to another screen | Works with one screen, while the slideshow is full screen; left out when you share only the slideshow's tab |
| [HumDocs](https://chromewebstore.google.com/detail/jphhlejhlbepeokpeamjefdciccopjap) | Chrome extension | 80 · 4.8 (5) | Free trial, then a one-time Pro · proprietary | Notes in a picture-in-picture window that stays above the full-screen slideshow; a class timer on the slide; can follow your voice | Similar idea, with more extras; Pro is paid |
| [NotesPrompter](https://chromewebstore.google.com/detail/dpgbpmpogejhbfdekndmpbpcgddiaehf) | Chrome extension | 81 · 5.0 (1) | Free · not stated | Turns presenter view's notes into a scrolling teleprompter, with a mirror mode | Inside presenter view |
| [SyncVocal](https://chromewebstore.google.com/detail/liodlhlcmfcknefddjejcmikmflklppp) | Chrome extension | 85 · no ratings | Free; its AI writing help needs an account · not stated | A floating prompter with your notes that scrolls, and changes slides, as you speak | Follows your voice |
| [FlexSlide Preview](https://chromewebstore.google.com/detail/jebfaphckighncnfnjmllmihgkcpgnnn) | Chrome extension | 11 · no ratings | Free · not stated | Resizes presenter view's slide previews | Adjusts presenter view |
| [gslides-betternotes-extension](https://github.com/daattali/gslides-betternotes-extension) | Extension (unpacked) | 22★ on GitHub | Free · MIT | Bigger, resizable notes in presenter view | No longer in the store; last changed in 2020 |
| [Presenter View Shortcut](https://github.com/BatNew2/presenter-view-webextension) | Extension (unpacked) | 0★ on GitHub | Free · no license | <kbd>F4</kbd> opens presenter view, with the slideshow full screen on a second monitor | For two screens |

Phone remotes ([below](#remotes)) also show your notes on the phone.

## Remotes

Change slides from your phone or another device. Most need a server, or a second device, to connect, which is why Slides Companion doesn't have one.

| Project | Kind | Users · rating | Price · license | How it works |
|---|---|---|---|---|
| [Remote for Slides](https://chromewebstore.google.com/detail/pojijacppbhikhkmegdoechbfiiibppi) | Chrome extension + website | 100,000 · 4.5 (137) | Free (donations) · not stated | Pair your phone with a 6-digit code; notes, a timer and YouTube control on the phone. Connects through a Firebase server |
| [Copresent](https://chromewebstore.google.com/detail/bbfdjjkhcmdpcjodlhnaijoionkjpiae) | Chrome extension + service | 893 · 5.0 (5) | Free for 5 presentations a month; Pro $4/month · proprietary | A phone remote with the live slide and notes, a countdown, audience Q&A; co-presenters join by link |
| [Searchlight Remote for Google Slides](https://chromewebstore.google.com/detail/mhpohiaafkokgdhoapjhmplecibolkod) | Chrome extension | 1,000 · 3.7 (14) | Free · not stated | A phone remote that connects straight to the browser once a public server introduces them, with a spotlight pointer |
| [Internet Clicker for Slides](https://chromewebstore.google.com/detail/klcibacejfbhiohpkiokjikicocnfbom) | Chrome extension | 1,000 · 3.0 (4) | Not stated | A remote from any browser, with notes and a slide preview |
| [Clikr](https://chromewebstore.google.com/detail/oalndbmcbpchbbognlpkdafainaimhdk) | Chrome and Firefox extension | 129 · no ratings | Free; one-time Pro · proprietary | A phone clicker and laser; Pro adds a timer, spotlight, notes on the phone, magnifier and drawing |
| [Web Presentation Clicker](https://chromewebstore.google.com/detail/mnkkbdgkehfhenamhggdljdmlpdpjmom) ([code](https://github.com/web-presentation-clicker)) | Chrome and Firefox extension | 50 · no ratings | Free · GPL-3.0, server AGPL-3.0 | A phone remote by QR code; you can host its server yourself |
| [Gesture Presenter](https://chromewebstore.google.com/detail/pdfpddkehgjilojkjcekjbfkoleclkkb) ([code](https://github.com/AnonymousAAArdvark/GesturePresenter)) | Chrome extension + website | 257 · 5.0 (5) | Free · MIT | Hand gestures, seen by a second device's camera, change slides |
| [Gestello](https://chromewebstore.google.com/detail/gdfihgdgldknehkkdbappmcjpphefici) | Chrome extension | 18 · 5.0 (5) | Free · not stated | Webcam gestures change slides, recognised on your computer |
| [mobslide](https://github.com/thewh1teagle/mobslide) | Desktop app | 492★ on GitHub | Free · not stated | Your phone becomes a remote for the computer |
| [Share Google Slides Control](https://chromewebstore.google.com/detail/dlkklgmnbhdpfnnndfiklcdllimifedf) ([code](https://github.com/LostInBrittany/share-google-slides-control)) | Chrome extension | 54 · no ratings | Free · not stated | Several speakers share control of one deck |
| [PowerSlides](https://chromewebstore.google.com/detail/lkacinimpogfdenkkipehipbmmlamfml) | Chrome extension | 187 · no ratings | Not stated | Remote and notes on a phone or smart glasses |
| [PitchBoost](https://chromewebstore.google.com/detail/cepdilplefohchhebaocbnnbnadhfmhj) | Chrome extension | 98 · no ratings | Not stated | Remote and notes on smart glasses |
| [CueCard](https://chromewebstore.google.com/detail/mfphcgcbbahhahofibnenonbgjnabamg) | Chrome extension | 88 · no ratings | Not stated | Sends your notes to the CueCard desktop app |

## Live edits and signage

Make changes to a deck reach a screen that's already showing it, like an office TV.

| Project | Kind | Users · rating | Price · license | How it works | Compared with Slides Companion |
|---|---|---|---|---|---|
| **Slides Companion** | Chrome extension | new | Free · GPL-3.0 | Edits by anyone reach a running slideshow, within seconds: right away, once you've moved on from the slide, or at the next slideshow | The real slideshow keeps going, with its animations and clicker |
| [Live Present Slides](https://chromewebstore.google.com/detail/fgnaekpcnnenhhdnkidokjmogogjbkkm) ([code](https://github.com/randylubin/Live-Present-Slides)) | Chrome and Firefox extension | 2,000 · 2.2 (6) | Free · MIT on Firefox | Hides the editor's toolbars so the editor looks like a slideshow; edits show because it's the editor | No slideshow: no animations, transitions or clicker |
| [Full Screen for Google Slides™](https://chromewebstore.google.com/detail/kepghmionbgdajcmmckifnfcdcgpbjah) | Chrome extension | 10,000 · 3.9 (7) | Not stated | The editor full screen, for showing an editable deck on calls | Similar to the above, per its listing |
| [GSlide Presenter](https://chromewebstore.google.com/detail/dcjobceelhgfipdaoceboakbdpmomloa) | Chrome extension | 129 · no ratings | Not stated | Switches a tab between the editor and the slideshow | Edits show once you switch back to the slideshow |
| [AutoSlides](https://github.com/pfelipm/autoslides) | Apps Script web app | 19★ on GitHub | Free · GPL-3.0 | Plays a published deck and reloads it on a schedule | Waits for "Publish to the web" to update |
| [IRT-Signage](https://github.com/TylerToomey/IRT-Signage-Chrome-Extension) | Extension (unpacked) | 1★ on GitHub | Free · not stated | Reloads a published deck on each loop | Manifest V2; one deck written into the code |

Digital signage services, like EasySignage or Yodeck, also play Slides decks from their "Publish to the web" link, so they update when Google refreshes it.

## Downloading images

| Project | Kind | Users · rating | Price · license | How it works | Compared with Slides Companion |
|---|---|---|---|---|---|
| **Slides Companion** | Chrome extension | new | Free · GPL-3.0 | Right-click an image › Download image, or from the spotlight; saves the image as it was added to the deck | One image at a time |
| [Google Slides & Docs - Download Image](https://chromewebstore.google.com/detail/afeblchodacmkncajakgjhfobkpbadnd) | Chrome extension | 40,000 · 4.6 (41) | Free · proprietary | Right-click › Download image, in Slides and Docs | Also in Docs |
| [Google Docs Image Zoom](https://chromewebstore.google.com/detail/jpbamfkmnggnnkeipgnomogpdclocibk) | Chrome and Firefox extension | 10,000 · 4.7 (49) | Free · MIT on Firefox | A gallery of a file's images, to preview, zoom, copy, or download one or all as a ZIP | All of a file's images at once |
| [Google Slides & Docs downloader, Extractor & Zoom](https://chromewebstore.google.com/detail/fbpcbgccoedlioejeiineobjmnpdfhkm) | Chrome extension | 4,000 · 3.9 (15) | Not stated | Download all images as a ZIP or one at a time, with a zoom view | All of a file's images at once |
| [Download Images for Google Slides™](https://chromewebstore.google.com/detail/bfaehegmbkamncaloejnhhjceimbgbdg) | Chrome extension | 72 · no ratings | Not stated | Right-click to download | |
| [Accio Imago](https://chromewebstore.google.com/detail/geiiegcdagboeemhdlombhmapghbfbce) ([code](https://github.com/weirdfisheslab/accio-imago)) | Chrome extension | 61 · no ratings | Not stated | A mode where clicking an image downloads it | |

## Audience interaction

Polls, quizzes and questions from the audience, by far the most-installed kind of Slides tool. They all run on their own servers, with an account, so they're outside what Slides Companion does. Slides itself has [Audience Q&A](https://support.google.com/docs/answer/6386827).

| Project | Kind | Installs or users · rating | Price · account |
|---|---|---|---|
| [Pear Deck](https://workspace.google.com/marketplace/app/pear_deck_for_google_slides_addon/363332900703) | Add-on | 81M+ installs · 4.3 (1,916) | Free and paid plans |
| [Nearpod](https://workspace.google.com/marketplace/app/nearpod/501359647293) | Add-on | 58M+ installs · 4.1 (888) | Needs a paid Nearpod license |
| [Slido](https://workspace.google.com/marketplace/app/slido_for_google_slides/240609050747) (and its [extension](https://chromewebstore.google.com/detail/dhhclfjehmpacimcdknijodpjpmppkii)) | Add-on + extension | 10M+ installs · 4.2 (262); extension 300,000 · 4.6 (20) | Free with paid features |
| [Poll Everywhere](https://chromewebstore.google.com/detail/jeehnidbmlhpkncbplipfalpjkhlokaa) | Chrome extension | 200,000 · 3.4 (75) | Account needed |
| [Live Polls Maker](https://workspace.google.com/marketplace/app/live_polls_maker_create_interactive_pres/964324417500) | Add-on + extension | 1M+ installs · 4.4 (72) | Free |
| [Wayground](https://workspace.google.com/marketplace/app/wayground_for_google_slides/533822536351) | Add-on | 1M+ installs · 3.5 (12) | Free with paid features |
| [AhaSlides](https://workspace.google.com/marketplace/app/ahaslides_quiz_live_polls_word_clouds_mo/362095682738) | Add-on | 388K+ installs · 4.2 (17) | Free with paid features |
| [Wooclap](https://chromewebstore.google.com/detail/kllodkcffkaonlilejggleoiiceemdlk) | Chrome and Firefox extension | 9,000 · 4.4 (35) | Account needed |
| [Storm by Kahoot](https://workspace.google.com/marketplace/app/storm_by_kahoot/377825748554) | Add-on | 11K+ installs · no ratings | Free |
| [ClassPoint](https://workspace.google.com/marketplace/app/classpoint_for_google_slides/575473940983) | Add-on | 9K+ installs · no ratings | Free |

## Captions

Slides has [live captions](https://support.google.com/docs/answer/9109474) of its own.

| Project | Kind | Users · rating | Price | How it works |
|---|---|---|---|---|
| [Live Classroom Captions](https://chromewebstore.google.com/detail/oegcniipgmflghlppicffjmbbpeibeee) | Chrome extension | 53 · 5.0 (1) | 10-day trial, then from $6/month | Live captions translated into 130+ languages, through its server |
| [Slides Captions](https://chromewebstore.google.com/detail/clhfnkgkjapoielpcakpkelmekloaoji) | Chrome extension | 106 · 5.0 (1) | Free | Restyles Slides' own captions: more lines, font and colours |

## Other presentation apps

PowerPoint's presenter view already has a pen and laser, zooming into part of a slide, and subtitles ([Microsoft Support](https://support.microsoft.com/en-us/office/4de90e28-487e-435c-9401-eb49a3801257)). Several of Slides Companion's features bring Slides closer to that.

## What Slides Companion doesn't do

So you know when to reach for something else:

- **A phone remote, or notes on your phone.** That needs a server to connect the two; see [Remotes](#remotes). A regular presentation clicker works.
- **Polls, quizzes, or Q&A beyond Slides' own.** See [Audience interaction](#audience-interaction).
- **A timer the audience sees, or a timer per slide.** See [Timers](#timers).
- **New drawing tools, or drawing on other websites.** It keeps Slides' own pen drawings; see [Drawing](#drawing-and-laser-pointers).
- **Recording, or captions.**
- **Firefox or Safari.** It's for Chrome, and browsers built on Chrome.

## Adding a project

Know a project that belongs here? [Open an issue](https://github.com/jpesce/slides-companion/issues) or a pull request with its link. Please keep this page fair: what each project does well, in its own words where we can't check.

Google Slides is a trademark of Google LLC. Slides Companion is not made or endorsed by Google, and every other name here belongs to its owner.
