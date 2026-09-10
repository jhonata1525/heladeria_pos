export interface ProductDTO {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  inStock: boolean;
  stockQuantity: number;
  image: string | null;
  unit: string;
}

export interface CategoryDTO {
  id: number;
  name: string;
  products: ProductDTO[];
}

export interface CartLine {
  product: ProductDTO;
  quantity: number;
  notes: string;
}

export interface PendingOrderItemDTO {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  notes: string | null;
}

export interface PendingOrderDTO {
  id: number;
  orderNumber: number;
  customerName: string | null;
  tableNumber: number | null;
  total: number;
  status: string;
  createdAt: string;
  items: PendingOrderItemDTO[];
}

export type PaymentMethod = "CASH" | "TRANSFER" | "CARD";

export interface ExpenseDTO {
  id: number;
  description: string;
  amount: number;
  category: string;
  createdAt: string;
}

export interface OpenRegisterSummaryDTO {
  id: number;
  openedAt: string;
  initialAmount: number;
  cashSales: number;
  digitalSales: number;
  expensesTotal: number;
  expectedCash: number;
  expenses: ExpenseDTO[];
}

export interface ClosedRegisterDTO {
  id: number;
  openedAt: string;
  closedAt: string;
  initialAmount: number;
  expectedAmount: number | null;
  actualAmount: number | null;
  difference: number | null;
  notes: string | null;
}

export interface IngredientDTO {
  id: number;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
}

export interface RecipeEntryDTO {
  ingredientId: number;
  quantity: number;
}
