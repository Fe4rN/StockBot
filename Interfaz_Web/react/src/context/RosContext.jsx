import { createContext, useState, useContext, useEffect } from 'react';
import ROSLIB from 'roslib';

const RosContext = createContext();

export const useRos = () => useContext(RosContext);

export const RosProvider = ({ children }) => {
    const [ros, setRos] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [address, setAddress] = useState('127.0.0.1:9090');

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

    return (
        <RosContext.Provider value={{ ros, isConnected, connectRos, disconnectRos, address, setAddress }}>
            {children}
        </RosContext.Provider>
    );
};