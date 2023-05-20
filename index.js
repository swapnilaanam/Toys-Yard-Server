const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fuichu5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const subCategoryCollection = client.db('toysDB').collection('subcategories');
        const toyCollection = client.db('toysDB').collection('toys');

        app.get('/subcategories', async (req, res) => {
            const cursor = subCategoryCollection.find();

            const result = await cursor.toArray();
            res.send(result);
        });


        app.get('/toys', async (req, res) => {
            const cursor = toyCollection.find();

            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/toys/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };

            const result = await toyCollection.findOne(query);
            res.send(result);
        })

        app.get('/toys/category/:subcategory', async (req, res) => {
            let subcategory = req.params.subcategory;

            const first = subcategory.charAt(0).toUpperCase();
            const remaining = subcategory.slice(1);

            subcategory = first + remaining;

            const query = { subCategory: subcategory };

            const cursor = toyCollection.find(query);

            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/toys', async (req, res) => {
            const newToy = req.body;

            const result = await toyCollection.insertOne(newToy);
            res.send(result);
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Toy Marketplace Server Is Running....');
});

app.listen(port, () => {
    console.log(`Toy Marketplace Server Is Running On Port: ${port}`);
});