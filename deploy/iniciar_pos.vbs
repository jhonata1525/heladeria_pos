' Inicia el POS en produccion sin abrir ventana de consola.
' Ruta base configurable: C:\heladeria_pos (por defecto).
' Si el script se ejecuta desde <proyecto>\deploy, la ruta real se detecta automaticamente.
PROJECT_ROOT = "C:\heladeria_pos"

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
detectedRoot = fso.GetParentFolderName(scriptDir)
If fso.FileExists(detectedRoot & "\package.json") Then PROJECT_ROOT = detectedRoot

If Not fso.FolderExists(PROJECT_ROOT) Then
    MsgBox "No se encontro la carpeta del proyecto: " & PROJECT_ROOT, 16, "Heladeria POS"
    WScript.Quit 1
End If

' Ajusta esta ruta si npm.cmd esta en otra ubicacion.
NPM_CMD = "C:\Program Files\nodejs\npm.cmd"
If Not fso.FileExists(NPM_CMD) Then NPM_CMD = "npm.cmd"

shell.CurrentDirectory = PROJECT_ROOT
shell.Run "cmd /c """ & NPM_CMD & """ run start", 0, False
