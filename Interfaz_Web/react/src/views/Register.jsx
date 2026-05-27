import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repassword, setRepassword] = useState('');
    const [terms, setTerms] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Estilos premium
    const containerStyle = {
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#070b13',
        backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(13, 110, 253, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.12) 0%, transparent 40%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: "'Rubik', sans-serif"
    };

    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '40px 45px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
    };

    const headerStyle = {
        marginBottom: '25px'
    };

    const titleStyle = {
        fontSize: '32px',
        fontWeight: '900',
        color: '#ffffff',
        margin: '0 0 5px 0',
        background: 'linear-gradient(135deg, #ffffff 40%, #a3c2e0 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    };

    const subtitleStyle = {
        fontSize: '15px',
        color: '#94a3b8',
        margin: '0'
    };

    const inputGroupStyle = {
        marginBottom: '15px',
        textAlign: 'left'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#cbd5e1',
        marginBottom: '6px'
    };

    const inputStyle = {
        width: '100%',
        padding: '11px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#ffffff',
        fontSize: '15px',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.3s'
    };

    const checkboxGroupStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '15px',
        marginBottom: '20px',
        textAlign: 'left'
    };

    const btnSubmitStyle = {
        width: '100%',
        padding: '14px',
        borderRadius: '10px',
        border: 'none',
        background: 'linear-gradient(135deg, #0052d4 0%, #4364f7 100%)',
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(67, 100, 247, 0.3)',
        transition: 'all 0.3s',
        marginTop: '10px'
    };

    const footerTextStyle = {
        marginTop: '25px',
        fontSize: '14px',
        color: '#94a3b8'
    };

    const linkStyle = {
        color: '#3b82f6',
        textDecoration: 'none',
        fontWeight: '600'
    };

    const alertStyle = {
        borderRadius: '8px',
        padding: '12px',
        fontSize: '14px',
        marginBottom: '20px',
        textAlign: 'left'
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (password !== repassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        if (!terms) {
            setError("Debes aceptar los términos de servicio");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("http://127.0.0.1:8000/usuarios/registro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ Nombre: nombre, Email: email, Contraseña: password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Error en el registro");
            }

            setSuccess(true);
            setTimeout(() => {
                navigate("/login");
            }, 2000);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <div style={headerStyle}>
                    <h1 style={titleStyle}>StockBot</h1>
                    <h2 style={subtitleStyle}>Crea tu cuenta de mozo de almacén</h2>
                </div>

                {error && (
                    <div style={{ ...alertStyle, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                        ⚠️ {error}
                    </div>
                )}

                {success && (
                    <div style={{ ...alertStyle, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
                        ✅ ¡Registro completado! Redirigiendo a inicio de sesión...
                    </div>
                )}

                <form onSubmit={handleRegister}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Usuario</label>
                        <input 
                            type="text" 
                            style={inputStyle}
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="tu_usuario"
                            required
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Email</label>
                        <input 
                            type="email" 
                            style={inputStyle}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@gmail.com"
                            required
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Contraseña</label>
                        <input 
                            type="password" 
                            style={inputStyle}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Escribe tu contraseña"
                            required
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Repite Contraseña</label>
                        <input 
                            type="password" 
                            style={inputStyle}
                            value={repassword}
                            onChange={(e) => setRepassword(e.target.value)}
                            placeholder="Repite la contraseña"
                            required
                        />
                    </div>

                    <div style={checkboxGroupStyle}>
                        <input 
                            type="checkbox" 
                            id="checkbox-terms"
                            checked={terms}
                            onChange={(e) => setTerms(e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="checkbox-terms" style={{ fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
                            Acepto los términos de servicio
                        </label>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        style={btnSubmitStyle}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(67, 100, 247, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 15px rgba(67, 100, 247, 0.3)';
                        }}
                    >
                        {loading ? "Registrando..." : "Crear cuenta"}
                    </button>
                </form>

                <p style={footerTextStyle}>
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login" style={linkStyle}>
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
