const router = require("express").Router();
const { Product, Category, Tag, ProductTag } = require("../../models");

// The `/api/products` endpoint

// get all products
router.get("/", async (req, res) => {
  // find all products
  // be sure to include its associated Category and Tag data

  try {
    const productData = await Product.findAll({
      include: [{ model: Category }, { model: Tag, through: ProductTag }],
    });

    const products = productData.map((product) => product.get({ plain: true }));
    console.log(products);

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json(err);
  }
});

// get one product
router.get("/:id", async (req, res) => {
  // find a single product by its `id`
  // be sure to include its associated Category and Tag data
  try {
    const productData = await Product.findByPk(req.params.id, {
      include: [{ model: Category }, { model: Tag, through: ProductTag }],
    });

    const product = productData.get({ plain: true });
    console.log(product);

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json(err);
  }
});

// create new product
router.post("/", (req, res) => {
  /* req.body should look like this...
    {
      "product_name": "Basketball",
      "price": 200.00,
      "stock": 3,
      "tagIds": [1, 2, 3, 4]
    }
  */
  Product.create(req.body)
    .then(async (product) => {
      // if there's product tags, we need to create pairings to bulk create in the ProductTag model
      if (req.body.tagIds && req.body.tagIds.length) {
        let productTagIdArr;
        // if (req.body.tagIds.length) {
          productTagIdArr = req.body.tagIds.map((tag_id) => {
            return {
              product_id: product.id,
              tag_id,
            };
          });
        // }
        ProductTag.bulkCreate(productTagIdArr);
        const productData = await Product.findByPk(product.id, {
          include: [{ model: Category }, { model: Tag, through: ProductTag }],
        });
    
        const newProduct = productData.get({ plain: true });
        return newProduct;
      }
      // if no product tags, just respond
      res.status(200).json(product);
    })
    .then((product) => res.status(200).json(product))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// update product
router.put("/:id", (req, res) => {
  // update product data
  // {
  //   product_name: "Basketball",
  //   price: 200.00,
  //   stock: 3,
  //   tagIds: [1, 2, 3, 5]
  // }
  Product.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((product) => {
      // find all associated tags from ProductTag
      const productTags =  ProductTag.findAll({ where: { product_id: req.params.id } });
      return productTags;
    })
    .then(async (productTags) => {
      // get list of current tag_ids
      // console.log(productTags, product);
      const productTagIds = productTags.map(({ tag_id }) => tag_id);
      // create filtered list of new tag_ids
      const newProductTags = req.body.tagIds
        .filter((tag_id) => !productTagIds.includes(tag_id))
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id,
          };
        });
      // figure out which ones to remove
      const productTagsToRemove = productTags
        .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
        .map(({ id }) => id);

      // run both actions
      Promise.all([
        ProductTag.destroy({ where: { id: productTagsToRemove } }),
        ProductTag.bulkCreate(newProductTags),
      ]);
      const productData = await Product.findByPk(req.params.id, {
        include: [{ model: Category }, { model: Tag, through: ProductTag }],
      });
  
      const updatedProduct = productData.get({ plain: true });
      return updatedProduct;
    })
    .then((updatedProduct) => res.json(updatedProduct))
    .catch((err) => {
      // console.log(err);
      res.status(400).json(err);
    });
});

router.delete("/:id", async (req, res) => {
  // delete one product by its `id` value
  try {
    const productData = await Product.destroy({
      where: {
        id: req.params.id,
      },
    });

    if (!productData) {
      res.status(404).json({ message: "No product found with this id!" });
      return;
    }

    res.status(200).json(productData);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
