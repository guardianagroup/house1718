# Elixire · la sala en 3D

`js/sala3d.js` es `fuente/sala3d.js` empaquetado con three.js r187 (MIT, github.com/mrdoob/three.js, etiqueta r187):

    esbuild fuente/sala3d.js --bundle --minify --format=esm --target=es2020 --legal-comments=eof --outfile=js/sala3d.js

(con `node_modules/three` apuntando a esa etiqueta). Sin WebGL, la página enseña la puerta en CSS y todo funciona igual.
