import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

const LoginPage = () => {
  const navigate = useNavigate();

  const {
    login,
    isAuthenticated,
    isLoading,
    error,
  } = useAuthStore();

  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await login(formData);
      navigate('/dashboard', { replace: true });
    } catch (loginError) {
      console.error('Error de login:', loginError);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Lock size={42} />
          </div>

          <h1>Acceso al sistema</h1>
          <p>
            Ingresa tu usuario y contraseña para continuar.
          </p>
        </div>

        {error && (
          <div className="form-alert form-alert-error">
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Usuario o correo</span>

            <div className="input-with-icon">
              <User size={24} />
              <input
                type="text"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                placeholder="Ejemplo: superadmin"
                autoComplete="username"
                required
              />
            </div>
          </label>

          <label className="form-field">
            <span>Contraseña</span>

            <div className="input-with-icon">
              <Lock size={24} />

              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Escribe tu contraseña"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="primary-button full-width-button"
            disabled={isLoading}
          >
            <LogIn size={26} />
            {isLoading ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>
        </form>

        <div className="login-helper">
          <strong>Usuario inicial:</strong> superadmin
          <br />
          <strong>Contraseña:</strong> Admin123*
        </div>
      </section>
    </main>
  );
};

export default LoginPage;