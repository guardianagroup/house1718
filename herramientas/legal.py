#!/usr/bin/env python3
"""Elixire · genera las páginas legales (ES: terminos.html, privacidad.html; EN: terms.html, privacy.html) con la misma plantilla.
Se ejecuta después de cambiar un texto:  python3 herramientas/legal.py  (y luego herramientas/huellas.py)."""
import base64, hashlib, html, pathlib
raiz = pathlib.Path(__file__).resolve().parent.parent
FECHA = {'es': '19 DE NOVIEMBRE DE 2026', 'en': '19 NOVEMBER 2026'}
EMPRESA = 'GUARDIANA GROUP S.A.S.'
NIT = '902.119.954-6'
DIRECCION = {'es': 'Torre Empresarial PRODEGI, Carrera 3 # 9-30, piso 18, Bocagrande, Cartagena de Indias, Colombia',
             'en': 'Torre Empresarial PRODEGI, Carrera 3 # 9-30, 18th floor, Bocagrande, Cartagena de Indias, Colombia'}
CORREO = 'hola@guardianagroup.com'
PAGINAS = {
 'terminos.html': ('es', 'terminos', 'terms.html'), 'privacidad.html': ('es', 'privacidad', 'privacy.html'),
 'terms.html': ('en', 'terminos', 'terminos.html'), 'privacy.html': ('en', 'privacidad', 'privacidad.html'),
}
ENLACE = {'es': {'terminos': 'terminos.html', 'privacidad': 'privacidad.html'}, 'en': {'terminos': 'terms.html', 'privacidad': 'privacy.html'}}
T = {}
T[('es', 'terminos')] = dict(
 titulo='Términos de uso · Elixire', etiqueta='TÉRMINOS DE USO', h1='Términos claros para usar Elixire.',
 intro=f'Elixire es un servicio de videollamadas privadas de {EMPRESA} (NIT {NIT}), con domicilio en Cartagena de Indias, Colombia. Se usa desde el navegador, sin cuenta. Durante la fase de pruebas no se cobra nada.',
 secciones=[
  ('1. Qué es', ['Elixire sirve para hablar por vídeo y para enviar mensajes, notas de voz, fotos y archivos entre las personas de una conversación, encriptados de extremo a extremo en sus navegadores, con una capa poscuántica además del encriptado estándar. Se entra con un enlace de invitación. Al terminar, se borra lo que queda de la conversación en los navegadores.', '«Comprobar» estima, en tu propio equipo, la probabilidad de que la otra persona sea una persona real y en directo.']),
  ('2. Lo que no promete', ['__lista__',
    'Ninguna herramienta garantiza una seguridad total. La encriptación no protege un equipo o un navegador ya comprometidos, ni impide que quien recibe haga capturas, grabe o guarde copias.',
    '«Comprobar» da una estimación, no una certeza: puede equivocarse en los dos sentidos. No es una prueba de identidad. Si te piden dinero, códigos o datos con prisa, cuelga y llama a su número de siempre.',
    'No da anonimato: los servidores que conectan la conversación ven las direcciones IP (lo explica la Política de privacidad).',
    'El servicio puede cambiar, fallar o interrumpirse sin aviso previo. En la fase de pruebas no hay garantía de disponibilidad.']),
  ('3. Uso permitido', ['Usa Elixire para fines legales. No lo uses para acosar, amenazar, estafar o suplantar a nadie, para enviar contenido ilegal ni para atacar o saturar el servicio. Podemos cortar el acceso a quien abuse de él, por ejemplo con un uso automatizado masivo.']),
  ('4. Tu parte', ['Lo que hagas y lo que envíes con Elixire es responsabilidad tuya. Antes de hablar de algo sensible, comparad por otra vía las palabras de seguridad que os muestra Elixire: es lo que acredita que nadie se ha puesto en medio.']),
  ('5. Precio', ['Hoy no se cobra nada. Si Elixire pasa a ser de pago, estos términos dirán antes el precio, la forma de pago y la fecha, y nadie empezará a pagar sin elegirlo.']),
  ('6. Código y reconocimientos', ['El código de esta web se puede leer en github.com/guardianagroup/house1718. Usa, con sus licencias: @noble/post-quantum 0.7.1, @noble/hashes y @noble/curves 2.4.0 (Paul Miller, licencia MIT) para ML-KEM-1024 y ML-DSA-87; face-api.js 0.22.2 y sus modelos (Vincent Mühler, licencia MIT) para «Comprobar»; three.js r187 (licencia MIT) para la escena 3D; y los tipos de letra Inter y Unbounded (SIL Open Font License 1.1). Todo se sirve desde este mismo sitio.', 'Las caras de la videollamada de ejemplo («La nueva amenaza») son de personas que no existen: imágenes generadas por inteligencia artificial, de dominio público, publicadas en Wikimedia Commons.']),
  ('7. Ley aplicable', ['Estos términos se rigen por la ley de Colombia. Si usas Elixire como consumidor, conservas los derechos que te reconozca la ley de tu país.']),
  ('8. Contacto', [f'{EMPRESA} · NIT {NIT} · {DIRECCION["es"]} · {CORREO}']),
 ])
