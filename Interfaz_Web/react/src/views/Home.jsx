import { Link } from 'react-router-dom';

function Home() {
    // Estilos generales del contenedor con fondo oscuro y efecto aura de fondo
    const containerStyle = {
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#070b13',
        backgroundImage: `
            radial-gradient(circle at 10% 20%, rgba(13, 110, 253, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 45%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: "'Rubik', sans-serif",
        overflow: 'hidden',
        position: 'relative'
    };

    // Estilo de tarjeta de cristal (Glassmorphism)
    const glassCardStyle = {
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '50px 60px',
        maxWidth: '900px',
        width: '100%',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '40px',
        zIndex: 10
    };

    // Estilo de texto de cabecera con gradiente metálico azul/blanco
    const titleStyle = {
        fontSize: '68px',
        fontWeight: '900',
        margin: '0 0 10px 0',
        lineHeight: '1.1',
        background: 'linear-gradient(135deg, #ffffff 30%, #a3c2e0 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-1.5px'
    };

    // Subtítulo con gradiente neón azul/morado
    const subtitleStyle = {
        fontSize: '32px',
        fontWeight: '700',
        margin: '0 0 25px 0',
        lineHeight: '1.2',
        background: 'linear-gradient(90deg, #00d2ff 0%, #0d6efd 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    };

    const paragraphStyle = {
        fontSize: '18px',
        lineHeight: '1.6',
        color: '#94a3b8',
        marginBottom: '40px'
    };

    const ctaContainerStyle = {
        display: 'flex',
        gap: '20px'
    };

    // Botón "Comenzar" premium con glow azul en hover
    const btnPrimaryStyle = {
        display: 'inline-block',
        fontWeight: '700',
        color: '#ffffff',
        fontSize: '17px',
        background: 'linear-gradient(135deg, #0052d4 0%, #4364f7 100%)',
        border: 'none',
        borderRadius: '12px',
        padding: '14px 32px',
        textDecoration: 'none',
        boxShadow: '0 4px 15px rgba(67, 100, 247, 0.3)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer'
    };

    // Botón secundario con borde translúcido
    const btnSecondaryStyle = {
        display: 'inline-block',
        fontWeight: '700',
        color: '#e2e8f0',
        fontSize: '17px',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '13px 32px',
        textDecoration: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer'
    };

    // Animación de flotado para el robot visual
    const robotFloatAnimation = `
        @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-12px) rotate(1deg); }
            100% { transform: translateY(0px) rotate(0deg); }
        }
    `;

    // Helper para verificar si hay sesión activa mediante la cookie
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };
    const hasSession = getCookie('session_user') !== null;

    return (
        <div style={containerStyle}>
            {/* Inyectamos estilos locales para animaciones complejas */}
            <style>{`
                ${robotFloatAnimation}
                .floating-robot {
                    animation: float 5s ease-in-out infinite;
                }
            `}</style>
            
            <div style={glassCardStyle}>
                <div style={{ flex: 1, textAlign: 'left' }}>
                    <h1 style={titleStyle}>StockBot</h1>
                    <h2 style={subtitleStyle}>Tu mozo de almacén</h2>
                    <p style={paragraphStyle}>
                        Un asistente personalizado que te permite mantener un control riguroso de inventario y mantener una nave segura desde una interfaz web interactiva y fácil de entender.
                    </p>
                    <div style={ctaContainerStyle}>
                        <Link 
                            to={hasSession ? "/teleoperacion" : "/login"} 
                            style={btnPrimaryStyle}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 8px 25px rgba(67, 100, 247, 0.6)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(67, 100, 247, 0.3)';
                            }}
                        >
                            Comenzar (Panel)
                        </Link>
                        <button 
                            style={btnSecondaryStyle}
                            onClick={() => alert("StockBot es un robot autónomo equipado con escáner de códigos de barras, detector de intrusos mediante visión artificial, mapa LiDAR en tiempo real y asistente con IA.")}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                e.target.style.transform = 'translateY(0)';
                            }}
                        >
                            Averiguar más
                        </button>
                    </div>
                </div>
                {/* Robot Gráfico: TurtleBot3 Burger con LiDAR Giratorio */}
                <div className="floating-robot" style={{ width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 -40 200 240" style={{ width: '100%', height: '100%' }}>
                        <defs>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="5" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            <linearGradient id="metalPillar" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#94a3b8" />
                                <stop offset="50%" stopColor="#e2e8f0" />
                                <stop offset="100%" stopColor="#475569" />
                            </linearGradient>
                        </defs>
                        
                        {/* Sombras y base en el suelo */}
                        <ellipse cx="100" cy="180" rx="65" ry="12" fill="rgba(0,0,0,0.4)" />
                        
                        {/* Rueda Izquierda (con llanta y dibujo) */}
                        <rect x="28" y="115" width="16" height="50" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                        <line x1="28" y1="125" x2="44" y2="125" stroke="#1e293b" />
                        <line x1="28" y1="135" x2="44" y2="135" stroke="#1e293b" />
                        <line x1="28" y1="145" x2="44" y2="145" stroke="#1e293b" />
                        <line x1="28" y1="155" x2="44" y2="155" stroke="#1e293b" />
                        <ellipse cx="36" cy="140" rx="4" ry="12" fill="#475569" />

                        {/* Rueda Derecha */}
                        <rect x="156" y="115" width="16" height="50" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                        <line x1="156" y1="125" x2="172" y2="125" stroke="#1e293b" />
                        <line x1="156" y1="135" x2="172" y2="135" stroke="#1e293b" />
                        <line x1="156" y1="145" x2="172" y2="145" stroke="#1e293b" />
                        <line x1="156" y1="155" x2="172" y2="155" stroke="#1e293b" />
                        <ellipse cx="164" cy="140" rx="4" ry="12" fill="#475569" />

                        {/* Eje / Motor central */}
                        <rect x="44" y="132" width="112" height="20" fill="#020617" stroke="#1e293b" rx="2" />
                        
                        {/* Pilares metálicos (Nivel 1 a Nivel 2) */}
                        <rect x="56" y="105" width="5" height="28" fill="url(#metalPillar)" />
                        <rect x="139" y="105" width="5" height="28" fill="url(#metalPillar)" />
                        <rect x="78" y="105" width="4" height="28" fill="url(#metalPillar)" />
                        <rect x="118" y="105" width="4" height="28" fill="url(#metalPillar)" />

                        {/* PLACA WAFFLE INFERIOR (Tier 1) */}
                        <ellipse cx="100" cy="135" rx="55" ry="12" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
                        <ellipse cx="70" cy="135" rx="3" ry="1.5" fill="#020617" />
                        <ellipse cx="130" cy="135" rx="3" ry="1.5" fill="#020617" />
                        <ellipse cx="100" cy="138" rx="3" ry="1.5" fill="#020617" />

                        {/* Electrónica en el nivel medio */}
                        <rect x="62" y="98" width="76" height="8" fill="#166534" rx="1" />
                        <rect x="72" y="94" width="22" height="4" fill="#1e40af" />
                        <rect x="106" y="92" width="18" height="6" fill="#1f2937" rx="1" />
                        <path d="M 75,101 Q 88,110 102,101" fill="none" stroke="#ef4444" strokeWidth="1.2" />
                        <path d="M 90,101 Q 105,112 118,101" fill="none" stroke="#eab308" strokeWidth="1.2" />
                        
                        {/* Pilares metálicos (Nivel 2 a Nivel 3) */}
                        <rect x="56" y="70" width="5" height="32" fill="url(#metalPillar)" />
                        <rect x="139" y="70" width="5" height="32" fill="url(#metalPillar)" />
                        <rect x="78" y="70" width="4" height="32" fill="url(#metalPillar)" />
                        <rect x="118" y="70" width="4" height="32" fill="url(#metalPillar)" />

                        {/* PLACA WAFFLE MEDIA (Tier 2) */}
                        <ellipse cx="100" cy="102" rx="55" ry="12" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
                        <ellipse cx="70" cy="102" rx="3" ry="1.5" fill="#020617" />
                        <ellipse cx="130" cy="102" rx="3" ry="1.5" fill="#020617" />
                        <ellipse cx="100" cy="105" rx="3" ry="1.5" fill="#020617" />

                        {/* Pilares metálicos (Nivel 3 a LiDAR) */}
                        <rect x="68" y="48" width="4" height="20" fill="url(#metalPillar)" />
                        <rect x="128" y="48" width="4" height="20" fill="url(#metalPillar)" />
                        <rect x="98" y="48" width="4" height="20" fill="url(#metalPillar)" />

                        {/* PLACA WAFFLE SUPERIOR (Tier 3) */}
                        <ellipse cx="100" cy="68" rx="55" ry="12" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
                        <ellipse cx="70" cy="68" rx="3" ry="1.5" fill="#020617" />
                        <ellipse cx="130" cy="68" rx="3" ry="1.5" fill="#020617" />
                        <ellipse cx="100" cy="71" rx="3" ry="1.5" fill="#020617" />

                        {/* LiDAR en la parte superior (LDS) */}
                        <rect x="76" y="38" width="48" height="15" fill="#020617" stroke="#334155" rx="3" />
                        <ellipse cx="100" cy="38" rx="24" ry="6" fill="#1e293b" />
                        <rect x="82" y="42" width="36" height="5" fill="#000" />
                        
                        {/* Haz de Láser Giratorio Animado (Grupo con Rotación Nativa de SVG) */}
                        <g>
                            <line x1="100" y1="43" x2="100" y2="-30" stroke="#00ffff" strokeWidth="3" />
                            <polygon points="100,43 75,-30 125,-30" fill="rgba(0, 255, 255, 0.15)" />
                            <animateTransform 
                                attributeName="transform" 
                                type="rotate" 
                                from="0 100 43" 
                                to="360 100 43" 
                                dur="4s" 
                                repeatCount="indefinite" 
                            />
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    );
}

export default Home;
