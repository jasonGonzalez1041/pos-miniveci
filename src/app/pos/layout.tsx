'use client';

import { useEffect } from 'react';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { initSyncMetadata } from '@/lib/db/sync-metadata';
import { toast } from 'sonner';

/**
 * Layout del POS con inicialización offline-first
 * 
 * @description
 * - Inicializa base de datos local
 * - Configura sincronización automática
 * - Maneja estados de conexión
 * - Proporciona contexto offline-first
 */
export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isOnline,
    isInitialized,
    isSyncing,
  } = useOfflineSync();

  // Inicialización
  useEffect(() => {
    const initializePos = async () => {
      try {
        // Inicializar metadata de sincronización
        await initSyncMetadata();
        
        console.log('🚀 POS initialized successfully');
        
        if (isInitialized && !isOnline) {
          toast.info('POS funcionando offline', {
            description: 'Los datos se sincronizarán cuando haya conexión',
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('❌ Failed to initialize POS:', error);
        toast.error('Error al inicializar POS');
      }
    };

    if (isInitialized) {
      initializePos();
    }
  }, [isInitialized, isOnline]);

  // Mostrar notificaciones de estado
  useEffect(() => {
    if (!isInitialized) return;

    if (isOnline && !isSyncing) {
      // Pequeño delay para evitar spam de notificaciones
      const timeoutId = setTimeout(() => {
        console.log('🟢 POS online and ready');
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, isSyncing, isInitialized]);

  // Loading state mientras inicializa
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-[#00AEEF] rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Iniciando POS MiniVeci
            </h2>
            <p className="text-[#6B7280]">
              Configurando base de datos local...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {children}
    </div>
  );
}