T[('en', 'terminos')] = dict(
 titulo='Terms of use · Elixire', etiqueta='TERMS OF USE', h1='Clear terms for using Elixire.',
 intro=f'Elixire is a private video calling service by {EMPRESA} (Colombian tax ID, NIT {NIT}), based in Cartagena de Indias, Colombia. It runs in the browser, with no account. During the trial phase nothing is charged.',
 secciones=[
  ('1. What it is', ['Elixire lets the people in a conversation talk on video and send messages, voice notes, photos and files, end-to-end encrypted in their browsers, with a post-quantum layer on top of standard encryption. You join with an invitation link. When the conversation ends, what is left of it in the browsers is erased.', '“Check” estimates, on your own device, the probability that the other person is a real person, live.']),
  ('2. What it does not promise', ['__lista__',
    'No tool guarantees total security. Encryption does not protect a device or browser that is already compromised, nor stop the recipient from taking screenshots, recording or keeping copies.',
    '“Check” gives an estimate, not a certainty: it can be wrong both ways. It is not proof of identity. If someone asks for money, codes or data in a hurry, hang up and call their usual number.',
    'It does not make you anonymous: the servers that connect the conversation see IP addresses (see the Privacy policy).',
    'The service may change, fail or be interrupted without notice. During the trial phase there is no availability guarantee.']),
  ('3. Acceptable use', ['Use Elixire for lawful purposes. Do not use it to harass, threaten, defraud or impersonate anyone, to send illegal content, or to attack or overload the service. We may cut off anyone who abuses it, for example through large-scale automated use.']),
  ('4. Your part', ['What you do and send with Elixire is your responsibility. Before discussing anything sensitive, compare the safety words Elixire shows you through another channel: that is what shows nobody is sitting in the middle.']),
  ('5. Price', ['Nothing is charged today. If Elixire becomes a paid service, these terms will state the price, payment method and date beforehand, and nobody will start paying without choosing to.']),
  ('6. Code and credits', ['The code of this website can be read at github.com/guardianagroup/house1718. It uses, under their licences: @noble/post-quantum 0.7.1, @noble/hashes and @noble/curves 2.4.0 (Paul Miller, MIT licence) for ML-KEM-1024 and ML-DSA-87; face-api.js 0.22.2 and its models (Vincent Mühler, MIT licence) for “Check”; three.js r187 (MIT licence) for the 3D scene; and the Inter and Unbounded typefaces (SIL Open Font License 1.1). Everything is served from this same site.', 'The faces in the sample video call (“The new threat”) belong to people who do not exist: AI-generated, public-domain images published on Wikimedia Commons.']),
  ('7. Governing law', ['These terms are governed by the laws of Colombia. If you use Elixire as a consumer, you keep the rights the law of your country gives you.']),
  ('8. Contact', [f'{EMPRESA} · NIT {NIT} · {DIRECCION["en"]} · {CORREO}']),
 ])
