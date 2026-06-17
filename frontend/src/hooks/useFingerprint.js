import { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import axiosInstance from '../config/axios';
import API_ENDPOINTS from '../config/api';

// Fingerprint bridge is a local hardware service — always localhost.
// Override via VITE_FINGERPRINT_BRIDGE_URL if the bridge runs on a different port.
const BRIDGE_URL = import.meta.env.VITE_FINGERPRINT_BRIDGE_URL || 'http://localhost:3001';

export const useFingerprint = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [error, setError] = useState(null);
  const [bridgeStatus, setBridgeStatus] = useState('disconnected');

  useEffect(() => {
    const newSocket = io(BRIDGE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Connected to fingerprint bridge');
      setIsConnected(true);
      setBridgeStatus('connected');
      setError(null);
    });

    newSocket.on('connection-status', (data) => {
      setBridgeStatus(data.connected ? 'scanner-ready' : 'scanner-disconnected');
    });

    newSocket.on('fingerprint-data', (data) => {
      setLastScan(data);
      setScanning(false);
    });

    newSocket.on('scanning', (data) => {
      setScanning(data.status === 'in-progress');
    });

    newSocket.on('error', (errorData) => {
      console.error('Bridge error:', errorData);
      setError(errorData.message);
      setScanning(false);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setBridgeStatus('disconnected');
    });

    setSocket(newSocket);

    fetch(`${BRIDGE_URL}/api/status`)
      .then(res => res.json())
      .then(data => {
        setBridgeStatus(data.connected ? 'scanner-ready' : 'scanner-disconnected');
      })
      .catch(() => {
        setBridgeStatus('bridge-offline');
      });

    return () => {
      newSocket.close();
    };
  }, []);

  const scanFingerprint = useCallback(() => {
    if (!isConnected) {
      setError('Bridge server not connected');
      return Promise.reject('Bridge not connected');
    }

    if (bridgeStatus !== 'scanner-ready') {
      setError('Fingerprint scanner not ready');
      return Promise.reject('Scanner not ready');
    }

    setScanning(true);
    setError(null);

    return new Promise((resolve, reject) => {
      if (!socket) {
        reject('Socket not initialized');
        return;
      }

      const onData = (data) => {
        socket.off('fingerprint-data', onData);
        socket.off('error', onError);
        resolve(data);
      };

      const onError = (errorData) => {
        socket.off('fingerprint-data', onData);
        socket.off('error', onError);
        reject(errorData);
      };

      socket.once('fingerprint-data', onData);
      socket.once('error', onError);

      socket.emit('scan-fingerprint');
    });
  }, [socket, isConnected, bridgeStatus]);

  const clockInWithFingerprint = useCallback(async (employeeId) => {
    const fingerprintData = await scanFingerprint();

    const response = await axiosInstance.post(API_ENDPOINTS.ATTENDANCE_CLOCK_IN, {
      employee_id: employeeId,
      fingerprint_data: fingerprintData,
      timestamp: new Date().toISOString(),
    });

    return response.data;
  }, [scanFingerprint]);

  return {
    isConnected: isConnected && bridgeStatus === 'scanner-ready',
    scanning,
    lastScan,
    error,
    bridgeStatus,
    scanFingerprint,
    clockInWithFingerprint,
  };
};
