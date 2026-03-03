import { DynamicTool } from "langchain";

export default ProductFind = new DynamicTool({
    name:"product_find",
    description:"useful for when you need to find the product link for a specific product. The input should be the name of the product.",
    func: async(productName)=>{
        const productLinks ={
            "iphone 14":"vbjdbvkjdbvfdhvj",
            "ipone 17":"svbjbsdvjdkbv"
        }
        const key = productName.toLowerCase();
        return productLinks[key] || "product not found";

    } 
})