T[('es', 'privacidad')] = dict(
 titulo='Política de privacidad · Elixire', etiqueta='POLÍTICA DE PRIVACIDAD', h1='Sin cuenta, sin cookies y sin vender datos.',
 intro='Elixire no te pide nombre, teléfono ni correo, no usa cookies ni analíticas y no vende ni cede datos. Aun así, necesita servidores para que las personas se encuentren y se oigan. Esto es lo que ve cada uno.',
 secciones=[
  ('1. Esta web', ['La web se sirve desde GitHub Pages, de GitHub, Inc. (Estados Unidos). Como cualquier servidor web, GitHub recibe tu dirección IP, tu navegador y la página que pides; lo que guarda lo explica su declaración de privacidad. Las páginas no cargan nada de otras empresas: los tipos de letra, las imágenes y las librerías se sirven desde este mismo sitio.']),
  ('2. Cookies y almacenamiento', ['Elixire no usa cookies. En el almacenamiento de tu navegador guarda solo el idioma que eliges y, si hace falta, una preferencia técnica de conexión. Mientras compartes una invitación, su secreto se guarda en esa pestaña y se borra al entrar en la conversación o al cerrarla. Nada de eso se envía a nadie. Para borrarlo todo, borra los datos del sitio house1718.com en los ajustes de tu navegador.'], 'cookies'),
  ('3. La conversación', ['Los mensajes, las notas de voz, las fotos y los archivos se encriptan en tu navegador, de extremo a extremo. El servidor de GUARDIANA que los transporta (el relé, en Núremberg, Alemania, o en Miami, Estados Unidos) no puede leerlos: ve tu dirección IP, la sala (un identificador sin nombre), las horas y el volumen de datos. No guarda nombres ni claves, y su código no escribe registros: lo que necesita lo tiene en memoria mientras dura la conversación. Si tu red bloquea la conexión, puede pasar por otro servidor de GUARDIANA que solo reenvía esos mismos datos encriptados.', 'La invitación: con el enlace, el secreto de la conversación viaja en la parte del enlace que el navegador no envía a ningún servidor. Si en su lugar se usa un código, el secreto espera en el relé, cerrado con una clave que sale de ese código, como mucho 10 minutos y para un solo uso.', 'Al terminar la conversación se borra en los navegadores lo que quedaba de ella: mensajes, archivos y claves.']),
  ('4. Llamadas y videollamadas', ['Pasan siempre por los servidores de llamadas de GUARDIANA, en Núremberg (Alemania) o en Miami (Estados Unidos). Ven las direcciones IP de quienes hablan, las horas y el volumen, no la imagen ni el sonido, y están configurados sin registros. La imagen y el sonido van encriptados de extremo a extremo y, además, con una capa poscuántica que solo abren los navegadores de la conversación. La cámara y el micrófono solo se usan durante la llamada y con tu permiso.']),
  ('5. «Comprobar»', ['El análisis de la cara, los gestos y la voz se hace entero en tu equipo, sobre la imagen y el sonido que ya te llegan: no se envía ni se guarda nada y la otra persona no ve nada. Lo único que se pregunta a su navegador, por el canal encriptado, es el tipo de cámara que usa (de móvil, física o virtual y, si es un programa de cámara virtual conocido, cuál), nunca el nombre del dispositivo.']),
  ('6. Lo que recibe la otra persona', ['Lo que le envías, tu imagen y tu voz durante la llamada y, si pulsa «Comprobar», el tipo de tu cámara.']),
  ('7. Lo que no hacemos', ['No vendemos ni cedemos datos. No hay publicidad, ni analíticas, ni cuentas, ni perfiles de quien usa Elixire. Hoy no se cobra nada, así que no tratamos datos de pago.']),
  ('8. Si nos escribes', [f'Si escribes a {CORREO}, guardamos ese correo para contestarte y para nada más. Se borra al año de la última respuesta, o antes si lo pides.']),
  ('9. Tus derechos, base legal y reclamaciones', [f'Puedes pedirnos que te digamos qué datos tuyos tenemos, que los corrijamos o que los borremos, escribiendo a {CORREO}. Casi todo lo que explica esta página vive solo en tu navegador o en la memoria de una conversación que ya terminó, así que no existe en ningún sitio donde podamos buscarlo. Tratamos los datos de conexión porque hacen falta para prestarte el servicio que pides, y tu correo, si nos escribes, con tu consentimiento, que puedes retirar cuando quieras. Los servidores de Elixire están en Alemania y en Estados Unidos; GitHub, que sirve la web, en Estados Unidos. Si crees que tratamos mal tus datos, puedes reclamar ante la Superintendencia de Industria y Comercio (Colombia), la AEPD (España) o la autoridad de protección de datos de tu país; antes, escríbenos y lo resolvemos.', f'Responsable: {EMPRESA} (NIT {NIT}), {DIRECCION["es"]}.']),
 ])
