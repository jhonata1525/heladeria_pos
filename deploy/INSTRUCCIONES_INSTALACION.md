# Instalación y arranque en Windows

## Requisitos previos

1. Instalar Node.js LTS y verificar `node --version` y `npm --version`.
2. Copiar el proyecto en `C:\heladeria_pos` (o ajustar la ruta en `deploy/iniciar_pos.vbs`).
3. En la raíz del proyecto ejecutar:

```bat
npm install
npx prisma generate
npm run build
```

`npm run start` requiere que exista la carpeta `.next` generada por `npm run build`.

## 1. Arrancar el POS automáticamente al iniciar Windows

1. Presionar `Win + R`, escribir `shell:startup` y pulsar Enter.
2. Dentro de la carpeta que se abre, crear un acceso directo (clic derecho → **Nuevo → Acceso directo**).
3. Como ubicación pegar:

```text
C:\heladeria_pos\deploy\iniciar_pos.vbs
```

4. Nombrarlo `Heladitos Dani` y terminar.
5. Reiniciar Windows o ejecutar el VBS manualmente para probar. El servidor se inicia sin ventana de consola.
6. Comprobar en el navegador: `http://localhost:3000`.

## 2. Programar el respaldo diario de la base de datos

1. Presionar `Win + R`, escribir `taskschd.msc` y pulsar Enter.
2. En el panel derecho elegir **Crear tarea básica...**.
3. Nombre: `Respaldo Heladitos Dani` → Siguiente.
4. Desencadenador: **Diaria**, hora sugerida `02:00` → Siguiente.
5. Acción: **Iniciar un programa** → Siguiente.
6. Programa o script:

```text
C:\heladeria_pos\deploy\backup_db.bat
```

7. Terminar. El historial se guarda en `C:\Respaldos_Heladeria` con nombres `dev_backup_YYYY-MM-DD_HH-MM.db`.

Alternativa por línea de comandos (desde una consola como Administrador):

```bat
schtasks /create /tn "Respaldo Heladitos Dani" /tr "C:\heladeria_pos\deploy\backup_db.bat" /sc daily /st 02:00 /f
```

## 3. Acceso directo de Chrome al POS

1. En el escritorio, clic derecho → **Nuevo → Acceso directo**.
2. Ubicación:

```text
http://localhost:3000
```

3. Nombre: `Heladitos Dani` → Terminar.
4. Opcional: clic derecho al acceso directo → **Propiedades → Cambiar icono** y elegir `C:\Program Files\Google\Chrome\Application\chrome.exe`.

Para abrirlo directamente como ventana de aplicación, usar como ubicación:

```text
"C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000
```

## Restauración rápida

1. Detener el servidor del POS.
2. Copiar el respaldo deseado sobre `C:\heladeria_pos\dev.db`.
3. Volver a ejecutar `deploy/iniciar_pos.vbs`.
