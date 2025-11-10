'use client';

import { useEffect, useState } from 'react';
import { localDb } from '@/lib/db/local-db';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { scheduleSyncDebounced } from '@/lib/db/sync';
import type { Product } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [prods, setProds] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    imageUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  const { isOnline, isSyncing, isInitialized, triggerSync } = useOfflineSync();

  // Load products from local database
  const loadProducts = async () => {
    try {
      const result = await localDb.getAllProducts();
      setProds(result);
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error('Error carga local.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      loadProducts();
    }
  }, [isInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
        price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
        stock: parseInt(formData.stock) || 0,
        imageUrl: formData.imageUrl || null,
      };

      if (editingId) {
        await localDb.updateProduct(editingId, data);
      } else {
        await localDb.insertProduct(data);
      }

      // Reload products
      await loadProducts();

      // Reset form
      setEditingId(null);
      setFormData({ name: '', description: '', price: '', stock: '', imageUrl: '' });

      toast.success(isOnline ? 'Guardado en cloud.' : 'Guardado local (sync pronto).');

      // Schedule background sync
      if (isOnline) {
        scheduleSyncDebounced(1000);
      }
    } catch (err) {
      console.error('Failed to save product:', err);
      toast.error('Error al guardar.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await localDb.deleteProduct(id);
      await loadProducts();
      toast.success('Eliminado.');

      // Schedule background sync
      if (isOnline) {
        scheduleSyncDebounced(1000);
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast.error('Error al eliminar.');
    }
  };

  const handleEdit = (id: number) => {
    const prod = prods.find((p) => p.id === id);
    if (prod) {
      setEditingId(id);
      setFormData({
        name: prod.name,
        description: prod.description || '',
        price: (prod.price / 100).toFixed(2),
        stock: prod.stock.toString(),
        imageUrl: prod.imageUrl || '',
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', price: '', stock: '', imageUrl: '' });
  };

  if (!isInitialized) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Inicializando base de datos local...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl">Dashboard POS - Miniveci</CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant={isOnline ? 'default' : 'secondary'} className="flex items-center gap-2">
                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              {isSyncing && (
                <Badge variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Syncing...
                </Badge>
              )}
              {isOnline && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerSync}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{editingId ? 'Editar Producto' : 'Agregar Producto'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">ID Imagen</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button type="submit">{editingId ? 'Actualizar' : 'Agregar'}</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prods.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.description || '-'}</TableCell>
                      <TableCell>${(p.price / 100).toFixed(2)}</TableCell>
                      <TableCell>{p.stock}</TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(p.id!)}>
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id!)}>
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {prods.length === 0 && (
                <p className="text-center text-muted-foreground mt-4">
                  No hay productos. ¡Agrega uno!
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
