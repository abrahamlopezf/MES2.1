const { execSync } = require('child_process');
console.log('Running migrations...');
try {
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit', cwd: __dirname + '/../' });
  console.log('Migrations done.');
} catch (error) {
  console.error('Migration failed:', error);
}
