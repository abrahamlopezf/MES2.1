const { updateUserSchema } = require('./src/modules/users/users.validator');

const payload = {
  first_name: 'Admin',
  last_name: 'Super',
  username: 'admin',
  numero_nomina: '',
  email: 'admin@nexus.com',
  is_active: true,
  telefono: '',
  role_id: 1,
  area_id: null
};

const result = updateUserSchema.validate(payload, {
  abortEarly: false,
  stripUnknown: true,
});

if (result.error) {
  console.log(JSON.stringify(result.error.details, null, 2));
} else {
  console.log('Validation passed!');
}
