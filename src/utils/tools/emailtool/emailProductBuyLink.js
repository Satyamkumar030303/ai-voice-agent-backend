const { DynamicTool } = require("langchain/tools");

const ProductFind = new DynamicTool({
  name: "product_find",
  description: "Find product link. Input should be product name",

  func: async (productName) => {
    const productLinks = {
      "iphone 14": "https://example.com/iphone14",
      "iphone 15": "https://example.com/iphone15",
    };

    const key = productName.toLowerCase();

    return productLinks[key] || "product not found";
  },
});

module.exports = ProductFind;