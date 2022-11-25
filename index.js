const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const { ObjectID } = require('bson');
const { query } = require('express');
require('dotenv').config();

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
        app.get('/buyers', async (req, res) =>{
            const query = {
                role : 'buyer'
            }
            const buyers = await usersCollection.find(query).toArray();
            res.send(buyers)
        })

        //delete seller
        app.delete('/buyers/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                role: 'buyer',
                _id: ObjectID(id)
            }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })


        //seller collection
        app.get('/sellers', async (req, res) =>{
            const query = {
                role : 'seller'
            }
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers)
        })

        //delete seller
        app.delete('/sellers/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                role: 'seller',
                _id: ObjectID(id)
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

        //product collection
        app.post('/products', async (req, res) => {
            let product = req.body;
            const categoryQuery = {
                _id: ObjectID(product.categoryId)
            }
            const categories = await categoryCollection.find(categoryQuery).toArray();

            const catName = categories[0].categoryName;
            product.categoryName = catName
            
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        //category base product 
        app.get('/products/:id', async(req, res) => {
            const id = req.params.id;
            const query = {categoryId: id}
            const categoryProduct = await productCollection.find(query).toArray();
            res.send(categoryProduct)
        })

         //get categories
         app.get('/categories', async (req, res) => {
            const query = {}
            const result = await categoryCollection.find(query).toArray();
            res.send(result);
        })

        //categories collection
        app.post('/categories', async (req, res) => {
            const category = req.body;
            const result = await categoryCollection.insertOne(category);
            res.send(result);
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