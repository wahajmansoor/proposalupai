"use client";

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Loader2, Link as LinkIcon, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { addCategory, getCategories, deleteCategory, addPortfolioItem, getPortfolioItems, deletePortfolioItem, updatePortfolioItem } from '@/lib/firebase/firestore';
import type { PortfolioCategory, PortfolioItem } from '@/app/lib/types';

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [itemFormData, setItemFormData] = useState({ url: '', description: '', categoryId: '' });


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    if (user) {
      setLoadingData(true);
      const [fetchedCategories, fetchedItems] = await Promise.all([
        getCategories(user.uid),
        getPortfolioItems(user.uid)
      ]);
      setCategories(fetchedCategories);
      setPortfolioItems(fetchedItems);
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !user) return;
    setIsAddingCategory(true);
    const newId = await addCategory(user.uid, newCategoryName.trim());
    if (newId) {
      setCategories([...categories, { id: newId, name: newCategoryName.trim(), userId: user.uid }]);
      setNewCategoryName('');
      toast({ title: 'Success', description: 'Category added.' });
    } else {
      toast({ title: 'Error', description: 'Failed to add category.', variant: 'destructive' });
    }
    setIsAddingCategory(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const success = await deleteCategory(categoryId);
    if (success) {
      await fetchData(); // Refetch all data
      toast({ title: 'Success', description: 'Category and its items have been deleted.' });
    } else {
      toast({ title: 'Error', description: 'Failed to delete category.', variant: 'destructive' });
    }
  };
  
  const handleOpenDialog = (item: PortfolioItem | null, categoryId?: string) => {
    setEditingItem(item);
    setItemFormData({
      url: item?.url || '',
      description: item?.description || '',
      categoryId: item?.categoryId || categoryId || '',
    });
    setIsDialogOpen(true);
  };
  
  const handleItemFormSubmit = async () => {
    if (!user || !itemFormData.url || !itemFormData.categoryId) {
        toast({ title: 'Missing Information', description: 'URL and category are required.', variant: 'destructive' });
        return;
    }

    if (editingItem) { // Update
        const success = await updatePortfolioItem(editingItem.id, {
            url: itemFormData.url,
            description: itemFormData.description,
            categoryId: itemFormData.categoryId,
        });
        if (success) {
            await fetchData();
            toast({ title: 'Success', description: 'Portfolio item updated.' });
        } else {
            toast({ title: 'Error', description: 'Failed to update item.', variant: 'destructive' });
        }
    } else { // Create
        const newItemId = await addPortfolioItem({
            ...itemFormData,
            userId: user.uid,
        });
        if (newItemId) {
            await fetchData();
            toast({ title: 'Success', description: 'Portfolio item added.' });
        } else {
            toast({ title: 'Error', description: 'Failed to add item.', variant: 'destructive' });
        }
    }
    
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    const success = await deletePortfolioItem(itemId);
    if (success) {
      setPortfolioItems(portfolioItems.filter(item => item.id !== itemId));
      toast({ title: 'Success', description: 'Portfolio item deleted.' });
    } else {
      toast({ title: 'Error', description: 'Failed to delete item.', variant: 'destructive' });
    }
  };


  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <Briefcase className="h-6 w-6 text-primary" />
             <h1 className="text-2xl font-bold">My Portfolio</h1>
          </div>
        </div>

        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Add New Category</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <Input 
                        placeholder="e.g., eCommerce Websites" 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <Button onClick={handleAddCategory} disabled={isAddingCategory || !newCategoryName.trim()}>
                        {isAddingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus />}
                        <span className="ml-2 hidden sm:inline">Add Category</span>
                    </Button>
                </div>
            </CardContent>
        </Card>

        {loadingData ? (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        ) : categories.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No categories</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new category.</p>
            </div>
        ) : (
            <div className="space-y-6">
                {categories.map(category => (
                    <Card key={category.id}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{category.name}</CardTitle>
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => handleOpenDialog(null, category.id)}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Item
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {portfolioItems.filter(item => item.categoryId === category.id).map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                                        <div className="flex items-center gap-3">
                                            <LinkIcon className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{item.url}</a>
                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {portfolioItems.filter(item => item.categoryId === category.id).length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">No items in this category yet.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit' : 'Add'} Portfolio Item</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="item-url">URL</Label>
                        <Input id="item-url" value={itemFormData.url} onChange={e => setItemFormData({...itemFormData, url: e.target.value})} placeholder="https://example.com" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="item-desc">Description (Optional)</Label>
                        <Input id="item-desc" value={itemFormData.description} onChange={e => setItemFormData({...itemFormData, description: e.target.value})} placeholder="A brief description of the project" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="item-category">Category</Label>
                        <select
                            id="item-category"
                            value={itemFormData.categoryId}
                            onChange={e => setItemFormData({...itemFormData, categoryId: e.target.value})}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="" disabled>Select a category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleItemFormSubmit}>{editingItem ? 'Save Changes' : 'Add Item'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
