const schemaStatements = [
  {
    name: "users",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(190) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('customer', 'seller', 'admin') NOT NULL DEFAULT 'customer',
        phone VARCHAR(40) NULL,
        avatar_url VARCHAR(500) NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY users_email_unique (email),
        KEY users_role_index (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "vendors",
    sql: `
      CREATE TABLE IF NOT EXISTS vendors (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        store_name VARCHAR(160) NOT NULL,
        slug VARCHAR(180) NOT NULL,
        description TEXT NULL,
        logo_url VARCHAR(500) NULL,
        status ENUM('pending', 'approved', 'suspended') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY vendors_user_unique (user_id),
        UNIQUE KEY vendors_slug_unique (slug),
        KEY vendors_status_index (status),
        CONSTRAINT vendors_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "categories",
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(140) NOT NULL,
        slug VARCHAR(160) NOT NULL,
        description TEXT NULL,
        parent_id BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY categories_slug_unique (slug),
        CONSTRAINT categories_parent_fk FOREIGN KEY (parent_id) REFERENCES categories (id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "products",
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        vendor_id BIGINT UNSIGNED NOT NULL,
        category_id BIGINT UNSIGNED NULL,
        name VARCHAR(180) NOT NULL,
        slug VARCHAR(220) NOT NULL,
        description TEXT NULL,
        price DECIMAL(12, 2) NOT NULL,
        compare_at_price DECIMAL(12, 2) NULL,
        stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
        sku VARCHAR(100) NULL,
        status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY products_slug_unique (slug),
        KEY products_vendor_index (vendor_id),
        KEY products_category_index (category_id),
        KEY products_status_index (status),
        CONSTRAINT products_vendor_fk FOREIGN KEY (vendor_id) REFERENCES vendors (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT products_category_fk FOREIGN KEY (category_id) REFERENCES categories (id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "product_images",
    sql: `
      CREATE TABLE IF NOT EXISTS product_images (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        product_id BIGINT UNSIGNED NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        alt_text VARCHAR(180) NULL,
        sort_order INT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY product_images_unique (product_id, image_url),
        KEY product_images_product_index (product_id),
        CONSTRAINT product_images_product_fk FOREIGN KEY (product_id) REFERENCES products (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "addresses",
    sql: `
      CREATE TABLE IF NOT EXISTS addresses (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        label VARCHAR(80) NULL,
        recipient_name VARCHAR(140) NOT NULL,
        phone VARCHAR(40) NULL,
        address_line1 VARCHAR(220) NOT NULL,
        address_line2 VARCHAR(220) NULL,
        city VARCHAR(120) NOT NULL,
        state VARCHAR(120) NOT NULL,
        postal_code VARCHAR(40) NULL,
        country VARCHAR(120) NOT NULL DEFAULT 'Nigeria',
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY addresses_user_index (user_id),
        CONSTRAINT addresses_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "carts",
    sql: `
      CREATE TABLE IF NOT EXISTS carts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY carts_user_unique (user_id),
        CONSTRAINT carts_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "cart_items",
    sql: `
      CREATE TABLE IF NOT EXISTS cart_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        cart_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        quantity INT UNSIGNED NOT NULL DEFAULT 1,
        price_at_addition DECIMAL(12, 2) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY cart_items_cart_product_unique (cart_id, product_id),
        CONSTRAINT cart_items_cart_fk FOREIGN KEY (cart_id) REFERENCES carts (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT cart_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "wishlists",
    sql: `
      CREATE TABLE IF NOT EXISTS wishlists (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY wishlists_user_product_unique (user_id, product_id),
        CONSTRAINT wishlists_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT wishlists_product_fk FOREIGN KEY (product_id) REFERENCES products (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "coupons",
    sql: `
      CREATE TABLE IF NOT EXISTS coupons (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(40) NOT NULL,
        description VARCHAR(220) NULL,
        discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
        discount_value DECIMAL(12, 2) NOT NULL,
        minimum_order DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        max_discount DECIMAL(12, 2) NULL,
        starts_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        usage_limit INT UNSIGNED NULL,
        used_count INT UNSIGNED NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY coupons_code_unique (code),
        KEY coupons_active_index (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "orders",
    sql: `
      CREATE TABLE IF NOT EXISTS orders (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        order_number VARCHAR(80) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        status ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
        subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        shipping_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        tax_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        coupon_id BIGINT UNSIGNED NULL,
        coupon_code VARCHAR(40) NULL,
        shipping_address_id BIGINT UNSIGNED NULL,
        placed_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY orders_number_unique (order_number),
        KEY orders_user_index (user_id),
        KEY orders_status_index (status),
        CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT orders_coupon_fk FOREIGN KEY (coupon_id) REFERENCES coupons (id)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT orders_shipping_address_fk FOREIGN KEY (shipping_address_id) REFERENCES addresses (id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "order_items",
    sql: `
      CREATE TABLE IF NOT EXISTS order_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        order_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NULL,
        vendor_id BIGINT UNSIGNED NULL,
        product_name VARCHAR(180) NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        unit_price DECIMAL(12, 2) NOT NULL,
        line_total DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY order_items_order_index (order_id),
        KEY order_items_product_index (product_id),
        KEY order_items_vendor_index (vendor_id),
        CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT order_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT order_items_vendor_fk FOREIGN KEY (vendor_id) REFERENCES vendors (id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "order_timeline",
    sql: `
      CREATE TABLE IF NOT EXISTS order_timeline (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        order_id BIGINT UNSIGNED NOT NULL,
        status VARCHAR(40) NOT NULL,
        title VARCHAR(140) NOT NULL,
        note VARCHAR(255) NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY order_timeline_order_index (order_id),
        CONSTRAINT order_timeline_order_fk FOREIGN KEY (order_id) REFERENCES orders (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT order_timeline_user_fk FOREIGN KEY (created_by) REFERENCES users (id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "payments",
    sql: `
      CREATE TABLE IF NOT EXISTS payments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        order_id BIGINT UNSIGNED NOT NULL,
        provider VARCHAR(80) NOT NULL,
        provider_reference VARCHAR(190) NULL,
        amount DECIMAL(12, 2) NOT NULL,
        status ENUM('pending', 'successful', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY payments_provider_reference_unique (provider_reference),
        KEY payments_order_index (order_id),
        CONSTRAINT payments_order_fk FOREIGN KEY (order_id) REFERENCES orders (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "reviews",
    sql: `
      CREATE TABLE IF NOT EXISTS reviews (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        product_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        rating TINYINT UNSIGNED NOT NULL,
        comment TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY reviews_product_user_unique (product_id, user_id),
        KEY reviews_rating_index (rating),
        CONSTRAINT reviews_product_fk FOREIGN KEY (product_id) REFERENCES products (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT reviews_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "recently_viewed",
    sql: `
      CREATE TABLE IF NOT EXISTS recently_viewed (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY recently_viewed_user_product_unique (user_id, product_id),
        KEY recently_viewed_user_index (user_id, viewed_at),
        CONSTRAINT recently_viewed_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT recently_viewed_product_fk FOREIGN KEY (product_id) REFERENCES products (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: "notifications",
    sql: `
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NULL,
        role ENUM('customer', 'seller', 'admin') NULL,
        type VARCHAR(80) NOT NULL,
        title VARCHAR(160) NOT NULL,
        message VARCHAR(500) NOT NULL,
        link_url VARCHAR(255) NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY notifications_user_index (user_id, is_read, created_at),
        KEY notifications_role_index (role, is_read, created_at),
        CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
];

const schemaMaintenanceStatements = [
  {
    name: "users_role_allow_seller_transition",
    sql: "ALTER TABLE users MODIFY role ENUM('customer', 'vendor', 'seller', 'admin') NOT NULL DEFAULT 'customer';",
  },
  {
    name: "users_role_vendor_to_seller",
    sql: "UPDATE users SET role = 'seller' WHERE role = 'vendor';",
  },
  {
    name: "users_role_final_values",
    sql: "ALTER TABLE users MODIFY role ENUM('customer', 'seller', 'admin') NOT NULL DEFAULT 'customer';",
  },
  {
    name: "cart_items_price_at_addition",
    sql: "ALTER TABLE cart_items ADD COLUMN price_at_addition DECIMAL(12, 2) NULL AFTER quantity;",
    ignoreErrors: ["ER_DUP_FIELDNAME"],
  },
  {
    name: "orders_discount_total",
    sql: "ALTER TABLE orders ADD COLUMN discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER subtotal;",
    ignoreErrors: ["ER_DUP_FIELDNAME"],
  },
  {
    name: "orders_coupon_id",
    sql: "ALTER TABLE orders ADD COLUMN coupon_id BIGINT UNSIGNED NULL AFTER grand_total;",
    ignoreErrors: ["ER_DUP_FIELDNAME"],
  },
  {
    name: "orders_coupon_code",
    sql: "ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(40) NULL AFTER coupon_id;",
    ignoreErrors: ["ER_DUP_FIELDNAME"],
  },
  {
    name: "seed_demo_coupons",
    sql: `
      INSERT IGNORE INTO coupons (code, description, discount_type, discount_value, minimum_order, max_discount, is_active)
      VALUES
        ('VENDORA10', '10% off marketplace orders', 'percent', 10.00, 10000.00, 10000.00, TRUE),
        ('WELCOME5000', 'Flat welcome discount', 'fixed', 5000.00, 25000.00, NULL, TRUE);
    `,
  },
];

module.exports = {
  schemaStatements,
  schemaMaintenanceStatements,
};