T[('en', 'privacidad')] = dict(
 titulo='Privacy policy · Elixire', etiqueta='PRIVACY POLICY', h1='No account, no cookies, no selling data.',
 intro='Elixire does not ask for your name, phone number or email, uses no cookies or analytics, and does not sell or share data. Even so, it needs servers so that people can find and hear each other. This is what each of them sees.',
 secciones=[
  ('1. This website', ['The website is served from GitHub Pages, by GitHub, Inc. (United States). Like any web server, GitHub receives your IP address, your browser and the page you request; what it keeps is explained in its privacy statement. The pages load nothing from other companies: typefaces, images and libraries are served from this same site.']),
  ('2. Cookies and storage', ['Elixire does not use cookies. In your browser’s storage it keeps only the language you choose and, if needed, a technical connection preference. While you are sharing an invitation, its secret is kept in that tab and erased when you join the conversation or close it. None of this is sent to anyone. To erase it all, clear the site data for house1718.com in your browser settings.'], 'cookies'),
  ('3. The conversation', ['Messages, voice notes, photos and files are encrypted in your browser, end to end. The GUARDIANA server that carries them (the relay, in Nuremberg, Germany, or in Miami, United States) cannot read them: it sees your IP address, the room (an anonymous identifier), the times and the amount of data. It keeps no names or keys, and its code writes no logs: what it needs is held in memory while the conversation lasts. If your network blocks the connection, it may go through another GUARDIANA server that only forwards the same encrypted data.', 'The invitation: with the link, the conversation’s secret travels in the part of the link that the browser never sends to any server. If a code is used instead, the secret waits on the relay, locked with a key derived from that code, for at most 10 minutes and for a single use.', 'When the conversation ends, what was left of it in the browsers is erased: messages, files and keys.']),
  ('4. Calls and video calls', ['They always go through GUARDIANA’s call servers, in Nuremberg (Germany) or Miami (United States). These see the IP addresses of the people talking, the times and the volume, not the picture or the sound, and are configured without logs. Picture and sound are end-to-end encrypted and also carry a post-quantum layer that only the browsers in the conversation can open. The camera and microphone are only used during the call and with your permission.']),
  ('5. “Check”', ['The analysis of the face, expressions and voice runs entirely on your device, on the picture and sound you already receive: nothing is sent or stored, and the other person sees nothing. The only thing asked of their browser, over the encrypted channel, is the type of camera they use (phone, physical or virtual and, if it is a known virtual camera program, which one), never the device name.']),
  ('6. What the other person receives', ['What you send, your picture and voice during the call and, if they press “Check”, the type of your camera.']),
  ('7. What we do not do', ['We do not sell or share data. There is no advertising, no analytics, no accounts and no profiles of the people who use Elixire. Nothing is charged today, so we process no payment data.']),
  ('8. If you write to us', [f'If you write to {CORREO}, we keep that email to answer you and for nothing else. It is deleted one year after the last reply, or earlier if you ask.']),
  ('9. Your rights, legal basis and complaints', [f'You can ask us what data of yours we hold, to correct it or to delete it, by writing to {CORREO}. Almost everything on this page lives only in your browser or in the memory of a conversation that has already ended, so it does not exist anywhere we could look for it. We process connection data because it is needed to provide the service you ask for, and your email, if you write to us, with your consent, which you can withdraw at any time. Elixire’s servers are in Germany and the United States; GitHub, which serves the website, in the United States. If you think we handle your data wrongly, you can complain to the Superintendencia de Industria y Comercio (Colombia), the AEPD (Spain) or the data protection authority of your country; first, write to us and we will sort it out.', f'Controller: {EMPRESA} (NIT {NIT}), {DIRECCION["en"]}.']),
 ])
