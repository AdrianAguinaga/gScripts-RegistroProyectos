function generarContraseñasPendientes() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Propuestas');
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    const estado = datos[i][10];
    const pass = datos[i][12];

    if (estado === "Aprobado" && !pass) {
      const nuevaPass = generarContraseña();
      hoja.getRange(i + 1, 12).setValue(nuevaPass); // ✅ columna 12


      const email = datos[i][6];
      const titulo = datos[i][2];
      MailApp.sendEmail({
        to: email,
        subject: `Tu proyecto ha sido aprobado 🎉`,
        body: `Hola ${datos[i][4]},\n\nTu proyecto "${titulo}" ha sido aprobado.\n\nTu contraseña de acceso es: ${nuevaPass}\n\nPuedes gestionar tu proyecto desde:\n${ScriptApp.getService().getUrl()}?page=propuestas`
      });
    }
  }
}
