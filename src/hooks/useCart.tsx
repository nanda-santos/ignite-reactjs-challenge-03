import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let productExists = cart.find(product => product.id === productId);
      let newCart: Product[];
      
      let productStock = await api.get(`stock/${productId}`)
      let amount = productStock.data.amount;
      
      if (productExists) {
        if (amount <= 0 || productExists.amount + 1 > amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      
        newCart = [...cart, {
          ...productExists,
          amount: productExists.amount + 1
        }]
      } else {
        let product = await api.get(`products/${productId}`).then(res => res.data)

        if (product) {
          newCart = [...cart, {
            ...product,
            amount: 1
          }]
        } else {
          throw Error();
        }
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))        
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let productIndex = cart.findIndex(product => product.id === productId)
      let newCart = cart;

      if (productIndex >= 0) {
        newCart.splice(productIndex, 1)
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;   

      let productStock = await api.get(`stock/${productId}`)
      let productStockAmount = productStock.data.amount;

      if (amount > productStockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let productExists = cart.find(product => product.id === productId);

      if (productExists) {
        let newCart = [...cart, {
          ...productExists,
          amount
        }]
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
