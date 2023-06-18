import axios from "axios";
import http from "http";
import { object, string, number } from "yup";

const addProduct = object({
  title: string().required(),
  price: number().positive().required(),
  description: string(),
  categoryId: number().positive().required().integer(),
});

const groupData = (products, cur) => {
  let newResponse = [];
  products.forEach((element) => {
    let obj = {
      category: {
        id: element.category.id,
        name: element.category.name,
      },
    };

    newResponse.push(obj);
  });

  newResponse = [
    ...new Map(newResponse.map((el) => [el.category["id"], el])).values(),
  ];

  newResponse.forEach((item) => {
    let itemCategory = [];

    products.forEach((product) => {
      if (item.category.id === product.category.id) {
        product.price = Number(product.price * cur).toFixed(4);
        itemCategory.push(product);
      }
    });
    item.products = itemCategory;
  });

  return newResponse;
};

const server = http.createServer(function (req, res) {
  if (req.method === "GET") {
    const cur = req.url.split("=").at(-1).toUpperCase();

    async function getData() {
      const [products, currency] = await Promise.all([
        await axios.get("https://api.escuelajs.co/api/v1/products"),
        await axios.get("https://api.exchangerate.host/latest?base=USD"),
      ]);
      let currPrice = currency.data.rates[`${cur}`] || 1;
      products.data;
      let finalProduct = groupData(products.data, currPrice);
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.write(JSON.stringify(finalProduct));
      res.end();
    }
    getData();
  }

  if (req.method === "POST") {
    let chuncks = [];
    req.on("data", (chunk) => {
      chuncks.push(chunk);
    });

    req.on("end", () => {
      try {
        let newProduct = addProduct.validateSync(
          JSON.parse(chuncks.toString()),
          {
            strict: true,
          }
        );

        async function postData() {
          let postResponse = await axios.post(
            "https://api.escuelajs.co/api/v1/products/",
            newProduct,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          res.setHeader("content-type", "application/json");
          res.writeHead(201);
          res.write(JSON.stringify(postResponse.data));
          res.end();
        }

        postData();
      } catch (error) {
        res.writeHead(400);
        res.end();
      }
    });
    req.on("error", (error) => {
      res.setHeader("content-type", "text");
      res.writeHead(500);
      res.write(error.message);
      res.end();
    });
  }
});

server.listen(8080, () => {
  console.log("server is running in http://localhost:8080");
});
