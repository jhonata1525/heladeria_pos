import { z } from "zod";

export const INGREDIENT_UNITS = ["gramos", "unidades", "ml"] as const;
export const PRODUCT_KINDS = ["BASE", "COMBO"] as const;

export const productSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  kind: z.enum(PRODUCT_KINDS),
  unit: z.string().trim().refine(
    (val) => INGREDIENT_UNITS.includes(val as (typeof INGREDIENT_UNITS)[number]),
    { message: "Unidad inválida. Usa gramos, unidades o ml." },
  ),
  price: z.number().finite().positive("El precio debe ser mayor a 0"),
  stockQuantity: z.number().finite().int().min(0, "El stock debe ser ≥ 0"),
  categoryId: z.number().int().positive("Categoría inválida"),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "El nombre de la categoría es obligatorio"),
  description: z.string().trim().optional(),
});

export const ingredientSchema = z.object({
  name: z.string().trim().min(1, "El nombre del insumo es obligatorio"),
  unit: z.enum(INGREDIENT_UNITS, {
    message: "Unidad inválida. Usa gramos, unidades o ml.",
  }),
  currentStock: z.number().finite().int().min(0, "El stock actual debe ser ≥ 0"),
  minStock: z.number().finite().int().min(0, "El stock mínimo debe ser ≥ 0"),
  costPerUnit: z.number().finite().min(0, "El costo debe ser ≥ 0"),
});

export const recipeLineSchema = z.object({
  ingredientId: z.number().int().positive("Insumo inválido"),
  quantity: z.number().finite().positive("La cantidad debe ser > 0"),
});

export const recipeSaveSchema = z.object({
  productId: z.number().int().positive("Producto inválido"),
  items: z.array(recipeLineSchema).min(1, "Al menos un insumo es requerido"),
});

export const orderLineSchema = z.object({
  productId: z.number().int().positive("Producto inválido"),
  quantity: z.number().finite().positive("Cantidad inválida"),
  notes: z.string().trim().optional(),
});

export const orderParseSchema = z.object({
  items: z.array(orderLineSchema).min(1, "El pedido debe tener al menos un producto"),
  status: z.enum(["PENDING", "PAID"]).default("PENDING"),
  customerName: z.string().trim().min(1, "El nombre del cliente es obligatorio"),
  tableNumber: z.number().int().nullable().refine(
    (val) => val === null || (Number.isInteger(val) && val > 0),
    { message: "Número de mesa inválido" },
  ),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD"]).optional(),
  cashReceived: z.number().finite().optional(),
});

export const updateOrderSchema = z.object({
  action: z.enum(["pay", "cancel"]),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD"]).optional(),
  cashReceived: z.number().finite().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
export type IngredientFormValues = z.infer<typeof ingredientSchema>;
export type RecipeLineInput = z.infer<typeof recipeLineSchema>;
export type RecipeSavePayload = z.infer<typeof recipeSaveSchema>;
export type OrderFormValues = z.infer<typeof orderParseSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type IngredientUpsertInput = z.infer<typeof ingredientSchema>;