// === Código.gs ===
const version = 2;
const url = ScriptApp.getService().getUrl() + `?v=${version}`;

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const pagina = params.page || 'index';
  let template;

  switch (pagina.toLowerCase()) {
    case 'formulario':
      template = HtmlService.createTemplateFromFile('Formulario');
      break;
    case 'administrador':
      template = HtmlService.createTemplateFromFile('PanelAdministrador');
      template.propuestas = obtenerPropuestas();
      break;
    case 'estadisticas':
      template = HtmlService.createTemplateFromFile('Estadisticas');
      break;
      case 'propuestas':
        template = HtmlService.createTemplateFromFile('ProyectosAprobados');
        template.proyectos = obtenerPropuestas(); // <-- This is the data source
        template.baseUrl = ScriptApp.getService().getUrl();
        break;

    case 'gestion':
      template = HtmlService.createTemplateFromFile('GestionProyecto');
      template.baseUrl = ScriptApp.getService().getUrl(); // ✅ esto es lo importante
      break;

    default:
      template = HtmlService.createTemplateFromFile('Index');
  }

  return template.evaluate()
    .setTitle("Gestión de Proyectos")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  Logger.log("Parámetros recibidos: " + JSON.stringify(params));
}

function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    Logger.log(`Error al incluir ${filename}: ${error.message}`);
    return '';
  }
}

// In Código.js
function validarAccesoProyecto(id, passIngresada) {
  Logger.log(`validarAccesoProyecto - Received ID: ${id} (Type: ${typeof id}), Password Attempt: '${passIngresada}'`); // Log input

  if (!id || !passIngresada) {
      Logger.log("validarAccesoProyecto - Returning FALSE due to missing ID or Password.");
      return false; // Explicitly return false if input is bad
  }

  try {
    const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
    if (!hoja) {
       Logger.log("validarAccesoProyecto - ERROR: Sheet 'Propuestas' not found.");
       return false; // Or throw error
    }
    const datos = hoja.getDataRange().getValues();

    const idToFind = String(id).trim(); // Ensure comparison is consistent

    for (let i = 1; i < datos.length; i++) {
      const idHoja = datos[i][0] ? String(datos[i][0]).trim() : "";
      if (idHoja === idToFind) {
        const passReal = datos[i][11] ? String(datos[i][11]) : ""; // Columna L = Índice 11 (Contraseña)
        Logger.log(`validarAccesoProyecto - Found matching ID at row ${i+1}. Real Password: '${passReal}'. Comparing with '${passIngresada}'.`);

        const esValido = passIngresada === passReal; // Direct comparison
        Logger.log(`validarAccesoProyecto - Comparison result: ${esValido}. Returning ${esValido}.`);
        return esValido;
      }
    }

    Logger.log(`validarAccesoProyecto - ID '${idToFind}' not found in sheet. Returning FALSE.`);
    return false; // ID not found

  } catch (e) {
     Logger.log(`validarAccesoProyecto - ERROR during execution: ${e.message} \nStack: ${e.stack}`);
     return false; // Return false on error
  }
}


function someterPropuesta(datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Propuestas');

  if (!hoja) throw new Error("¡Hoja 'Propuestas' no encontrada!");

  // Validar campos requeridos
  const camposRequeridos = ['titulo', 'descripcion', 'nombre', 'matricula', 'email', 'carrera', 'semestre'];
  const camposFaltantes = camposRequeridos.filter(campo => !datos[campo]?.toString().trim());

  if (camposFaltantes.length > 0) {
    throw new Error(`Campos requeridos faltantes: ${camposFaltantes.join(', ')}`);
  }

  // Generar ID único
  const idProyecto = Utilities.getUuid(); // Más confiable que timestamp

  // Insertar en hoja
  hoja.appendRow([
    idProyecto,
    new Date(),
    datos.titulo,
    datos.descripcion,
    datos.nombre,
    datos.matricula,
    datos.email,
    datos.carrera,
    datos.semestre,
    datos.colaboradores || "",
    'Sometido'
  ]);

  // Notificar por email (cambiar admin@example.com)
  try {
    MailApp.sendEmail({
      to: datos.email,
      subject: `Propuesta recibida: ${datos.titulo}`,
      body: `Hola ${datos.nombre},\nTu propuesta ha sido recibida correctamente.\n\nDetalles:\n${JSON.stringify(datos, null, 2)}`
    });
  } catch (emailError) {
    Logger.log(`Error email: ${emailError}`);
  }

  return idProyecto;
}

