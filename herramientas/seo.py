#!/usr/bin/env python3
"""1718 · lo que ven Google y los demás buscadores (26 nov 2026; dueño: «indexa la web en Google y hazle el SEO perfecto para que
aparezca en el buscador bien organizada y que pase las pruebas de velocidad»).

La portada tiene una dirección por idioma, y cada una llega ya escrita en el suyo, para que cada buscador enseñe a cada persona la
suya y para que se pinte en el acto (antes, en inglés, los textos esperaban a que js/idioma.js los tradujera: en un móvil lento,
un segundo más):
  · https://www.house1718.com/es/  en español: es/index.html. ES EL ORIGINAL: la portada se edita ahí.
  · https://www.house1718.com/     en inglés: index.html. SALE DE AQUÍ: es/index.html con cada texto data-t en el inglés de
                                    js/idioma.js (y sus placeholder, aria-label y enlaces). No se edita a mano.
Aquí están también los títulos, las descripciones, las etiquetas para compartir, los datos estructurados (schema.org, JSON-LD) y el
mapa del sitio con la versión de cada idioma. No hace falta ejecutarlo a mano: lo llama herramientas/huellas.py al final, después de
poner las huellas en es/index.html (así la inglesa las lleva iguales). Necesita node, para leer los diccionarios de js/idioma.js.
Los textos siguen las reglas de la web: «encriptado», nada de cifras inventadas ni de promesas absolutas, los precios del dueño.
"""
import datetime, json, pathlib, re, subprocess
from html.parser import HTMLParser

raiz = pathlib.Path(__file__).resolve().parent.parent
WEB = 'https://www.house1718.com/'
INICIO, FIN = '<!-- seo:inicio -->', '<!-- seo:fin -->'
AVISO = ("<!-- GENERADA por herramientas/seo.py a partir de es/index.html (la portada en español, la que se edita) y del inglés de "
         "js/idioma.js. No se edita a mano: se pierde al publicar. -->")

TEXTOS = {
    'en': dict(
        url=WEB, locale='en_US', otro_locale='es_LA',
        titulo='1718 · Private video calls with post-quantum encryption',
        descripcion='Private video calls in your browser, end-to-end encrypted with post-quantum cryptography. '
                    'No downloads, no account, no phone number: just send a link.',
        og_descripcion='End-to-end encrypted video calls in your browser, with post-quantum cryptography. '
                       'No downloads, no account, no phone number.',
        imagen_alt='1718 · private video calls with post-quantum encryption',
        app_descripcion='Private video calls in the browser with post-quantum end-to-end encryption. You invite with a link: '
                        'no downloads, no account and no phone number. Pay only for the time you talk.',
        funciones=['Hybrid post-quantum end-to-end encryption: ML-KEM-1024 + ECDH P-384, with ML-DSA-87 + ECDSA P-384 signatures',
                   'Encrypted chat, voice notes, photos and files during the call',
                   'No account and no phone number', 'No downloads: it runs in Safari and Chrome',
                   'Nothing stored: the conversation is erased when you hang up', 'Open source (AGPL-3.0)'],
        oferta1='1 hour of calls', oferta5='5 hours of calls',
    ),
    'es': dict(
        url=WEB + 'es/', locale='es_LA', otro_locale='en_US',
        titulo='1718 · Videollamadas privadas con encriptado poscuántico',
        descripcion='Videollamadas privadas en tu navegador, encriptadas de extremo a extremo con criptografía poscuántica. '
                    'Sin descargas, sin cuenta ni número de teléfono: solo un enlace.',
        og_descripcion='Videollamadas encriptadas de extremo a extremo en tu navegador, con criptografía poscuántica. '
                       'Sin descargas, sin cuenta ni número de teléfono.',
        imagen_alt='1718 · videollamadas privadas con encriptado poscuántico',
        app_descripcion='Videollamadas privadas en el navegador con encriptado poscuántico de extremo a extremo. Se invita con un '
                        'enlace: sin descargas, sin cuenta y sin número de teléfono. Pagas solo el tiempo que hablas.',
        funciones=['Encriptado poscuántico híbrido de extremo a extremo: ML-KEM-1024 + ECDH P-384, con firmas ML-DSA-87 + ECDSA P-384',
                   'Chat, notas de voz, fotos y archivos encriptados durante la llamada',
                   'Sin cuenta y sin número de teléfono', 'Sin descargas: funciona en Safari y en Chrome',
                   'Nada guardado: la conversación se borra al colgar', 'Código abierto (AGPL-3.0)'],
        oferta1='1 hora de llamadas', oferta5='5 horas de llamadas',
    ),
}

