#!/usr/bin/env python3
"""Elixire · pone en index.html la huella SHA-384 (Subresource Integrity) de cada script y hoja de estilo propios.
El navegador no ejecuta ninguno que no coincida con su huella. Se ejecuta antes de cada publicación:
    python3 herramientas/huellas.py
"""
import base64, hashlib, pathlib, re, sys
raiz = pathlib.Path(__file__).resolve().parent.parent
def pon(m):
    etiqueta, atributo, url = m.group(0), m.group(1), m.group(2)
    ruta = url.split('?')[0]
    if ruta.startswith(('http:', 'https:', '//')) or not (raiz / ruta).is_file():
        return etiqueta
    etiqueta = re.sub(r'\s+integrity="[^"]*"', '', etiqueta)
    return etiqueta.replace(f'{atributo}="{url}"', f'{atributo}="{url}" integrity="{huella(ruta)}"', 1)
def huella(ruta):
    datos = (raiz / ruta).read_bytes()
    return 'sha384-' + base64.b64encode(hashlib.sha384(datos).digest()).decode()
# index.html y pago.html (la vuelta del pago, 25 nov 2026)
for pagina in ('index.html', 'pago.html'):
    f = raiz / pagina
    if not f.is_file():
        continue
    html = f.read_text(encoding='utf-8')
    nuevo = re.sub(r'<script[^>]*\b(src)="([^"]+)"[^>]*>', pon, html)
    nuevo = re.sub(r'<link[^>]*rel="stylesheet"[^>]*\b(href)="([^"]+)"[^>]*>', pon, nuevo)
    if nuevo != html:
        f.write_text(nuevo, encoding='utf-8')
    # /version.txt: la versión publicada (la de las hojas y los scripts de index.html). Las páginas abiertas la miran al cargar y al
    # volver a la pestaña; si es otra, se cargan de nuevo (js/puerta.js), para que nadie se quede con una versión vieja
    if pagina == 'index.html':
        v = re.search(r'css/elixir\.css\?v=([\w-]+)', nuevo)
        if v:
            (raiz / 'version.txt').write_text(v.group(1) + '\n', encoding='utf-8')
    print(pagina + ':')
    print('\n'.join(f'  {a}  {b}' for a, b in re.findall(r'(?:src|href)="([^"]+)" integrity="(sha384-[^"]+)"', nuevo)))
