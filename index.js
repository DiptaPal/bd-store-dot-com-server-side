const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 5000;

const app = express();

//middle ware

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xm5hqxk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//verify jwt
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized Access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send('Forbidden Access')
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {

        const usersCollection = client.db('bdStore').collection('users');
        const productCollection = client.db('bdStore').collection('products');
        const categoryCollection = client.db('bdStore').collection('categories');
        const bookingCollection = client.db('bdStore').collection('bookingProducts');
        const paymentsCollection = client.db('bdStore').collection('payments');
        const reportedProductCollection = client.db('bdStore').collection('reportedProducts');


        //user collection
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = {
                email: user.email
            }
            const alreadyHave = await usersCollection.findOne(query)
            if (!alreadyHave) {
                const result = await usersCollection.insertOne(user);
                return res.send(result);
            }
            res.send({ acknowledged: false, message: 'User already created' })
        })

        //buyer collection
        app.get('/buyers', async (req, res) => {
            const query = {
                role: 'buyer'
            }
            const buyers = await usersCollection.find(query).toArray();
            res.send(buyers)
        })

        //delete buyer
        app.delete('/buyers/:email', async (req, res) => {
            const buyerEmail = req.params.email;
            const filter = {
                role: 'buyer',
                email: buyerEmail
            }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })


        //seller collection
        app.get('/sellers', async (req, res) => {
            const query = {
                role: 'seller'
            }
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers)
        })

        //verify seller 
        app.put('/sellers/verified/:email', async (req, res) => {
            const sellerEmail = req.params.email;
            const filter = {
                email: sellerEmail
            }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    verified: 'true'
                }
            }
            const productHave = await productCollection.find(filter).toArray()

            if (productHave.length) {
                const set = await productCollection.updateMany(filter, updatedDoc, options);
            }

            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        //delete seller
        app.delete('/sellers/:email', async (req, res) => {
            const sellerEmail = req.params.email;
            const filter = {
                role: 'seller',
                email: sellerEmail
            }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })

        //get products
        app.get('/products', async (req, res) => {
            const query = {}
            const result = await productCollection.find(query).toArray();
            res.send(result);
        })

        //edit products
        app.get('/editProduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await productCollection.findOne(query)
            res.send(result)
        })

        //edit product details
        app.patch('/updateProduct/:id', async (req, res) => {
            const id = req.params.id;
            const product = req.body;
            const query = {
                _id: ObjectId(id)
            }

            const categoryQuery = {
                _id: ObjectId(product.categoryId)
            }
            const categories = await categoryCollection.findOne(categoryQuery);
            const catName = categories.categoryName;

            const updatedDoc = {
                $set: {
                    username: product.username,
                    email: product.email,
                    profileImage: product.profileImage,
                    productName: product.productName,
                    phoneNumber: product.phoneNumber,
                    productImage: product.productImage,
                    location: product.location,
                    quality: product.quality,
                    categoryId: product.categoryId,
                    resalePrice: product.resalePrice,
                    originalPrice: product.originalPrice,
                    yearsOfUsed: product.yearsOfUsed,
                    description: product.description,
                    categoryName: catName
                }
            }

            const result = await productCollection.updateOne(query, updatedDoc)
            res.send(result)
        })

        //product delete based on id
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await productCollection.deleteOne(query);
            res.send(result)
        })

        //product collection
        app.post('/products', async (req, res) => {
            let product = req.body;
            const categoryQuery = {
                _id: ObjectId(product.categoryId)
            }
            const categories = await categoryCollection.findOne(categoryQuery);
            const catName = categories.categoryName;
            product.categoryName = catName;

            const userQuery = {
                email: product.email
            }
            const user = await usersCollection.findOne(userQuery);
            const isVerified = user.verified;

            if (isVerified === 'true') {
                product.verified = 'true'
            }

            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        //make advertise 
        app.put('/makeAdvertise/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id),
            }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    isAdvertise: 'true'
                }
            }
            const result = await productCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        //gate advertise product

        app.get('/advertiseProduct', async (req, res) => {
            const query = {
                isAdvertise: 'true'
            }
            const result = await productCollection.find(query).toArray()
            res.send(result)
        })

        //category base product 
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id }
            const categoryProduct = await productCollection.find(query).toArray();
            res.send(categoryProduct)
        })

        //user base product
        app.get('/myProducts', async (req, res) => {
            const customerEmail = req.query.email;
            const query = {
                email: customerEmail
            }
            const result = await productCollection.find(query).toArray();
            res.send(result)
        })

        //get categories
        app.get('/categories', async (req, res) => {
            const query = {}
            const result = await categoryCollection.find(query).toArray();
            res.send(result);
        })

        //booking collection 
        app.post('/bookingProducts', async (req, res) => {
            const bookingProducts = req.body;
            const query = {
                productName: bookingProducts.productName,
                productId: bookingProducts.productId,
                customerEmail: bookingProducts.customerEmail,
            }
            const alreadyBooked = await bookingCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = "Already Booked! Please check your Dashboard";
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingCollection.insertOne(bookingProducts);
            res.send(result)
        })

        //get booked product base on id
        app.get('/myOrder/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await bookingCollection.findOne(query);
            res.send(result)
        })

        //delete booked product
        app.delete('/myOrders/delete', async (req, res) => {
            const id = req.query.id;
            const filter = {
                _id: ObjectId(id)
            }
            const result = await bookingCollection.deleteOne(filter)
            res.send(result)
        })

        //user base product
        app.get('/myOrders', async (req, res) => {
            const email = req.query.email;
            const query = {
                customerEmail: email
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result)
        })


        //categories collection
        app.post('/categories', async (req, res) => {
            const category = req.body;
            const result = await categoryCollection.insertOne(category);
            res.send(result);
        })

        app.delete('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await categoryCollection.deleteOne(query);
            res.send(result)
        })

        //report products
        app.post('/reportedProduct', async (req, res) => {
            const reportProducts = req.body;
            const query = {
                productName: reportProducts.productName,
                productId: reportProducts.productId,
                userEmail: reportProducts.userEmail,
            }
            const alreadyReport = await reportedProductCollection.find(query).toArray();
            if (alreadyReport.length) {
                const message = "Already reported!";
                return res.send({ acknowledged: false, message })
            }
            const result = await reportedProductCollection.insertOne(reportProducts);
            res.send(result)
        })

        //get reported product
        app.get('/reportedProducts', async (req, res) => {
            const query = {}
            const result = await reportedProductCollection.find(query).toArray()
            res.send(result)
        })

        //delete reported product
        app.delete('/reportedProducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const findReportProduct = await reportedProductCollection.findOne(query);
            const productId = findReportProduct.productId;
            const findProduct = await productCollection.findOne({ _id: ObjectId(productId) });

            const result1 = await reportedProductCollection.deleteOne(findReportProduct);
            const result2 = await productCollection.deleteOne(findProduct);

            res.send(result1)
        })


        //admin role checkout
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })

        //seller role checkout
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' })
        })

        //buyer role checkout
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            }
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'buyer' })
        })

        //stripe setup
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.productPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        //payment collection
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment)
            const id = payment.bookingId;

            const prodId = payment.productId;

            const filterBooking = { _id: ObjectId(id) }
            const filterProduct = { _id: ObjectId(prodId) }
            const updatedBooking = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const updatedProduct = {
                $set: {
                    status: 'sold'
                }
            }
            const updatedResult1 = await bookingCollection.updateOne(filterBooking, updatedBooking)
            const updatedResult2 = await productCollection.updateOne(filterProduct, updatedProduct)

            res.send(result)
        })

        //jwt set up
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, /*{expireIn: '1y'}*/)
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        })
    }
    finally {
        //await client.close();
    }
}
run().catch(error => console.log(error.message))

app.get('/', (req, res) => {
    res.send('BD-Store server is running.')
});

app.listen(port, () => {
    console.log(`BD-Store running on ${port}`);
})