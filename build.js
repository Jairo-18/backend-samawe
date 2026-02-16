// backend-samawe/build.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Función para ejecutar comandos
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }
      console.log(stdout);
      resolve(stdout);
    });
  });
}

// Crear un wrapper para el backend que pueda manejar comandos
const wrapperScript = `
const { spawn } = require('child_process');
const path = require('path');

// Obtener el comando de los argumentos
const command = process.argv[2];

if (command === 'migration:run') {
  // Ejecutar migraciones
  const migrationScript = path.join(__dirname, 'dist/run-migrations.js');
  require(migrationScript);
} else {
  // Ejecutar la aplicación normalmente
  require('./dist/src/main.js');
}
`;

async function build() {
  try {
    console.log('Compilando backend con TypeScript...');
    await runCommand('npm run build');

    console.log('Creando wrapper script...');
    fs.writeFileSync('wrapper.js', wrapperScript);

    console.log('Empaquetando con pkg...');
    const pkgConfig = {
      pkg: {
        scripts: [
          'dist/**/*.js',
          'node_modules/typeorm/**/*.js',
          'node_modules/pg/**/*.js',
          'node_modules/reflect-metadata/**/*.js',
        ],
        assets: ['dist/**/*.json', '.env.production', '.env.development'],
        targets: ['node18-win-x64'],
        outputPath: '.',
      },
    };

    // Guardar configuración de pkg
    fs.writeFileSync('pkg.config.json', JSON.stringify(pkgConfig, null, 2));

    // Ejecutar pkg
    await runCommand(
      'pkg wrapper.js -t node18-win-x64 -o backend.exe --config pkg.config.json',
    );

    console.log('Backend compilado exitosamente como backend.exe');

    // Limpiar archivos temporales
    fs.unlinkSync('wrapper.js');
    fs.unlinkSync('pkg.config.json');
  } catch (error) {
    console.error('Error durante la compilación:', error);
    process.exit(1);
  }
}

build();
