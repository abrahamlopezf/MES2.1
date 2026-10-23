const { User, Role } = require('../database/models');

async function main() {
  const users = await User.findAll({ include: [{ model: Role, as: 'role' }] });
  console.log(users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role?.code })));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