function obtenerPropuestas() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Propuestas');

    if (!sheet) {
      Logger.log("Hoja no encontrada");
      return [];
    }

    const datos = sheet.getDataRange().getValues();

    if (datos.length <= 1) return datos; // Solo encabezados o vacío

    const encabezados = datos[0];
    const cuerpoInvertido = datos.slice(1).reverse(); // invierte las filas
    return [encabezados, ...cuerpoInvertido];

  } catch (e) {
    Logger.log(`Error obtenerPropuestas: ${e}`);
    return [];
  }
}


function notificarRevision() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Propuestas');
  if (!hoja) return;

  const fila = hoja.getActiveCell().getRow();
  if (fila < 2) return;

  const estado = hoja.getRange(fila, 11).getValue();
  if (estado === "En Revisión") {
    const email = hoja.getRange(fila, 7).getValue();
    const titulo = hoja.getRange(fila, 3).getValue();

    try {
      MailApp.sendEmail({
        to: email,
        subject: `Propuesta en revisión: ${titulo}`,
        body: `Hola,\nTu propuesta "${titulo}" está siendo revisada.`
      });
      SpreadsheetApp.getUi().alert("¡Notificación enviada!");
    } catch (error) {
      SpreadsheetApp.getUi().alert(`Error: ${error.message}`);
    }
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Admin')
    .addItem('Abrir Panel', 'abrirPanelAdministrador')
    .addToUi();
}

function abrirPanelAdministrador() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('PanelAdministrador')
      .setWidth(1200)
      .setHeight(800);
    SpreadsheetApp.getUi().showModalDialog(html, 'Panel Admin');
  } catch (e) {
    Logger.log(`Error abrirPanel: ${e}`);
    SpreadsheetApp.getUi().alert("Error al cargar el panel");
  }
}

function cambiarEstadoPropuesta(id, nuevoEstado) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      const fila = i + 1;
      hoja.getRange(fila, 11).setValue(nuevoEstado); // Estado (col 11)
      hoja.getRange(fila, 16).setValue(new Date()); // Última actualización (col 16)

      const historial = JSON.parse(datos[i][12] || "[]"); // col 13
      historial.push({ estado: nuevoEstado, fecha: new Date().toISOString() });
      hoja.getRange(fila, 13).setValue(JSON.stringify(historial)); // col 13

      // Si es aprobado y no hay contraseña
      if (nuevoEstado === "Aprobado" && !datos[i][11]) {
        const pass = generarContraseña();
        hoja.getRange(fila, 12).setValue(pass); // ✅ Contraseña (col 12)

        const email = datos[i][6];
        const titulo = datos[i][2];
        MailApp.sendEmail({
          to: email,
          subject: `Tu proyecto ha sido aprobado 🎉`,
          body: `Hola ${datos[i][4]},\n\nTu proyecto "${titulo}" ha sido aprobado.\n\nTu contraseña de acceso es: ${pass}\n\nPuedes gestionar tu proyecto desde:\n${ScriptApp.getService().getUrl()}?page=propuestas`
        });
      }

      break;
    }
  }
}

function generarContraseña(longitud = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < longitud; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}


// === FUNCIÓN obtenerDatosProyecto (CORREGIDA) ===
function obtenerDatosProyecto(id) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  // Nueva validación de ID
  if (!id || id === "undefined") {
    Logger.log("❌ ID vacío o inválido");
    throw new Error("ID de proyecto no proporcionado");
  }

  for (let i = 1; i < datos.length; i++) {
    const idHoja = datos[i][0] ? datos[i][0].toString().trim() : "";

    if (idHoja === id.toString().trim()) {
      Logger.log(`✅ Proyecto encontrado en fila ${i + 1}`);

      // Ajustar índices según estructura real de tu Sheet:
      return {
        id: datos[i][0],
        titulo: datos[i][2],    // Columna C
        nombre: datos[i][4],    // Columna E
        matricula: datos[i][5], // Columna F
        email: datos[i][6],     // Columna G
        carrera: datos[i][7],   // Columna H
        semestre: datos[i][8],  // Columna I
        estado: datos[i][10],   // Columna K
        notas: JSON.parse(datos[i][13] || "[]"),  // Columna N
        historial: JSON.parse(datos[i][12] || "[]"), // Columna M
        repositorio: datos[i][14] || "" // Columna O
      };
    }
  }
  throw new Error("Proyecto no encontrado");
}

