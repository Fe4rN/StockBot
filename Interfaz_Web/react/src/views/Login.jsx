import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
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
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        textAlign: 'center'
    };

    const headerStyle = {
        marginBottom: '30px'
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
        marginBottom: '20px',
        textAlign: 'left'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#cbd5e1',
        marginBottom: '8px'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#ffffff',
        fontSize: '15px',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.3s'
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

    const errorAlertStyle = {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '8px',
        color: '#f87171',
        padding: '12px',
        fontSize: '14px',
        marginBottom: '20px',
        textAlign: 'left'
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("http://127.0.0.1:8000/usuarios/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ Email: email, Contraseña: password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Error al iniciar sesión");
            }

            // Seteamos la cookie localmente para que sea visible en el puerto del frontend
            if (data.usuario) {
                const user_data_str = JSON.stringify(data.usuario);
                const encoded_data = btoa(unescape(encodeURIComponent(user_data_str)));
                document.cookie = `session_user=${encoded_data}; max-age=3600; path=/; samesite=lax`;
            }

            // Redirige al panel de control tras login correcto
            navigate("/teleoperacion");

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
                    <h2 style={subtitleStyle}>Inicia sesión para gestionar tu almacén</h2>
                </div>

                {error && <div style={errorAlertStyle}>⚠️ {error}</div>}

                <form onSubmit={handleLogin}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Email</label>
                        <input 
                            type="email" 
                            style={inputStyle}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@gmail.com"
                            required
                            onFocus={(e) => {
                                e.target.style.borderColor = '#3b82f6';
                                e.target.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                e.target.style.boxShadow = 'none';
                            }}
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
                            onFocus={(e) => {
                                e.target.style.borderColor = '#3b82f6';
                                e.target.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
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
                        {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                    </button>
                </form>

                <p style={footerTextStyle}>
                    ¿No tienes una cuenta?{' '}
                    <Link to="/registro" style={linkStyle}>
                        Regístrate aquí
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