# las páginas legales: cada una con su pareja en el otro idioma (en, es)
LEGALES = [('terms.html', 'terminos.html'), ('privacy.html', 'privacidad.html'), ('refunds.html', 'reembolsos.html')]


def datos(l):
    t = TEXTOS[l]
    oferta = lambda nombre, precio: {'@type': 'Offer', 'name': nombre, 'price': precio, 'priceCurrency': 'USD',
                                      'url': t['url'] + '#precios', 'availability': 'https://schema.org/InStock'}
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {'@type': 'Organization', '@id': WEB + '#organizacion', 'name': 'GUARDIANA GROUP S.A.S.', 'url': WEB,
             'logo': {'@type': 'ImageObject', 'url': WEB + 'img/app/icono-512.png', 'width': 512, 'height': 512},
             'brand': {'@type': 'Brand', 'name': '1718'},
             'address': {'@type': 'PostalAddress', 'addressLocality': 'Cartagena de Indias', 'addressCountry': 'CO'},
             'contactPoint': {'@type': 'ContactPoint', 'email': 'hola@guardianagroup.com', 'contactType': 'customer support',
                              'availableLanguage': ['English', 'Spanish']},
             'sameAs': ['https://x.com/1718calls']},
            {'@type': 'WebSite', '@id': WEB + '#web', 'name': '1718', 'alternateName': 'house1718', 'url': WEB,
             'inLanguage': ['en', 'es'], 'publisher': {'@id': WEB + '#organizacion'}},
            {'@type': 'WebPage', '@id': t['url'] + '#pagina', 'url': t['url'], 'name': t['titulo'], 'description': t['descripcion'],
             'inLanguage': l, 'isPartOf': {'@id': WEB + '#web'}, 'about': {'@id': WEB + '#app'},
             'primaryImageOfPage': {'@type': 'ImageObject', 'url': WEB + 'img/1718.jpg', 'width': 1200, 'height': 630}},
            {'@type': 'WebApplication', '@id': WEB + '#app', 'name': '1718', 'url': t['url'], 'inLanguage': l,
             'applicationCategory': 'CommunicationApplication', 'applicationSubCategory': 'Video calling',
             'operatingSystem': 'Windows, macOS, Linux, iOS, Android', 'browserRequirements': 'Safari or Chrome, up to date',
             'description': t['app_descripcion'], 'featureList': t['funciones'], 'image': WEB + 'img/1718.jpg',
             'offers': [oferta(t['oferta1'], '5.00'), oferta(t['oferta5'], '25.00')],
             'publisher': {'@id': WEB + '#organizacion'}},
        ],
    }


def esc(x):
    return x.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')


def bloque(l):
    t = TEXTOS[l]
    ld = json.dumps(datos(l), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    return '\n'.join([
        INICIO,
        f'<title>{esc(t["titulo"])}</title>',
        f'<meta name="description" content="{esc(t["descripcion"])}">',
        '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">',
        f'<link rel="canonical" href="{t["url"]}">',
        f'<link rel="alternate" hreflang="en" href="{WEB}">',
        f'<link rel="alternate" hreflang="es" href="{WEB}es/">',
        f'<link rel="alternate" hreflang="x-default" href="{WEB}">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="1718">',
        f'<meta property="og:url" content="{t["url"]}">',
        f'<meta property="og:title" content="{esc(t["titulo"])}">',
        f'<meta property="og:description" content="{esc(t["og_descripcion"])}">',
        f'<meta property="og:image" content="{WEB}img/1718.jpg">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{esc(t["imagen_alt"])}">',
        f'<meta property="og:locale" content="{t["locale"]}">',
        f'<meta property="og:locale:alternate" content="{t["otro_locale"]}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<script type="application/ld+json">{ld}</script>',
        FIN,
    ])


def pon_bloque(html, l):
    if INICIO not in html or FIN not in html:
        raise SystemExit('es/index.html no tiene las marcas ' + INICIO + ' … ' + FIN)
    a, b = html.index(INICIO), html.index(FIN) + len(FIN)
    return html[:a] + bloque(l) + html[b:]


def diccionarios():
    """El inglés (EN) y el español que solo dice el código (ES_MAS), tal cual están en js/idioma.js."""
    js = (raiz / 'js' / 'idioma.js').read_text(encoding='utf-8')
    a, b, c = js.index('const ES_MAS = '), js.index('const EN = '), js.index('const TITULO = ')
    es_mas = js[a + len('const ES_MAS = '):b]
    en = js[b + len('const EN = '):c]
    fuente = '({ES_MAS: ' + es_mas[:es_mas.rindex('}') + 1] + ', EN: ' + en[:en.rindex('}') + 1] + '})'
    lee = "let s='';process.stdin.on('data',(d)=>{s+=d;}).on('end',()=>{process.stdout.write(JSON.stringify(eval(s)));});"
    try:
        r = subprocess.run(['node', '-e', lee], input=fuente, capture_output=True, text=True, check=True)
    except FileNotFoundError:
        raise SystemExit('seo.py necesita node para leer js/idioma.js')
    except subprocess.CalledProcessError as e:
        raise SystemExit('seo.py no ha podido leer los diccionarios de js/idioma.js:\n' + e.stderr[-800:])
    d = json.loads(r.stdout)
    return d['ES_MAS'], d['EN']


VACIOS = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'param'}


