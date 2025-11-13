'use client';

import { useState, useEffect } from 'react';
import { User, Settings, RefreshCw, Wifi, WifiOff, Clock, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CheckoutHeaderProps {
  userName?: string;
  userRole?: string;
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date | null;
  cartItemCount: number;
  cartTotal: number;
  onToggleCart: () => void;
  onManualSync?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

/**
 * Header del POS con información del usuario y estado
 * 
 * @description
 * - Información del cajero actual
 * - Estado de conexión y sincronización
 * - Resumen rápido del carrito
 * - Controles de configuración
 * - Reloj en tiempo real
 */
export function CheckoutHeader({
  userName = 'Cajero',
  userRole = 'cashier',
  isOnline,
  isSyncing,
  lastSync,
  cartItemCount,
  cartTotal,
  onToggleCart,
  onManualSync,
  onOpenSettings,
  onLogout,
}: CheckoutHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Reloj en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getLastSyncText = () => {
    if (!lastSync) return 'Nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Hace menos de 1 min';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    return lastSync.toLocaleDateString('es-CL');
  };

  const getRoleLabel = (role: string) => {
    const roles = {
      admin: 'Administrador',
      cashier: 'Cajero',
      viewer: 'Visualizador',
    };
    return roles[role as keyof typeof roles] || role;
  };

  return (
    <header className="flex-shrink-0 bg-white border-b border-[#E5E7EB] shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Branding & Time */}
          <div className="flex items-center space-x-6">
            {/* Logo/Branding */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#00AEEF] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#111827]">POS MiniVeci</h1>
                <p className="text-sm text-[#6B7280]">Next Level</p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="hidden md:block border-l border-[#E5E7EB] pl-6">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-[#6B7280]" />
                <div>
                  <p className="font-medium text-[#111827]">{formatTime(currentTime)}</p>
                  <p className="text-xs text-[#6B7280] capitalize">{formatDate(currentTime)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Center Section - Cart Summary */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={onToggleCart}
              className={cn(
                "flex items-center space-x-3 px-4 py-2 h-auto",
                cartItemCount > 0 && "border-[#00AEEF] bg-[#00AEEF]/5"
              )}
            >
              <ShoppingCart className="h-5 w-5" />
              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-[#111827]">
                    {cartItemCount} items
                  </span>
                  {cartItemCount > 0 && (
                    <Badge className="bg-[#00AEEF] text-white">
                      {cartItemCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-[#00AEEF] font-semibold">
                  ${cartTotal.toLocaleString('es-CL')}
                </p>
              </div>
            </Button>
          </div>

          {/* Right Section - User & Status */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="hidden md:flex items-center space-x-2">
              <div className={cn(
                "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
                isOnline ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#F59E0B]/10 text-[#F59E0B]"
              )}>
                {isOnline ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Sync Status */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onManualSync}
                disabled={isSyncing || !isOnline}
                className="text-[#6B7280] hover:text-[#111827]"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  isSyncing && "animate-spin"
                )} />
                <span className="ml-1 text-xs">
                  {isSyncing ? 'Sync...' : getLastSyncText()}
                </span>
              </Button>
            </div>

            {/* Mobile Cart Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleCart}
              className="lg:hidden relative"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-[#00AEEF] text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            <div className="flex items-center space-x-3 border-l border-[#E5E7EB] pl-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#8CC63F] rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-[#111827]">{userName}</p>
                  <p className="text-xs text-[#6B7280]">{getRoleLabel(userRole)}</p>
                </div>
              </div>

              {/* Settings Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenSettings}
                className="text-[#6B7280] hover:text-[#111827]"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Status Bar */}
        <div className="md:hidden mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <div className={cn(
              "flex items-center space-x-1",
              isOnline ? "text-[#10B981]" : "text-[#F59E0B]"
            )}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            
            <div className="flex items-center space-x-1 text-[#6B7280]">
              <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
              <span>{isSyncing ? 'Sincronizando...' : `Último sync: ${getLastSyncText()}`}</span>
            </div>
          </div>

          <div className="text-[#111827] font-medium">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
    </header>
  );
}