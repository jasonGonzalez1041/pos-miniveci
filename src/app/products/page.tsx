'use client';

import { useEffect, useState } from 'react';
import { localDb } from '@/lib/db/local-db';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { scheduleSyncDebounced } from '@/lib/db/sync';
import type { Product } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, Plus, Edit2, Trash2, X } from 'lucide-react';

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
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
      setProducts(result);
    } catch (err) {
      console.error('Failed to load products:', err);
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

      // Schedule background sync
      if (isOnline) {
        scheduleSyncDebounced(1000);
      }
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('Error guardando producto. Ver consola.');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id!);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: (product.price / 100).toFixed(2),
      stock: product.stock.toString(),
      imageUrl: product.imageUrl || '',
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Seguro que quieres eliminar este producto?')) return;

    try {
      await localDb.deleteProduct(id);
      await loadProducts();

      // Schedule background sync
      if (isOnline) {
        scheduleSyncDebounced(1000);
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Error eliminando producto. Ver consola.');
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
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header with Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl">Mantenimiento de Productos</CardTitle>
              <CardDescription>Local-first POS con sync automático</CardDescription>
            </div>
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

      {/* Product Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? 'Editar Producto' : 'Agregar Producto'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: Coca Cola 2L"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  placeholder="10.50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del producto"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL Imagen</Label>
                <Input
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">Guardar</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Productos ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay productos registrados</p>
              <p className="text-sm mt-2">Agrega tu primer producto para comenzar</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(product.price / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.stock === 0 ? (
                          <span className="text-red-600 font-medium">Sin stock</span>
                        ) : (
                          `Stock: ${product.stock}`
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {product.synced === 0 ? (
                          <Badge variant="outline">Pendiente sincronización</Badge>
                        ) : (
                          <Badge variant="secondary">Sincronizado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            aria-label="Editar"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label="Eliminar"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