class Lector(HTMLParser):
    """Lee la portada y apunta, con su posición exacta en el texto, cada etiqueta con algo que traducir y lo que hay dentro."""

    def __init__(self, texto):
        super().__init__(convert_charrefs=False)
        self.texto, self.lineas = texto, [0] + [m.end() for m in re.finditer('\n', texto)]
        self.pila, self.etiquetas, self.dentros, self.fallos = [], [], [], []
        self.feed(texto)
        self.close()
        if self.pila:
            self.fallos.append('sin cerrar: ' + ', '.join(x[0] for x in self.pila))

    def pos(self):
        l, c = self.getpos()
        return self.lineas[l - 1] + c

    def apunta(self, tag, attrs):
        a = dict(attrs)
        if any(k in a for k in ('data-t', 'data-t-placeholder', 'data-t-aria', 'data-href-en', 'data-idioma')):
            ini = self.pos()
            self.etiquetas.append((ini, ini + len(self.get_starttag_text()), a))
        return a

    def handle_starttag(self, tag, attrs):
        a = self.apunta(tag, attrs)
        if tag in VACIOS:
            return
        ini = self.pos() + len(self.get_starttag_text())
        self.pila.append((tag, ini, a.get('data-t')))

    def handle_startendtag(self, tag, attrs):
        self.apunta(tag, attrs)

    def handle_endtag(self, tag):
        for i in range(len(self.pila) - 1, -1, -1):
            if self.pila[i][0] == tag:
                if i != len(self.pila) - 1:
                    self.fallos.append(f'cierre implícito de {[x[0] for x in self.pila[i + 1:]]} en {self.getpos()}')
                _, ini, clave = self.pila[i]
                if clave:
                    self.dentros.append((ini, self.pos(), clave))
                del self.pila[i:]
                return
        self.fallos.append(f'</{tag}> sin abrir en {self.getpos()}')


def atributo(etiqueta, nombre, valor):
    """La etiqueta de apertura con ese atributo puesto a ese valor (lo cambia si estaba; si no, lo añade)."""
    nuevo = f' {nombre}="{esc(valor)}"'
    patron = re.compile(r'\s' + re.escape(nombre) + r'="[^"]*"')
    if patron.search(etiqueta):
        return patron.sub(lambda _: nuevo, etiqueta, count=1)
    if re.search(r'\s' + re.escape(nombre) + r'(\s|=|>|/)', etiqueta):
        raise SystemExit(f'seo.py: {nombre} sin comillas dobles en {etiqueta[:120]}')
    fin = len(etiqueta) - (2 if etiqueta.endswith('/>') else 1)
    return etiqueta[:fin].rstrip() + nuevo + etiqueta[fin:]


