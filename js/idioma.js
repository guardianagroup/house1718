// 1718 · idioma: español (el de la página) e inglés (dueño, 19 nov 2026: «solamente en inglés y en español, me parece perfecto»).
// Cada texto lleva data-t; el español sale del propio HTML (y de ES_MAS, lo que solo se dice desde el código) y el inglés de aquí.
// La elección se recuerda en este navegador.
'use strict';
(() => {
  const ES_MAS = {
    compraTituloInvitar: 'Ya has usado tus 2 minutos gratis de hoy en este aparato.', compraTextoInvitar: 'Para invitar, compra tiempo: paga quien invita. También sirve para tus próximas conversaciones. Si alguien te invita a ti, puedes entrar igual.',
    compraTituloInvitado: 'A quien te invitó se le acabó el tiempo.', compraTextoInvitado: 'Esta llamada la paga quien invita. Si tú tienes tiempo o lo compras, invita tú a la otra persona y hablaréis con el tuyo.', compraNotaInvitado: 'Pago único con Dodo Payments, sin suscripción. Se abre en otra pestaña.', llSinTiempoInvitado: 'A quien te invitó se le acabó el tiempo. Paga quien invita: para hablar con tu tiempo, invita tú.', sinTiempoTextoInvitado: 'Paga quien invita. Para hablar con tu tiempo, invita tú.',
    teInvitanVoz: 'LLAMADA DE VOZ POSCUÁNTICA', teInvitanVozTexto: 'Te han invitado a una llamada de voz privada con encriptado poscuántico de extremo a extremo. Al entrar se encenderá tu micrófono.',
    // 1718: comprar tiempo (25 nov 2026)
    compraTituloTiempo: 'Se acabó tu tiempo.', compraTituloMas: 'Añade tiempo.',
    codigoFormato: 'Revisa el código: no parece completo.', codigoGuardado: 'Guardado. Se usará en tu próxima conversación.', codigoMirando: 'Comprobando el código…',
    codigoSinRed: 'No hay respuesta del servidor. Inténtalo de nuevo.', codigoMal: 'Ese código no vale.', codigoGastado: 'Ese código ya no tiene minutos.',
    codigoBien: 'Código aceptado: tienes {m} minutos.', codigoOtro: 'Ese código ya se usa en otro aparato. Cada código solo sirve a quien lo usa primero.', codigoPendiente: 'No se ha podido comprobar ahora. Queda guardado y se comprobará al usarlo.', codigoEspera: 'Demasiados intentos. Espera un minuto y vuelve a probar.',
    gratis: 'Gratis', quedan: 'Quedan {t}', llSinTiempo: 'Se acabó tu tiempo.', llSinCortesia: 'Se acabaron los 2 minutos gratis de hoy.', hayTiempo: 'Ya hay tiempo. Podéis volver a llamar.',
    sinTiempoTexto: 'Para seguir hablando, compra tiempo.', comprarTiempo: 'Comprar tiempo',
    avisoCortesiaT: 'Quedan 30 segundos gratis', avisoCortesia: 'Después, la llamada se corta. Para seguir, compra tiempo.',
    avisoTiempoT: 'Quedan 2 minutos', avisoTiempo: 'Se acaba vuestro tiempo. Compra más para que no se corte.',
    enPcTexto: 'Ya puedes cerrar esta pestaña. En este móvil no queda nada de la llamada.', pcVuelveEtiqueta: 'DE VUELTA', pcVuelveTitulo: 'La llamada vuelve a este ordenador.', pcVuelveTexto: 'Conectando… En unos segundos la tienes aquí, en grande.', llamadaAqui: 'Llamada en curso · 1718',
    verElChat: 'Ver el chat', ampliarLl: 'Ampliar',
    // la llamada en grupo
    anadirEntra: 'Entrando en la llamada…', anadirError: 'No se ha podido crear la invitación. Inténtalo de nuevo.', anadirCaduca: 'La invitación ha caducado. Toca «Añadir» para crear otra.',
    mensajeGrupo: '*Te han invitado a una videollamada poscuántica en 1718*\n{enlace}\nCódigo: {codigo}', grupoEntra: '{p} ha entrado en la llamada', grupoSale: '{p} ha salido de la llamada', grupoLleno: 'La llamada ya tiene 4 personas, el máximo.',
    grupoInvitado: 'Invitación enviada. Entrará en la llamada en cuanto la abra.', persona: 'Persona', tu: 'Tú', cerrar: 'Cerrar',
    etVoz: 'voz cambiada', etCara: 'cara oculta', etPantalla: 'compartiendo pantalla', etChat: 'en el chat', guardarFotos: 'Guardar en Fotos', grupoConectando: 'Conectando…', grupoNoConecta: 'No se ha podido conectar con {p}', camaraApagada: 'Cámara apagada', etChatLargo: 'En el chat', personasN: '{n} personas', grupoViejo: '{p} tiene la web sin actualizar y no puede ver ni oír a los demás. Pídele que recargue la página (F5) y vuelve a añadirle.',
    cambiarVista: 'Cambiar vista',
    movilConectadoPasando: 'Tu móvil se ha conectado. Pasando la llamada…', vueltaNoEspera: 'El otro aparato ya no está esperando. Si quieres, vuelve a pasarla con el código QR.', volviendoPc: 'Volviendo al ordenador…',
    pcHechoEtiqueta: 'EN TU ORDENADOR', pcHechoTitulo: 'La llamada ha vuelto a tu ordenador.', pcHechoTexto: 'Para pasarla otra vez a este móvil, pulsa «Pasar al móvil» en el ordenador. Deja esta página abierta.',
    movilHechoVuelta: 'Para traerla de vuelta, pulsa «Volver al ordenador» en tu móvil. Deja esta página abierta.', traspasoEsperaPc: 'La otra persona está pasando la conversación a su ordenador…',
    continuaAquiPc: 'La conversación sigue en este ordenador · claves nuevas', continuaSuPc: 'La conversación continúa en su ordenador · claves nuevas',
    pantallaDividida: 'Pantalla dividida', hacerPequena: 'Hacer pequeña tu imagen', moverDivision: 'Mover la división',
    escribiendo: 'Escribiendo…',
    estadoMas: '· Imagen, sonido y chat', compartirPantalla: 'Compartir pantalla', dejarPantalla: 'Dejar de compartir', ampliar: 'Ampliar', verChat: 'Ver chat', otroPantalla: 'Está compartiendo su pantalla',
    mensajeWa: '*Te han invitado a una videollamada poscuántica en 1718*\n{enlace}\nCódigo: {codigo}',
    volverLlamar: 'Volver a llamar', volverGrupo: 'Volver a la llamada', grupoFuera: 'Has salido de la llamada en grupo. Puedes volver cuando quieras.', grupoVuelve: 'Volviendo a la llamada…', botonVoz: 'Llamada de voz', botonVideo: 'Videollamada', llamadaVozEnCurso: 'Llamada de voz', pasarVideo: 'Vídeo', enVoz: 'Solo voz', mensajeLlamadaVoz: '*Te han invitado a una llamada de voz poscuántica*\n{enlace}', mensajeWaVoz: '*Te han invitado a una llamada de voz poscuántica en 1718*\n{enlace}\nCódigo: {codigo}', correoAsuntoVoz: 'Llamada de voz privada en 1718', correoCuerpoVoz: 'Te invito a una llamada de voz privada y encriptada en 1718. Ábrela aquí:\n{enlace}\n\nLa invitación caduca en 10 minutos.', irAbajo: 'Ir a lo último', grupoCortada: 'La llamada en grupo se ha cortado para ti. Puedes volver cuando quieras.', llCaida: 'La llamada se ha cortado. Puedes volver a llamar.', pruebaQueda: 'Quedan {t} de prueba',
    movilConectando: 'Conectando con tu ordenador…', movilCompruebaPc: 'Comprueba que en tu ordenador salen estas mismas palabras y pulsa allí «Sí, es mi móvil».',
    movilPasando: 'Pasando la conversación…', pasandoLlamada: 'Pasando la llamada…', movilUsado: 'Este código ya se ha usado o ha caducado. Genera otro en el ordenador.', movilCancelado: 'Se ha cancelado desde el ordenador.',
    movilCaducado: 'El código ha caducado. Ciérralo y vuelve a pulsar «Pasar al móvil».', movilNo: 'No coinciden',
    movilHechoEtiqueta: 'EN TU MÓVIL', movilHechoTitulo: 'La conversación sigue en tu móvil.', movilHechoTexto: 'En este ordenador se ha borrado todo. La otra persona ha pasado sola a la sesión nueva, con claves nuevas.',
    traspasoEspera: 'La otra persona está pasando la conversación a su móvil…', continuaSuMovil: 'La conversación continúa en su móvil · claves nuevas', continuaAqui: 'La conversación continúa en este móvil · claves nuevas',
    ampliar: 'Ampliar',
    esperandoLlamada: 'Esperando a que la otra persona abra la invitación', mensajeLlamada: '*Te han invitado a una videollamada poscuántica*\n{enlace}',
    esperandoInicio: 'En cuanto abra la invitación, empezáis a hablar.', esperandoVuelva: 'En cuanto la otra persona esté en 1718, empezáis a hablar.', tardaVuelva: 'Si tarda, pídele que vuelva a abrir 1718. La llamada empezará sola.', reintentando: 'Sin conexión. Reintentando…', invitacionCaducada: 'La invitación ha caducado. Vuelve y envía otra.',
    copiado: 'Copiado', faltan: 'Faltan símbolos: el código tiene 16.', creando: 'Creando el código…', caducado: 'El código ha caducado. Vuelve y crea otro.',
    alguienEntra: 'Alguien ha escrito el código: conectando…', llegaOtra: 'La otra persona ha entrado. Acordando las claves…', conectando: 'Conectando…',
    eNoVale: 'Ese código no existe, ya se usó o ha caducado.', eSinRele: 'Sin conexión con el servidor. Inténtalo de nuevo.',
    eSinPq: 'Este navegador no admite el encriptado poscuántico. Usa Chrome o Safari actualizados.', eDemasiados: 'Demasiados intentos. Espera un minuto.',
    eSinCodigo: 'No se pudo crear el código. Inténtalo de nuevo.',
    
    mConectado: 'Conectados · claves acordadas en los dos equipos', clavesRenovadas: 'Claves renovadas', seFue: 'La otra persona se ha desconectado', vuelve: 'La otra persona ha vuelto',
    intruso: 'Alguien con otra identidad intentó entrar: rechazado', integridad: 'Una trama no superó la comprobación de integridad y se descartó', sinRed: 'Sin conexión',
    palabrasHechas: 'Comprobadas por ti. La otra persona también debe comprobarlas.', suComprobacion: 'La otra persona ha comprobado las palabras',
    llPreparando: 'Preparando la cámara y el micrófono…', llLlamando: 'Llamando…', llEntrante: 'Videollamada entrante', llConectando: 'Conectando la videollamada…', prueba: 'Prueba',
    pruebaFin: 'La prueba ha terminado. Para seguir, solicita acceso.', llFinPrueba: 'Prueba terminada: 3 minutos de videollamada', llRechazada: 'Videollamada rechazada',
    llColgo: 'La otra persona ha colgado', tocaVer: 'Toca para ver y oír a la otra persona', cifradaExtremo: 'Encriptado poscuántico de extremo a extremo', cifradaEstandar: 'Encriptado estándar de extremo a extremo', cifradaComprobando: 'Comprobando el encriptado poscuántico…', entendido: 'Entendido', calidad_excelente: 'Conexión excelente', calidad_buena: 'Conexión buena', calidad_debil: 'Conexión débil', encriptadoEstandarT: 'Encriptado estándar', ubicacionEnviada: 'Ubicación enviada', ubicacionRecibida: 'Ubicación recibida', mensajeNuevo: 'Mensaje', fotoEnviada: 'Foto enviada', archivoEnviadoT: 'Archivo enviado', enviandoFoto: 'Enviando la foto…', enviandoArchivo: 'Enviando el archivo…', fotoRecibida: 'Foto recibida', tocaParaVer: 'Toca para verla', archivoRecibido: 'Archivo recibido', recibiendoFoto: 'Recibiendo una foto…', recibiendoArchivo: 'Recibiendo un archivo…', visorNota: 'Lo recibido se borra de este móvil al terminar, salvo lo que guardes.', llSinCapaSuyaNormal: 'El navegador de la otra persona no admite la capa poscuántica: esta llamada va con el encriptado estándar del navegador.', llSinCapaMiaNormal: 'Este navegador no admite la capa poscuántica: esta llamada va con el encriptado estándar del navegador. Con Chrome o Safari al día, va poscuántica.', enviarCosas: 'Enviar', foto: 'Foto', ubicacion: 'Ubicación', archivoMenu: 'Archivo', miUbicacion: 'Mi ubicación', abrirMapa: 'Abrir el mapa', sinUbicacion: 'No se ha podido obtener la ubicación.', buscandoUbicacion: 'Buscando tu ubicación…', guardar: 'Guardar', verFoto: 'Ver', contestar: 'Contestar', salir: 'Salir', llamar: 'Llamar', conectandoLlamada: 'Conectando la llamada…', llOcupado: 'La otra persona ya está en una llamada', llSinRespuesta: 'Sin respuesta', llFallo: 'No se pudo conectar la videollamada',
    llSinTurn: 'El servidor de llamadas no responde. Inténtalo en un momento.', llSinPermiso: 'Sin permiso para la cámara o el micrófono',
    llSinCapaSuya: 'El navegador de la otra persona no admite la capa poscuántica: sin ella no hay llamada',
    llSinCapa: 'Este navegador no admite la capa poscuántica de la imagen y el sonido: sin ella no hay llamada', llSinMedios: 'Este navegador no puede usar la cámara ni el micrófono',
    llSinSesion: 'La otra persona no está conectada', llDescifra: 'No se puede desencriptar la imagen o el sonido de la otra persona', llTerminada: 'Videollamada terminada',
    archivoGrande: 'El archivo pasa de 1 GB, el máximo de esta versión', archivoNo: 'No se pudo enviar el archivo', archivoEnviado: 'Enviado', descargar: 'Descargar', archivoCancelado: 'Envío cancelado',
    finEtiqueta: 'LLAMADA FINALIZADA', finTitulo: 'Todo se ha borrado.', finSuyoTitulo: 'La otra persona ha colgado.',
    finTexto: 'Por tu privacidad, al colgar se elimina todo de este dispositivo.',
    finL1: 'Mensajes, fotos y archivos eliminados', finL2: 'Claves de encriptado destruidas', finL3: 'El servidor solo transmitió datos encriptados',
    alarmaEtiqueta: 'ALERTA DE SEGURIDAD', alarmaTitulo: 'Conversación cortada.',
    alarmaTexto: 'Las claves o las palabras no cuadraban con lo comprometido: alguien podía estar en medio. Se ha borrado todo en los dos equipos. No envíes nada importante y vuelve a empezar con un código nuevo.',
    noCoincidenTitulo: 'Las palabras no coincidían.',
    noCoincidenTexto: 'Has cortado la conversación y se ha borrado todo. Si las palabras no coinciden, alguien puede estar en medio: crea un código nuevo y dáselo a la otra persona por otro canal.',
    escribeAqui: 'Escribe un mensaje',
    bajarAria: 'Desliza hacia abajo',
    
    cambiaVoz: 'Cambiar voz', otroSinCamara: 'Cámara apagada', otroSinCamaraTxt: 'Sigue en la llamada, solo con voz.', volverVideo: 'Volver al vídeo', enLlamada: 'En llamada', volverLlamada: 'Volver a la llamada', camPausa: 'Tu cámara, en pausa', otroChat: 'Ha pasado al chat · solo voz', otroChatTit: 'Está en el chat', otroChatTxt: 'Te sigue oyendo · su cámara está en pausa', cartelBorra: 'Los mensajes se encriptan en cada equipo y desaparecen al terminar.', vozCambiada: 'Voz cambiada', ocultaCara: 'Ocultar cara', caraOcultaTxt: 'Cara oculta', otroVoz: 'Su voz está cambiada', otroCara: 'Su cara está oculta', 
    enlaceCopiado: 'Enlace copiado', correoAsunto: 'Videollamada privada en 1718', enviarInvitacionAria: 'Enviar la invitación',
    correoCuerpo: 'Te invito a una videollamada privada y encriptada en 1718. Ábrela aquí:\n{enlace}\n\nLa invitación caduca en 10 minutos.',
    espiaTitulo: 'Extensión del navegador detectada{n}', espiaTexto: 'Podría leer tus mensajes y ver la llamada. Para más privacidad, usa una ventana privada sin extensiones.', 
    
    
    
    pantallaCompleta: 'Pantalla completa', salirPantalla: 'Salir de pantalla completa',
    
    
    verificarEtiqueta: 'VERIFICAR ESTA PÁGINA', verificarTitulo: 'El código es público.',
    verificarTexto: 'Esta página se publica tal cual desde un repositorio público. En su código, cada script y la hoja de estilo llevan su huella SHA-384, y tu navegador no carga ninguno que no coincida. Puedes comparar esas huellas con las del repositorio.',
    video: 'Vídeo', chatCifrado: 'Encriptado poscuántico', chatCifradoEstandar: 'Encriptado estándar', responder: 'Responder',
    notaVoz: 'Nota de voz', notaEnviada: 'Nota de voz enviada', enviandoNota: 'Enviando la nota de voz…', notaRecibida: 'Nota de voz', recibiendoNota: 'Recibiendo una nota de voz…', escuchar: 'Escuchar',
    notaSinMicro: 'No hay permiso para usar el micrófono.', notaNo: 'Este navegador no puede grabar notas de voz.', girarTitulo: 'Gira el móvil', girarTexto: '1718 se usa en vertical.',
    
    
    
    
    pocaLuzT: 'Está muy oscuro', pocaLuz: 'Ponte frente a una luz para que te vean bien.', girarBoton: 'Girar', 
    
    
    llamandoT: 'Llamando', conectandoT: 'Conectando', sinTiempoT: 'Sin tiempo',
    esperaSinTiempo: 'No te quedan minutos para empezar. Paga quien invita: compra tiempo para hablar.',
    otroSalio: 'La otra persona ha salido de 1718. Para volver a hablar, invítala de nuevo.', invitarDeNuevo: 'Invitar de nuevo', previaFoto: 'Enviar foto', previaFotos: 'Enviar fotos', previaArchivo: 'Enviar archivo', previaArchivos: 'Enviar archivos', quitar: 'Quitar', parar: 'Parar', borrarTodos: 'Borrar para todos', borrarMi: 'Borrar para mí', copiarMsg: 'Copiar', copiadoMsg: 'Copiado', mensajeBorrado: 'Eliminaste este mensaje', mensajeBorradoSuyo: 'Se eliminó este mensaje', girarCamara: 'Girar la cámara',
  };
  const EN = {
    h1Portada: '1718 · Private video calls, end-to-end encrypted',
    compraTituloInvitar: 'You have used your 2 free minutes for today on this device.', compraTextoInvitar: 'To invite someone, buy time: the person who invites pays. It also works for your next conversations. If someone invites you, you can still join.',
    compraTituloInvitado: 'The person who invited you has run out of time.', compraTextoInvitado: 'The person who invites pays for the call. If you have time or buy it, invite the other person yourself and you will talk on yours.', compraNotaInvitado: 'One-time payment with Dodo Payments, no subscription. It opens in a new tab.', llSinTiempoInvitado: 'The person who invited you has run out of time. The person who invites pays: to talk on your time, invite them yourself.', sinTiempoTextoInvitado: 'The person who invites pays. To talk on your time, invite them yourself.',
    teInvitanVoz: 'POST-QUANTUM VOICE CALL', teInvitanVozTexto: 'You have been invited to a private voice call with post-quantum end-to-end encryption. When you join, your microphone will turn on.',
    // 1718: comprar tiempo (25 nov 2026)
    compraEtiqueta: 'CONVERSATION TIME', compraTituloCortesia: 'Today’s 2 free minutes are up.', compraTituloTiempo: 'Your time is up.', compraTituloMas: 'Add time.',
    compraTexto: 'To keep talking, buy time. It also works for your next conversations.',
    compra1T: '1 hour', compra1P: 'USD 5', compra5T: '5 hours', compra5P: 'USD 25',
    compraNota: 'One-time payment with Dodo Payments, no subscription. It opens in a new tab: when you are done, come back to this one and your time will be there.',
    compraTengo: 'Already have a code?', compraPega: 'Paste your code here', compraUsar: 'Use', ahoraNo: 'Not now',
    codigoFormato: 'Check the code: it does not look complete.', codigoGuardado: 'Saved. It will be used in your next conversation.', codigoMirando: 'Checking the code…',
    codigoSinRed: 'No answer from the server. Please try again.', codigoMal: 'That code is not valid.', codigoGastado: 'That code has no minutes left.',
    codigoBien: 'Code accepted: you have {m} minutes.', codigoOtro: 'That code is already in use on another device. Each code works only for whoever uses it first.', codigoPendiente: 'It could not be checked right now. It is saved and will be checked when used.', codigoEspera: 'Too many attempts. Wait a minute and try again.',
    gratis: 'Free', quedan: '{t} left', llSinTiempo: 'Your time is up.', llSinCortesia: 'Today’s 2 free minutes are up.', hayTiempo: 'Time added. You can call again.',
    sinTiempoTexto: 'To keep talking, buy time.', comprarTiempo: 'Buy time',
    avisoCortesiaT: '30 free seconds left', avisoCortesia: 'Then the call will end. To keep going, buy time.',
    avisoTiempoT: '2 minutes left', avisoTiempo: 'Your time is running out. Buy more so the call is not cut.',
    faqEtiqueta: 'QUESTIONS', faqTitulo: 'What people usually ask us.', 
    faq1P: 'Do I need to install anything or create an account?', faq1R: 'No. It works in the browser on your phone or computer, with an invitation link. If you like, you can add 1718 to your home screen like an app.',
    faq2P: 'Is anything from the conversation stored?', faq2R: 'No. The conversation only exists on the screens of those taking part and is erased when you close it. The server relays encrypted data it cannot read.',
    faq3P: 'Can anyone listen in on the call?', faq3R: 'The call is end-to-end encrypted with hybrid post-quantum cryptography. Keys are created on your devices and the server only relays data it cannot read. One caveat: if a device is infected, whoever controls it sees what you see.',
    faq4P: 'What does “post-quantum” mean?', faq4R: 'That, on top of classical cryptography, we use ML-KEM, the standard designed so that what someone captures today stays protected against tomorrow\'s quantum computers.',
    faq5P: 'Does it work on iPhone and Android?', faq5R: 'Yes, in Safari and Chrome, on phones and computers.',
    faq6P: 'How much does it cost?', faq6R: '1 hour, USD 5, or 5 hours, USD 25, with one-time payments and no subscription. Every day you get 2 free minutes to try it.',
    faq7P: 'How do I pay, and how is time used?', faq7R: 'You pay with Dodo Payments in a new tab. When you come back, each hour is a 60-minute code tied to this browser: it only works for whoever uses it first, so to continue on your phone, use “Move to phone”. Time runs by the minute while you are both in the conversation. The person who invites always pays with their own time; the invited person’s time is never used.',
    faq8P: 'What happens when time runs out?', faq8R: 'The call ends and the person who invited gets the option to buy more. As soon as they buy or paste a code, you can call again in the same conversation. If it is the other person who has time, they should be the one to invite.',
    preciosEtiqueta: 'PRICING', preciosTitulo: 'You only pay for the time you <em class="c-verde">talk</em>.', precio1T: '1 hour · USD 5', precio1: 'One-time payment, no subscription.', precio2T: '5 hours · USD 25', precio2: 'One-time payment, no subscription.', precio3T: '2 free minutes a day per device', precio3: 'Try it for free. The person who invites uses them; after that, time is paid and only runs while you are both in the conversation.', comprar: 'Buy',
    preciosNota: 'Payments are processed by Dodo Payments in a new tab. Each hour is a 60-minute code tied to this browser; it is also sent to you by email, as a receipt. If you have not used a code, you can ask for a refund within 14 days of purchase: <a href="refunds.html">refunds and cancellations</a>.',
    e7C2: 'Post-quantum encryption', e7C3: 'Always end-to-end', e7C4: 'No account or number', e7C5: 'No history', e7C6: 'Open source', pieCodigo: 'Open source', e7Si: 'Yes', e7Parcial: 'Only if turned on, paid or partly', e7No: 'No', e7NotaZoom: 'Threema is preparing post-quantum encryption with IBM.', paisSuiza: 'Switzerland',
    lema: 'Private video calls with post-quantum encryption.',
    espiaTitulo: 'Browser extension detected{n}', espiaTexto: 'It could read your messages and see the call. For more privacy, use a private window without extensions.', 
    
    
    
    cpWhatsApp: 'WhatsApp', cpCorreo: 'Email', cpCopiar: 'Copy link', enlaceCopiado: 'Link copied', enviarInvitacionAria: 'Send the invitation',
    invitacionTextoPC: 'Send it by WhatsApp or email, or copy the link. When the other person opens it, the video call will start by itself. It expires in 10 minutes.',
    tengoCodigoPC: 'Were you given a code? Enter here', correoAsunto: 'Private video call on 1718',
    correoCuerpo: 'I am inviting you to a private, encrypted video call on 1718. Open it here:\n{enlace}\n\nThe invitation expires in 10 minutes.',
    
    cambiaVoz: 'Change voice', otroSinCamara: 'Camera off', otroSinCamaraTxt: 'Still on the call, voice only.', volverVideo: 'Back to video', enLlamada: 'On call', volverLlamada: 'Back to call', camPausa: 'Your camera is paused', otroChat: 'Switched to chat · voice only', otroChatTit: 'In the chat', otroChatTxt: 'They can still hear you · their camera is paused', cartelBorra: 'Messages are encrypted on each device and disappear when you end.', vozCambiada: 'Voice changed', ocultaCara: 'Hide face', caraOcultaTxt: 'Face hidden', otroVoz: 'Their voice is changed', otroCara: 'Their face is hidden', 
    bajarAria: 'Scroll down', tresTitulo: 'Private video calls, <em class="c-ambar">end‑to‑end encrypted</em>.',
    tresQueE: 'WHAT WE DO', tresQueT: 'Encrypted video calls for executives and companies.', tresQue: 'No accounts, no phone number and no history.',
    tresPorE: 'WHY', tresPorT: 'Ordinary calls can be intercepted.', tresPor: 'They cross cell towers and carrier networks that neither of you controls.',
    tresConE: 'WITH WHAT TECHNOLOGY', tresConT: 'Post-quantum encryption in your own browser.', tresCon: 'Keys are created on your devices. The server only relays encrypted data it cannot read.',
    // App descargada o navegador (24 nov 23:39)
    vsEtiqueta: 'APP VS. BROWSER',
    vsTitulo: 'No download. <em class="c-verde">Just a link.</em>',
    vsTexto: 'An app has to be found, installed and given permissions, by both of you. 1718 runs in the browser you already have, isolated from the rest of your phone, with post-quantum encryption from the first second.',
    vsAspecto: 'What changes',
    vsApp: 'A downloaded app',
    vs1718: '1718, in your browser',
    vsAppCorto: 'An app',
    vs1T: 'Getting started',
    vs1A: 'Both of you have to download and install it.',
    vs1W: 'Send a link, they tap it and you’re talking.',
    vs2T: 'Your identity',
    vs2A: 'It usually asks for your phone number or an account.',
    vs2W: 'No phone number, no account: nothing that identifies you.',
    vs3T: 'Permissions',
    vs3A: 'It may ask for your contacts or location and keep running in the background.',
    vs3W: 'Only camera and microphone, for the call. It can’t see your contacts or photos, only what you choose to share.',
    vs4T: 'What stays behind',
    vs4A: 'It stays installed on your phone and in your app store history.',
    vs4W: 'No app installed, and the conversation is erased when you hang up.',
    vs5T: 'Always up to date',
    vs5A: 'It needs updates, and each system has its own version.',
    vs5W: 'The latest version every time you open it, with the same link on iPhone, Android and computer.',
    vsNota: 'Use it often? Add 1718 to your home screen and it opens like an app, without going through any app store.',
    // ¿Sabías que…? (24 nov 23:16): seis datos con su fuente
    sabEtiqueta: 'THE FACTS',
    sabTitulo: '<em class="c-ambar">Did you know?</em>',
    sabTexto: 'What talking and sharing without protection costs today. Every figure links to its source.',
    sab1Q: 'countries targeted by Salt Typhoon',
    sab1: 'Hackers backed by China’s government broke into US phone carriers, stole customers’ call records and copied data on court-ordered wiretaps.',
    sab1F: 'Sources: <a href="https://www.cisa.gov/news-events/news/joint-statement-fbi-and-cisa-peoples-republic-china-prc-targeting-commercial-telecommunications" target="_blank" rel="noopener noreferrer">FBI and CISA, 2024</a> · <a href="https://www.nextgov.com/cybersecurity/2025/08/salt-typhoon-hackers-targeted-over-80-countries-fbi-says/407719/" target="_blank" rel="noopener noreferrer">Nextgov, 2025</a>',
    sab2Q: 'governments bought spyware',
    sab2: 'That’s the documented minimum for 2011⁠–⁠2023, counting tools that extract everything stored on a phone. The best known is NSO Group’s Pegasus. Apple has warned people in more than 150 countries that spyware was targeting them.',
    sab2F: 'Sources: <a href="https://carnegieendowment.org/research/2023/03/why-does-the-global-spyware-industry-continue-to-thrive-trends-explanations-and-responses" target="_blank" rel="noopener noreferrer">Carnegie, 2023</a> · <a href="https://support.apple.com/en-us/102174" target="_blank" rel="noopener noreferrer">Apple, 2026</a>',
    sab3Q: 'identity theft reports a day',
    sab3: 'The FTC, the US consumer protection agency, received more than 1.1 million in 2024. With your data, someone else can open cards and accounts in your name.',
    sab3F: 'Source: <a href="https://www.ftc.gov/news-events/news/press-releases/2025/03/new-ftc-data-show-big-jump-reported-losses-fraud-125-billion-2024" target="_blank" rel="noopener noreferrer">FTC, 2025</a>',
    sab4Pre: '$',
    sab4Suf: 'M',
    sab4Q: 'lost to online crime every day',
    sab4: 'Losses reported to the FBI reached $20.9 billion in 2025, up 26% from 2024. That’s almost 3,000 complaints a day.',
    sab4F: 'Source: <a href="https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf" target="_blank" rel="noopener noreferrer">FBI (IC3), 2026</a>',
    sab5N: 'Free?',
    sab5Q: 'ask who’s paying',
    sab5: 'Many free apps are paid for with your data. The FTC found that big social media and video streaming companies engaged in vast surveillance of their users to make money from their personal information.',
    sab5F: 'Source: <a href="https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-staff-report-finds-large-social-media-video-streaming-companies-have-engaged-vast-surveillance" target="_blank" rel="noopener noreferrer">FTC, 2024</a>',
    sab6N: '#1',
    sab6Q: 'CISA’s top tip',
    sab6: 'After Salt Typhoon, the FBI and CISA, the US cybersecurity agency, urged Americans to use encrypted apps. CISA’s mobile guidance puts it first: use only end-to-end encrypted communications.',
    sab6F: 'Sources: <a href="https://www.nbcnews.com/tech/security/us-officials-urge-americans-use-encrypted-apps-cyberattack-rcna182694" target="_blank" rel="noopener noreferrer">NBC News, 2024</a> · <a href="https://www.cisa.gov/resources-tools/resources/mobile-communications-best-practice-guidance" target="_blank" rel="noopener noreferrer">CISA, 2024</a>',
    sabCierre: '<b>1718 is paid for with call time, not with your data.</b> No ads, no cookies, no account, and we don’t sell or share data. Every call is end-to-end encrypted in your own browser.',
    sabNota: 'Daily figures are annual totals divided by 365, rounded. Sources checked in November 2026.',
    navDescubrir: 'Discover', navAcceso: 'Access', empezar: 'Start trial',
    
    
    eligeTitulo: 'VIDEO CALL', eligeTexto: 'One person invites and gives the code to the other. When they type it, the video call starts by itself.',
    crear: 'Create a code', tengo: 'I have a code', invitarVideollamada: 'Invite to a video call', volver: 'Back', cancelar: 'Cancel', entrar: 'Enter',
    reconectando: 'Reconnecting the call…', volverLlamar: 'Call again', volverGrupo: 'Rejoin the call', grupoFuera: 'You left the group call. You can rejoin whenever you like.', grupoVuelve: 'Rejoining the call…', botonVoz: 'Voice call', botonVideo: 'Video call', llamadaVozEnCurso: 'Voice call', pasarVideo: 'Video', enVoz: 'Voice only', mensajeLlamadaVoz: '*You are invited to a post-quantum voice call*\n{enlace}', mensajeWaVoz: '*You are invited to a post-quantum voice call on 1718*\n{enlace}\nCode: {codigo}', correoAsuntoVoz: 'Private voice call on 1718', correoCuerpoVoz: 'I am inviting you to a private, encrypted voice call on 1718. Open it here:\n{enlace}\n\nThe invitation expires in 10 minutes.', irAbajo: 'Go to latest', grupoCortada: 'The group call was cut off for you. You can rejoin whenever you like.', llCaida: 'The call was cut off. You can call again.', pruebaQueda: '{t} of trial left',
    pasarMovil: 'Move to phone', movilEtiqueta: 'MOVE TO PHONE', movilTitulo: 'Continue on your phone',
    movilTexto: 'Point your phone camera at this code. It works once, expires in 2 minutes and never passes through any server.',
    movilCompara: 'Your phone has connected. Check that its screen shows these same words:', movilSi: 'Yes, it is my phone', cancelar: 'Cancel', movilNo: 'They do not match',
    movilAquiTitulo: 'CONTINUE ON THIS PHONE', movilAquiTexto: 'You are about to move the conversation open on your computer to this phone.', movilContinuar: 'Continue here',
    movilConectando: 'Connecting to your computer…', movilCompruebaPc: 'Check that your computer shows these same words and press “Yes, it is my phone” there.',
    movilPasando: 'Moving the conversation…', pasandoLlamada: 'Moving the call…', movilUsado: 'This code has already been used or has expired. Generate another on the computer.', movilCancelado: 'It was canceled from the computer.',
    movilCaducado: 'The code has expired. Close it and press “Move to phone” again.',
    movilHechoEtiqueta: 'ON YOUR PHONE', movilHechoTitulo: 'The conversation continues on your phone.', movilHechoTexto: 'Everything has been erased on this computer. The other person moved to the new session automatically, with new keys.',
    traspasoEspera: 'The other person is moving the conversation to their phone…', continuaSuMovil: 'The conversation continues on their phone · new keys', continuaAqui: 'The conversation continues on this phone · new keys',
    chat: 'Chat', ampliar: 'Enlarge',
    invitar: 'Invite to a call', invitacionEnviada: 'INVITATION SENT', esperandoInicio: 'As soon as they open the invitation, you start talking.', esperandoVuelva: 'As soon as the other person is on 1718, you start talking.', tardaVuelva: 'If it takes long, ask them to open 1718 again. The call will start by itself.', reintentando: 'No connection. Retrying…', invitacionCaducada: 'The invitation has expired. Go back and send another.', invitacionLista: 'YOUR INVITATION', invitacionTexto: 'Send it via WhatsApp. When the other person opens it, the video call will start by itself. It expires in 10 minutes.', eligeTextoMovil: 'Send the invitation via WhatsApp: when the other person opens it, the video call will start by itself.',
    enviarInvitacion: 'Send the invitation', teInvitan: 'POST-QUANTUM VIDEO CALL', teInvitanTexto: 'You have been invited to a private video call with post-quantum end-to-end encryption. When you join, your camera and microphone will turn on.', entrarLlamada: 'Join the call',
    esperandoLlamada: 'Waiting for the other person to open the invitation', mensajeLlamada: '*You are invited to a post-quantum video call*\n{enlace}',
    tuCodigo: 'YOUR CODE', daselo: 'Send it to the other person. When they type it in “I have a code”, the video call starts by itself. It expires in 10 minutes and works only once.', whatsapp: 'Send via WhatsApp',
    mensajeWa: '*You are invited to a post-quantum video call on 1718*\n{enlace}\nCode: {codigo}',
    esperando: 'Waiting for the other person', copiar: 'Copy the code', copiado: 'Copied',
    tengoTitulo: 'I HAVE A CODE', tengoTexto: 'The 16 characters you were given. Once you enter, the video call starts by itself.',
    faltan: 'Characters missing: the code has 16.', creando: 'Creating the code…', caducado: 'The code has expired. Go back and create another.',
    alguienEntra: 'Someone entered the code: connecting…', llegaOtra: 'The other person is here. Agreeing keys…', conectando: 'Connecting…',
    eNoVale: 'That code does not exist, was already used or has expired.', eSinRele: 'No connection to the server. Please try again.',
    eSinPq: 'This browser does not support post-quantum encryption. Use an up-to-date Chrome or Safari.', eDemasiados: 'Too many attempts. Wait a minute.',
    eSinCodigo: 'The code could not be created. Please try again.',
    porqueIntro: 'Money is rarely stolen today by breaking encryption. It is stolen by pretending to be someone else: an executive, a supplier, the bank itself. Convinced, the victim authorises the payment.',
    d1c: '$2.77 bn', d1t: 'Fake executives and changed bank details', d1p: 'An email that looks like it comes from the boss or a supplier asks for payment to a different account. In the US alone, 2024, across 21,442 complaints.', d1f: 'FBI · IC3 REPORT 2024',
    d2c: '$25.6 m', d2t: 'A cloned executive on a video call', d2p: 'In Hong Kong, an Arup employee made 15 transfers after a meeting in which everyone else was fake, created with artificial intelligence.', d2f: 'ARUP · HONG KONG POLICE · 2024',
    d3c: '£450.7 m', d3t: 'Payments authorised under deception', d3p: 'Victims send the money themselves, convinced by someone posing as their bank, the police or an adviser. United Kingdom, 2024.', d3f: 'UK FINANCE · 2025',
    d4c: '$2.95 bn', d4t: 'Impersonation', d4p: 'Someone poses as an agency, a company or a relative, and asks for money. United States, 2024.', d4f: 'FTC · 2025',
    d5c: '$16.6 bn', d5t: 'A record', d5p: 'Internet crime losses reported in the US in 2024: 33% more than the year before.',
    escuchaEtiqueta: 'HOW YOU ARE OVERHEARD', escuchaTitulo: 'An ordinary call can be <em class="c-ambar">listened to</em> along the way.',
    escuchaIntro: 'A call from Vodafone to Orange is only encrypted between each phone and its mast. Inside each carrier, and between them, it can be listened to.',
    tuTelefono: 'Your phone', antena: 'Mast', redOperadoras: 'Network between carriers', suTelefono: 'Their phone',
    r1: '<b>1 · Fake mast.</b> It poses as your carrier’s and can force 2G, which is far weaker.',
    r2: '<b>2 · Inside the carrier.</b> Lawful-interception systems can be attacked. In 2024 it emerged that they had been.',
    r3: '<b>3 · Between carriers.</b> SS7 and Diameter can divert calls and texts without properly checking who is asking.',
    r4: '<b>4 · On the phone.</b> Spyware such as Pegasus sees everything before it is encrypted.',
    enElixire: 'IN 1718', tuEquipo: 'Your device', rele: 'Relay · sees only bytes', suEquipo: 'Their device',
    enElixireTexto: 'What you write is encrypted on your device and only the other device holds the key to open it. If your device is infected, whoever controls it sees your screen: no tool can fix that.',
    solucionEtiqueta: 'THE SOLUTION', solucionTitulo: '<em class="c-verde">Only the two of you</em> can read it.',
    s1t: 'Identity by key', porEso1: 'Who is on the other side is not decided by a voice, a face or an email: it is checked with a key.',
    p2t: 'Nobody in the middle unnoticed', p2p: 'On a computer, on entering, both people see the same four words, committed before the exchange. If someone steps in, they do not match.',
    s3t: 'Encrypted on your device', porEso2: 'What you write and send is encrypted on your device, and only the other device can open it.',
    s4t: 'Instant warning', porEso3: 'If someone steps in the middle or changes keys, the session is cut and you are warned.',
    p5t: 'Nothing stored', p5p: 'No account, no phone number. The conversation lives only in the memory of the two tabs: close them and it is gone.',
    porEso4: 'No tool can stop someone paying outside the agreed channel. The rule is simple: no important payment without confirming it in 1718.',
    frenteEtiqueta: 'COMPARED', frenteTitulo: 'No phone number, no trace, and <em class="c-hielo">post-quantum encryption</em>.',
    f1: 'Always end-to-end encrypted', si: 'Yes', no: 'No', soloSecretos: 'Only in secret chats',
    f2: 'Asks for your phone number', f3: 'Where the conversation stays', f3wa: 'On the phone and in backups', f3tg: 'On their servers', f3sg: 'On the phone', f3el: 'Nowhere once closed',
    f4: 'Checking nobody is in the middle', opcional: 'Optional', f4el: 'Four words, on a computer',
    pieTabla: 'Public information from each service, November 2026.',
    tecnologiaEtiqueta: 'THE TECHNOLOGY', tecnologiaTitulo: '<em class="c-hielo">Post-quantum</em> cryptography, in your browser.',
    p1t: 'Hybrid post-quantum encryption', p1p: 'ML-KEM-1024 with ECDH P-384, and ML-DSA-87 with ECDSA P-384 signatures. Reading a conversation would mean breaking classical and post-quantum cryptography at once.',
    p3t: 'Keys that keep changing', p3p: 'A different key for every message and a new post-quantum agreement every minute: what came before cannot be read with the new keys.',
    t4t: 'Encrypted video call', t4p: 'Picture and sound carry an extra post-quantum layer keyed from the conversation when both browsers support it (if not, the call uses the browser’s standard encryption and says so), and travel through our call server: neither of you sees the other’s address.',
    p4t: 'Constant traffic', p4p: 'While the conversation is open, frames of the same size leave at a fixed rhythm: from outside, nobody can tell when you write.',
    p6t: 'Coming soon', p6p: 'Signed delivery records. Transfers of up to 1 TB. The trust closure for payment orders.',
    limite: 'What no tool can promise, neither can we: if a device is infected, whoever controls it sees what you see.',
    accesoEtiqueta: 'ACCESS', accesoTitulo: '<em class="c-ambar">Private</em> access',
    accesoTexto: '1718 is a paid service. It is offered privately to individuals, law firms, clinics and companies that need the highest level of protection for what they say and send.',
    pruebaTitulo: 'FREE TRIAL', pruebaTexto: 'A video call of up to 3 minutes, with the same encryption as the full service.',
    pruebasTexto: 'During the testing phase, chat and file transfers are unlimited.',
    verificar: 'Verify this page',
    anadirPersona: 'Add', anadirTitulo: 'ADD TO THE CALL', anadirTexto: 'Send them this code or the link. As soon as they open it, they will join the call, from a computer, phone or tablet. It expires in 10 minutes and works only once.',
    copiarCodigo: 'Copy code', anadirEsperando: 'Waiting for them to join…', anadirEntra: 'Joining the call…', anadirError: 'The invitation could not be created. Please try again.',
    anadirCaduca: 'The invitation has expired. Tap “Add” to create another one.', mensajeGrupo: '*You are invited to a post-quantum video call on 1718*\n{enlace}\nCode: {codigo}', grupoEntra: '{p} joined the call', grupoSale: '{p} left the call', grupoLleno: 'The call already has 4 people, the maximum.',
    grupoInvitado: 'Invitation sent. They will join the call as soon as they open it.', persona: 'Person', tu: 'You', cerrar: 'Close',
    etVoz: 'voice changed', etCara: 'face hidden', etPantalla: 'sharing screen', etChat: 'in the chat', guardarFotos: 'Save to Photos', grupoConectando: 'Connecting…', grupoNoConecta: 'Could not connect with {p}', camaraApagada: 'Camera off', etChatLargo: 'In the chat', personasN: '{n} people', grupoViejo: '{p} has an outdated version of the site and cannot see or hear the others. Ask them to reload the page (F5) and add them again.',
    salaEstado: 'Post-quantum encrypted', enPcTexto: 'You can close this tab now. Nothing of the call remains on this phone.', pcVuelveEtiqueta: 'COMING BACK', pcVuelveTitulo: 'The call is coming back to this computer.', pcVuelveTexto: 'Connecting… In a few seconds you will have it here, full size.', llamadaAqui: 'Call in progress · 1718', verElChat: 'Show chat', ampliarLl: 'Enlarge', cambiarVista: 'Change view', movilConectadoPasando: 'Your phone has connected. Moving the call…', vueltaNoEspera: 'The other device is no longer waiting. If you want, move it again with the QR code.', volviendoPc: 'Going back to the computer…', pcHechoEtiqueta: 'ON YOUR COMPUTER', pcHechoTitulo: 'The call is back on your computer.', pcHechoTexto: 'To move it to this phone again, press “Move to phone” on the computer. Keep this page open.', movilHechoVuelta: 'To bring it back, press “Back to computer” on your phone. Keep this page open.', traspasoEsperaPc: 'The other person is moving the conversation to their computer…', continuaAquiPc: 'The conversation continues on this computer · new keys', continuaSuPc: 'The conversation continues on their computer · new keys', volverPc: 'Back to computer', pantallaDividida: 'Split screen', hacerPequena: 'Make your image small', moverDivision: 'Move the divider', estadoMas: '· Picture, sound and chat', compartirPantalla: 'Share screen', dejarPantalla: 'Stop sharing', ampliar: 'Enlarge', verChat: 'Show chat', otroPantalla: 'Sharing their screen', terminar: 'End', palabrasEtiqueta: 'VERIFICATION WORDS', palabrasAyuda: 'Read them aloud. If they don’t match, someone is in the middle.',
    coinciden: 'They match', noCoinciden: 'No match', palabrasHechas: 'Verified by you. The other person must verify them too.', suComprobacion: 'The other person verified the words',
    videoEtiqueta: 'VIDEO CALL', pruebaLimite: 'Trial: up to 3 minutes', videollamada: 'Start video call', aceptar: 'Accept', rechazar: 'Decline',
    capaActiva: 'Picture and sound with post-quantum layer', micro: 'Mic', camara: 'Camera', colgar: 'Hang up',
    llPreparando: 'Preparing camera and microphone…', llLlamando: 'Calling…', llEntrante: 'Incoming video call', llConectando: 'Connecting the video call…', prueba: 'Trial',
    pruebaFin: 'The trial has ended. To continue, request access.', llFinPrueba: 'Trial over: 3 minutes of video call', llRechazada: 'Video call declined',
    llColgo: 'The other person hung up', tocaVer: 'Tap to see and hear the other person', cifradaExtremo: 'Post-quantum end-to-end encryption', cifradaEstandar: 'Standard end-to-end encryption', cifradaComprobando: 'Checking post-quantum encryption…', entendido: 'Got it', calidad_excelente: 'Excellent connection', calidad_buena: 'Good connection', calidad_debil: 'Weak connection', encriptadoEstandarT: 'Standard encryption', ubicacionEnviada: 'Location sent', ubicacionRecibida: 'Location received', mensajeNuevo: 'Message', fotoEnviada: 'Photo sent', archivoEnviadoT: 'File sent', enviandoFoto: 'Sending the photo…', enviandoArchivo: 'Sending the file…', fotoRecibida: 'Photo received', tocaParaVer: 'Tap to view', archivoRecibido: 'File received', recibiendoFoto: 'Receiving a photo…', recibiendoArchivo: 'Receiving a file…', visorNota: 'What you receive is erased from this phone when you finish, unless you save it.', llSinCapaSuyaNormal: 'The other person’s browser does not support the post-quantum layer: this call uses the browser’s standard encryption.', llSinCapaMiaNormal: 'This browser does not support the post-quantum layer: this call uses the browser’s standard encryption. With an up-to-date Chrome or Safari, it is post-quantum.', enviarCosas: 'Send', foto: 'Photo', ubicacion: 'Location', archivoMenu: 'File', miUbicacion: 'My location', abrirMapa: 'Open the map', sinUbicacion: 'The location could not be found.', buscandoUbicacion: 'Finding your location…', guardar: 'Save', verFoto: 'View', contestar: 'Answer', salir: 'Leave', llamar: 'Call', conectandoLlamada: 'Connecting the call…', llOcupado: 'The other person is already on a call', llSinRespuesta: 'No answer', llFallo: 'The video call could not connect',
    llSinTurn: 'The call server is not responding. Try again shortly.', llSinPermiso: 'No permission for camera or microphone',
    llSinCapaSuya: 'The other person’s browser does not support the post-quantum layer: no call without it',
    llSinCapa: 'This browser does not support the post-quantum layer for picture and sound: no call without it', llSinMedios: 'This browser cannot use the camera or microphone',
    llSinSesion: 'The other person is not connected', llDescifra: 'The other person’s picture or sound cannot be decrypted', llTerminada: 'Video call ended',
    conversacion: 'CONVERSATION', vacio: 'What you write is encrypted on each device and disappears when you end.', escribiendo: 'Typing…',
    adjuntar: 'Attach', enviar: 'Send', escribeAqui: 'Write a message', descargar: 'Download', archivoEnviado: 'Sent', archivoCancelado: 'Transfer canceled',
    archivoGrande: 'The file is over 1 GB, the maximum in this version', archivoNo: 'The file could not be sent',
    mConectado: 'Connected · keys agreed on both devices', clavesRenovadas: 'Keys renewed', seFue: 'The other person disconnected', vuelve: 'The other person is back',
    intruso: 'Someone with another identity tried to join: rejected', integridad: 'A frame failed the integrity check and was discarded', sinRed: 'Offline',
    finEtiqueta: 'CALL ENDED', finTitulo: 'Everything has been erased.', finSuyoTitulo: 'The other person hung up.',
    finTexto: 'For your privacy, everything is removed from this device when the call ends.',
    finL1: 'Messages, photos and files deleted', finL2: 'Encryption keys destroyed', finL3: 'The server only relayed encrypted data',
    alarmaEtiqueta: 'SECURITY ALERT', alarmaTitulo: 'Conversation cut.',
    alarmaTexto: 'The keys or the words did not match what was committed: someone could be in the middle. Everything has been erased on both devices. Do not send anything important and start again with a new code.',
    noCoincidenTitulo: 'The words did not match.',
    noCoincidenTexto: 'You cut the conversation and everything was erased. If the words do not match, someone may be in the middle: create a new code and give it to the other person through another channel.',
    entendido: 'Understood', verRepositorio: 'View the code',
    pantallaCompleta: 'Full screen', salirPantalla: 'Exit full screen',
    
    
    t5t: 'Liveness check', t5p: 'During a video call either of you can request a random challenge: a gesture or a word the other must perform live. It helps expose a recorded video or an AI-generated face; it is not infallible proof.',
    verificarEtiqueta: 'VERIFY THIS PAGE', verificarTitulo: 'The code is public.',
    verificarTexto: 'This page is published as-is from a public repository. In its code, every script and the stylesheet carry their SHA-384 fingerprint, and your browser will not load any that does not match. You can compare those fingerprints with the repository.',
    video: 'Video', chatCifrado: 'Post-quantum encrypted', chatCifradoEstandar: 'Standard encryption', responder: 'Reply',
    notaVoz: 'Voice note', notaEnviada: 'Voice note sent', enviandoNota: 'Sending the voice note…', notaRecibida: 'Voice note', recibiendoNota: 'Receiving a voice note…', escuchar: 'Listen',
    notaSinMicro: 'There is no permission to use the microphone.', notaNo: 'This browser cannot record voice notes.', girarTitulo: 'Turn your phone', girarTexto: '1718 works in portrait mode.',
    
    pieTerminos: 'Terms of use', piePrivacidad: 'Privacy', pieCookies: 'Cookies', pieContacto: 'Contact', pieX: 'X · @1718calls', piePrecios: 'Pricing', pieReembolsos: 'Refunds', pieCiudad: 'Cartagena de Indias, Colombia', 
    
    
    pocaLuzT: 'It is very dark', pocaLuz: 'Face a light so they can see you clearly.', girarBoton: 'Flip', 
    
    
    llamandoT: 'Calling', conectandoT: 'Connecting', sinTiempoT: 'No time left',
    esperaSinTiempo: 'You have no minutes left to start. The person who invites pays: buy time to talk.',
    
    
    
    e3Etiqueta: 'HOW THEY LISTEN IN', e3Titulo: 'An ordinary call can be <em class="c-ambar">overheard</em> along the way.',
    e3Texto: 'A phone call is only encrypted up to the cell tower. After that, it crosses networks neither of you controls.',
    e3N0: 'Your phone', e3N1: 'Cell tower', e3N2: 'Your carrier', e3N3: 'Between carriers', e3N4: 'Their phone',
    e3R1T: 'Fake cell tower.', e3R1: 'It poses as your carrier’s and forces 2G, which is far weaker.',
    e3R2T: 'Inside the carrier.', e3R2: 'Lawful-interception systems can be attacked. In 2024 it emerged that they had been.',
    e3R3T: 'SS7 and Diameter.', e3R3: 'They can divert calls and texts without properly checking who asks.',
    e3R4T: 'Spyware.', e3R4: 'Something like Pegasus sees everything before it is encrypted.',
    e4Etiqueta: 'THE ANSWER', e4Titulo: '<em class="c-verde">Only the two of you</em> can read it.', e4Tu: 'Your device', e4Su: 'Their device', e4Rele: 'Server: sees only bytes', e4Msg: 'We sign tomorrow at 10',
    e4P1T: 'Encrypted on your device.', e4P1: 'It leaves your device encrypted, and only the other device can open it.',
    e4P2T: 'No account, no number.', e4P2: 'Nothing that identifies you. Nothing that can leak.',
    e4P3T: 'Nothing stored.', e4P3: 'The conversation exists only on your two screens and disappears when you close it.',
    e4P4T: 'No one in between.', e4P4: 'On a computer, four words that only match if no one is in between.',
    
    
    e6Etiqueta: 'THE TECHNOLOGY', e6Titulo: 'Two locks. <em class="c-hielo">One conversation.</em>',
    e6Texto: 'Hybrid post-quantum encryption, in your browser: reading a conversation would mean breaking classical and post-quantum cryptography at the same time.',
    e6F1: 'Hybrid post-quantum key agreement, at the standard’s highest level.', e6F2: 'Post-quantum signatures on every key agreement.', e6F3: 'Encryption of every message, file, image and sound.',
    e6F4T: 'Every minute', e6F4: 'A fresh post-quantum key agreement and a different key for every message.',
    e6F5T: 'Constant pace', e6F5: 'Identical packets at a fixed pace: from outside, no one can tell when you speak.',
    e6F6T: 'No addresses', e6F6: 'The call goes through our server: neither of you sees the other’s address.',
    e6F7T: 'Up to 4K', e6F7: '1080p on phones and 4K on computers, adapting to the connection on its own.',
    e6F8T: 'Open source', e6F8: 'Published under the AGPL-3.0 license: anyone can review it and check there are no backdoors. Every script carries its SHA-384 fingerprint.',
    e6Limite: 'What no tool can promise, neither can we: if a device is infected, whoever controls it sees what you see.',
    e7Etiqueta: 'HOW WE COMPARE', e7Titulo: 'Your apps for daily life. <em class="c-hielo">1718 for what counts.</em>', e7Texto: 'WhatsApp, Telegram and Signal are fine for everyday use. 1718 is for sensitive conversations: post-quantum encryption, no account, no phone number and no history.',
    no: 'No',
    e8Etiqueta: 'HOW IT WORKS', e8Titulo: 'As simple as <em class="c-verde">tapping a link</em>.',
    e8P1T: 'Invite.', e8P1: 'Press “Video call” and send the invitation on WhatsApp. To talk with voice only, turn off your camera.', e8P2T: 'Tap the link.', e8P2: 'Whoever receives it taps it and the call starts by itself.',
    e8P3T: 'Talk.', e8P3: 'Post-quantum end-to-end encryption. When you hang up, nothing remains.',
    e9Titulo: 'If it matters, <em class="c-ambar">talk here</em>.',
    e9Texto: 'For a board meeting, a deal, a contract or a personal conversation that must stay between you. Designed for individuals, law firms, clinics and companies.',
    
    otroSalio: 'The other person has left 1718. To talk again, send them a new invitation.', invitarDeNuevo: 'Invite again', previaFoto: 'Send photo', previaFotos: 'Send photos', previaArchivo: 'Send file', previaArchivos: 'Send files', quitar: 'Remove', parar: 'Stop', borrarTodos: 'Delete for everyone', borrarMi: 'Delete for me', copiarMsg: 'Copy', copiadoMsg: 'Copied', mensajeBorrado: 'You deleted this message', mensajeBorradoSuyo: 'This message was deleted', girarCamara: 'Flip camera',
  };
  const TITULO = { es: '1718 · Conversaciones privadas poscuánticas', en: '1718 · Private post-quantum conversations' };
  const ES = {}; // lo original de la página, para volver al español
  let actual = 'es';
  for (const el of document.querySelectorAll('[data-t]')) { const k = el.dataset.t; if (!(k in ES)) ES[k] = el.innerHTML; }
  for (const el of document.querySelectorAll('[data-t-placeholder]')) { const k = el.dataset.tPlaceholder; if (!(k in ES)) ES[k] = el.getAttribute('placeholder') || ''; }
  for (const k of Object.keys(ES_MAS)) if (!(k in ES)) ES[k] = ES_MAS[k];
  const t = (k) => (actual === 'en' ? EN[k] : ES[k]) || ES[k] || EN[k] || k;
  function pon(idioma) {
    actual = idioma === 'en' ? 'en' : 'es';
    document.documentElement.lang = actual; document.title = TITULO[actual];
    for (const el of document.querySelectorAll('[data-t]')) { const v = t(el.dataset.t); if (el.innerHTML !== v) el.innerHTML = v; }
    for (const el of document.querySelectorAll('[data-t-placeholder]')) el.setAttribute('placeholder', t(el.dataset.tPlaceholder));
    for (const el of document.querySelectorAll('[data-t-aria]')) el.setAttribute('aria-label', t(el.dataset.tAria));
    // los enlaces que tienen su página en cada idioma (términos y privacidad)
    for (const el of document.querySelectorAll('a[data-href-en]')) { if (!el.dataset.hrefEs) el.dataset.hrefEs = el.getAttribute('href'); el.setAttribute('href', actual === 'en' ? el.dataset.hrefEn : el.dataset.hrefEs); }
    for (const b of document.querySelectorAll('[data-idioma]')) b.setAttribute('aria-pressed', String(b.dataset.idioma === actual));
    document.dispatchEvent(new CustomEvent('elixire-idioma', { detail: { idioma: actual } }));
  }
  // De partida, en inglés (dueño, 13:09); solo se guarda lo que la persona elige con ES/EN.
  let guardado = null; try { guardado = localStorage.getItem('elixire-lengua'); } catch (_) {}
  const delEnlace = (/[#&]l=(es|en)\b/.exec(location.hash || '') || [])[1]; // la invitación lleva el idioma de quien la manda
  const inicial = (guardado || delEnlace) === 'es' ? 'es' : 'en';
  // ES / EN (dueño, 23 nov 12:15: «ponlo bien profesional… se da y no sabes si has clicado; va como a tirones»): al tocar, la ficha
  // y el botón cambian en el acto; la página se traduce justo después de pintarlos (la ficha se desliza suave mientras tanto). Tocar el
  // idioma que ya está no hace nada.
  const grupoIdioma = document.querySelector('.idiomas');
  let pedido = actual, traduceT = 0;
  const marca = (k) => { pedido = k; if (grupoIdioma) grupoIdioma.dataset.pedido = k; for (const b of document.querySelectorAll('[data-idioma]')) b.setAttribute('aria-pressed', String(b.dataset.idioma === k)); };
  for (const b of document.querySelectorAll('[data-idioma]')) b.addEventListener('click', () => {
    const k = b.dataset.idioma === 'en' ? 'en' : 'es';
    if (k === pedido) return;
    marca(k); try { localStorage.setItem('elixire-lengua', k); } catch (_) {}
    cancelAnimationFrame(traduceT); traduceT = requestAnimationFrame(() => setTimeout(() => { if (pedido === k && actual !== k) pon(k); }, 0));
  });
  window.ElixireIdioma = { t, pon, actual: () => actual };
  if (inicial !== 'es') pon(inicial);
  marca(actual);
  document.documentElement.classList.remove('traduciendo');
  if (grupoIdioma) requestAnimationFrame(() => requestAnimationFrame(() => grupoIdioma.classList.add('listo')));
})();
