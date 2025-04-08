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
      template = HtmlService.createTemplateFromFile('PanelAdministrador');
      template.propuestas = obtenerPropuestas();
      break;

    case 'estadisticas':
      template = HtmlService.createTemplateFromFile('Estadisticas');
      break;

    case 'propuestas':
      template = HtmlService.createTemplateFromFile('ProyectosAprobados');
      template.proyectos = obtenerPropuestas();
      template.baseUrl = ScriptApp.getService().getUrl();
      break;

    case 'gestion':
      template = HtmlService.createTemplateFromFile('GestionProyecto');
      template.baseUrl = ScriptApp.getService().getUrl();
      template.idProyecto = params.id || ""; // ✅ Cambio principal aquí
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
