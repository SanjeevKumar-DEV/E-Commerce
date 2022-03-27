const router = require("express").Router();
const { Tag, Product, ProductTag } = require("../../models");

// The `/api/tags` endpoint

router.get("/", async (req, res) => {
  // find all tags
  // be sure to include its associated Product data
  try {
    const tagData = await Tag.findAll({
      include: [{ model: Product, through: ProductTag }],
    });

    const tags = tagData.map((tag) => tag.get({ plain: true }));
    console.log(tags);

    res.status(200).json(tags);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/:id", async (req, res) => {
  // find a single tag by its `id`
  // be sure to include its associated Product data
  try {
    const tagData = await Tag.findByPk(req.params.id, {
      include: [{ model: Product, through: ProductTag }],
    });

    const tag = tagData.get({ plain: true });
    console.log(tag);

    res.status(200).json(tag);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/", async (req, res) => {
  // create a new tag
  // {
  //   "tag_name": "blue"
  // }
  Tag.create(req.body)
    .then((tag) => {
      // if there's tag products, we need to create pairings to bulk create in the ProductTag model
      if (req.body.productIds && req.body.productIds.length) {
        const tagProductIdArr = req.body.productIds.map((product_id) => {
          return {
            tag_id: tag.id,
            product_id,
          };
        });
        return ProductTag.bulkCreate(tagProductIdArr);
      }
      // if no tag products, just respond
      res.status(200).json(tag);
    })
    .then((tagProductIds) => res.status(200).json(tagProductIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

router.put("/:id", async (req, res) => {
  // update a tag's name by its `id` value
  // {
  //   "tag_name": "blue Changed"
  // }
  Tag.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then(async (tagSuccess) => {
      // find all associated Products from ProductTag
      if (req.body.productIds && req.body.productIds.length) {
        return ProductTag.findAll({ where: { tag_id: req.params.id } });
      }
      const tagData = await Tag.findByPk(req.params.id, {
        include: [{ model: Product, through: ProductTag }],
      });
      const tag = tagData.get({ plain: true });
      res.status(200).json(tag);
    })
    .then(async (tagProducts) => {
      if (tagProducts) {
        // get list of current tag_ids
        const tagProductIds = tagProducts.map(({ product_id }) => product_id);
        // create filtered list of new prodcuts_ids
        const newTagProducts = req.body.productIds
          .filter((product_id) => !tagProductIds.includes(product_id))
          .map((product_id) => {
            return {
              tag_id: req.params.id,
              product_id,
            };
          });
        // figure out which ones to remove
        const tagProductsToRemove = tagProducts
          .filter(({ product_id }) => !req.body.productIds.includes(product_id))
          .map(({ id }) => id);

        // run both actions
        Promise.all([
          ProductTag.destroy({ where: { id: tagProductsToRemove } }),
          ProductTag.bulkCreate(newTagProducts),
        ]);
        const tagData = await Tag.findByPk(req.params.id, {
          include: [{ model: Product, through: ProductTag }],
        });
        const updatedTagProducts = tagData.get({ plain: true });
        // res.status(200).json(tag);
        return updatedTagProducts;
      }
    })
    .then((updatedTagProducts) => res.json(updatedTagProducts))
    .catch((err) => {
      // console.log(err);
      res.status(400).json(err);
    });
});

router.delete("/:id", async (req, res) => {
  // delete on tag by its `id` value
  try {
    const tagData = await Tag.destroy({
      where: {
        id: req.params.id,
      },
    });

    if (!tagData) {
      res.status(404).json({ message: "No tag found with this id!" });
      return;
    }

    res.status(200).json(tagData);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
