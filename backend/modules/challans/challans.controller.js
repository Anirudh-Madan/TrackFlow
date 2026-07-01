const { Challan, Order, OrderItem, Customer, Product, User, Region } = require('../../models');

// List All Challans
exports.getChallans = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where[sequelize.Sequelize.Op.or] = [
        { challan_number: { [sequelize.Sequelize.Op.like]: `%${search}%` } },
      ];
    }

    const challans = await Challan.findAll({
      where,
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            { 
              model: Customer, 
              as: 'party', 
              attributes: ['id', 'company_name', 'region_id'],
              include: [{ model: Region, as: 'region', attributes: ['id', 'name', 'code'] }]
            },
            { model: User, as: 'salesManager', attributes: ['id', 'name'] },
            { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'supplier'] }] },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: challans });
  } catch (error) {
    return next(error);
  }
};

// Get Single Challan
exports.getChallanById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const challan = await Challan.findByPk(id, {
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            { 
              model: Customer, 
              as: 'party',
              include: [{ model: Region, as: 'region' }]
            },
            { model: User, as: 'salesManager', attributes: ['id', 'name'] },
            { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
          ],
        },
      ],
    });

    if (!challan) {
      return res.status(404).json({ success: false, error: 'Challan not found' });
    }

    return res.json({ success: true, data: challan });
  } catch (error) {
    return next(error);
  }
};