PIE = {'es': dict(terminos='Términos de uso', privacidad='Privacidad', cookies='Cookies', contacto='Contacto', inicio='Volver a Elixire', otro='English'),
       'en': dict(terminos='Terms of use', privacidad='Privacy', cookies='Cookies', contacto='Contact', inicio='Back to Elixire', otro='Español')}
def huella(ruta):
    return 'sha384-' + base64.b64encode(hashlib.sha384((raiz / ruta).read_bytes()).digest()).decode()
def pagina(nombre, lengua, clave, otra):
    d, p, e = T[(lengua, clave)], PIE[lengua], ENLACE[lengua]
    cuerpo = []
    for sec in d['secciones']:
        titulo, parrafos = sec[0], sec[1]; ancla = f' id="{sec[2]}"' if len(sec) > 2 else ''
        cuerpo.append(f'<section{ancla}><h2>{html.escape(titulo)}</h2>')
        if parrafos and parrafos[0] == '__lista__':
            cuerpo.append('<ul>' + ''.join(f'<li>{html.escape(x)}</li>' for x in parrafos[1:]) + '</ul>')
        else:
            cuerpo.extend(f'<p>{html.escape(x)}</p>' for x in parrafos)
        cuerpo.append('</section>')
    css = 'css/legal.css'
    return f'''<!doctype html>
<html lang="{lengua}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(d['titulo'])}</title>
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#06080C">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'">
<link rel="icon" href="img/icono.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="img/app/icono-180.png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="stylesheet" href="{css}?v=1" integrity="{huella(css)}">
</head>
<body>
<header class="cab"><a class="marca" href="./">ELIXIRE</a><a class="otro" href="{otra}" hreflang="{'en' if lengua == 'es' else 'es'}">{p['otro']}</a></header>
<main class="legal">
<span class="etiqueta">{d['etiqueta']} · {FECHA[lengua]}</span>
<h1>{html.escape(d['h1'])}</h1>
<p class="intro">{html.escape(d['intro'])}</p>
{chr(10).join(cuerpo)}
<a class="volver" href="./">{p['inicio']}</a>
</main>
<footer class="pie-legal">
<nav aria-label="Legal"><a href="{e['terminos']}">{p['terminos']}</a><a href="{e['privacidad']}">{p['privacidad']}</a><a href="{e['privacidad']}#cookies">{p['cookies']}</a><a href="mailto:{CORREO}">{p['contacto']}</a></nav>
<p>© 2026 {EMPRESA} · NIT {NIT} · Cartagena de Indias, Colombia</p>
</footer>
</body>
</html>
'''
for nombre, (lengua, clave, otra) in PAGINAS.items():
    (raiz / nombre).write_text(pagina(nombre, lengua, clave, otra), encoding='utf-8')
    print('escrita', nombre)
