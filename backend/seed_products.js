const { sequelize, Product, ProductCategory, UnitOfMeasure } = require('./models');

async function seedProducts() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Ensure we have a Category and UOM
    const [category] = await ProductCategory.findOrCreate({
      where: { name: 'Test Category' },
      defaults: { description: 'Category for testing' }
    });

    const [uom] = await UnitOfMeasure.findOrCreate({
      where: { code: 'PCS' },
      defaults: { name: 'Pieces' }
    });

    // Create Dummy Products
    const products = [
      {
        sku: 'SKU-001',
        name: 'Test Product 1',
        category_id: category.id,
        uom_id: uom.id,
        purchase_price: 50,
        dealer_landing_price: 70,
        selling_price: 100,
        tax_rate: 18,
        hsn_sac: '1234'
      },
      {
        sku: 'SKU-002',
        name: 'Test Product 2',
        category_id: category.id,
        uom_id: uom.id,
        purchase_price: 100,
        dealer_landing_price: 150,
        selling_price: 200,
        tax_rate: 18,
        hsn_sac: '5678'
      },
      {
        sku: 'SKU-003',
        name: 'Test Product 3',
        category_id: category.id,
        uom_id: uom.id,
        purchase_price: 20,
        dealer_landing_price: 30,
        selling_price: 50,
        tax_rate: 18,
        hsn_sac: '9012'
      }
    ];

    for (const p of products) {
      await Product.findOrCreate({
        where: { sku: p.sku },
        defaults: p
      });
    }

    console.log('Dummy products seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
}

seedProducts();
