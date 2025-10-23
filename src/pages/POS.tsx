import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast as sonnerToast } from "sonner";

const API_BASE = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:8000/api';

interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface Product {
  id: string;
  name: string;
  base_price: number;
  category: string; // This will be the category ID
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POS() {
  const { toast } = useToast();
  const { user, logout } = useAuth(); // Use useAuth hook
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN"); // Updated order types
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      };

      // Fetch categories
      const categoriesResponse = await fetch(`${API_BASE}/staff/categories/`, { headers });
      if (!categoriesResponse.ok) {
        if (categoriesResponse.status === 401) logout();
        throw new Error('Failed to fetch categories');
      }
      const cats: Category[] = await categoriesResponse.json();
      setCategories(cats);

      // Fetch products
      const productsResponse = await fetch(`${API_BASE}/staff/products/`, { headers });
      if (!productsResponse.ok) {
        if (productsResponse.status === 401) logout();
        throw new Error('Failed to fetch products');
      }
      const prods: Product[] = await productsResponse.json();
      setProducts(prods);
    } catch (error) {
      console.error('Error loading POS data:', error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to load POS data.",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter(p => p.category === selectedCategory); // Filter by category ID

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + change;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + (item.product.base_price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const orderData = {
        order_type: orderType,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items: orderItems,
      };

      const response = await fetch(`${API_BASE}/staff/orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        if (response.status === 401) logout();
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const order = await response.json();

      sonnerToast.success("Order Created", {
        description: `Order ${order.id.substring(0, 8)} has been placed successfully.`,
      });

      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setShowCheckout(false);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Products Section */}
      <div className="flex-1 p-6 overflow-auto">
        <h1 className="text-3xl font-bold mb-6">Point of Sale</h1>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <Card
              key={product.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => addToCart(product)}
            >
              <h3 className="font-semibold mb-2">{product.name}</h3>
              <p className="text-lg font-bold text-primary">
                ${product.base_price.toFixed(2)}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 bg-muted p-6 flex flex-col border-t lg:border-t-0 lg:border-l">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart className="h-6 w-6" />
          <h2 className="text-xl font-bold">Current Order</h2>
        </div>

        <div className="flex-1 overflow-auto mb-4">
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Cart is empty</p>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <Card key={item.product.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{item.product.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-bold">
                      ${(item.product.base_price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax (10%):</span>
            <span>${(total * 0.1).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-2 border-t">
            <span>Total:</span>
            <span>${(total * 1.1).toFixed(2)}</span>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={cart.length === 0}
          onClick={() => setShowCheckout(true)}
        >
          Checkout
        </Button>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={(v: "DINE_IN" | "TAKEAWAY" | "DELIVERY") => setOrderType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DINE_IN">Dine In</SelectItem>
                  <SelectItem value="TAKEAWAY">Takeaway</SelectItem>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer Name (Optional)</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label>Phone Number (Optional)</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="pt-4 border-t">
              <div className="text-2xl font-bold text-center">
                Total: ${(total * 1.1).toFixed(2)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckout} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Confirm Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