def en_ingles(es):
    """La portada en inglés: lo mismo que hace js/idioma.js al pulsar EN, hecho de antemano."""
    ES_MAS, EN = diccionarios()
    p = Lector(es)
    if p.fallos:
        raise SystemExit('seo.py: es/index.html está mal cerrada: ' + '; '.join(p.fallos[:5]))
    # el español de la página, como lo arma idioma.js (los textos, luego los placeholder, luego lo que solo dice el código)
    ES = {}
    for ini, fin, clave in sorted(p.dentros):
        ES.setdefault(clave, es[ini:fin])
    for _, _, a in p.etiquetas:
        if 'data-t-placeholder' in a:
            ES.setdefault(a['data-t-placeholder'], a.get('placeholder') or '')
    for k, v in ES_MAS.items():
        ES.setdefault(k, v)
    t = lambda k: EN.get(k) or ES.get(k) or k
    faltan = sorted({c for _, _, c in p.dentros if not EN.get(c)})
    if faltan:
        print('seo: sin inglés en js/idioma.js (se queda en español):', ', '.join(faltan))
    cambios = []  # (desde, hasta, texto nuevo), sin solaparse
    textos = [(ini, fin, t(clave)) for ini, fin, clave in p.dentros if t(clave) != es[ini:fin]]
    for ini, fin, a in p.etiquetas:
        # lo que va dentro de un texto que se cambia entero ya viene en el inglés (como al pulsar EN: idioma.js cambia antes los textos)
        if any(x <= ini < y for x, y, _ in textos):
            continue
        e = es[ini:fin]
        if 'data-t-placeholder' in a:
            e = atributo(e, 'placeholder', t(a['data-t-placeholder']))
        if 'data-t-aria' in a:
            k = a['data-t-aria']
            e = atributo(e, 'aria-label', EN.get(k) or ES.get(k) or a.get('aria-label') or k)
        if 'data-href-en' in a:
            if 'data-href-es' not in a:
                e = atributo(e, 'data-href-es', a.get('href') or '')
            e = atributo(e, 'href', a['data-href-en'])
        if 'data-idioma' in a:
            e = atributo(e, 'aria-pressed', 'true' if a['data-idioma'] == 'en' else 'false')
        if e != es[ini:fin]:
            cambios.append((ini, fin, e))
    cambios += textos
    cambios.sort()
    for (a1, b1, _), (a2, _, _) in zip(cambios, cambios[1:]):
        if a2 < b1:
            raise SystemExit(f'seo.py: dos cambios se pisan en la posición {a2}')
    trozos, ultimo = [], 0
    for ini, fin, nuevo in cambios:
        trozos += [es[ultimo:ini], nuevo]
        ultimo = fin
    en = ''.join(trozos) + es[ultimo:]
    q = Lector(en)
    if q.fallos:
        raise SystemExit('seo.py: la portada en inglés ha salido mal cerrada: ' + '; '.join(q.fallos[:5]))
    return en


def genera():
    hoy = datetime.date.today().isoformat()
    f_es = raiz / 'es' / 'index.html'
    es = f_es.read_text(encoding='utf-8')
    # la portada en español (el original): su cabecera y su idioma
    es2 = re.sub(r'<html[^>]*>', '<html lang="es" data-idioma-pagina="es">', pon_bloque(es, 'es'), count=1)
    if es2 != es:
        f_es.write_text(es2, encoding='utf-8')
    # la portada en inglés: sale de la española
    en = en_ingles(es2)
    en = re.sub(r'<html[^>]*>', '<html lang="en">', pon_bloque(en, 'en'), count=1)
    if not en.startswith('<!doctype html>\n'):
        raise SystemExit('seo.py: es/index.html tiene que empezar por <!doctype html>')
    en = en.replace('<!doctype html>\n', '<!doctype html>\n' + AVISO + '\n', 1)
    (raiz / 'index.html').write_text(en, encoding='utf-8')
    # las páginas legales: además de su pareja, la versión por defecto (la inglesa) para quien no habla ninguno de los dos
    for p_en, p_es in LEGALES:
        for pag in (p_en, p_es):
            g = raiz / pag
            s = g.read_text(encoding='utf-8')
            if 'hreflang="x-default"' not in s:
                s = s.replace(f'<link rel="alternate" hreflang="en" href="{WEB}{p_en}">\n',
                              f'<link rel="alternate" hreflang="en" href="{WEB}{p_en}">\n'
                              f'<link rel="alternate" hreflang="x-default" href="{WEB}{p_en}">\n', 1)
                g.write_text(s, encoding='utf-8')
    # el mapa del sitio, con la versión de cada idioma
    urls = [('', 'es/', '')] + [(p_en, p_es, p_en) for p_en, p_es in LEGALES]
    filas = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for p_en, p_es, defecto in urls:
        for loc in (p_en, p_es):
            filas += [f'  <url><loc>{WEB}{loc}</loc><lastmod>{hoy}</lastmod>',
                      f'    <xhtml:link rel="alternate" hreflang="en" href="{WEB}{p_en}"/>',
                      f'    <xhtml:link rel="alternate" hreflang="es" href="{WEB}{p_es}"/>',
                      f'    <xhtml:link rel="alternate" hreflang="x-default" href="{WEB}{defecto}"/></url>']
    filas.append('</urlset>')
    (raiz / 'sitemap.xml').write_text('\n'.join(filas) + '\n', encoding='utf-8')
    print('seo: es/index.html (español, el original), index.html (inglés, generada), páginas legales y sitemap.xml')


if __name__ == '__main__':
    genera()
