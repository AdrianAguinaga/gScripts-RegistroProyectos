// === Código.js ===
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
        const pass = e.parameter.pass || '';
        if (!validarAccesoAdministrador(pass)) {
          template = HtmlService.createTemplateFromFile('LoginAdministrador');
          template.mensajeError = pass ? "Contraseña incorrecta." : "";
          template.baseUrl = ScriptApp.getService().getUrl();
        } else {
          template = HtmlService.createTemplateFromFile('PanelAdministrador');
          template.propuestas = obtenerPropuestas();
        }
        break;
      
      case 'estadisticas':
        template = HtmlService.createTemplateFromFile('Estadisticas');
        template.proyectos = obtenerPropuestas(); // datos completos para análisis
        break;
      case 'propuestas':
        template = HtmlService.createTemplateFromFile('ProyectosAprobados');
        template.proyectos = obtenerPropuestasAprobadas();
        template.baseUrl = ScriptApp.getService().getUrl();
        break;
      
    case 'gestion':
      template = HtmlService.createTemplateFromFile('GestionProyecto');
      template.baseUrl = ScriptApp.getService().getUrl();
      template.idProyecto = params.id || ""; // ✅ Cambio principal aquí
      break;

    case 'cambiarPass':
        template = HtmlService.createTemplateFromFile('CambiarContrasena');
        break;
      

    default:
      template = HtmlService.createTemplateFromFile('Index');
  }

  return template.evaluate()
    .setTitle("Gestión de Proyectos")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Función para incluir archivos HTML externos
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    Logger.log(`Error al incluir ${filename}: ${error.message}`);
    return '';
  }
}

// Otras funciones existentes (sin cambios)
function validarAccesoProyecto(id, passIngresada) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  if (!hoja) return false;

  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim() === String(id).trim()) {
      return passIngresada === String(datos[i][11]);
    }
  }
  return false;
}

function obtenerDatosProyecto(id) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      return {
        id: datos[i][0],
        titulo: datos[i][2],
        nombre: datos[i][4],
        matricula: datos[i][5],
        email: datos[i][6],
        carrera: datos[i][7],
        semestre: datos[i][8],
        estado: datos[i][10],
        notas: JSON.parse(datos[i][13] || "[]"),
        historial: JSON.parse(datos[i][12] || "[]"),
        repositorio: datos[i][14] || ""
      };
    }
  }
  throw new Error("Proyecto no encontrado");
}

function obtenerPropuestas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Propuestas');
  if (!sheet) return [];

  const datos = sheet.getDataRange().getValues();
  if (datos.length <= 1) return datos;

  const encabezados = datos[0];
  const cuerpoInvertido = datos.slice(1).reverse();
  return [encabezados, ...cuerpoInvertido];
}

function obtenerPropuestasAprobadas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Propuestas');
  if (!hoja) return [];

  const datos = hoja.getDataRange().getValues().slice(1);
  return datos
    .filter(row => row[10].trim().toUpperCase() === "APROBADO")
    .map(row => ({
      id: row[0],
      titulo: row[2],
      nombre: row[4],
      carrera: row[7],
      semestre: row[8],
      estado: row[10]
    }));
}

function cambiarEstadoProyecto(id, nuevoEstado) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      hoja.getRange(i + 1, 11).setValue(nuevoEstado);
      hoja.getRange(i + 1, 17).setValue(new Date());

      const historial = JSON.parse(datos[i][12] || "[]");
      historial.push({ estado: nuevoEstado, fecha: new Date().toISOString() });
      hoja.getRange(i + 1, 13).setValue(JSON.stringify(historial));
      return;
    }
  }
  throw new Error("Proyecto no encontrado para actualizar estado");
}

function agregarNotaProyecto(id, texto) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      const notas = JSON.parse(datos[i][13] || "[]");
      notas.push({ texto, fecha: new Date().toLocaleString() });
      hoja.getRange(i + 1, 14).setValue(JSON.stringify(notas));
      return;
    }
  }
}

function guardarRepositorioProyecto(id, link) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      hoja.getRange(i + 1, 15).setValue(link);
      return;
    }
  }
}


function someterPropuesta(datos) {
  try {
    Logger.log("Iniciando someterPropuesta con datos: " + JSON.stringify(datos));
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName('Propuestas');
    if (!hoja) {
      Logger.log("Error: La hoja 'Propuestas' no existe.");
      throw new Error("La hoja 'Propuestas' no existe.");
    }

    const id = generarUUID();
    const fecha = new Date();
    const contraseña = generarContraseña();

    Logger.log("Añadiendo fila con ID: " + id);
    
    hoja.appendRow([
      id,
      fecha,
      datos.titulo,
      datos.descripcion,
      datos.nombre,
      datos.matricula,
      datos.email,
      datos.carrera,
      datos.semestre,
      datos.colaboradores || "",
      "Pendiente",
      contraseña,
      JSON.stringify([]),
      JSON.stringify([]),
      "",
      fecha
    ]);

    Logger.log("Propuesta añadida con éxito, ID: " + id);
    return id;
  } catch (error) {
    Logger.log("Error en someterPropuesta: " + error.toString());
    throw error;
  }
}

function cambiarEstadoPropuesta(id, nuevoEstado) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === id) {
      hoja.getRange(i + 1, 11).setValue(nuevoEstado);
      hoja.getRange(i + 1, 17).setValue(new Date());

      const historial = JSON.parse(datos[i][12] || "[]");
      historial.push({ estado: nuevoEstado, fecha: new Date().toISOString() });
      hoja.getRange(i + 1, 13).setValue(JSON.stringify(historial));
      return;
    }
  }
  throw new Error("Proyecto no encontrado para actualizar estado");
}
// En Código.js, función de servidor
function escaparHTML(texto) {
  if (!texto) return '';
  return texto.replace(/[&<>"']/g, function(match) {
    const caracteres = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return caracteres[match];
  });
}

function generarUUID() {
  const chars = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.split('');
  for (let i = 0, len = chars.length; i < len; i++) {
    switch (chars[i]) {
      case 'x':
        chars[i] = Math.floor(Math.random() * 16).toString(16);
        break;
      case 'y':
        chars[i] = (Math.floor(Math.random() * 4) + 8).toString(16);
        break;
    }
  }
  return chars.join('');
}

function generarContraseña(longitud = 10) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let contraseña = '';
  for (let i = 0; i < longitud; i++) {
    contraseña += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return contraseña;
}
function enviarCorreo(destinatario, asunto, mensaje) {
  try {
    MailApp.sendEmail({
      to: destinatario,
      subject: asunto,
      htmlBody: mensaje
    });
  } catch (error) {
    Logger.log(`Error al enviar correo: ${error}`);
  }
}

function obtenerTodosLosProyectos() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues().slice(1);

  return datos.map(row => ({
    id: row[0],
    titulo: row[2],
    estado: row[10],
    historial: row[12] || "[]"
  }));
}

function validarAccesoAdministrador(passwordIngresado) {
  const passReal = PropertiesService.getScriptProperties().getProperty("ADMIN_PASS");
  return passwordIngresado === passReal;
}

function cambiarContrasena(actual, nueva) {
  const propiedades = PropertiesService.getScriptProperties();
  const passGuardada = propiedades.getProperty("ADMIN_PASS");

  if(actual !== passGuardada) {
    throw new Error("La contraseña actual no es correcta.");
  }

  propiedades.setProperty("ADMIN_PASS", nueva);
  return "Contraseña cambiada exitosamente.";
}
