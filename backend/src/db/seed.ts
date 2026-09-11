import bcrypt from 'bcrypt';
import { pool } from '../config/db';

/**
 * Realistic wholesale/distribution seed for FundFlow ERP demos.
 * Password for all demo users: Password@123
 */
async function seed(): Promise<void> {
  const client = await pool.connect();
  const passwordHash = await bcrypt.hash('Password@123', 10);

  try {
    await client.query('BEGIN');

    // Idempotent wipe of demo data (preserve schema)
    await client.query('DELETE FROM sales_challan_items');
    await client.query('DELETE FROM sales_challans');
    await client.query('DELETE FROM stock_movements');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM customer_follow_ups');
    await client.query('DELETE FROM customers');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM challan_number_seq');

    const users = await client.query<{ id: string; role: string }>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES
         ('Asha Verma', 'admin@fundflow.local', $1, 'ADMIN'),
         ('Rohan Mehta', 'sales@fundflow.local', $1, 'SALES'),
         ('Priya Nair', 'warehouse@fundflow.local', $1, 'WAREHOUSE'),
         ('Karan Shah', 'accounts@fundflow.local', $1, 'ACCOUNTS')
       RETURNING id, role`,
      [passwordHash],
    );

    const adminId = users.rows.find((u) => u.role === 'ADMIN')!.id;
    const salesId = users.rows.find((u) => u.role === 'SALES')!.id;
    const warehouseId = users.rows.find((u) => u.role === 'WAREHOUSE')!.id;

    const customers = await client.query<{ id: string; business_name: string }>(
      `INSERT INTO customers (
          customer_name, mobile_number, email, business_name, gst_number,
          customer_type, address, status, follow_up_date, notes
        ) VALUES
          ('Suresh Patel', '9876543210', 'suresh@pateltraders.in', 'Patel Traders',
           '24AABCP1234D1Z5', 'WHOLESALE', '12 Ring Road, Ahmedabad, GJ', 'ACTIVE',
           CURRENT_DATE + 3, 'Prefers bulk carton orders. Call before 11 AM.'),
          ('Meena Iyer', '9988776655', 'meena@southdist.co', 'South Distro Pvt Ltd',
           '33AAGCS9988F1Z2', 'DISTRIBUTOR', '45 Industrial Estate, Coimbatore, TN', 'ACTIVE',
           CURRENT_DATE + 7, 'Quarterly stocking plan in discussion.'),
          ('Arjun Kapoor', '9123456780', 'arjun@kapoorretail.com', 'Kapoor Retail Mart',
           NULL, 'RETAIL', '88 MG Road, Pune, MH', 'LEAD',
           CURRENT_DATE + 1, 'Interested in stationery starter pack.'),
          ('Fatima Khan', '9090909090', 'accounts@khanwholesales.com', 'Khan Wholesale Hub',
           '07AAKFK5566H1Z9', 'WHOLESALE', '3 Azad Market, Delhi', 'ACTIVE',
           CURRENT_DATE - 1, 'Follow-up overdue: confirm payment terms.'),
          ('Vikram Desai', '9811122233', NULL, 'Desai General Stores',
           NULL, 'RETAIL', '21 Station Road, Surat, GJ', 'INACTIVE',
           NULL, 'Paused ordering for this quarter.')
       RETURNING id, business_name`,
    );

    const products = await client.query<{
      id: string;
      sku: string;
      product_name: string;
      current_stock: number;
    }>(
      `INSERT INTO products (
          product_name, sku, category, unit_price, current_stock,
          minimum_stock_quantity, warehouse_location
        ) VALUES
          ('A4 Copier Paper Ream', 'STN-A4-500', 'Stationery', 240.00, 120, 40, 'Rack A-01'),
          ('Ball Pen Blue Box (50)', 'STN-PEN-BLU', 'Stationery', 175.00, 35, 50, 'Rack A-02'),
          ('Corrugated Carton Medium', 'PKG-CTN-M', 'Packaging', 45.00, 8, 25, 'Bay B-03'),
          ('Packaging Tape 48mm', 'PKG-TAPE-48', 'Packaging', 55.00, 200, 60, 'Bay B-01'),
          ('LED Desk Lamp', 'ELC-LAMP-01', 'Electronics', 899.00, 18, 10, 'Shelf C-02'),
          ('USB-C Hub 7-in-1', 'ELC-HUB-7', 'Electronics', 1499.00, 4, 8, 'Shelf C-04'),
          ('Safety Gloves Pair', 'SAF-GLV-L', 'Safety', 120.00, 60, 20, 'Rack D-01'),
          ('N95 Mask Box (20)', 'SAF-N95-20', 'Safety', 350.00, 15, 15, 'Rack D-02')
       RETURNING id, sku, product_name, current_stock`,
    );

    // Opening stock movements (IN) for every product
    for (const product of products.rows) {
      await client.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
         VALUES ($1, $2, 'IN', 'Opening stock / GRN intake', $3)`,
        [product.id, product.current_stock, warehouseId],
      );
    }

    const bySku = Object.fromEntries(products.rows.map((p) => [p.sku, p]));
    const patel = customers.rows.find((c) => c.business_name === 'Patel Traders')!;
    const south = customers.rows.find((c) => c.business_name === 'South Distro Pvt Ltd')!;
    const kapoor = customers.rows.find((c) => c.business_name === 'Kapoor Retail Mart')!;
    const khan = customers.rows.find((c) => c.business_name === 'Khan Wholesale Hub')!;

    await client.query(
      `INSERT INTO customer_follow_ups (customer_id, note, follow_up_date, created_by)
       VALUES
         ($1, 'Discussed carton MOQ and delivery SLA.', CURRENT_DATE + 3, $2),
         ($3, 'Payment terms follow-up overdue — call accounts contact.', CURRENT_DATE - 1, $2)`,
      [patel.id, salesId, khan.id],
    );

    // Draft challan — must NOT reduce stock
    const draft = await client.query<{ id: string }>(
      `INSERT INTO sales_challans (challan_number, customer_id, total_quantity, status, created_by)
       VALUES ('SC-2026-0001', $1, 12, 'DRAFT', $2)
       RETURNING id`,
      [kapoor.id, salesId],
    );

    await client.query(
      `INSERT INTO sales_challan_items (
          challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity
        ) VALUES
          ($1, $2, $3, 'STN-A4-500', 240.00, 10),
          ($1, $4, $5, 'STN-PEN-BLU', 175.00, 2)`,
      [
        draft.rows[0].id,
        bySku['STN-A4-500'].id,
        bySku['STN-A4-500'].product_name,
        bySku['STN-PEN-BLU'].id,
        bySku['STN-PEN-BLU'].product_name,
      ],
    );

    // Confirmed challan — stock already reflected in current_stock + matching OUT movements
    // We reduce stock and write OUT movements for demo realism.
    const confirmQtyPaper = 20;
    const confirmQtyTape = 10;
    const paper = bySku['STN-A4-500'];
    const tape = bySku['PKG-TAPE-48'];

    await client.query(
      `UPDATE products SET current_stock = current_stock - $1 WHERE id = $2`,
      [confirmQtyPaper, paper.id],
    );
    await client.query(
      `UPDATE products SET current_stock = current_stock - $1 WHERE id = $2`,
      [confirmQtyTape, tape.id],
    );

    const confirmed = await client.query<{ id: string }>(
      `INSERT INTO sales_challans (challan_number, customer_id, total_quantity, status, created_by)
       VALUES ('SC-2026-0002', $1, $2, 'CONFIRMED', $3)
       RETURNING id`,
      [patel.id, confirmQtyPaper + confirmQtyTape, salesId],
    );

    await client.query(
      `INSERT INTO sales_challan_items (
          challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity
        ) VALUES
          ($1, $2, $3, 'STN-A4-500', 240.00, $4),
          ($1, $5, $6, 'PKG-TAPE-48', 55.00, $7)`,
      [
        confirmed.rows[0].id,
        paper.id,
        paper.product_name,
        confirmQtyPaper,
        tape.id,
        tape.product_name,
        confirmQtyTape,
      ],
    );

    await client.query(
      `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
       VALUES
         ($1, $2, 'OUT', 'Sales challan SC-2026-0002 confirmation', $3),
         ($4, $5, 'OUT', 'Sales challan SC-2026-0002 confirmation', $3)`,
      [paper.id, confirmQtyPaper, salesId, tape.id, confirmQtyTape],
    );

    // Cancelled draft example (no stock impact)
    await client.query(
      `INSERT INTO sales_challans (challan_number, customer_id, total_quantity, status, created_by)
       VALUES ('SC-2026-0003', $1, 5, 'CANCELLED', $2)`,
      [south.id, adminId],
    );

    await client.query(
      `INSERT INTO challan_number_seq (year, last_value) VALUES (2026, 3)
       ON CONFLICT (year) DO UPDATE SET last_value = EXCLUDED.last_value`,
    );

    await client.query('COMMIT');
    console.log('Seed complete.');
    console.log('Demo users (password: Password@123):');
    console.log('  admin@fundflow.local      ADMIN');
    console.log('  sales@fundflow.local      SALES');
    console.log('  warehouse@fundflow.local  WAREHOUSE');
    console.log('  accounts@fundflow.local   ACCOUNTS');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
