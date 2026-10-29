HOW TO RUN
  Open a terminal in this folder and run:  python3 -m http.server 8000
  then visit http://localhost:8000

WHERE TO SWAP THINGS
  app.js  -> CONFIG block at the top: characters/positions (x,y are 0-1 across the map), decor,
             dot coordinates, background image, map size (worldScale), coloring page, palette, audio.
  assets/art/world-bg.jpg        the pannable background (same aspect ratio as your original works best)
  assets/characters/*.png        characters + grass
  assets/logo/logo-dark.png + logo-light.png   your logo (dark shows on light pages, light on the Play page)
  assets/icons/sound-on.png, sound-off.png
  assets/art/coloring-page.png   transparent-background line art works best
  assets/art/ector-outline.png   revealed after connect-the-dots
  style.css -> :root variables at the top, and body.is-play for the Play page colors
