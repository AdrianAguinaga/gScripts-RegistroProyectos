function verificarHojaPropuestas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName('Propuestas');

  const encabezadosEsperados = [
    "ID", "Fecha", "Título", "Descripción", "Nombre", "Matrícula",
    "Email", "Carrera", "Semestre", "Colaboradores", "Estado",
    "Contraseña", "Historial Estados", "Notas", "Repositorio GitHub", "Última Actualización"
  ];

  if (!hoja) {
    hoja = ss.insertSheet('Propuestas');
    hoja.appendRow(encabezadosEsperados);
    Logger.log("✅ Hoja 'Propuestas' creada con encabezados.");
    return "Hoja creada correctamente con encabezados.";
  }

  const encabezadosActuales = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];

  let necesitaActualizar = false;
  for (let i = 0; i < encabezadosEsperados.length; i++) {
    if (encabezadosActuales[i] !== encabezadosEsperados[i]) {
      necesitaActualizar = true;
      break;
    }
  }

  if (necesitaActualizar) {
    hoja.getRange(1, 1, 1, encabezadosEsperados.length).setValues([encabezadosEsperados]);
    Logger.log("🔄 Encabezados actualizados en la hoja 'Propuestas'.");
    return "Encabezados actualizados correctamente.";
  }

  Logger.log("✅ Hoja 'Propuestas' ya existe y está en orden.");
  return "La hoja ya estaba correctamente configurada.";
}