// === FUNCIÓN cambiarEstadoProyecto (CORREGIDA) ===
function cambiarEstadoProyecto(id, nuevoEstado) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      // Actualizar estado (Columna K = índice 10)
      hoja.getRange(i + 1, 11).setValue(nuevoEstado);

      // Actualizar historial (Columna M = índice 12)
      const historial = JSON.parse(datos[i][12] || "[]");
      historial.push({
        fecha: new Date().toLocaleString("es-MX"),
        estado: nuevoEstado
      });
      hoja.getRange(i + 1, 13).setValue(JSON.stringify(historial));

      return; // Salir después de encontrar
    }
  }
  throw new Error("Proyecto no encontrado para actualizar estado");
}


function cambiarEstadoProyecto(id, nuevoEstado) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      hoja.getRange(i + 1, 11).setValue(nuevoEstado); // Estado
      hoja.getRange(i + 1, 17).setValue(new Date()); // Última actualización

      const historial = JSON.parse(datos[i][12] || "[]");
      historial.push({ estado: nuevoEstado, fecha: new Date().toISOString() });
      hoja.getRange(i + 1, 13).setValue(JSON.stringify(historial));
      break;
    }
  }
}

function agregarNotaProyecto(id, texto) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      const notas = JSON.parse(datos[i][14] || "[]");
      notas.push({ texto: texto, fecha: new Date().toLocaleString() });
      hoja.getRange(i + 1, 14).setValue(JSON.stringify(notas));
      break;
    }
  }
}

function guardarRepositorioProyecto(id, link) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      hoja.getRange(i + 1, 15).setValue(link);
      break;
    }
  }
}

function obtenerPropuestasAprobadas() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName('Propuestas');

    if (!hoja) {
      Logger.log("Error: Hoja 'Propuestas' no encontrada");
      return [];
    }

    const ultimaFila = hoja.getLastRow();

    // Si solo hay encabezados (sin datos)
    if (ultimaFila <= 1) return [];

    // Obtener datos desde A2 hasta O (columna 15)
    const rango = hoja.getRange(2, 1, ultimaFila - 1, 15);
    const datos = rango.getValues();

    // Filtrar y mapear con validaciones
    return datos
      .filter(row => {
        const estado = row[10] ? row[10].toString().trim().toUpperCase() : "";
        return estado === "APROBADO";
      })
      .map(row => ({
        id: row[0] || "Sin ID",
        titulo: row[2] || "Sin título",
        nombre: row[4] || "Anónimo",
        estado: row[10] || "Desconocido",
        repositorio: row[14] || ""
      }));

  } catch (error) {
    Logger.log(`Error en obtenerPropuestasAprobadas: ${error.message}`);
    return [];
  }
}
function exportarPropuestas() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const filas = datos.slice(1);

  let html = `
    <html><head>
      <style>
        body { font-family: Arial; font-size: 12px; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f0f0f0; }
      </style>
    </head><body>
      <h2>Listado de Propuestas</h2>
      <table><thead><tr>`;

  encabezados.forEach(col => html += `<th>${col}</th>`);
  html += `</tr></thead><tbody>`;

  filas.forEach(row => {
    html += '<tr>' + row.map(col => `<td>${col}</td>`).join('') + '</tr>';
  });

  html += '</tbody></table></body></html>';

  const blob = HtmlService.createHtmlOutput(html).getBlob()
    .getAs('application/pdf')
    .setName('Propuestas_' + new Date().toISOString().slice(0, 10) + '.pdf');

  const archivo = DriveApp.createFile(blob);
  return archivo.getUrl();  // Devuelve el enlace
}

function obtenerUsuarioActivo() {
  return Session.getActiveUser().getEmail();
}
