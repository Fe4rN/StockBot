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
    
    // NUEVO: El estado del texto de navegación ahora es global
    const [statusText, setStatusText] = useState("Esperando órdenes...");

    const connectRos = (ip) => {
        let final_address = ip;
        if (!ip.startsWith("ws://") && !ip.startsWith("wss://")) {
            final_address = "ws://" + ip;
        }

        const rosInstance = new ROSLIB.Ros({ url: final_address });

        rosInstance.on('connection', () => {
            console.log("Conexión con ROSBridge correcta");
            setIsConnected(true);
            setRos(rosInstance);
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

    // Escucha Global Ininterrumpida
    useEffect(() => {
        if (!ros || !isConnected) return;

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

        return () => { 
            resultSub.unsubscribe(); 
            intruderSub.unsubscribe(); 
            estadoSub.unsubscribe();
        };
    }, [ros, isConnected]);

    return (
        <RosContext.Provider value={{ 
            ros, isConnected, connectRos, disconnectRos, address, setAddress,
            scanStatus, setScanStatus, securityAlert, setSecurityAlert,
            patrolMode, setPatrolMode, statusText, setStatusText
        }}>
            {children}
        </RosContext.Provider>
    );
};