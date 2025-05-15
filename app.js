document.addEventListener('DOMContentLoaded', () => {

    // -------- INICIO DE LA ALERTA A AÑADIR --------
    const mensajeAlerta = "AVISO IMPORTANTE:\n\n" +
                          "Todos los tests han sido generados con Inteligencia Artificial (IA).\n\n" +
                          "Es posible que existan errores o información incorrecta.\n\n" +
                          "Si detectas algún fallo o algo que necesite revisión, por favor, comunícaselo a tus compañeras para que pueda ser corregido.\n\n" +
                          "¡Tu colaboración es muy valiosa!";

    alert(mensajeAlerta);
    // -------- FIN DE LA ALERTA A AÑADIR --------
    
     const vistas = {
        listaExamenes: document.getElementById('lista-temas-examenes'),
        examen: document.getElementById('vista-examen'),
        resultado: document.getElementById('vista-resultado')
    };

    const elementosExamen = {
        tituloExamen: document.getElementById('titulo-examen'),
        contenedorTodasPreguntas: document.getElementById('contenedor-todas-preguntas'),
        botonFinalizarTodo: document.getElementById('boton-finalizar-todo'),
        botonVolverInicioExamen: document.getElementById('boton-volver-inicio-examen'),
        //AÑADIR EL NUEVO BOTÓN Y EL CONTENEDOR DEL CASO CLÍNICO
        descripcionCasoContenedorGlobal: document.getElementById('descripcion-caso-contenedor'), // Ya lo tienes referenciado en iniciarExamen
        botonScrollCaso: document.getElementById('boton-scroll-caso')
    };
    const elementosResultado = {
        puntuacion: document.getElementById('puntuacion'),
        feedbackGeneral: document.getElementById('feedback-general'),
        botonVolverInicioResultado: document.getElementById('boton-volver-inicio-resultado'),
        botonRevisarRespuestas: document.getElementById('boton-revisar-respuestas'),
        revisionRespuestasContenedor: document.getElementById('revision-respuestas-contenedor')
    };

    let examenesData = {};
    let temasData = [];
    let examenActual = null;
    let preguntasExamenActual = [];
    let respuestasUsuario = [];

    async function cargarDatosIniciales() {
        try {
            const resTemas = await fetch('data/temas.json');
            if (!resTemas.ok) {
                throw new Error(`Error al cargar temas.json: ${resTemas.status} ${resTemas.statusText}. Asegúrate de que el archivo existe en 'data/temas.json' y la ruta es correcta.`);
            }
            
            try {
                temasData = await resTemas.json();
            } catch (e) {
                const textoError = await resTemas.text(); // Leer el contenido para depuración
                throw new Error(`El archivo temas.json no es un JSON válido: ${e.message}. Contenido recibido: "${textoError}"`);
            }
            
           const todosLosNombresArchivosExamenes = [];
temasData.forEach(tema => {
    if (tema.id === "paliativos_general") {
        // Vamos a cargar los 10 exámenes generales de paliativos
        for (let i = 1; i <= 11; i++) { 
            todosLosNombresArchivosExamenes.push(`data/examenes/paliativos_general_examen${i}.json`);
        }
    }
    // Puedes eliminar la lógica 'else if (tema.id !== 'global')' y el 'else' para globales
    // si solo vas a tener este tema de "paliativos_general".
});

console.log(todosLosNombresArchivosExamenes);
            
            const promesasExamenes = todosLosNombresArchivosExamenes.map(async (rutaArchivo) => {
                try {
                    const res = await fetch(rutaArchivo);
                    if (res.ok) {
                        const data = await res.json();
                        examenesData[data.idExamen] = data;
                        return { status: 'fulfilled', value: data.idExamen };
                    } else {
                        // Silenciar warnings de archivos no encontrados si es esperado durante el desarrollo
                        // console.warn(`Archivo de examen no encontrado (esperado si no existe): ${rutaArchivo} (${res.status})`);
                        return { status: 'rejected', reason: `Archivo ${rutaArchivo} no encontrado (${res.status})` };
                    }
                } catch (error) { // Error al parsear JSON de un examen específico
                    // console.warn(`Error procesando ${rutaArchivo} (posiblemente JSON inválido):`, error);
                    return { status: 'rejected', reason: `Error procesando ${rutaArchivo}: ${error}` };
                }
            });

            await Promise.allSettled(promesasExamenes);
            mostrarListaExamenes();

        } catch (error) {
            console.error("Error fatal al cargar datos iniciales:", error);
            vistas.listaExamenes.innerHTML = `<p>Error crítico al cargar la configuración: ${error.message}. Revisa la consola del navegador para más detalles (F12).</p>`;
        }
    }

    function mostrarVista(vistaNombre) {
        for (const key in vistas) {
            vistas[key].classList.add('oculto');
        }
        if (vistas[vistaNombre]) {
            vistas[vistaNombre].classList.remove('oculto');
        }
        elementosResultado.revisionRespuestasContenedor.classList.add('oculto');
    }

    function mostrarListaExamenes() {
        vistas.listaExamenes.innerHTML = '';

        if (temasData.length === 0) {
             vistas.listaExamenes.innerHTML = "<p>No se cargaron temas. Verifica el archivo 'data/temas.json'.</p>";
             return;
        }

        function extraerNumeroExamen(idExamen) {
            if (!idExamen) return 0; // Fallback
            const match = idExamen.match(/\d+$/); // Extrae el número al final del string
            return match ? parseInt(match[0], 10) : 0; // Convierte a número, o 0 si no hay número
        }

        temasData.forEach(tema => {
            const temaContainer = document.createElement('div');
            temaContainer.className = 'tema-container';
            const temaTitulo = document.createElement('h2');
            temaTitulo.textContent = tema.nombre;
            temaContainer.appendChild(temaTitulo);

            const examenesListaDiv = document.createElement('div');
            examenesListaDiv.className = 'examenes-lista';

            const examenesDelTema = Object.values(examenesData).filter(ex => ex && ex.idTema === tema.id);

           examenesDelTema.sort((a, b) => {
                const numA = extraerNumeroExamen(a.idExamen);
                const numB = extraerNumeroExamen(b.idExamen);
                
                // Primero, comparar la parte no numérica (prefijo) para agrupar correctamente
                // si hubiera diferentes prefijos (ej. 'paliativos_general_examen' vs 'otro_tema_examen')
                // Aunque en tu caso actual, todos los exámenes bajo un tema parecen tener el mismo prefijo.
                const prefijoA = (a.idExamen || '').replace(/\d+$/, '');
                const prefijoB = (b.idExamen || '').replace(/\d+$/, '');

                if (prefijoA.localeCompare(prefijoB) !== 0) {
                    return prefijoA.localeCompare(prefijoB);
                }
                // Si los prefijos son iguales, ordenar por número
                return numA - numB;
            });

            if (tema.id === "casos_clinicos") {
                temaContainer.classList.add('seccion-casos-clinicos'); // ¡Esta es la clase clave!
            } else if (tema.id === "global") {
                temaContainer.classList.add('seccion-global');
            } else {
                temaContainer.classList.add('seccion-tema-regular');
            }

            if (examenesDelTema.length > 0) {
                examenesDelTema.forEach(examen => {
                    const boton = document.createElement('button');
                    boton.className = 'boton-examen';
                    boton.dataset.examenId = examen.idExamen;

                    const nombreExamenSpan = document.createElement('span');
                    nombreExamenSpan.className = 'nombre-examen-texto';
                    nombreExamenSpan.textContent = examen.nombreExamen;
                    boton.appendChild(nombreExamenSpan);

                    const notaSpan = document.createElement('span');
                    notaSpan.className = 'nota-examen';
                    notaSpan.id = `nota-${examen.idExamen}`;
                    const notaGuardada = localStorage.getItem(`nota_${examen.idExamen}`);
                    notaSpan.textContent = notaGuardada ? `${notaGuardada}%` : '-';
                    boton.appendChild(notaSpan);

                    boton.addEventListener('click', () => iniciarExamen(examen.idExamen));
                    examenesListaDiv.appendChild(boton);
                });
            } else {
                const noExamenesMsg = document.createElement('p');
                noExamenesMsg.textContent = "No hay exámenes disponibles para este tema.";
                examenesListaDiv.appendChild(noExamenesMsg);
            }
            temaContainer.appendChild(examenesListaDiv);
            vistas.listaExamenes.appendChild(temaContainer);
        });
        
        if (vistas.listaExamenes.children.length === 0 && temasData.length > 0) {
             vistas.listaExamenes.innerHTML = "<p>Temas cargados, pero no se encontraron exámenes asociados. Verifica los archivos JSON y sus 'idTema'.</p>";
        }
        mostrarVista('listaExamenes');
        
    }

    let scrollCasoPosicionGuardada = 0;
    let botonScrollCasoModoBajar = false; // false = flecha arriba (subir), true = flecha abajo (bajar)

    // --- MODIFICACIONES EN cargarDatosIniciales o donde se limpian estados ---
    // Al volver al inicio, reseteamos el estado del botón de scroll
    // (Por ejemplo, en tu función que te lleva a la lista de exámenes)


    function iniciarExamen(idExamen) {
        examenActual = examenesData[idExamen];
        if (!examenActual || !examenActual.preguntas || examenActual.preguntas.length === 0) {
            console.error("Examen no encontrado o sin preguntas válidas:", idExamen, examenActual);
            alert("Este examen no está disponible o tiene un formato incorrecto.");
            cargarDatosIniciales(); // Volver al inicio si hay error
            return;
        }
        preguntasExamenActual = examenActual.preguntas;

        const respuestasGuardadasString = localStorage.getItem(`respuestas_${examenActual.idExamen}`);
        if (respuestasGuardadasString) {
            try {
                const respuestasParseadas = JSON.parse(respuestasGuardadasString);
                if (Array.isArray(respuestasParseadas) && respuestasParseadas.length === preguntasExamenActual.length) {
                    respuestasUsuario = respuestasParseadas;
                } else {
                    console.warn(`Desajuste en respuestas guardadas para ${idExamen}. Se reiniciarán.`);
                    respuestasUsuario = new Array(preguntasExamenActual.length).fill(null);
                }
            } catch (e) {
                console.error(`Error al parsear respuestas guardadas para ${idExamen}:`, e);
                respuestasUsuario = new Array(preguntasExamenActual.length).fill(null);
            }
        } else {
            respuestasUsuario = new Array(preguntasExamenActual.length).fill(null);
        }
        
        elementosExamen.tituloExamen.textContent = examenActual.nombreExamen;

         const descripcionCasoContenedor = document.getElementById('descripcion-caso-contenedor'); // Lo usas localmente aquí

        if (examenActual.descripcionCaso) {
            descripcionCasoContenedor.innerHTML = examenActual.descripcionCaso;
            descripcionCasoContenedor.classList.remove('oculto');
            
            // Lógica para el botón de scroll del caso
            if (elementosExamen.botonScrollCaso) { // Asegurarse de que el botón existe
                botonScrollCasoModoBajar = false; // Resetear modo a "subir"
                elementosExamen.botonScrollCaso.innerHTML = '&uarr;'; // Flecha arriba
                elementosExamen.botonScrollCaso.title = "Subir al caso clínico";
                // Mostrar el botón inicialmente oculto o según el scroll (ver manejador de scroll)
                actualizarVisibilidadBotonScrollCaso(); // Llamada inicial
            }
        } else {
            descripcionCasoContenedor.innerHTML = '';
            descripcionCasoContenedor.classList.add('oculto');
            if (elementosExamen.botonScrollCaso) {
                elementosExamen.botonScrollCaso.classList.add('oculto'); // Ocultar si no hay caso
            }
        }

        renderizarTodasLasPreguntas();
        elementosExamen.botonFinalizarTodo.classList.remove('oculto');
        mostrarVista('examen');
        window.scrollTo(0, 0);
        actualizarVisibilidadBotonScrollCaso(); // Actualizar tras el scroll to top
    }

    function actualizarVisibilidadBotonScrollCaso() {
        if (!elementosExamen.botonScrollCaso || !examenActual || !examenActual.descripcionCaso || vistas.examen.classList.contains('oculto')) {
            if (elementosExamen.botonScrollCaso) elementosExamen.botonScrollCaso.classList.add('oculto');
            return;
        }

        const descripcionCont = elementosExamen.descripcionCasoContenedorGlobal; // Usar la referencia global
        if (!descripcionCont) return;

        const umbralParaMostrar = descripcionCont.offsetTop + (descripcionCont.offsetHeight / 2); // Mostrar cuando la mitad del caso ya no se ve

        if (botonScrollCasoModoBajar) {
            // Si está en modo bajar (flecha abajo), siempre visible mientras estemos en el examen de caso
            elementosExamen.botonScrollCaso.classList.remove('oculto');
            elementosExamen.botonScrollCaso.innerHTML = '&darr;';
            elementosExamen.botonScrollCaso.title = "Bajar a las preguntas";
        } else {
            // Modo subir (flecha arriba)
            if (window.scrollY > umbralParaMostrar) {
                elementosExamen.botonScrollCaso.classList.remove('oculto');
            } else {
                elementosExamen.botonScrollCaso.classList.add('oculto');
            }
            elementosExamen.botonScrollCaso.innerHTML = '&uarr;';
            elementosExamen.botonScrollCaso.title = "Subir al caso clínico";
        }
    }

    if (elementosExamen.botonScrollCaso) {
        elementosExamen.botonScrollCaso.addEventListener('click', () => {
            if (!examenActual || !examenActual.descripcionCaso) return;

            const descripcionCont = elementosExamen.descripcionCasoContenedorGlobal; // Usar la referencia global

            if (botonScrollCasoModoBajar) {
                // Bajar a la posición guardada
                window.scrollTo({ top: scrollCasoPosicionGuardada, behavior: 'smooth' });
                botonScrollCasoModoBajar = false;
                // La flecha se actualizará con el evento de scroll, o forzamos:
                // No es necesario, el scroll activará actualizarVisibilidadBotonScrollCaso
            } else {
                // Subir al inicio del caso clínico
                scrollCasoPosicionGuardada = window.scrollY; // Guardar posición actual
                if (descripcionCont) {
                    // descripcionCont.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // scrollIntoView puede ser problemático si el header es fixed. Mejor scrollTo.
                    window.scrollTo({ top: descripcionCont.offsetTop, behavior: 'smooth'});
                }
                botonScrollCasoModoBajar = true;
            }
            // Es importante llamar a actualizarVisibilidadBotonScrollCaso DESPUÉS de cambiar el modo
            // y DESPUÉS de que el scroll pueda haber comenzado, para que la flecha cambie inmediatamente
            // si el scroll no es instantáneo. Un pequeño timeout puede ayudar.
            // O mejor, que el propio scroll event lo maneje.
            // Para un cambio visual más rápido de la flecha al hacer clic:
            actualizarVisibilidadBotonScrollCaso(); 
        });
    }

    // Event listener para el scroll de la página
    window.addEventListener('scroll', () => {
        // Solo actualizar si estamos en la vista de examen y hay un caso clínico
        if (!vistas.examen.classList.contains('oculto') && examenActual && examenActual.descripcionCaso) {
            actualizarVisibilidadBotonScrollCaso();
        } else if (elementosExamen.botonScrollCaso) {
            // Si no estamos en examen de caso clínico, ocultar el botón
            elementosExamen.botonScrollCaso.classList.add('oculto');
        }
    });
    
    // Cuando se cambia de vista, asegurarse de que el botón se oculte si no es la vista de examen.
    function mostrarVista(vistaNombre) {
        for (const key in vistas) {
            vistas[key].classList.add('oculto');
        }
        if (vistas[vistaNombre]) {
            vistas[vistaNombre].classList.remove('oculto');
        }
        elementosResultado.revisionRespuestasContenedor.classList.add('oculto');

        if (vistaNombre !== 'examen' || (examenActual && !examenActual.descripcionCaso)) {
            if (elementosExamen.botonScrollCaso) {
                elementosExamen.botonScrollCaso.classList.add('oculto');
            }
        } else if (vistaNombre === 'examen' && examenActual && examenActual.descripcionCaso) {
            actualizarVisibilidadBotonScrollCaso(); // Revisar estado al mostrar vista examen
        }
    }

    function renderizarTodasLasPreguntas() {
        elementosExamen.contenedorTodasPreguntas.innerHTML = ''; 

        preguntasExamenActual.forEach((pregunta, questionIndex) => {
            const preguntaContainer = document.createElement('div');
            preguntaContainer.className = 'pregunta-item';

            const textoPregunta = document.createElement('p');
            textoPregunta.className = 'texto-pregunta';
            textoPregunta.textContent = `${questionIndex + 1}. ${pregunta.texto}`;
            preguntaContainer.appendChild(textoPregunta);

            const listaOpciones = document.createElement('ul');
            listaOpciones.className = 'lista-opciones';

            pregunta.opciones.forEach(opcion => {
                const itemOpcion = document.createElement('li');
                const inputRadio = document.createElement('input');
                inputRadio.type = 'radio';
                inputRadio.name = `pregunta_${pregunta.idPregunta || questionIndex}`; 
                inputRadio.value = opcion.id;
                inputRadio.id = `opcion_${pregunta.idPregunta || questionIndex}_${opcion.id}`;

                if (respuestasUsuario[questionIndex] === opcion.id) {
                    inputRadio.checked = true;
                    itemOpcion.classList.add('opcion-seleccionada');
                }

                inputRadio.addEventListener('change', () => {
                    respuestasUsuario[questionIndex] = opcion.id;
                    const opcionesDeEstaPregunta = listaOpciones.querySelectorAll('li');
                    opcionesDeEstaPregunta.forEach(li => li.classList.remove('opcion-seleccionada'));
                    itemOpcion.classList.add('opcion-seleccionada');
                });
                
                itemOpcion.addEventListener('click', () => { 
                    if(!inputRadio.checked) { 
                        inputRadio.checked = true;
                        inputRadio.dispatchEvent(new Event('change')); 
                    }
                });

                const labelOpcion = document.createElement('label');
                labelOpcion.htmlFor = inputRadio.id;
                labelOpcion.textContent = opcion.texto;

                itemOpcion.appendChild(inputRadio); 
                itemOpcion.appendChild(labelOpcion);
                listaOpciones.appendChild(itemOpcion);
            });
            preguntaContainer.appendChild(listaOpciones);
            elementosExamen.contenedorTodasPreguntas.appendChild(preguntaContainer);
        });
    }
    
    elementosExamen.botonVolverInicioExamen.addEventListener('click', () => {
        if (confirm("¿Seguro que quieres abandonar el examen? Tu progreso actual no se guardará si no has finalizado.")) {
            cargarDatosIniciales(); 
        }
    });

    elementosExamen.botonFinalizarTodo.addEventListener('click', () => {
        const respondidasCount = respuestasUsuario.filter(r => r !== null).length;
        const noRespondidasCount = preguntasExamenActual.length - respondidasCount;
        let proceder = true;
        
        if (noRespondidasCount > 0) {
            if (!confirm(`Aún tienes ${noRespondidasCount} pregunta(s) sin responder. ¿Deseas finalizar de todas formas?`)) {
                proceder = false;
            }
        }
        if (proceder) {
            finalizarExamen(noRespondidasCount > 0); 
        }
    });

    function finalizarExamen(fueEntregadoIncompleto) { // Renombrada variable para claridad
        let correctas = 0;
        let respondidas = 0;
        const desgloseResultadosIndividuales = [];

        preguntasExamenActual.forEach((pregunta, index) => {
            if (respuestasUsuario[index] !== null) {
                respondidas++;
                const esCorrecta = respuestasUsuario[index] === pregunta.respuestaCorrecta;
                if (esCorrecta) {
                    correctas++;
                }
                if (fueEntregadoIncompleto) { 
                    desgloseResultadosIndividuales.push({
                        numero: index + 1,
                        estado: esCorrecta ? "Correcta" : "Incorrecta"
                    });
                }
            }
        });

        const totalPreguntas = preguntasExamenActual.length;
        const porcentaje = totalPreguntas > 0 ? Math.round((correctas / totalPreguntas) * 100) : 0;

        localStorage.setItem(`nota_${examenActual.idExamen}`, porcentaje.toString());
        localStorage.setItem(`respuestas_${examenActual.idExamen}`, JSON.stringify(respuestasUsuario));

        const notaSpan = document.getElementById(`nota-${examenActual.idExamen}`);
        if (notaSpan) {
            notaSpan.textContent = `${porcentaje}%`;
        }

        elementosResultado.puntuacion.innerHTML = ''; 
        elementosResultado.feedbackGeneral.textContent = '';

        if (fueEntregadoIncompleto) {
            const tituloDesglose = document.createElement('h4');
            tituloDesglose.textContent = 'Resultado de las preguntas respondidas:';
            elementosResultado.puntuacion.appendChild(tituloDesglose);

            if (desgloseResultadosIndividuales.length > 0) {
                const ul = document.createElement('ul');
                ul.className = 'lista-desglose-resultados'; 
                desgloseResultadosIndividuales.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = `Pregunta ${item.numero}: `;
                    const spanEstado = document.createElement('span');
                    spanEstado.textContent = item.estado;
                    spanEstado.className = item.estado === "Correcta" ? "estado-correcto" : "estado-incorrecto";
                    li.appendChild(spanEstado);
                    ul.appendChild(li);
                });
                elementosResultado.puntuacion.appendChild(ul);
            } else {
                const pNoRespondidas = document.createElement('p');
                pNoRespondidas.textContent = "No has respondido ninguna pregunta de las que componen el examen.";
                elementosResultado.puntuacion.appendChild(pNoRespondidas);
            }
            elementosResultado.feedbackGeneral.textContent = `Dejaste ${totalPreguntas - respondidas} pregunta(s) sin responder de un total de ${totalPreguntas}.`;
        } else {
            elementosResultado.puntuacion.textContent = `Has acertado ${correctas} de ${totalPreguntas} preguntas (${porcentaje}%).`;
            if (porcentaje >= 50) {
                elementosResultado.feedbackGeneral.textContent = "¡Enhorabuena, has aprobado!";
            } else {
                elementosResultado.feedbackGeneral.textContent = "Sigue estudiando, ¡la próxima vez seguro que apruebas!";
            }
        }

        elementosResultado.botonRevisarRespuestas.classList.remove('oculto');
        mostrarVista('resultado');
        window.scrollTo(0, 0); 
    }
    
    elementosResultado.botonRevisarRespuestas.addEventListener('click', () => {
        mostrarRevisionRespuestas();
    });

    function mostrarRevisionRespuestas() {
        elementosResultado.revisionRespuestasContenedor.innerHTML = '<h3>Revisión Detallada:</h3>';
        elementosResultado.revisionRespuestasContenedor.classList.remove('oculto');

        const respuestasGuardadas = JSON.parse(localStorage.getItem(`respuestas_${examenActual.idExamen}`)) || [];

        preguntasExamenActual.forEach((pregunta, index) => {
            const divPregunta = document.createElement('div');
            divPregunta.className = 'pregunta-revision';
            
            const textoP = document.createElement('p');
            textoP.className = 'texto-pregunta-revision';
            textoP.textContent = `${index + 1}. ${pregunta.texto}`;
            divPregunta.appendChild(textoP);

            pregunta.opciones.forEach(opcion => {
                const spanOpcion = document.createElement('span');
                spanOpcion.className = 'opcion-revision';
                spanOpcion.textContent = opcion.texto;

                if (opcion.id === pregunta.respuestaCorrecta) {
                    spanOpcion.classList.add('correcta');
                }
                if (opcion.id === respuestasGuardadas[index]) {
                    spanOpcion.classList.add('seleccionada-usuario');
                    if (opcion.id !== pregunta.respuestaCorrecta) {
                        spanOpcion.classList.add('incorrecta-usuario');
                    }
                }
                divPregunta.appendChild(spanOpcion);
            });
            elementosResultado.revisionRespuestasContenedor.appendChild(divPregunta);
        });
    }

    elementosExamen.botonVolverInicioExamen.addEventListener('click', () => {
        if (confirm("¿Seguro que quieres abandonar el examen? Tu progreso actual no se guardará si no has finalizado.")) {
            if (elementosExamen.botonScrollCaso) elementosExamen.botonScrollCaso.classList.add('oculto'); // Ocultar
            cargarDatosIniciales();
        }
    });

    elementosResultado.botonVolverInicioResultado.addEventListener('click', () => {
        if (elementosExamen.botonScrollCaso) elementosExamen.botonScrollCaso.classList.add('oculto'); // Ocultar
        cargarDatosIniciales();
    });


    cargarDatosIniciales();
});