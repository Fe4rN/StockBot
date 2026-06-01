import { createContext, useState, useContext, useEffect } from 'react';

const RosContext = createContext();

export const useRos = () => useContext(RosContext);

export const RosProvider = ({ children }) => {
    const [ros, setRos] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [address, setAddress] = useState('127.0.0.1:9090');

    const [scanStatus, setScanStatus] = useState("En espera");
    const [securityAlert, setSecurityAlert] = useState("Sistema Normal");
    const [patrolMode, setPatrolMode] = useState("MANUAL");
    const [statusText, setStatusText] = useState("Esperando órdenes...");
    const [darkMode, setDarkMode] = useState(false);
    const [batteryLevel, setBatteryLevel] = useState(100);

    // NUEVO: Estados globales de telemetría y salud del robot
    const [velocity, setVelocity] = useState({ linear: 0, angular: 0 });
    const [orientation, setOrientation] = useState(0); // Orientación (Yaw) en grados (0-360)
    const [minObstacleDist, setMinObstacleDist] = useState(null); // Distancia en metros al obstáculo más cercano

    const connectRos = (ip) => {
        let final_address = ip;
        if (!ip.startsWith("ws://") && !ip.startsWith("wss://")) {
            final_address = "ws://" + ip;
        }

        const rosInstance = new ROSLIB.Ros({ url: final_address });

        rosInstance.on('connection', () => {
            console.log("Conexión con ROSBridge correcta. Verificando nodos del robot...");

            rosInstance.getServices((services) => {
                const robotServices = ['/ir_a_estanteria', '/control_patrulla'];
                const hasRobot = services.some(srv => robotServices.includes(srv));

                if (hasRobot) {
                    console.log("Robot detectado con éxito.");
                    setIsConnected(true);
                    setRos(rosInstance);
                } else {
                    console.warn("Nodos del robot no detectados.");
                    alert("Advertencia. ROSBridge está activo, pero no se detectan los servicios del robot. Asegúrate de haber lanzado Gazebo, Rviz y sus nodos.");
                    rosInstance.close();
                    setIsConnected(false);
                    setRos(null);
                }
            }, (error) => {
                console.error("Error consultando servicios del robot:", error);
                rosInstance.close();
                setIsConnected(false);
                setRos(null);
            });
        });

        rosInstance.on('error', () => {
            console.log("Error al conectar");
            setIsConnected(false);
            setRos(null);
        });

        rosInstance.on('close', () => {
            console.log("Conexión cerrada");
            setIsConnected(false);
            setRos(null);
        });
    };

    const disconnectRos = () => {
        if (ros) ros.close();
        setIsConnected(false);
        setRos(null);
    };

    // Simular descarga de batería de 30 minutos (baja 1% cada 18 segundos)
    useEffect(() => {
        const interval = setInterval(() => {
            setBatteryLevel(prev => (prev > 1 ? prev - 1 : 100));
        }, 18000);

        return () => clearInterval(interval);
    }, []);

    // Escucha Global Ininterrumpida
    useEffect(() => {
        if (!ros || !isConnected) {
            setVelocity({ linear: 0, angular: 0 });
            setOrientation(0);
            setMinObstacleDist(null);
            return;
        }

        // Búsqueda de Códigos de Barras
        const resultSub = new ROSLIB.Topic({ ros: ros, name: '/resultado_busqueda', messageType: 'std_msgs/String' });
        resultSub.subscribe((msg) => {
            if (msg.data !== "No encontrado") setScanStatus(msg.data.toUpperCase());
        });

        // Detección de Intrusos
        const intruderSub = new ROSLIB.Topic({ ros: ros, name: '/alertas_intrusion', messageType: 'std_msgs/String' });
        intruderSub.subscribe((msg) => {
            setSecurityAlert(`🚨 ${msg.data}`);
            setTimeout(() => setSecurityAlert("Sistema Normal"), 5000);
        });

        // Escuchar el estado real del robot
        const estadoSub = new ROSLIB.Topic({ ros: ros, name: '/estado_patrulla', messageType: 'std_msgs/String' });
        estadoSub.subscribe((msg) => {
            setPatrolMode(msg.data);
        });

        // Suscribirse a la batería con promedio acumulado cada 15 segundos
        let batteryBuffer = [];
        let hasSetInitial = false;

        const batterySub = new ROSLIB.Topic({ ros: ros, name: '/battery_state', messageType: 'sensor_msgs/msg/BatteryState' });
        batterySub.subscribe((msg) => {
            if (msg) {
                // Extraer el valor del voltaje (si no viene, intentamos usar el percentage si está inflado)
                let raw_voltage = (msg.voltage !== undefined && msg.voltage !== 0) ? msg.voltage : (msg.percentage || 0);

                // Si viene escalado en voltios (ej: 11.1), se multiplica por 1000.
                // Si viene como entero bruto inflado (ej: 11100), se trata directamente.
                let voltage_mv = raw_voltage < 20.0 ? raw_voltage * 1000.0 : raw_voltage;

                // Clamping de seguridad entre 9900 mV (0%) y 12600 mV (100%)
                const min_voltage = 9900.0;
                const max_voltage = 12600.0;
                const clamped_mv = Math.max(min_voltage, Math.min(voltage_mv, max_voltage));

                // Interpolación lineal
                const range = max_voltage - min_voltage;
                let pct = 0;
                if (range > 0) {
                    pct = ((clamped_mv - min_voltage) / range) * 100;
                }

                batteryBuffer.push(pct);

                // Si es el primer dato que recibimos, lo mostramos de inmediato
                if (!hasSetInitial) {
                    setBatteryLevel(Math.round(pct));
                    hasSetInitial = true;
                }
            }
        });

        // Intervalo para promediar y actualizar la interfaz cada 15 segundos
        const averageInterval = setInterval(() => {
            if (batteryBuffer.length > 0) {
                const sum = batteryBuffer.reduce((a, b) => a + b, 0);
                const avg = sum / batteryBuffer.length;
                setBatteryLevel(Math.round(avg));
                batteryBuffer = []; // Reset del buffer
            }
        }, 15000);

        // Suscribirse a la odometría (Velocidad y Orientación)
        const odomSub = new ROSLIB.Topic({ ros: ros, name: '/odom', messageType: 'nav_msgs/msg/Odometry' });
        odomSub.subscribe((msg) => {
            if (msg.twist && msg.twist.twist) {
                const linearX = msg.twist.twist.linear.x;
                const angularZ = msg.twist.twist.angular.z;
                setVelocity({
                    linear: parseFloat(linearX.toFixed(2)),
                    angular: parseFloat(angularZ.toFixed(2))
                });
            }
            if (msg.pose && msg.pose.pose && msg.pose.pose.orientation) {
                const q = msg.pose.pose.orientation;
                const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
                const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
                const yawRad = Math.atan2(siny_cosp, cosy_cosp);
                let yawDeg = Math.round(yawRad * (180 / Math.PI));
                if (yawDeg < 0) yawDeg += 360;
                setOrientation(yawDeg);
            }
        });

        // Suscribirse al escáner LiDAR (Distancia a obstáculo más cercano)
        const scanSub = new ROSLIB.Topic({ ros: ros, name: '/scan', messageType: 'sensor_msgs/msg/LaserScan' });
        scanSub.subscribe((msg) => {
            if (msg.ranges && msg.ranges.length > 0) {
                // Filtrar lecturas válidas de distancia
                const validRanges = msg.ranges.filter(r => r > 0.08 && r < 4.0);
                if (validRanges.length > 0) {
                    const minDist = Math.min(...validRanges);
                    setMinObstacleDist(parseFloat(minDist.toFixed(2)));
                } else {
                    setMinObstacleDist(null);
                }
            }
        });

        return () => {
            resultSub.unsubscribe();
            intruderSub.unsubscribe();
            estadoSub.unsubscribe();
            batterySub.unsubscribe();
            odomSub.unsubscribe();
            scanSub.unsubscribe();
            clearInterval(averageInterval);
        };
    }, [ros, isConnected]);

    return (
        <RosContext.Provider value={{
            ros, isConnected, connectRos, disconnectRos, address, setAddress,
            scanStatus, setScanStatus, securityAlert, setSecurityAlert,
            patrolMode, setPatrolMode, statusText, setStatusText,
            darkMode, setDarkMode, batteryLevel, setBatteryLevel,
            velocity, orientation, minObstacleDist
        }}>
            {children}
        </RosContext.Provider>
    );
};