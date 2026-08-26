import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Role, Unit } from "../src/constants/enums";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@meatshop.com" },
    update: {},
    create: {
      name: "Shop Owner",
      email: "admin@meatshop.com",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const cashierHash = await bcrypt.hash("Cashier@123", 10);
  await prisma.user.upsert({
    where: { email: "cashier@meatshop.com" },
    update: {},
    create: {
      name: "Front Counter Cashier",
      email: "cashier@meatshop.com",
      passwordHash: cashierHash,
      role: Role.CASHIER,
    },
  });

  const categories = ["Beef", "Chicken", "Mutton", "Fish & Seafood", "Sausages & Processed"];
  const categoryRecords: Record<string, string> = {};
  for (const name of categories) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryRecords[name] = cat.id;
  }

  const products = [
    { name: "Beef Ribeye Steak", sku: "BEEF-RIB-001", category: "Beef", unit: Unit.KG, costPrice: 8.5, sellingPrice: 14.99, stockQty: 40, reorderLevel: 10 },
    { name: "Beef Mince (Ground Beef)", sku: "BEEF-MIN-002", category: "Beef", unit: Unit.KG, costPrice: 5.2, sellingPrice: 9.5, stockQty: 60, reorderLevel: 15 },
    { name: "Whole Chicken", sku: "CHK-WHL-001", category: "Chicken", unit: Unit.PIECE, costPrice: 4.0, sellingPrice: 7.25, stockQty: 35, reorderLevel: 10 },
    { name: "Chicken Breast Fillet", sku: "CHK-BRS-002", category: "Chicken", unit: Unit.KG, costPrice: 4.8, sellingPrice: 8.99, stockQty: 50, reorderLevel: 12 },
    { name: "Mutton Leg", sku: "MUT-LEG-001", category: "Mutton", unit: Unit.KG, costPrice: 9.0, sellingPrice: 16.5, stockQty: 20, reorderLevel: 8 },
    { name: "Mutton Chops", sku: "MUT-CHP-002", category: "Mutton", unit: Unit.KG, costPrice: 9.5, sellingPrice: 17.0, stockQty: 3, reorderLevel: 8 },
    { name: "Salmon Fillet", sku: "FSH-SAL-001", category: "Fish & Seafood", unit: Unit.KG, costPrice: 10.0, sellingPrice: 18.75, stockQty: 15, reorderLevel: 6 },
    { name: "Tiger Prawns", sku: "FSH-PRW-002", category: "Fish & Seafood", unit: Unit.KG, costPrice: 12.0, sellingPrice: 21.0, stockQty: 2, reorderLevel: 5 },
    { name: "Beef Sausages", sku: "PRC-SAU-001", category: "Sausages & Processed", unit: Unit.PIECE, costPrice: 0.6, sellingPrice: 1.25, stockQty: 200, reorderLevel: 50 },
    { name: "Smoked Bacon", sku: "PRC-BAC-002", category: "Sausages & Processed", unit: Unit.KG, costPrice: 6.5, sellingPrice: 11.5, stockQty: 25, reorderLevel: 8 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        name: p.name,
        sku: p.sku,
        categoryId: categoryRecords[p.category],
        unit: p.unit,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stockQty: p.stockQty,
        reorderLevel: p.reorderLevel,
      },
    });
  }

  const supplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-1" },
    update: {},
    create: {
      id: "seed-supplier-1",
      name: "Green Valley Meat Wholesalers",
      phone: "+1-555-0142",
      email: "orders@greenvalleymeat.example",
      address: "12 Industrial Ave, Meatville",
    },
  });

  const customer = await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      name: "Walk-in Customer",
      phone: null,
      creditBalance: 0,
    },
  });

  console.log("Seed complete:", { admin: admin.email, supplier: supplier.name, customer: customer.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
