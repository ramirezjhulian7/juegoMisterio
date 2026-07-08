/**
 * Contenido del caso propio "Pantalla en Negro" (Caso 004).
 * Las imagenes van en server/uploads/pantalla-negra/<archivo>.
 * Si un archivo no existe, el seed genera un placeholder con ese nombre.
 */

export const PANTALLA_NEGRA = {
  slug: "pantalla-negra",
  case_number: "004-07052026",
  title: "Pantalla en Negro",
  objective:
    "Durante una LAN party en La Ceja, un apagón deja a oscuras la casa. Cuando vuelve la luz, Uber aparece muerto. Descubran quién lo hizo, cómo y por qué.",
  verify_url: null as string | null,
  cover_path: "pantalla-negra/portada.png",

  // Órdenes de registro que tiene el equipo. Hay 4 sospechosos: solo pueden catear a 2.
  search_budget: 2,

  // ---- Lectura narrativa del caso (se muestra al abrir la sala)
  briefing: `La Ceja, Antioquia. Domingo, 5 de julio de 2026, 8:00 p.m.

Cuatro parejas se reúnen en la casa de Jhuls para una noche de videojuegos: la clásica *LAN party* del grupo. Torres de computador, cables por todas partes, cerveza, pizza y risas. Los hombres —Jhuls, Mauro, Beta y Uber— montan los equipos; sus parejas los acompañan entre partida y partida.

Uber, el conductor de aplicación del grupo, es el alma de la fiesta: el que a todos les cae bien, el que todo el mundo quiere en su carro porque escucha, aconseja y guarda secretos. Esa noche, sin embargo, Uber estaba raro. Serio. Como si cargara algo.

A las 10:41 de la noche, una tormenta eléctrica —de esas que no perdonan al Oriente antioqueño— revienta un transformador y deja a oscuras todo el barrio. Doce minutos de negrura absoluta. Velas, lucecitas de celular, nervios y bromas.

Cuando la luz vuelve a las 10:53, Uber no está riendo con los demás. Está en el suelo del cuarto de equipos, sin vida, con un golpe en la nuca.

Nadie salió de la casa. La Policía acordonó todo. Eso significa una sola cosa:

**el asesino sigue entre ustedes.**

Su trabajo, detectives, es reconstruir esos doce minutos a oscuras. Interroguen las evidencias, crucen las coartadas y descubran quién apagó para siempre la pantalla de Uber... y por qué.`,

  // ---- Evidencias (orden = como se muestran). file = nombre en uploads/pantalla-negra/
  evidence: [
    { type: "intro", title: "Portada del expediente", file: "portada.png" },
    { type: "photo", title: "Escena del crimen — cuarto de equipos", file: "escena.png" },
    { type: "photo", title: "Uberney 'Uber' — la víctima", file: "victima-uber.png" },
    { type: "suspect", title: "Beta", file: "ficha-beta.png" },
    { type: "suspect", title: "Jhuls", file: "ficha-jhuls.png" },
    { type: "suspect", title: "Mauro", file: "ficha-mauro.png" },
    { type: "suspect", title: "Zaida", file: "ficha-zaida.png" },
    { type: "witness", title: "Declaración de Daniela", file: "testigo-daniela.png" },
    { type: "witness", title: "Declaración de Zaida", file: "testigo-zaida.png" },
    { type: "witness", title: "Declaración de Camila", file: "testigo-camila.png" },
    { type: "witness", title: "Declaración de Maria", file: "testigo-maria.png" },
    { type: "call", title: "Chat: Uber ↔ Beta", file: "chat-uber.png" },
    { type: "call", title: "Mensajes de Zaida a Uber", file: "chat-zaida.png" },
    { type: "article", title: "Reporte de interrupción — EPM", file: "reporte-epm.png" },
    { type: "article", title: "Laboratorio: análisis de la mancha", file: "lab-vino.png" },
    { type: "photo", title: "La mesa: ¿quién bebía qué?", file: "mesa-bebidas.png" },
    { type: "article", title: "Necropsia de la víctima", file: "necropsia.png" },
    { type: "other", title: "Plano de la casa", file: "plano-casa.png" },

    // ---- Evidencias OCULTAS: se revelan al "Solicitar registro" del sospechoso ----
    { type: "letter", title: "Registro a Beta: documentos ocultos", file: "documentos-beta.png", locked: "Beta" },
    { type: "article", title: "Registro a Zaida: huellas en el arma (UPS)", file: "huellas-ups.png", locked: "Zaida" },
    { type: "article", title: "Registro a Jhuls: reporte del técnico eléctrico", file: "registro-jhuls.png", locked: "Jhuls" },
    { type: "call", title: "Registro a Mauro: detalle de la llamada", file: "registro-mauro.png", locked: "Mauro" },
  ],

  // ---- Sospechosos (el mugshot apunta a la evidencia tipo suspect)
  suspects: [
    { name: "Beta", file: "ficha-beta.png", details: { rol: "Novio de Zaida", edad: 31 } },
    { name: "Jhuls", file: "ficha-jhuls.png", details: { rol: "Anfitrión, esposo de Daniela", edad: 33 } },
    { name: "Mauro", file: "ficha-mauro.png", details: { rol: "Esposo de Maria", edad: 35 } },
    { name: "Zaida", file: "ficha-zaida.png", details: { rol: "Novia de Beta", edad: 28 } },
  ],

  // ---- Objetivos con validacion automatica
  objectives: [
    {
      prompt: "1. ¿Quién mató a Uber?",
      answer: "beta",
      accepts: "",
    },
    {
      prompt: "2. ¿Con qué arma / cómo lo hizo?",
      answer: "ups",
      accepts: "bateria|batería|ups del rack|la ups|bateria del rack|batería del rack",
    },
    {
      prompt: "3. ¿Cuál fue el móvil?",
      answer: "secreto",
      accepts:
        "el secreto|pasado oculto|su pasado|identidad oculta|la identidad|chantaje|lo iba a delatar|iba a contarle a zaida",
    },
  ],

  // ---- Linea de tiempo del caso (SOLO hechos objetivos y neutrales;
  //      nada que apunte a un culpable — eso se deduce de las evidencias).
  timeline: [
    { time: "8:00 p.m.", title: "Empieza la LAN party", desc: "Llegan las cuatro parejas a casa de Jhuls. Montan los equipos entre todos." },
    { time: "9:30 p.m.", title: "Ajustes en los equipos", desc: "Hay problemas de conexión; varios de los presentes trastean cables y el rack para que todo funcione." },
    { time: "10:15 p.m.", title: "Última partida", desc: "El grupo juega la última ronda. Uber sube al cuarto de equipos a preparar la siguiente." },
    { time: "10:41 p.m.", title: "Apagón", desc: "Una tormenta eléctrica corta la luz de todo el sector. Oscuridad total." },
    { time: "10:53 p.m.", title: "Vuelve la luz", desc: "Al regresar la energía en la casa, encuentran a Uber sin vida en el cuarto de equipos." },
    { time: "11:10 p.m.", title: "Llega la Policía", desc: "Acordonan la casa. Nadie ha salido. El culpable sigue dentro." },
  ],

  // ---- Pistas: se desbloquean por TIEMPO (una cada 10 min), no bajo demanda.
  //      Orientan CÓMO investigar, sin descartar sospechosos ni nombrar al culpable.
  hints: [
    "La prueba más llamativa contra alguien no siempre es la verdadera. Pregúntense siempre: ¿cuándo y cómo llegó esa prueba a estar ahí?",
    "Una coartada vale por quien la confirma. Crucen cada declaración con la de los demás: ¿se sostienen entre sí o se contradicen?",
    "Fíjense en los pequeños detalles físicos: estatura, ropa, qué bebía cada quién. Un solo detalle puede ubicar (o descartar) a alguien en la escena.",
    "El arma no apareció sola en el cuarto. ¿Quién tuvo la oportunidad de dejarla lista antes del apagón?",
    "Todo crimen tiene un móvil. ¿Quién tenía algo que perder si Uber hablaba esa noche?",
  ],
};
